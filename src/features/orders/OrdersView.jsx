import { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  Flame,
  ChefHat,
  ShoppingBag,
  Bike,
  Store,
  Utensils,
  X,
  Check,
  Package,
  Edit2,
  Edit3,
  Trash2,
  Lock,
  UserCheck,
  User,
  Plus,
  Minus,
  Search,
  ClipboardList,
  LayoutGrid,
  List,
} from 'lucide-react';
import { formatCurrency, formatTime, formatElapsedTime, generateOrderNumber } from '../../utils/formatters';
import { ORDER_STATUS, PAYMENT_STATUS } from '../../types/constants';
import Modal from '../../components/ui/Modal';
import ItemConsumptionBadge from '../../components/ui/ItemConsumptionBadge';
import EmptyState from '../../components/ui/EmptyState';
import SearchInput from '../../components/ui/SearchInput';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import ProductThumbnail from '../../components/ui/ProductThumbnail';
import { handleInputFocusScroll } from '../../utils/scrollIntoViewHelper';
import { isProductBeverage, isProductDessert, doesProductSupportCreams } from '../../utils/productCategories';
import { useAuth } from '../../context/useAuth';
import { useCatalog } from '../../context/useCatalog';

export default function OrdersView({
  orders = [],
  tables = [],
  onEditOrderInSales,
  onUpdateOrder,
  onCreateOrder,
}) {
  const { user } = useAuth();
  const { products = [], categories = [], packagings: catalogPackagings = [], recordProductSales } = useCatalog();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';

  const getItemThumbnail = (item) => {
    if (item?.thumbnailUrl) return item.thumbnailUrl;
    if (item?.image) return item.image;
    if (!products || products.length === 0) return null;
    const match = products.find(
      (p) =>
        (item?.productId && p.id === item.productId) ||
        (item?.name && p.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase())
    );
    return match?.thumbnailUrl || match?.image || null;
  };

  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'HISTORY'
  const [filterModality, setFilterModality] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('porkos_orders_view_mode') || 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('porkos_orders_view_mode', mode);
    } catch {
      // ignore
    }
  };
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingCustomerNameOrder, setEditingCustomerNameOrder] = useState(null);
  const [tempCustomerName, setTempCustomerName] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [, setTick] = useState(0);

  // Modal para ingreso manual de pedidos pasados (Solo Admin)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualDateTime, setManualDateTime] = useState(() => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  });
  const [manualModality, setManualModality] = useState('MESA');
  const [manualTableId, setManualTableId] = useState('');
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualPaymentMethod, setManualPaymentMethod] = useState('EFECTIVO');
  const [manualNotes, setManualNotes] = useState('');
  const [manualDeliveryFee, setManualDeliveryFee] = useState('0');
  const [manualItems, setManualItems] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('ALL');
  const [productSearch, setProductSearch] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemPrice, setItemPrice] = useState('');
  const [itemDetails, setItemDetails] = useState('');
  const [isPriceCustomized, setIsPriceCustomized] = useState(false);
  const [editingItemPriceId, setEditingItemPriceId] = useState(null);
  const [tempItemPrice, setTempItemPrice] = useState('');
  const [editingItemDetailsId, setEditingItemDetailsId] = useState(null);
  const [tempItemDetails, setTempItemDetails] = useState('');
  const [isSavingManual, setIsSavingManual] = useState(false);

  // Helper para detectar táper/empaque correspondiente según el producto y la modalidad
  const getPackagingForProduct = (prod, modalityToUse) => {
    const isTakeoutOrDelivery = modalityToUse === 'PARA_LLEVAR' || modalityToUse === 'DELIVERY';
    if (!isTakeoutOrDelivery || !prod) return null;
    if (
      prod.type === 'MARKET' ||
      prod.line === 'MARKET' ||
      prod.id?.startsWith('mkt_') ||
      isProductBeverage(prod) ||
      isProductDessert(prod)
    ) {
      return null;
    }
    return (
      (catalogPackagings || []).find(
        (pkg) =>
          pkg.active &&
          pkg.id !== 'pkg_ninguno' &&
          (prod?.availablePackagingIds?.includes(pkg.id) ||
            pkg.applicableProductIds?.includes(prod.id))
      ) ||
      (catalogPackagings || []).find((pkg) => pkg.active && pkg.id !== 'pkg_ninguno') ||
      null
    );
  };

  const handleOpenManualOrderModal = () => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    setManualDateTime(new Date(now.getTime() - tzOffset).toISOString().slice(0, 16));
    setManualModality('MESA');
    setManualTableId('');
    setManualCustomerName('');
    setManualItems([]);
    setSelectedProductId('');
    setCatalogCategoryFilter('ALL');
    setProductSearch('');
    setCustomItemName('');
    setItemQuantity(1);
    setItemPrice('');
    setItemDetails('');
    setIsPriceCustomized(false);
    setEditingItemPriceId(null);
    setEditingItemDetailsId(null);
    setManualDeliveryFee('0');
    setManualPaymentMethod('EFECTIVO');
    setManualNotes('');
    setIsManualModalOpen(true);
  };

  // Selector y manipuladores de productos para pedido pasado
  const filteredCatalogProducts = useMemo(() => {
    let list = products;
    if (catalogCategoryFilter !== 'ALL' && catalogCategoryFilter !== 'CUSTOM') {
      const selectedCat = categories.find((c) => c.id === catalogCategoryFilter);
      list = list.filter(
        (p) => p.categoryId === catalogCategoryFilter || (selectedCat && p.line === selectedCat.line)
      );
    }
    const q = productSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => (p.name || '').toLowerCase().includes(q));
    }
    return list;
  }, [products, categories, catalogCategoryFilter, productSearch]);

  const selectedProductObj = useMemo(() => {
    if (!selectedProductId || selectedProductId === 'CUSTOM') return null;
    return products.find((p) => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  const handleModalityChange = (nextModality) => {
    setManualModality(nextModality);
    if (nextModality !== 'DELIVERY') {
      setManualDeliveryFee('0');
    }

    // Recalcular táper/packaging en los items ya añadidos que no tengan precio manual
    setManualItems((prev) =>
      prev.map((it) => {
        const prod = products.find((p) => p.id === it.productId);
        const pkg = getPackagingForProduct(prod, nextModality);
        const pkgPrice = pkg?.price || 0;

        if (it.isManualPrice) {
          return {
            ...it,
            packaging: pkg,
            packagingPrice: pkgPrice,
          };
        }

        const base = it.basePrice !== undefined ? it.basePrice : (prod?.price || it.unitPrice);
        const newUnitPrice = Math.round((base + pkgPrice) * 100) / 100;
        return {
          ...it,
          basePrice: base,
          packaging: pkg,
          packagingPrice: pkgPrice,
          unitPrice: newUnitPrice,
          subtotal: Math.round(newUnitPrice * it.quantity * 100) / 100,
        };
      })
    );

    // Si hay un producto seleccionado que no ha sido personalizado en precio, actualizar su precio sugerido
    if (selectedProductId && selectedProductId !== 'CUSTOM' && !isPriceCustomized) {
      const prod = products.find((p) => p.id === selectedProductId);
      if (prod) {
        const pkg = getPackagingForProduct(prod, nextModality);
        const pkgPrice = pkg?.price || 0;
        const newPrice = Math.round(((prod.price || 0) + pkgPrice) * 100) / 100;
        setItemPrice(newPrice.toString());
      }
    }
  };

  const handleSelectProduct = (productId) => {
    setSelectedProductId(productId);
    setItemDetails('');
    setIsPriceCustomized(false);
    if (productId === 'CUSTOM') {
      setCustomItemName('');
      setItemPrice('');
      setItemQuantity(1);
    } else if (productId) {
      const prod = products.find((p) => p.id === productId);
      if (prod) {
        setCustomItemName(prod.name);
        const pkg = getPackagingForProduct(prod, manualModality);
        const pkgPrice = pkg?.price || 0;
        const calcPrice = Math.round(((prod.price || 0) + pkgPrice) * 100) / 100;
        setItemPrice(calcPrice.toString());
        setItemQuantity(1);
      }
    } else {
      setCustomItemName('');
      setItemPrice('');
      setItemQuantity(1);
    }
  };

  const handleQuickAddProduct = (prod) => {
    const pkg = getPackagingForProduct(prod, manualModality);
    const pkgPrice = pkg?.price || 0;
    const basePrice = prod.price || 0;
    const unitPrice = Math.round((basePrice + pkgPrice) * 100) / 100;

    setManualItems((prev) => {
      const existingIdx = prev.findIndex(
        (it) => it.productId === prod.id && !it.details && it.unitPrice === unitPrice
      );
      if (existingIdx >= 0) {
        const copy = [...prev];
        const existing = copy[existingIdx];
        const newQty = existing.quantity + 1;
        copy[existingIdx] = {
          ...existing,
          quantity: newQty,
          subtotal: Math.round(newQty * existing.unitPrice * 100) / 100,
        };
        return copy;
      }

      const newItem = {
        id: `item_manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId: prod.id,
        name: prod.name,
        basePrice,
        packaging: pkg,
        packagingPrice: pkgPrice,
        quantity: 1,
        unitPrice,
        subtotal: unitPrice,
        details: '',
        isManualPrice: false,
        image: prod.image || null,
        thumbnailUrl: prod.thumbnailUrl || prod.image || null,
      };
      return [...prev, newItem];
    });
  };

  const handleAddManualItem = (e) => {
    if (e) e.preventDefault();

    let nameToUse = '';
    let prodId = null;
    let basePrice = 0;
    let matchingProd = null;

    if (selectedProductId === 'CUSTOM') {
      nameToUse = customItemName.trim();
      if (!nameToUse) {
        alert('Por favor escribe el nombre del producto.');
        return;
      }
      basePrice = Math.max(0, parseFloat(itemPrice) || 0);
    } else if (selectedProductId) {
      matchingProd = products.find((p) => p.id === selectedProductId);
      if (!matchingProd) {
        alert('Por favor selecciona un producto válido.');
        return;
      }
      nameToUse = matchingProd.name;
      prodId = matchingProd.id;
      basePrice = matchingProd.price || 0;
    } else {
      alert('Por favor selecciona un producto del catálogo o elige la opción personalizada.');
      return;
    }

    const parsedQty = Math.max(1, parseInt(itemQuantity, 10) || 1);
    const parsedPrice = Math.max(0, parseFloat(itemPrice) || 0);
    const pkg = getPackagingForProduct(matchingProd, manualModality);
    const pkgPrice = pkg?.price || 0;
    const cleanDetails = itemDetails.trim();

    setManualItems((prev) => {
      const existingIdx = prev.findIndex(
        (it) =>
          it.productId === prodId &&
          it.name.trim().toLowerCase() === nameToUse.toLowerCase() &&
          it.unitPrice === parsedPrice &&
          (it.details || '').trim().toLowerCase() === cleanDetails.toLowerCase()
      );
      if (existingIdx >= 0) {
        const copy = [...prev];
        const existing = copy[existingIdx];
        const newQty = existing.quantity + parsedQty;
        copy[existingIdx] = {
          ...existing,
          quantity: newQty,
          subtotal: Math.round(newQty * existing.unitPrice * 100) / 100,
        };
        return copy;
      }

      const newItem = {
        id: `item_manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId: prodId,
        name: nameToUse,
        basePrice,
        packaging: pkg,
        packagingPrice: pkgPrice,
        quantity: parsedQty,
        unitPrice: parsedPrice,
        subtotal: Math.round(parsedQty * parsedPrice * 100) / 100,
        details: cleanDetails,
        isManualPrice: isPriceCustomized,
        image: matchingProd?.image || null,
        thumbnailUrl: matchingProd?.thumbnailUrl || matchingProd?.image || null,
      };
      return [...prev, newItem];
    });

    // Reset de campos de adición
    setSelectedProductId('');
    setCustomItemName('');
    setItemQuantity(1);
    setItemPrice('');
    setItemDetails('');
    setIsPriceCustomized(false);
  };

  const handleUpdateManualItemQty = (id, newQty) => {
    if (newQty < 1) {
      handleRemoveManualItem(id);
      return;
    }
    setManualItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          return {
            ...it,
            quantity: newQty,
            subtotal: Math.round(newQty * it.unitPrice * 100) / 100,
          };
        }
        return it;
      })
    );
  };

  const handleUpdateManualItemPrice = (id, newPrice) => {
    const parsed = Math.max(0, parseFloat(newPrice) || 0);
    const rounded = Math.round(parsed * 100) / 100;
    setManualItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          return {
            ...it,
            unitPrice: rounded,
            subtotal: Math.round(rounded * it.quantity * 100) / 100,
            isManualPrice: true,
          };
        }
        return it;
      })
    );
    setEditingItemPriceId(null);
  };

  const handleUpdateManualItemDetails = (id, newDetails) => {
    setManualItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          return {
            ...it,
            details: newDetails.trim(),
          };
        }
        return it;
      })
    );
    setEditingItemDetailsId(null);
  };

  const handleRemoveManualItem = (id) => {
    setManualItems((prev) => prev.filter((it) => it.id !== id));
  };

  const manualItemsSubtotal = useMemo(() => {
    return manualItems.reduce((acc, it) => acc + (it.subtotal || 0), 0);
  }, [manualItems]);

  const manualPackagingsTotal = useMemo(() => {
    return manualItems.reduce((acc, it) => acc + ((it.packagingPrice || 0) * it.quantity), 0);
  }, [manualItems]);

  const manualTotalCalculated = useMemo(() => {
    const fee = manualModality === 'DELIVERY' ? Math.max(0, parseFloat(manualDeliveryFee) || 0) : 0;
    return Math.round((manualItemsSubtotal + fee) * 100) / 100;
  }, [manualItemsSubtotal, manualModality, manualDeliveryFee]);

  const handleCreateManualOrder = async (e) => {
    e.preventDefault();
    if (!isAdmin || !onCreateOrder) return;

    if (manualItems.length === 0) {
      alert('Por favor agrega al menos un producto a la comanda antes de registrar el pedido.');
      return;
    }

    if (manualModality === 'MESA' && !manualTableId) {
      alert('Por favor selecciona una mesa para el pedido de salón.');
      return;
    }

    if (manualTotalCalculated <= 0) {
      alert('El importe total del pedido debe ser mayor a 0.');
      return;
    }

    setIsSavingManual(true);
    try {
      const orderDate = manualDateTime ? new Date(manualDateTime) : new Date();
      const targetTable = tables.find((t) => t.id === manualTableId);
      const prefix = manualModality === 'MARKET' ? 'M' : 'P';
      const parsedDeliveryFee = manualModality === 'DELIVERY' ? Math.max(0, parseFloat(manualDeliveryFee) || 0) : 0;

      const orderItems = manualItems.map((item, index) => {
        const matchingProd = products.find((p) => p.id === item.productId);
        const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
        const unitPrice = Math.max(0, parseFloat(item.unitPrice) || 0);
        const subtotal = Math.round(qty * unitPrice * 100) / 100;

        return {
          itemId: `item_manual_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
          productId: item.productId || null,
          name: item.name.trim(),
          quantity: qty,
          unitPrice,
          subtotal,
          total: subtotal,
          details: item.details || null,
          notes: item.details || null,
          customization: {
            itemNotes: item.details || '',
            packaging: item.packaging || null,
          },
          requiresKitchen: matchingProd?.requiresKitchen ?? false,
          isMarket: matchingProd?.type === 'MARKET' || matchingProd?.line === 'MARKET' || false,
          image: item.image || matchingProd?.image || null,
          thumbnailUrl: item.thumbnailUrl || matchingProd?.thumbnailUrl || matchingProd?.image || null,
          consumptionType:
            manualModality === 'PARA_LLEVAR'
              ? 'PARA_LLEVAR'
              : manualModality === 'CONSUMO_EXTERNO'
              ? 'CONSUMO_EXTERNO'
              : manualModality === 'DELIVERY'
              ? 'DELIVERY'
              : 'MESA',
        };
      });

      const packagingsSummary = [];
      const totalPkgQty = manualItems.reduce((sum, it) => sum + (it.packaging ? it.quantity : 0), 0);
      if (totalPkgQty > 0 && manualPackagingsTotal > 0) {
        packagingsSummary.push({
          packagingId: 'pkg_auto_takeout',
          name: 'Táper / Empaque',
          quantity: totalPkgQty,
          unitPrice: Math.round((manualPackagingsTotal / totalPkgQty) * 100) / 100,
          total: manualPackagingsTotal,
        });
      }

      const newManualOrder = {
        id: `ord_manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        orderNumber: generateOrderNumber(orders, prefix),
        modality: manualModality,
        tableId: manualModality === 'MESA' ? (manualTableId || null) : null,
        tableName: manualModality === 'MESA' ? (targetTable?.label || manualTableId || 'Mesa') : null,
        customerName: manualCustomerName.trim() || (manualModality === 'DELIVERY' ? 'Cliente Delivery' : null),
        customer: manualModality === 'DELIVERY'
          ? {
              name: manualCustomerName.trim() || 'Cliente Delivery',
              phone: '',
              address: '',
              deliveryFee: parsedDeliveryFee,
            }
          : null,
        items: orderItems,
        packagings: packagingsSummary,
        packagingsTotal: manualPackagingsTotal,
        deliveryFee: parsedDeliveryFee,
        discount: 0,
        subtotal: Math.round(manualItemsSubtotal * 100) / 100,
        total: manualTotalCalculated,
        status: 'ENTREGADO',
        paymentStatus: 'PAID',
        payment: {
          method: manualPaymentMethod,
          amount: manualTotalCalculated,
          paidAt: orderDate,
        },
        generalNotes: manualNotes.trim() || 'Registro manual',
        createdAt: orderDate,
        updatedAt: orderDate,
        isManualPastOrder: true,
        createdBy: {
          uid: user?.uid || null,
          email: user?.email || 'admin@porkos.pe',
          name: user?.displayName || user?.email?.split('@')[0] || 'Admin',
        },
        registeredBy: user?.displayName || user?.email?.split('@')[0] || 'Admin',
      };

      await onCreateOrder(newManualOrder);

      if (typeof recordProductSales === 'function') {
        recordProductSales(orderItems);
      }

      setIsManualModalOpen(false);
      setManualItems([]);
      setSelectedProductId('');
      setCatalogCategoryFilter('ALL');
      setProductSearch('');
      setCustomItemName('');
      setItemQuantity(1);
      setItemPrice('');
      setManualCustomerName('');
      setManualNotes('');
      setManualDeliveryFee('0');
      setToastMessage(`Pedido ${newManualOrder.orderNumber} registrado con éxito con ${orderItems.length} producto${orderItems.length > 1 ? 's' : ''}`);
    } catch (err) {
      console.error('Error registrando pedido manual:', err);
      alert('Hubo un error guardando el pedido manual.');
    } finally {
      setIsSavingManual(false);
    }
  };

  const handleSaveCustomerName = (order) => {
    if (!order) return;
    const newName = tempCustomerName.trim();
    const updated = {
      ...order,
      customerName: newName || null,
      customer: order.customer ? { ...order.customer, name: newName } : (newName ? { name: newName } : null),
    };
    if (onUpdateOrder) {
      onUpdateOrder(updated);
    }
    if (selectedOrder && selectedOrder.orderNumber === order.orderNumber) {
      setSelectedOrder(updated);
    }
    setEditingCustomerNameOrder(null);
  };

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  const filteredOrders = useMemo(() => {
    const list = orders.filter((o) => {
      if (activeTab === 'ACTIVE') {
        const isActive = o.status === 'PENDIENTE' || o.status === 'PREPARANDO' || o.status === 'LISTO';
        if (!isActive) return false;
      } else if (activeTab === 'HISTORY') {
        const isHistory = o.status === 'ENTREGADO' || o.status === 'CANCELADO';
        if (!isHistory) return false;
      }

      if (filterModality !== 'ALL') {
        if (filterModality === 'MESA' && o.modality !== 'MESA') return false;
        if (filterModality === 'DELIVERY' && o.modality !== 'DELIVERY') return false;
        if (filterModality === 'PARA_LLEVAR' && o.modality !== 'PARA_LLEVAR' && o.modality !== 'CONSUMO_EXTERNO') return false;
        if (filterModality === 'MARKET' && o.modality !== 'MARKET') return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesNum = o.orderNumber?.toLowerCase().includes(query);
        const matchesClient = o.customerName?.toLowerCase().includes(query) || o.customer?.name?.toLowerCase().includes(query);
        const matchesPhone = o.customer?.phone?.includes(query);
        const matchesTable = o.tableName?.toLowerCase().includes(query);
        return matchesNum || matchesClient || matchesPhone || matchesTable;
      }

      return true;
    });

    return list.sort((a, b) => {
      const timeA = a.createdAt?.getTime ? a.createdAt.getTime() : new Date(a.createdAt || 0).getTime();
      const timeB = b.createdAt?.getTime ? b.createdAt.getTime() : new Date(b.createdAt || 0).getTime();
      if (!isNaN(timeA) && !isNaN(timeB) && timeB !== timeA) {
        return timeB - timeA;
      }
      return (b.orderNumber || '').localeCompare(a.orderNumber || '', undefined, { numeric: true });
    });
  }, [orders, activeTab, filterModality, searchQuery]);

  const activeCount = useMemo(() => {
    return orders.filter((o) => o.status === 'PENDIENTE' || o.status === 'PREPARANDO' || o.status === 'LISTO').length;
  }, [orders]);

  const historyCount = useMemo(() => {
    return orders.filter((o) => o.status === 'ENTREGADO' || o.status === 'CANCELADO').length;
  }, [orders]);

  const getModalityIcon = (mod) => {
    switch (mod) {
      case 'MESA':
        return <Utensils className="w-4 h-4 text-blue-400" />;
      case 'DELIVERY':
        return <Bike className="w-4 h-4 text-emerald-400" />;
      case 'PARA_LLEVAR':
        return <ShoppingBag className="w-4 h-4 text-amber-400" />;
      case 'CONSUMO_EXTERNO':
        return <Utensils className="w-4 h-4 text-purple-400" />;
      case 'MARKET':
        return <Store className="w-4 h-4 text-purple-400" />;
      default:
        return <Package className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getStepStatusIndex = (status) => {
    switch (status) {
      case 'PENDIENTE':
        return 0;
      case 'PREPARANDO':
        return 1;
      case 'LISTO':
        return 2;
      case 'ENTREGADO':
        return 3;
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-6">
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-[#121215] p-3 sm:p-4 rounded-2xl border border-[var(--color-porkos-border)] space-y-3 shadow-sm">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Segmented Control / Tabs */}
          <div className="flex bg-[#0C0C0F] p-1 rounded-xl border border-zinc-800 shrink-0">
            {[
              { id: 'ALL', label: 'Todas', count: orders.length },
              { id: 'ACTIVE', label: 'En Curso', count: activeCount },
              { id: 'HISTORY', label: 'Historial', count: historyCount },
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 active:scale-95 touch-manipulation select-none
                    ${
                      isSelected
                        ? 'bg-[var(--color-porkos-orange)] text-zinc-950 font-black shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isSelected ? 'bg-zinc-950 text-white' : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search bar y Botón de Pedido Pasado */}
          <div className="flex items-center gap-2.5 flex-1 lg:max-w-xl">
            <div className="flex-1 min-w-0">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                placeholder="Buscar comanda, cliente, mesa..."
                mobilePlaceholder="Buscar"
                size="sm"
              />
            </div>

            {isAdmin && onCreateOrder && (
              <Button
                onClick={handleOpenManualOrderModal}
                icon={Plus}
                size="sm"
                className="text-xs font-black shadow-md shadow-orange-500/20 whitespace-nowrap shrink-0"
              >
                <span className="hidden sm:inline">Registrar </span>Pedido Pasado
              </Button>
            )}
          </div>
        </div>

        {/* Filter Pills: Modalidad + Selector de Vista (Tarjetas / Lista) */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 scrollbar-none text-xs pt-1 border-t border-[var(--color-porkos-border)]">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider shrink-0 mr-1">
              Modalidad:
            </span>
            {[
              { id: 'ALL', label: 'Todas' },
              { id: 'MESA', label: 'Mesas' },
              { id: 'PARA_LLEVAR', label: 'Para Llevar' },
              { id: 'DELIVERY', label: 'Delivery' },
              { id: 'MARKET', label: 'Market' },
            ].map((m) => {
              const isSelected = filterModality === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setFilterModality(m.id)}
                  className={`
                    px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer border active:scale-95 touch-manipulation
                    ${
                      isSelected
                        ? 'bg-zinc-800 text-white border-zinc-600 font-black shadow-xs'
                        : 'bg-[#141418] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white'
                    }
                  `}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Toggle de Vista: Tarjetas vs Lista Compacta */}
          <div className="flex items-center bg-[#0C0C0F] p-0.5 rounded-lg border border-zinc-800 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => handleSetViewMode('grid')}
              className={`p-1.5 rounded-md text-xs transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'grid'
                  ? 'bg-zinc-800 text-white font-bold shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Vista en cuadrícula de tarjetas"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('list')}
              className={`p-1.5 rounded-md text-xs transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'list'
                  ? 'bg-zinc-800 text-white font-bold shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Vista de lista compacta"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Orders List / Cards */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No se encontraron pedidos"
          description={
            searchQuery
              ? 'No hay resultados que coincidan con la búsqueda actual.'
              : 'No hay pedidos en la categoría o filtro seleccionado.'
          }
          action={
            searchQuery
              ? {
                  label: 'Limpiar búsqueda',
                  onClick: () => setSearchQuery(''),
                }
              : undefined
          }
        />
      ) : viewMode === 'list' ? (
        /* VISTA DE LISTA COMPACTA (Ultra-eficiente en espacio) */
        <div className="space-y-1.5">
          {filteredOrders.map((order) => {
            const statusConf = ORDER_STATUS[order.status] || {};
            const isTable = order.modality === 'MESA' || Boolean(order.tableId);
            const effectivePaymentStatus = isTable ? (order.paymentStatus || 'PENDING') : 'PAID';
            const payConf = PAYMENT_STATUS[effectivePaymentStatus] || {};

            const itemsSummary = (order.items || [])
              .map((it) => `${it.quantity}× ${it.name}`)
              .join(', ');

            return (
              <div
                key={order.orderNumber}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedOrder(order)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedOrder(order);
                  }
                }}
                className="group bg-[#121216] hover:bg-[#16161c] border border-[var(--color-porkos-border)] hover:border-zinc-700 rounded-xl px-3 py-2 transition-all cursor-pointer flex items-center justify-between gap-2.5 active:scale-[0.99] shadow-xs text-xs"
                title="Toca para ver el detalle y seguimiento del pedido"
              >
                {/* Izquierda: Icono + Número + Mesa + Cliente */}
                <div className="flex items-center gap-2.5 min-w-0 sm:w-64 shrink-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                      order.status === 'ENTREGADO'
                        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                        : order.status === 'LISTO'
                        ? 'bg-amber-950/40 border-amber-500/30 text-amber-400'
                        : 'bg-orange-950/40 border-orange-500/30 text-[var(--color-porkos-orange)]'
                    }`}
                  >
                    {getModalityIcon(order.modality)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-white">{order.orderNumber}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-zinc-800 text-zinc-300 rounded font-bold border border-zinc-700/80">
                        {order.tableName || (order.modality === 'PARA_LLEVAR' ? 'Llevar' : order.modality === 'CONSUMO_EXTERNO' ? 'Ir Comiendo' : order.modality === 'DELIVERY' ? 'Delivery' : 'Market')}
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-300/90 truncate font-semibold">
                      {order.customerName || order.customer?.name || 'Cliente'}
                    </div>
                  </div>
                </div>

                {/* Centro: Resumen de productos en una sola línea */}
                <div className="hidden md:flex flex-1 min-w-0 items-center gap-1.5 text-zinc-400 text-xs">
                  <span className="truncate">
                    {itemsSummary || 'Sin productos'}
                  </span>
                  {order.deliveryFee > 0 && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-1 rounded font-bold shrink-0">
                      Delivery
                    </span>
                  )}
                </div>

                {/* Derecha: Estado + Total + Tiempo + Editar */}
                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto">
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full border whitespace-nowrap ${
                      statusConf.badgeClass || 'bg-zinc-800 text-zinc-300 border-zinc-700'
                    }`}
                  >
                    {statusConf.label || order.status}
                  </span>

                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap hidden sm:inline ${
                      payConf.badgeClass || 'text-zinc-400 bg-zinc-800'
                    }`}
                  >
                    {payConf.label || effectivePaymentStatus}
                  </span>

                  <span className="font-black text-xs sm:text-sm text-white shrink-0 min-w-[65px] text-right">
                    {formatCurrency(order.total)}
                  </span>

                  <span className="text-[10px] text-zinc-500 hidden sm:inline whitespace-nowrap min-w-[70px] text-right">
                    {formatElapsedTime(order.createdAt)}
                  </span>

                  {((order.status !== 'ENTREGADO' && order.status !== 'CANCELADO') ||
                    ((order.modality === 'MESA' || Boolean(order.tableId)) && order.paymentStatus !== 'PAID' && order.status !== 'CANCELADO')) &&
                    onEditOrderInSales && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditOrderInSales(order);
                        }}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer active:scale-95 border border-zinc-700"
                        title="Editar comanda"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA DE CUADRÍCULA COMPACTA Y MODERNA (2 a 3 columnas) */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
          {filteredOrders.map((order) => {
            const statusConf = ORDER_STATUS[order.status] || {};
            const isTable = order.modality === 'MESA' || Boolean(order.tableId);
            const effectivePaymentStatus = isTable ? (order.paymentStatus || 'PENDING') : 'PAID';
            const payConf = PAYMENT_STATUS[effectivePaymentStatus] || {};
            const isFinished = order.status === 'ENTREGADO' || order.status === 'CANCELADO';

            return (
              <div
                key={order.orderNumber}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedOrder(order)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedOrder(order);
                  }
                }}
                className={`
                  group bg-[#121216] hover:bg-[#16161c] border rounded-2xl p-3 sm:p-3.5 transition-colors duration-200 cursor-pointer flex flex-col justify-between gap-2 active:scale-[0.99] shadow-sm
                  ${
                    !isFinished
                      ? 'border-[var(--color-porkos-border)] hover:border-zinc-700'
                      : 'border-[var(--color-porkos-border)]/80 hover:border-zinc-700'
                  }
                `}
                title="Toca para ver el detalle y seguimiento del pedido"
              >
                {/* Cabecera del pedido */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        order.status === 'ENTREGADO'
                          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                          : order.status === 'LISTO'
                          ? 'bg-amber-950/40 border-amber-500/30 text-amber-400'
                          : 'bg-orange-950/40 border-orange-500/30 text-[var(--color-porkos-orange)]'
                      }`}
                    >
                      {getModalityIcon(order.modality)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-black text-sm text-white transition-colors">
                          {order.orderNumber}
                        </h4>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {order.tableName || (order.modality === 'PARA_LLEVAR' ? 'Para Llevar' : order.modality === 'CONSUMO_EXTERNO' ? 'Ir Comiendo' : order.modality === 'DELIVERY' ? 'Delivery' : 'Market Directo')}
                        </span>
                      </div>

                      {/* Cliente inline con edición rápida */}
                      <div className="flex items-center gap-1 text-[11px] text-zinc-400 mt-0.5 min-w-0">
                        {editingCustomerNameOrder === order.orderNumber ? (
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              autoFocus
                              value={tempCustomerName}
                              onChange={(e) => setTempCustomerName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveCustomerName(order);
                                if (e.key === 'Escape') setEditingCustomerNameOrder(null);
                              }}
                              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-[var(--color-porkos-orange)] font-bold w-28"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveCustomerName(order)}
                              className="p-1 rounded bg-[var(--color-porkos-orange)] text-zinc-950 cursor-pointer font-bold"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCustomerNameOrder(null)}
                              className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCustomerNameOrder(order.orderNumber);
                              setTempCustomerName(order.customerName || order.customer?.name || '');
                            }}
                            className="group/cust inline-flex items-center gap-1 cursor-pointer text-amber-300 hover:text-amber-200 font-bold truncate max-w-[140px]"
                            title="Clic para editar el nombre del cliente"
                          >
                            <User className="w-2.5 h-2.5 text-zinc-500 group-hover/cust:text-amber-300 shrink-0" />
                            <span className="truncate">{order.customerName || order.customer?.name || 'Cliente'}</span>
                            <Edit3 className="w-2.5 h-2.5 text-zinc-500 group-hover/cust:text-amber-300 shrink-0" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Derecha: Total y Badges */}
                  <div className="text-right shrink-0">
                    <div className="font-black text-sm sm:text-base text-white">
                      {formatCurrency(order.total)}
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded-full border whitespace-nowrap ${
                          statusConf.badgeClass || 'bg-zinc-800 text-zinc-300 border-zinc-700'
                        }`}
                      >
                        {statusConf.label || order.status}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap ${
                          payConf.badgeClass || 'text-zinc-400 bg-zinc-800'
                        }`}
                      >
                        {payConf.label || effectivePaymentStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Chips de Productos (resumen compacto) */}
                <div className="bg-[#0C0C0F] rounded-xl p-2 border border-zinc-900 flex flex-wrap items-center gap-1">
                  {order.items && order.items.length > 0 ? (
                    <>
                      {order.items.slice(0, 3).map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 bg-zinc-900 border border-zinc-800 text-zinc-200 px-1.5 py-0.5 rounded-md text-[11px]"
                        >
                          <ProductThumbnail
                            src={item.image}
                            thumbnailUrl={getItemThumbnail(item)}
                            name={item.name}
                            isBeverage={isProductBeverage(item)}
                            isDessert={isProductDessert(item)}
                            className="w-5 h-5 rounded shrink-0"
                            iconSize="w-3 h-3"
                          />
                          <span className="font-black text-[var(--color-porkos-orange)]">
                            {item.quantity}×
                          </span>
                          <span className="font-semibold text-zinc-300 truncate max-w-[100px] sm:max-w-[130px]">
                            {item.name}
                          </span>
                          <ItemConsumptionBadge item={item} orderModality={order.modality} />
                        </span>
                      ))}
                      {order.items.length > 3 && (
                        <span className="inline-flex items-center text-[10px] font-bold text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded-md border border-zinc-700">
                          +{order.items.length - 3} más
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-zinc-500 italic">Sin productos</span>
                  )}

                  {order.deliveryFee > 0 && (
                    <span className="inline-flex items-center gap-1 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded-md text-[10px] font-bold ml-auto">
                      <Bike className="w-3 h-3 text-emerald-400" />
                      +{formatCurrency(order.deliveryFee)}
                    </span>
                  )}
                </div>

                {/* Barra inferior */}
                <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-[var(--color-porkos-border)]/60 text-[10px]">
                  <div className="flex items-center gap-1.5 text-zinc-500 min-w-0">
                    <span className="inline-flex items-center gap-1 text-zinc-400">
                      <Clock className="w-2.5 h-2.5 text-zinc-500" />
                      {formatElapsedTime(order.createdAt)}
                    </span>
                    {order.generalNotes && (
                      <span className="truncate italic text-amber-300 max-w-[120px] sm:max-w-[160px]" title={order.generalNotes}>
                        • &ldquo;
                        {order.generalNotes.includes('histórico') || order.generalNotes.includes('administrador')
                          ? 'Registro manual'
                          : order.generalNotes}
                        &rdquo;
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    {/* Botón Editar Comanda */}
                    {((order.status !== 'ENTREGADO' && order.status !== 'CANCELADO') ||
                      ((order.modality === 'MESA' || Boolean(order.tableId)) && order.paymentStatus !== 'PAID' && order.status !== 'CANCELADO')) &&
                      onEditOrderInSales && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditOrderInSales(order);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-bold transition-colors cursor-pointer active:scale-95 border border-zinc-700/80 hover:border-zinc-600"
                          title="Editar comanda"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalle de Orden */}
      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={`Detalle de Comanda: ${selectedOrder?.orderNumber}`}
        subtitle={`Modalidad: ${selectedOrder?.tableName || (selectedOrder?.modality === 'CONSUMO_EXTERNO' ? 'Ir Comiendo' : selectedOrder?.modality)}`}
        maxWidth="max-w-xl"
      >
        {selectedOrder && (
          <div className="space-y-4 text-xs">
            {/* Timeline */}
            <div className="bg-[#0C0C0F] p-3.5 rounded-2xl border border-[var(--color-porkos-border)] space-y-2.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 block">
                Progreso del Pedido
              </span>

              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {[
                  { id: 'PENDIENTE', label: '1. Recibido', icon: Clock },
                  { id: 'PREPARANDO', label: '2. Cocina', icon: Flame },
                  { id: 'LISTO', label: '3. Listo', icon: ChefHat },
                  { id: 'ENTREGADO', label: '4. Entregado', icon: CheckCircle2 },
                ].map((step, idx) => {
                  const currentIdx = getStepStatusIndex(selectedOrder.status);
                  const isDone = idx < currentIdx;
                  const isCurrent = idx === currentIdx;
                  const StepIcon = step.icon;

                  return (
                    <div
                      key={step.id}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center gap-1 transition-all ${
                        isCurrent
                          ? 'bg-[var(--color-porkos-orange)] text-zinc-950 border-[var(--color-porkos-orange)] font-black shadow-md'
                          : isDone
                          ? 'bg-zinc-800 text-emerald-400 border-emerald-500/30 font-bold'
                          : 'bg-zinc-900/60 text-zinc-600 border-zinc-800'
                      }`}
                    >
                      <StepIcon className="w-3.5 h-3.5" />
                      <span className="text-[10px] leading-tight font-bold">{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Datos del Cliente y Registro */}
            <div className="bg-[#0C0C0F] p-3 rounded-2xl border border-[var(--color-porkos-border)] flex items-center justify-between text-xs">
              <div className="flex-1 pr-3">
                <span className="text-zinc-500 text-[10px] font-bold block uppercase tracking-wider">Cliente:</span>
                <span className="font-extrabold text-white text-sm">
                  {selectedOrder.customerName || selectedOrder.customer?.name || 'Cliente en Salón'}
                </span>
                {selectedOrder.customer?.phone && (
                  <p className="text-[11px] text-zinc-400">Tel: {selectedOrder.customer.phone}</p>
                )}
                {selectedOrder.customer?.address && (
                  <p className="text-[11px] text-zinc-400 truncate">
                    Dir: {selectedOrder.customer.address}
                  </p>
                )}
              </div>

              <div className="text-right">
                <span className="text-zinc-500 text-[10px] font-bold block uppercase tracking-wider">Registrado:</span>
                <span className="font-bold text-zinc-200">
                  {formatTime(selectedOrder.createdAt)}
                </span>
                <span className="text-[10px] text-zinc-500 block">
                  {formatElapsedTime(selectedOrder.createdAt)}
                </span>
              </div>
            </div>

            {/* Ingresado por */}
            <div className="bg-[#0C0C0F] px-3.5 py-2.5 rounded-xl border border-[var(--color-porkos-border)] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-zinc-400">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px]">
                  Operador:{' '}
                  <strong className="text-zinc-200 font-bold">
                    {selectedOrder.createdBy?.name || selectedOrder.createdBy?.email?.split('@')[0] || 'Caja'}
                  </strong>
                </span>
              </div>
              {selectedOrder.createdBy?.email && (
                <span className="text-[10px] text-zinc-500 font-mono">
                  {selectedOrder.createdBy.email}
                </span>
              )}
            </div>

            {/* Productos */}
            <div className="bg-[#0C0C0F] p-3 sm:p-4 rounded-2xl space-y-2.5 border border-[var(--color-porkos-border)]">
              <div className="flex items-center justify-between">
                <h5 className="font-black text-white uppercase tracking-wider text-[11px]">
                  Platos y Artículos ({selectedOrder.items?.length || 0})
                </h5>
                <span className="text-[11px] font-bold text-zinc-400">
                  {selectedOrder.items?.reduce((acc, i) => acc + (i.quantity || 1), 0)} unidades
                </span>
              </div>
              <div className="space-y-2.5 max-h-72 sm:max-h-80 overflow-y-auto pr-0.5 scrollbar-none">
                {selectedOrder.items?.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 sm:p-3 rounded-xl bg-[#141418] border border-zinc-800 flex items-start gap-3 text-xs"
                  >
                    <ProductThumbnail
                      src={item.image}
                      thumbnailUrl={getItemThumbnail(item)}
                      name={item.name}
                      isBeverage={isProductBeverage(item)}
                      isDessert={isProductDessert(item)}
                      priority={true}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl shrink-0"
                      iconSize="w-6 h-6"
                    />

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <span className="bg-zinc-800 text-white border border-zinc-700 px-1.5 py-0.5 rounded font-black text-xs shrink-0">
                            {item.quantity}×
                          </span>
                          <span className="font-black text-white text-xs sm:text-sm truncate">
                            {item.name}
                          </span>
                          <ItemConsumptionBadge item={item} orderModality={selectedOrder.modality} />
                        </div>
                        <span className="font-black text-white text-xs sm:text-sm shrink-0 ml-2">
                          {formatCurrency(item.subtotal)}
                        </span>
                      </div>

                      {item.customization?.saladSummary && (
                        <p className="text-[10px] text-emerald-400 font-semibold">
                          • {item.customization.saladSummary}
                        </p>
                      )}

                      {item.customization?.selectedModifiers?.map((m) => (
                        <p key={m.groupId} className="text-[10px] text-zinc-400">
                          • {m.optionName}
                        </p>
                      ))}

                      {(() => {
                        const catalogProd = products.find((p) => p.id === (item.productId || item.id)) || item;
                        const supportsCreams = doesProductSupportCreams(catalogProd, categories);
                        if (!supportsCreams) return null;

                        const creamsText = item.customization?.creamsSummary?.trim();
                        if (!creamsText) return null;

                        return (
                          <p className="text-[11px] text-[var(--color-porkos-orange)] font-bold">
                            Cremas: {creamsText}
                          </p>
                        );
                      })()}

                      {item.customization?.selectedExtras?.map((e, eIdx) => {
                        const clean = (e?.name || e?.label || (typeof e === 'string' ? e : '') || 'Extra').replace(/^Extra\s+/i, '');
                        const qty = e?.quantity || 1;
                        const totalExtraPrice = (e?.unitPrice || e?.price || 0) * qty;
                        return (
                          <div
                            key={e?.id || `ord_extra_${eIdx}`}
                            className="flex items-center justify-between text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20"
                          >
                            <span className="flex items-center gap-1.5 min-w-0 truncate">
                              <span className="bg-amber-400 text-zinc-950 px-1.5 py-0.2 rounded text-[10px] font-black shrink-0">
                                {qty}x
                              </span>
                              <span className="truncate">{clean}</span>
                            </span>
                            {totalExtraPrice > 0 && (
                              <span className="text-[10px] text-amber-200/90 font-black shrink-0 ml-2">
                                +{formatCurrency(totalExtraPrice)}
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {item.customization?.packaging && item.customization.packaging.price > 0 && (
                        <p className="text-[10px] text-blue-300 font-medium">
                          📦 {item.customization.packaging.name || 'Empaque'}
                        </p>
                      )}

                      {item.customization?.temperature && (
                        <p className="text-[10px] text-cyan-300 font-bold">
                          {item.customization.temperature === 'HELADA' ? '❄️ Helada' : '🌡️ Sin Helar'}
                        </p>
                      )}

                      {item.customization?.itemNotes && (
                        <p className="text-[10px] text-amber-300 italic">
                          &ldquo;{item.customization.itemNotes}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totales */}
            <div className="space-y-1.5 pt-2 border-t border-[var(--color-porkos-border)] font-semibold text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedOrder.subtotal)}</span>
              </div>
              {selectedOrder.packagingsTotal > 0 && (
                <div className="flex justify-between text-zinc-400">
                  <span>Empaques / Tápers:</span>
                  <span>{formatCurrency(selectedOrder.packagingsTotal)}</span>
                </div>
              )}
              {selectedOrder.deliveryFee > 0 && (
                <div className="flex justify-between text-zinc-400">
                  <span>Costo Delivery:</span>
                  <span>{formatCurrency(selectedOrder.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-black text-base pt-1.5 border-t border-zinc-800">
                <span>Total:</span>
                <span className="text-[var(--color-porkos-orange)]">
                  {formatCurrency(selectedOrder.total)}
                </span>
              </div>
            </div>

            {/* Acciones */}
            <div className="pt-2 border-t border-[var(--color-porkos-border)] flex items-center justify-between gap-2">
              {((selectedOrder.status !== 'ENTREGADO' && selectedOrder.status !== 'CANCELADO') ||
                ((selectedOrder.modality === 'MESA' || Boolean(selectedOrder.tableId)) && selectedOrder.paymentStatus !== 'PAID' && selectedOrder.status !== 'CANCELADO')) ? (
                onEditOrderInSales && (
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={() => {
                      const orderToEdit = selectedOrder;
                      setSelectedOrder(null);
                      onEditOrderInSales(orderToEdit);
                    }}
                    icon={Edit3}
                    className="ml-auto"
                  >
                    Editar en Ventas
                  </Button>
                )
              ) : (
                <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-semibold ml-auto py-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Comanda Finalizada</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Registrar Pedido Manual / Pasado (Solo Admin) */}
      {isAdmin && (
        <Modal
          isOpen={isManualModalOpen}
          onClose={() => !isSavingManual && setIsManualModalOpen(false)}
          title="Registrar Pedido / Venta Pasada"
          subtitle="Ingresa ventas históricas con productos y fecha exacta para mantener tu registro y comandas coherentes"
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleCreateManualOrder} className="space-y-4 text-xs sm:text-sm">
            {/* Fecha y Modalidad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Fecha y Hora de la Venta *</label>
                <input
                  type="datetime-local"
                  required
                  value={manualDateTime}
                  onChange={(e) => setManualDateTime(e.target.value)}
                  onClick={(e) => e.target.showPicker?.()}
                  style={{ colorScheme: 'dark' }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)] cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">Modalidad *</label>
                <select
                  value={manualModality}
                  onChange={(e) => handleModalityChange(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)] cursor-pointer"
                >
                  <option value="MESA">Mesa (Salón)</option>
                  <option value="PARA_LLEVAR">Para Llevar (con táper)</option>
                  <option value="CONSUMO_EXTERNO">Ir Comiendo</option>
                  <option value="DELIVERY">Delivery (con táper + envío)</option>
                  <option value="MARKET">Market</option>
                </select>
              </div>
            </div>

            {/* Mesa y/o Nombre del Cliente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {manualModality === 'MESA' && (
                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Mesa *</label>
                  <select
                    required
                    value={manualTableId}
                    onChange={(e) => setManualTableId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)] cursor-pointer"
                  >
                    <option value="">Selecciona mesa...</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={manualModality !== 'MESA' ? 'sm:col-span-2' : ''}>
                <label className="block text-zinc-300 font-bold mb-1">Nombre del Cliente</label>
                <input
                  type="text"
                  value={manualCustomerName}
                  onChange={(e) => setManualCustomerName(e.target.value)}
                  onFocus={handleInputFocusScroll}
                  placeholder={manualModality === 'DELIVERY' ? 'Nombre para entrega (opcional)' : 'Nombre del cliente (opcional)'}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)]"
                />
              </div>
            </div>

            {/* SECCIÓN: PRODUCTOS DE LA COMANDA */}
            <div className="bg-[#0C0C0F] p-3.5 sm:p-4 rounded-2xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="font-black text-white text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5">
                    <Utensils className="w-4 h-4 text-[var(--color-porkos-orange)]" />
                    Productos de la Comanda *
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Añade los platos o bebidas que conformaron este pedido.
                  </p>
                </div>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {manualItems.reduce((acc, it) => acc + it.quantity, 0)} {manualItems.reduce((acc, it) => acc + it.quantity, 0) === 1 ? 'ítem' : 'ítems'}
                </span>
              </div>

              {/* Selector Visual de Producto con Miniaturas */}
              <div className="bg-[#121216] p-3 sm:p-3.5 rounded-2xl border border-[var(--color-porkos-border)] space-y-3">
                {/* 1. Buscador y Categorías */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      onFocus={handleInputFocusScroll}
                      placeholder="Buscar plato o bebida en carta..."
                      className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-[var(--color-porkos-orange)] rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder-zinc-500 font-medium focus:outline-none transition-colors"
                    />
                    {productSearch && (
                      <button
                        type="button"
                        onClick={() => setProductSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 rounded cursor-pointer"
                        title="Limpiar búsqueda"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Pills de Categorías */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setCatalogCategoryFilter('ALL');
                        if (selectedProductId === 'CUSTOM') setSelectedProductId('');
                      }}
                      className={`
                        px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer border active:scale-95
                        ${
                          catalogCategoryFilter === 'ALL' && selectedProductId !== 'CUSTOM'
                            ? 'bg-[var(--color-porkos-orange)] text-zinc-950 border-[var(--color-porkos-orange)] font-black shadow-xs'
                            : 'bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white'
                        }
                      `}
                    >
                      Todas ({products.length})
                    </button>

                    {categories.map((cat) => {
                      const count = products.filter(
                        (p) => p.categoryId === cat.id || p.line === cat.line
                      ).length;
                      if (count === 0) return null;
                      const isCatActive = catalogCategoryFilter === cat.id && selectedProductId !== 'CUSTOM';
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setCatalogCategoryFilter(cat.id);
                            if (selectedProductId === 'CUSTOM') setSelectedProductId('');
                          }}
                          className={`
                            px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer border active:scale-95
                            ${
                              isCatActive
                                ? 'bg-[var(--color-porkos-orange)] text-zinc-950 border-[var(--color-porkos-orange)] font-black shadow-xs'
                                : 'bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white'
                            }
                          `}
                        >
                          {cat.name} ({count})
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => {
                        setCatalogCategoryFilter('CUSTOM');
                        handleSelectProduct('CUSTOM');
                      }}
                      className={`
                        px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer border active:scale-95 flex items-center gap-1
                        ${
                          catalogCategoryFilter === 'CUSTOM' || selectedProductId === 'CUSTOM'
                            ? 'bg-[var(--color-porkos-orange)] text-zinc-950 border-[var(--color-porkos-orange)] font-black shadow-xs'
                            : 'bg-zinc-900/90 text-amber-300 border-amber-500/30 hover:border-amber-500/60'
                        }
                      `}
                    >
                      <Plus className="w-3 h-3" />
                      <span>Personalizado</span>
                    </button>
                  </div>
                </div>

                {/* 2. Catálogo visual con miniaturas */}
                {catalogCategoryFilter !== 'CUSTOM' && selectedProductId !== 'CUSTOM' && (
                  <div className="bg-zinc-950/80 p-2 sm:p-2.5 rounded-xl border border-zinc-800/80">
                    {filteredCatalogProducts.length === 0 ? (
                      <div className="py-6 text-center text-zinc-500 text-xs space-y-2">
                        <p>No se encontraron productos en la carta con ese nombre.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setProductSearch('');
                            setCatalogCategoryFilter('ALL');
                          }}
                          className="text-xs text-[var(--color-porkos-orange)] hover:underline font-bold cursor-pointer"
                        >
                          Mostrar todos los productos
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1 scrollbar-none">
                        {filteredCatalogProducts.map((p) => {
                          const isSelected = selectedProductId === p.id;
                          return (
                            <div
                              key={p.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleSelectProduct(p.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleSelectProduct(p.id);
                                }
                              }}
                              className={`
                                p-2 sm:p-2.5 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all active:scale-[0.98] select-none text-left
                                ${
                                  isSelected
                                    ? 'bg-orange-950/30 border-[var(--color-porkos-orange)] ring-1 ring-[var(--color-porkos-orange)]/60 shadow-sm'
                                    : 'bg-[#141418] border-zinc-800/80 hover:border-zinc-700 hover:bg-[#18181f]'
                                }
                              `}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <ProductThumbnail
                                  src={p.image}
                                  thumbnailUrl={p.thumbnailUrl || p.image}
                                  name={p.name}
                                  isBeverage={isProductBeverage(p)}
                                  isDessert={isProductDessert(p)}
                                  className="w-11 h-11 rounded-lg object-cover shrink-0 border border-zinc-800/80"
                                  iconSize="w-4 h-4"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-white text-xs sm:text-[13px] leading-tight line-clamp-2 break-words" title={p.name}>
                                    {p.name}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="font-black text-[var(--color-porkos-orange)] text-xs">
                                      {formatCurrency(p.price || 0)}
                                    </span>
                                    {!p.active && (
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 font-semibold">
                                        Pausado
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Botón rápido +1 */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickAddProduct(p);
                                }}
                                className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-[var(--color-porkos-orange)] text-zinc-300 hover:text-zinc-950 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                title={`Añadir 1x ${p.name}`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Si seleccionó CUSTOM, tarjeta para definir producto libre */}
                {(selectedProductId === 'CUSTOM' || catalogCategoryFilter === 'CUSTOM') && (
                  <div className="bg-[#141418] border border-dashed border-amber-500/40 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                      <Package className="w-4 h-4 text-amber-400" />
                      <span>Definir Producto Fuera de Carta / Especial</span>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={customItemName}
                        onChange={(e) => setCustomItemName(e.target.value)}
                        onFocus={handleInputFocusScroll}
                        placeholder="Ej. Combo Especial de Temporada, Porción Extra..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-medium text-xs focus:outline-none focus:border-[var(--color-porkos-orange)]"
                      />
                    </div>
                  </div>
                )}

                {/* 3. Panel de Configuración y Adición del Producto Seleccionado */}
                {selectedProductId ? (
                  <div className="bg-[#0E0E12] border border-zinc-800 p-3 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {selectedProductObj ? (
                          <ProductThumbnail
                            src={selectedProductObj.image}
                            thumbnailUrl={selectedProductObj.thumbnailUrl || selectedProductObj.image}
                            name={selectedProductObj.name}
                            isBeverage={isProductBeverage(selectedProductObj)}
                            isDessert={isProductDessert(selectedProductObj)}
                            className="w-8 h-8 rounded-lg shrink-0 border border-zinc-800"
                            iconSize="w-4 h-4"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 font-bold">
                            ★
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block">
                            Seleccionado para añadir:
                          </span>
                          <span className="font-extrabold text-white text-xs sm:text-[13px] leading-snug line-clamp-2 break-words block">
                            {selectedProductObj ? selectedProductObj.name : (customItemName || 'Producto personalizado')}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block">
                          Subtotal línea:
                        </span>
                        <span className="font-black text-xs sm:text-sm text-[var(--color-porkos-orange)]">
                          {formatCurrency((itemQuantity || 1) * (parseFloat(itemPrice) || 0))}
                        </span>
                      </div>
                    </div>

                    {/* Información de Táper / Empaque incluido en caso de Para Llevar o Delivery */}
                    {(manualModality === 'PARA_LLEVAR' || manualModality === 'DELIVERY') && selectedProductObj && (
                      (() => {
                        const pkg = getPackagingForProduct(selectedProductObj, manualModality);
                        if (pkg && pkg.price > 0) {
                          return (
                            <div className="flex items-center gap-1.5 text-[11px] text-blue-300 bg-blue-950/40 border border-blue-800/50 px-2.5 py-1 rounded-lg">
                              <Package className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span>
                                Incluye táper/empaque <strong>{pkg.name || 'Táper'}</strong> (+{formatCurrency(pkg.price)}) por modalidad {manualModality === 'DELIVERY' ? 'Delivery' : 'Para Llevar'}.
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()
                    )}

                    {/* Campo de Detalles / Especificaciones para el producto seleccionado */}
                    <div>
                      <label className="block text-[11px] font-black text-zinc-300 uppercase tracking-wider mb-1">
                        NOTA
                      </label>
                      <input
                        type="text"
                        value={itemDetails}
                        onChange={(e) => setItemDetails(e.target.value)}
                        onFocus={handleInputFocusScroll}
                        placeholder="Ej. Sin cebolla, papas al hilo, término medio, cremas aparte..."
                        className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-[var(--color-porkos-orange)] rounded-xl px-3 py-2 text-white font-medium text-xs focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Fila con Cantidad, Precio Unitario Manual y Botón Agregar */}
                    <div className="flex flex-wrap sm:flex-nowrap items-end gap-2.5 pt-1 border-t border-zinc-800/60">
                      <div className="w-28 shrink-0">
                        <label className="block text-[11px] font-bold text-zinc-400 mb-1">Cantidad</label>
                        <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() => setItemQuantity((q) => Math.max(1, q - 1))}
                            className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center font-bold text-xs cursor-pointer active:scale-95"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={itemQuantity}
                            onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="w-full bg-transparent text-center font-black text-white text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => setItemQuantity((q) => q + 1)}
                            className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center font-bold text-xs cursor-pointer active:scale-95"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="w-48 shrink-0">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider">PRECIO</label>
                          {(() => {
                            const defaultPrice = selectedProductObj
                              ? Math.round(((selectedProductObj.price || 0) + (getPackagingForProduct(selectedProductObj, manualModality)?.price || 0)) * 100) / 100
                              : null;
                            const isDifferent = isPriceCustomized && defaultPrice !== null && Math.abs((parseFloat(itemPrice) || 0) - defaultPrice) > 0.001;
                            if (isDifferent) {
                              return (
                                <span className="text-[10px] font-medium text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                                  manual
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const curr = parseFloat(itemPrice) || 0;
                              const nextVal = Math.max(0, Math.round((curr - 0.5) * 100) / 100);
                              setItemPrice(nextVal.toFixed(2));
                              setIsPriceCustomized(true);
                            }}
                            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-90 text-zinc-300 flex items-center justify-center font-bold text-xs cursor-pointer border border-zinc-700 shrink-0"
                            title="Restar S/ 0.50"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <div className="relative flex-1">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-zinc-400 text-xs pointer-events-none">S/</span>
                            <input
                              type="number"
                              step="0.50"
                              min="0"
                              value={itemPrice}
                              onChange={(e) => {
                                setItemPrice(e.target.value);
                                setIsPriceCustomized(true);
                              }}
                              onFocus={(e) => {
                                e.target.select();
                                handleInputFocusScroll(e);
                              }}
                              placeholder="0.00"
                              className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl pl-7 pr-2 py-2 text-center text-white font-bold text-xs focus:outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const curr = parseFloat(itemPrice) || 0;
                              const nextVal = Math.round((curr + 0.5) * 100) / 100;
                              setItemPrice(nextVal.toFixed(2));
                              setIsPriceCustomized(true);
                            }}
                            className="w-8 h-8 rounded-lg bg-[var(--color-porkos-orange)]/20 hover:bg-[var(--color-porkos-orange)] text-[var(--color-porkos-orange)] hover:text-zinc-950 active:scale-90 flex items-center justify-center font-bold text-xs cursor-pointer border border-orange-500/40 shrink-0"
                            title="Aumentar S/ 0.50"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 min-w-[140px]">
                        <Button
                          type="button"
                          onClick={handleAddManualItem}
                          disabled={!selectedProductId || (selectedProductId === 'CUSTOM' && !customItemName.trim())}
                          icon={Plus}
                          className="w-full py-2.5 font-black text-xs bg-[var(--color-porkos-orange)] text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-orange-500/20"
                        >
                          Añadir a comanda
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 px-3 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-[11px] text-zinc-400 flex items-center gap-2">
                    <span className="text-[var(--color-porkos-orange)] font-bold">💡 Tip:</span>
                    <span>Toca un producto arriba para ajustar cantidad, precio unitario o notas, o usa el botón <strong>+</strong> para agregarlo directo.</span>
                  </div>
                )}
              </div>

              {/* Lista de Productos Agregados */}
              <div className="space-y-1.5 pt-1">
                {manualItems.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-zinc-800 text-center text-zinc-500 text-xs">
                    No has agregado ningún producto todavía. Selecciona un producto arriba para añadirlo a la comanda.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-none">
                    {manualItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs space-y-2 hover:border-zinc-700/80 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <ProductThumbnail
                              src={item.image}
                              thumbnailUrl={item.thumbnailUrl}
                              name={item.name}
                              isBeverage={isProductBeverage(item)}
                              isDessert={isProductDessert(item)}
                              className="w-9 h-9 rounded-lg shrink-0 mt-0.5 border border-zinc-800"
                              iconSize="w-4 h-4"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-white text-xs sm:text-sm leading-snug line-clamp-2 break-words">{item.name}</div>

                              {/* Badges: Táper / Empaque */}
                              {item.packaging && item.packagingPrice > 0 && (
                                <div className="flex items-center gap-1 mt-0.5 text-[10px] text-blue-300 font-semibold">
                                  <Package className="w-3 h-3 text-blue-400 shrink-0" />
                                  <span>{item.packaging.name || 'Táper'} (+{formatCurrency(item.packagingPrice)})</span>
                                </div>
                              )}

                              {/* Edición directa de Precio Unitario */}
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                {editingItemPriceId === item.id ? (
                                  <div className="flex items-center gap-1 bg-[#18181D] border border-amber-500/80 rounded-lg px-2 py-0.5 shadow-md">
                                    <span className="text-[11px] font-bold text-amber-400">S/</span>
                                    <input
                                      type="number"
                                      step="0.10"
                                      min="0"
                                      autoFocus
                                      value={tempItemPrice}
                                      onChange={(e) => setTempItemPrice(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleUpdateManualItemPrice(item.id, tempItemPrice);
                                        if (e.key === 'Escape') setEditingItemPriceId(null);
                                      }}
                                      className="w-16 bg-transparent text-white font-black text-xs focus:outline-none"
                                      placeholder="0.00"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateManualItemPrice(item.id, tempItemPrice)}
                                      className="p-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded text-xs cursor-pointer active:scale-90"
                                      title="Guardar precio"
                                    >
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingItemPriceId(null)}
                                      className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded text-xs cursor-pointer"
                                      title="Cancelar"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingItemPriceId(item.id);
                                      setTempItemPrice(item.unitPrice !== undefined ? String(item.unitPrice) : '');
                                    }}
                                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-amber-300 bg-zinc-950/60 px-2 py-0.5 rounded-lg border border-zinc-800/80 hover:border-zinc-700 transition-colors cursor-pointer group/price"
                                    title="Toca para editar el precio unitario manualmente"
                                  >
                                    <span>Unitario: <strong className={item.isManualPrice ? 'text-amber-300 font-black' : 'text-zinc-200'}>{formatCurrency(item.unitPrice)}</strong></span>
                                    <Edit2 className="w-2.5 h-2.5 text-zinc-500 group-hover/price:text-amber-400" />
                                    {item.isManualPrice && (
                                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-black ml-0.5">
                                        Manual
                                      </span>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Selector de Cantidad */}
                            <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                              <button
                                type="button"
                                onClick={() => handleUpdateManualItemQty(item.id, item.quantity - 1)}
                                className="w-6 h-6 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center font-bold text-xs cursor-pointer active:scale-95"
                                title="Reducir cantidad"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center font-black text-white text-xs">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateManualItemQty(item.id, item.quantity + 1)}
                                className="w-6 h-6 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center font-bold text-xs cursor-pointer active:scale-95"
                                title="Aumentar cantidad"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Subtotal de Línea */}
                            <div className="font-black text-white text-xs w-16 text-right">
                              {formatCurrency(item.subtotal)}
                            </div>

                            {/* Eliminar */}
                            <button
                              type="button"
                              onClick={() => handleRemoveManualItem(item.id)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                              title="Eliminar de la comanda"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Fila de Detalles / Notas del ítem */}
                        <div className="pt-1 border-t border-zinc-800/60">
                          {editingItemDetailsId === item.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                autoFocus
                                value={tempItemDetails}
                                onChange={(e) => setTempItemDetails(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdateManualItemDetails(item.id, tempItemDetails);
                                  if (e.key === 'Escape') setEditingItemDetailsId(null);
                                }}
                                placeholder="Notas (ej. sin cebolla, papas al hilo)..."
                                className="flex-1 bg-zinc-950 border border-amber-500/80 rounded-lg px-2.5 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateManualItemDetails(item.id, tempItemDetails)}
                                className="p-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-xs font-black cursor-pointer active:scale-90"
                                title="Guardar detalle"
                              >
                                <Check className="w-3 h-3 stroke-[3]" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingItemDetailsId(null)}
                                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg text-xs cursor-pointer"
                                title="Cancelar"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : item.details ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg italic truncate block flex-1">
                                💬 &ldquo;{item.details}&rdquo;
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemDetailsId(item.id);
                                  setTempItemDetails(item.details || '');
                                }}
                                className="text-[10px] text-zinc-400 hover:text-amber-300 font-bold underline cursor-pointer shrink-0"
                              >
                                Editar nota
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItemDetailsId(item.id);
                                setTempItemDetails('');
                              }}
                              className="text-[10px] text-zinc-500 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Agregar nota/detalle para este producto</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totales Calculados con Desglose de Táper / Empaques */}
              <div className="p-3.5 rounded-xl bg-black/60 border border-zinc-800 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal Productos ({manualItems.reduce((acc, it) => acc + it.quantity, 0)} ítems):</span>
                  <span className="font-bold text-zinc-200">
                    {formatCurrency(Math.max(0, manualItemsSubtotal - manualPackagingsTotal))}
                  </span>
                </div>

                {/* Línea explícita de Tápers / Empaques */}
                {manualPackagingsTotal > 0 && (
                  <div className="flex items-center justify-between text-blue-300 bg-blue-950/30 px-2 py-1 rounded-lg border border-blue-900/40">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Package className="w-3.5 h-3.5 text-blue-400" />
                      <span>Empaques / Tápers ({manualItems.reduce((acc, it) => acc + (it.packagingPrice > 0 ? it.quantity : 0), 0)} u.):</span>
                    </span>
                    <span className="font-black">+{formatCurrency(manualPackagingsTotal)}</span>
                  </div>
                )}

                {manualModality === 'DELIVERY' && (
                  <div className="flex items-center justify-between text-zinc-300">
                    <span className="flex items-center gap-1 font-semibold">
                      <Bike className="w-3.5 h-3.5 text-emerald-400" />
                      Costo de Delivery:
                    </span>
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-zinc-400 text-[11px]">S/</span>
                      <input
                        type="number"
                        min="0"
                        step="0.50"
                        value={manualDeliveryFee}
                        onChange={(e) => setManualDeliveryFee(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-7 pr-2 py-1 text-right text-white font-bold text-xs focus:outline-none focus:border-[var(--color-porkos-orange)]"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center text-white font-black text-sm pt-2 border-t border-zinc-800">
                  <span>Total de la Comanda:</span>
                  <span className="text-[var(--color-porkos-orange)] text-base font-black">
                    {formatCurrency(manualTotalCalculated)}
                  </span>
                </div>
              </div>
            </div>

            {/* Método de Pago y Observaciones */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Método de Pago *</label>
                <select
                  value={manualPaymentMethod}
                  onChange={(e) => setManualPaymentMethod(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)] cursor-pointer"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="YAPE">Yape</option>
                  <option value="PLIN">Plin</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">Observaciones / Notas</label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  onFocus={handleInputFocusScroll}
                  placeholder="Ej. Registro pasado del turno tarde..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-[var(--color-porkos-orange)]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSavingManual}
                onClick={() => setIsManualModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingManual || manualItems.length === 0}
                isLoading={isSavingManual}
                className="font-black bg-[var(--color-porkos-orange)] text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Registrar Pedido ({formatCurrency(manualTotalCalculated)})
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
