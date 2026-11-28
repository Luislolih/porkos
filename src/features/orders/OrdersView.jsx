import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Clock,
  Bike,
  Utensils,
  X,
  Check,
  Package,
  Edit2,
  Edit3,
  Trash2,
  User,
  Plus,
  Minus,
  Search,
  ClipboardList,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronRight,
} from 'lucide-react';
import {
  formatCurrency,
  formatShortDate,
  formatTime,
  generateOrderNumber,
} from '../../utils/formatters';
import {
  getShiftDateString,
  getPreviousShiftDateString,
  getShiftBoundsForDate,
  isTimestampInShiftRange,
  formatShiftDisplayDate,
} from '../../utils/shiftDateUtils';
import Modal from '../../components/ui/Modal';
import ItemConsumptionBadge from '../../components/ui/ItemConsumptionBadge';
import EmptyState from '../../components/ui/EmptyState';
import SearchInput from '../../components/ui/SearchInput';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import ProductThumbnail from '../../components/ui/ProductThumbnail';
import StatusIndicator from '../../components/ui/StatusIndicator';
import { handleInputFocusScroll } from '../../utils/scrollIntoViewHelper';
import { isProductBeverage, isProductDessert, resolveConfiguredPackaging } from '../../utils/productCategories';
import { useAuth } from '../../context/useAuth';
import { useCatalog } from '../../context/useCatalog';
import OrderDetailContent from './components/OrderDetailContent';
import ModalityIcon from './components/ModalityIcon';
import {
  MODALITY_FULL_LABELS,
  formatOrderNote,
  getOrderCustomerLabel,
  getOrderItemsCount,
  getOrderItemsSummary,
  getOrderKey,
  getOrderLocationLabel,
  getOrderPaymentInfo,
  getOrderTimestampMs,
  getStatusIconContainerClass,
  isOrderEditable,
} from './orderHelpers';

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mql = window.matchMedia('(min-width: 1024px)');
    const handleChange = (e) => setIsDesktop(e.matches);
    if (mql.addEventListener) {
      mql.addEventListener('change', handleChange);
      return () => mql.removeEventListener('change', handleChange);
    }
    mql.addListener(handleChange);
    return () => mql.removeListener(handleChange);
  }, []);

  return isDesktop;
}

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
  const isDesktop = useIsDesktop();

  // Índice memoizado O(1) para resolver miniaturas de catálogo sin escanear products[] por cada ítem
  const productThumbIndex = useMemo(() => {
    const byId = new Map();
    const byName = new Map();
    products.forEach((p) => {
      const thumb = p?.thumbnailUrl || p?.image || null;
      if (!thumb) return;
      if (p.id) byId.set(p.id, thumb);
      if (p.name) byName.set(p.name.trim().toLowerCase(), thumb);
    });
    return { byId, byName };
  }, [products]);

  const getItemThumbnail = useCallback(
    (item) => {
      if (item?.thumbnailUrl) return item.thumbnailUrl;
      if (item?.image) return item.image;
      if (item?.productId && productThumbIndex.byId.has(item.productId)) {
        return productThumbIndex.byId.get(item.productId);
      }
      if (item?.name) {
        const key = item.name.trim().toLowerCase();
        if (productThumbIndex.byName.has(key)) {
          return productThumbIndex.byName.get(key);
        }
      }
      return null;
    },
    [productThumbIndex]
  );

  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'HISTORY'
  const [filterModality, setFilterModality] = useState('ALL');
  const [filterShift, setFilterShift] = useState('CURRENT'); // 'CURRENT' | 'PREVIOUS' | 'CUSTOM' | 'ALL'
  const [selectedShiftDate, setSelectedShiftDate] = useState(() => getShiftDateString());
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
  const [selectedOrderKey, setSelectedOrderKey] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [expandedOrderIds, setExpandedOrderIds] = useState({});
  const [editingCustomerNameOrder, setEditingCustomerNameOrder] = useState(null);
  const [tempCustomerName, setTempCustomerName] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const selectedOrder = useMemo(() => {
    if (!selectedOrderKey) return null;
    return orders.find((o) => getOrderKey(o) === selectedOrderKey) || null;
  }, [orders, selectedOrderKey]);

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
    return resolveConfiguredPackaging(prod, catalogPackagings);
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
    const cleaned = String(newPrice ?? '').replace(',', '.').trim();
    if (cleaned === '') {
      setEditingItemPriceId(null);
      return;
    }
    const parsedNum = parseFloat(cleaned);
    if (isNaN(parsedNum) || parsedNum < 0) {
      setEditingItemPriceId(null);
      return;
    }
    const rounded = Math.round(parsedNum * 100) / 100;
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
          id: item.productId || null,
          productId: item.productId || null,
          cost: Number(matchingProd?.cost) || 0,
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
        subtotal: Math.round(Math.max(0, manualItemsSubtotal - manualPackagingsTotal) * 100) / 100,
        total: manualTotalCalculated,
        status: 'ENTREGADO',
        paymentStatus: 'PAID',
        payments: [
          {
            method: manualPaymentMethod,
            amount: manualTotalCalculated,
            paidAt: orderDate,
          },
        ],
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

  const handleSaveCustomerName = useCallback(
    (order, explicitName = null) => {
      if (!order) return;
      const rawName = explicitName !== null ? explicitName : tempCustomerName;
      const newName = String(rawName || '').trim();
      const updated = {
        ...order,
        customerName: newName || null,
        customer: order.customer
          ? { ...order.customer, name: newName }
          : newName
          ? { name: newName }
          : null,
      };
      if (onUpdateOrder) {
        onUpdateOrder(updated);
      }
      setEditingCustomerNameOrder(null);
    },
    [onUpdateOrder, tempCustomerName]
  );

  // Cerrar el panel lateral con Escape en desktop
  useEffect(() => {
    if (!isDesktop || !selectedOrderKey || isManualModalOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedOrderKey(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDesktop, selectedOrderKey, isManualModalOpen]);

  // Helper de límites del turno operativo seleccionado (de 4:00 AM a 3:59:59 AM del día siguiente)
  const shiftBounds = useMemo(() => {
    if (filterShift === 'ALL') return null;
    const currentShiftStr = getShiftDateString();
    if (filterShift === 'CURRENT') {
      return {
        bounds: getShiftBoundsForDate(currentShiftStr),
        label: `Turno Hoy (${formatShiftDisplayDate(currentShiftStr)})`,
        dateStr: currentShiftStr,
      };
    }
    if (filterShift === 'PREVIOUS') {
      const prevShiftStr = getPreviousShiftDateString(currentShiftStr);
      return {
        bounds: getShiftBoundsForDate(prevShiftStr),
        label: `Turno Ayer (${formatShiftDisplayDate(prevShiftStr)})`,
        dateStr: prevShiftStr,
      };
    }
    if (filterShift === 'CUSTOM') {
      return {
        bounds: getShiftBoundsForDate(selectedShiftDate),
        label: `Turno ${formatShiftDisplayDate(selectedShiftDate)}`,
        dateStr: selectedShiftDate,
      };
    }
    return null;
  }, [filterShift, selectedShiftDate]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const list = orders.filter((o) => {
      const isActive = o.status === 'PENDIENTE' || o.status === 'PREPARANDO' || o.status === 'LISTO';
      const isHistory = o.status === 'ENTREGADO' || o.status === 'CANCELADO';

      if (activeTab === 'ACTIVE' && !isActive) return false;
      if (activeTab === 'HISTORY' && !isHistory) return false;

      // Filtro de Turno Operativo (4:00 AM a 3:59 AM)
      // En 'ACTIVE' o 'ALL' con orden en curso, no descartar para garantizar que ninguna orden activa se pierda
      if (shiftBounds?.bounds) {
        if ((activeTab === 'ACTIVE' || activeTab === 'ALL') && isActive) {
          // Mantener visible en activa o todas
        } else {
          const inShift = isTimestampInShiftRange(o.createdAt, shiftBounds.bounds.start, shiftBounds.bounds.end);
          if (!inShift) return false;
        }
      }

      if (filterModality !== 'ALL') {
        if (filterModality === 'MESA' && o.modality !== 'MESA') return false;
        if (filterModality === 'DELIVERY' && o.modality !== 'DELIVERY') return false;
        if (filterModality === 'PARA_LLEVAR' && o.modality !== 'PARA_LLEVAR' && o.modality !== 'CONSUMO_EXTERNO') return false;
        if (filterModality === 'MARKET' && o.modality !== 'MARKET') return false;
      }

      if (query) {
        const matchesNum = o.orderNumber?.toLowerCase().includes(query);
        const matchesClient = o.customerName?.toLowerCase().includes(query) || o.customer?.name?.toLowerCase().includes(query);
        const matchesPhone = o.customer?.phone?.includes(query);
        const matchesTable = o.tableName?.toLowerCase().includes(query);
        return matchesNum || matchesClient || matchesPhone || matchesTable;
      }

      return true;
    });

    // Ordenado estrictamente del último pedido al primero
    return list.sort((a, b) => {
      const timeA = getOrderTimestampMs(a);
      const timeB = getOrderTimestampMs(b);
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      return (b.orderNumber || '').localeCompare(a.orderNumber || '', undefined, { numeric: true });
    });
  }, [orders, activeTab, shiftBounds, filterModality, searchQuery]);

  // Cálculo unificado en una sola pasada para contadores de pestañas y totales del turno
  const { activeCount, historyCount, allCount, shiftTotals } = useMemo(() => {
    let active = 0;
    let history = 0;
    let all = 0;
    let sales = 0;
    let validCount = 0;
    let cancelledCount = 0;
    let totalOrders = 0;

    orders.forEach((o) => {
      const isActive = o.status === 'PENDIENTE' || o.status === 'PREPARANDO' || o.status === 'LISTO';
      const isHistory = o.status === 'ENTREGADO' || o.status === 'CANCELADO';
      const inShift = !shiftBounds?.bounds
        ? true
        : isTimestampInShiftRange(o.createdAt, shiftBounds.bounds.start, shiftBounds.bounds.end);

      if (isActive) active++;
      if (isHistory && inShift) history++;
      if (isActive || inShift) all++;

      const matchesModality =
        filterModality === 'ALL' ||
        (filterModality === 'MESA' && o.modality === 'MESA') ||
        (filterModality === 'DELIVERY' && o.modality === 'DELIVERY') ||
        (filterModality === 'PARA_LLEVAR' && (o.modality === 'PARA_LLEVAR' || o.modality === 'CONSUMO_EXTERNO')) ||
        (filterModality === 'MARKET' && o.modality === 'MARKET');

      if (matchesModality && inShift) {
        totalOrders++;
        const totalNum = Math.round((Number(o.total) || 0) * 100) / 100;
        if (o.status === 'CANCELADO') {
          cancelledCount++;
        } else {
          validCount++;
          sales = Math.round((sales + totalNum) * 100) / 100;
        }
      }
    });

    return {
      activeCount: active,
      historyCount: history,
      allCount: all,
      shiftTotals: { sales, validCount, cancelledCount, totalOrders },
    };
  }, [orders, shiftBounds, filterModality]);

  const selectedOrderIndex = useMemo(() => {
    if (!selectedOrder) return -1;
    const targetKey = getOrderKey(selectedOrder);
    return filteredOrders.findIndex((o) => getOrderKey(o) === targetKey);
  }, [filteredOrders, selectedOrder]);

  const desktopGridColsClass = selectedOrder
    ? 'grid-cols-[minmax(0,1.3fr)_110px_132px_108px] xl:grid-cols-[165px_112px_minmax(0,1fr)_148px_118px] gap-2.5 xl:gap-3'
    : 'grid-cols-[145px_118px_135px_minmax(0,1fr)_165px_124px] xl:grid-cols-[175px_126px_165px_minmax(0,1fr)_190px_142px] gap-3';

  const handleSelectOrderRow = (order) => {
    const key = getOrderKey(order);
    if (!key) return;
    if (isDesktop) {
      setSelectedOrderKey((prev) => (prev === key ? null : key));
    } else {
      setSelectedOrderKey(key);
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSelectedOrderKey(null);
  };

  const handleModalityFilterChange = (modId) => {
    setFilterModality(modId);
    setSelectedOrderKey(null);
  };

  const handleShiftFilterChange = (shiftId) => {
    setFilterShift(shiftId);
    setSelectedOrderKey(null);
  };

  return (
    <div
      className={
        isDesktop
          ? 'h-[calc(100vh-7rem)] min-h-[480px] flex flex-col gap-3.5 overflow-hidden'
          : 'space-y-4 pb-20'
      }
    >
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Barra de Filtros, Búsqueda y Resumen del Turno */}
      <div className="bg-[#121215] p-2.5 sm:p-3.5 rounded-2xl border border-[var(--color-porkos-border)] space-y-2.5 shadow-sm shrink-0">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Segmented Control / Tabs */}
          <div className="flex bg-[#0C0C0F] p-1 rounded-xl border border-zinc-800 shrink-0">
            {[
              { id: 'ALL', label: 'Todas', count: allCount },
              { id: 'ACTIVE', label: 'En Curso', count: activeCount },
              { id: 'HISTORY', label: 'Historial', count: historyCount },
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    flex-1 lg:flex-initial justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 touch-manipulation select-none
                    ${
                      isSelected
                        ? 'bg-[var(--color-porkos-orange)] text-zinc-950 font-black shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black tabular-nums ${
                      isSelected ? 'bg-zinc-950 text-white' : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search bar, Filtros móvil, Vista móvil y Botón Pedido Pasado */}
          <div className="flex items-center gap-2 flex-1 lg:max-w-2xl">
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

            <button
              type="button"
              onClick={() => setShowMobileFilters((v) => !v)}
              className={`sm:hidden flex items-center gap-1 px-2.5 py-2 rounded-xl border text-xs font-bold shrink-0 cursor-pointer transition-colors ${
                showMobileFilters || filterModality !== 'ALL' || filterShift !== 'CURRENT'
                  ? 'bg-zinc-800 text-white border-[var(--color-porkos-orange)]/70'
                  : 'bg-[#0C0C0F] text-zinc-300 border-zinc-800'
              }`}
              title="Mostrar u ocultar filtros de turno y modalidad"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--color-porkos-orange)]" />
              <span>Filtros</span>
              {showMobileFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Toggle de Vista solo en móvil/tablet (desktop usa vista profesional en fila + panel lateral) */}
            {!isDesktop && (
              <div className="flex items-center bg-[#0C0C0F] p-0.5 rounded-lg border border-zinc-800 shrink-0">
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
            )}

            {isAdmin && onCreateOrder && (
              <Button
                onClick={handleOpenManualOrderModal}
                icon={Plus}
                size="sm"
                className="hidden sm:inline-flex text-xs font-black shadow-md shadow-orange-500/20 whitespace-nowrap shrink-0"
              >
                Registrar Pedido Pasado
              </Button>
            )}
          </div>
        </div>

        {/* Barra resumen móvil con acceso rápido a pedido pasado sin comprimir el buscador */}
        <div className="sm:hidden flex items-center justify-between gap-2 text-[11px] bg-[#0C0C0F] px-2.5 py-1.5 rounded-xl border border-zinc-800/80">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-zinc-300 font-bold truncate">
              {shiftBounds?.label || 'Historial Completo'}
              {filterModality !== 'ALL' ? ` • ${MODALITY_FULL_LABELS[filterModality] || filterModality}` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 tabular-nums">
            <span className="text-zinc-400 font-semibold">{shiftTotals.validCount} ped.</span>
            <span className="text-emerald-400 font-black">{formatCurrency(shiftTotals.sales)}</span>
            {isAdmin && onCreateOrder && (
              <button
                type="button"
                onClick={handleOpenManualOrderModal}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--color-porkos-orange)] text-zinc-950 font-black text-[10px] cursor-pointer active:scale-95"
                title="Registrar pedido pasado"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>Pasado</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills: Modalidad + Turno (siempre visible en sm+, colapsable en móvil) */}
        <div className={`${showMobileFilters ? 'block' : 'hidden'} sm:block space-y-2`}>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--color-porkos-border)] text-xs">
            {/* Modalidad */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 sm:pb-0">
              <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider shrink-0 mr-0.5">
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
                    onClick={() => handleModalityFilterChange(m.id)}
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

            {/* Resumen del Turno */}
            <div className="hidden lg:flex items-center gap-2.5 text-xs font-semibold text-zinc-400 bg-[#0C0C0F] px-3 py-1.5 rounded-xl border border-zinc-800/80 tabular-nums">
              <span className="text-zinc-300 font-bold">
                {shiftBounds?.label || 'Historial Completo'}
              </span>
              <span className="text-zinc-700">|</span>
              <span>
                <strong className="text-white font-black">{shiftTotals.validCount}</strong>{' '}
                {shiftTotals.validCount === 1 ? 'comanda' : 'comandas'}
                {shiftTotals.cancelledCount > 0 && (
                  <span className="text-rose-400 text-[11px] ml-1.5">
                    ({shiftTotals.cancelledCount} canc.)
                  </span>
                )}
              </span>
              <span className="text-zinc-700">|</span>
              <span className="text-emerald-400 font-black">
                {formatCurrency(shiftTotals.sales)}
              </span>
            </div>
          </div>

          {/* Selector de Turno Operativo (4:00 AM a 3:59 AM) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--color-porkos-border)]/70 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider shrink-0 flex items-center gap-1 mr-0.5">
                <Clock className="w-3 h-3 text-[var(--color-porkos-orange)]" />
                Turno:
              </span>
              {[
                { id: 'CURRENT', label: 'Turno Hoy' },
                { id: 'PREVIOUS', label: 'Turno Ayer' },
                { id: 'CUSTOM', label: 'Por Fecha' },
                { id: 'ALL', label: 'Todos' },
              ].map((s) => {
                const isSelected = filterShift === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleShiftFilterChange(s.id)}
                    className={`
                      px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer border active:scale-95 touch-manipulation
                      ${
                        isSelected
                          ? 'bg-[var(--color-porkos-orange)] text-zinc-950 border-[var(--color-porkos-orange)] font-black shadow-xs'
                          : 'bg-[#141418] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white'
                      }
                    `}
                  >
                    {s.label}
                  </button>
                );
              })}

              {filterShift === 'CUSTOM' && (
                <div className="flex items-center gap-1 ml-1">
                  <input
                    type="date"
                    value={selectedShiftDate}
                    onChange={(e) => {
                      setSelectedShiftDate(e.target.value);
                      setSelectedOrderKey(null);
                    }}
                    onClick={(e) => e.target.showPicker?.()}
                    style={{ colorScheme: 'dark' }}
                    className="bg-black/70 border border-zinc-700 rounded-lg px-2 py-0.5 text-white text-xs font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)] cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Resumen del Turno en tablet (sm/md) */}
            <div className="hidden sm:flex lg:hidden items-center gap-2 text-xs font-semibold text-zinc-400 ml-auto bg-[#0C0C0F] px-2.5 py-1 rounded-lg border border-zinc-800/80 tabular-nums">
              <span className="text-zinc-300 font-bold">
                {shiftBounds?.label || 'Historial Completo'}
              </span>
              <span className="text-zinc-600">•</span>
              <span>
                {shiftTotals.validCount} {shiftTotals.validCount === 1 ? 'comanda' : 'comandas'}
                {shiftTotals.cancelledCount > 0 && (
                  <span className="text-rose-400 text-[11px] ml-1">
                    ({shiftTotals.cancelledCount} canc.)
                  </span>
                )}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-emerald-400 font-black">
                {formatCurrency(shiftTotals.sales)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List / Master-Detail */}
      {filteredOrders.length === 0 ? (
        <div className={isDesktop ? 'flex-1 min-h-0 flex items-center justify-center' : ''}>
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
        </div>
      ) : isDesktop ? (
        /* VISTA DESKTOP PROFESIONAL: PANELES INDEPENDIENTES CON SCROLL PROPIO */
        <div className="flex-1 min-h-0 grid grid-cols-12 gap-4 items-stretch">
          {/* Lista en filas con cabecera fija y scroll interno independiente */}
          <div
            className={`${
              selectedOrder ? 'col-span-7' : 'col-span-12'
            } min-w-0 h-full min-h-0 flex flex-col bg-[#121216] border border-[var(--color-porkos-border)] rounded-2xl overflow-hidden shadow-lg`}
          >
            {/* Cabecera de columnas fija */}
            <div
              className={`shrink-0 bg-[#16161C] border-b border-[var(--color-porkos-border)] px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-zinc-400 grid items-center ${desktopGridColsClass}`}
            >
              <div>Comanda</div>
              <div>Fecha / Hora ↓</div>
              {!selectedOrder && <div>Cliente</div>}
              <div className={selectedOrder ? 'hidden xl:block' : ''}>Productos</div>
              <div>Estado / Pago</div>
              <div className="text-right">Total</div>
            </div>

            {/* Filas ordenadas del último pedido al primero con scroll independiente */}
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin overscroll-contain divide-y divide-[var(--color-porkos-border)]/70">
              {filteredOrders.map((order) => {
                const orderKey = getOrderKey(order);
                const isSelected = Boolean(selectedOrder && getOrderKey(selectedOrder) === orderKey);
                const isCancelled = order.status === 'CANCELADO';
                const editable = isOrderEditable(order);
                const paymentInfo = getOrderPaymentInfo(order);
                const locationLabel = getOrderLocationLabel(order, { short: true });
                const customerLabel = getOrderCustomerLabel(order, 'Cliente');
                const itemsSummary = getOrderItemsSummary(order);
                const itemsCount = getOrderItemsCount(order);
                const noteText = formatOrderNote(order.generalNotes);

                return (
                  <div
                    key={orderKey}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectOrderRow(order)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectOrderRow(order);
                      }
                    }}
                    className={`group grid items-center py-2.5 pr-4 pl-[13px] border-l-[3px] transition-colors cursor-pointer select-none ${desktopGridColsClass} ${
                      isSelected
                        ? 'bg-orange-500/[0.09] hover:bg-orange-500/[0.12] border-l-[var(--color-porkos-orange)]'
                        : 'hover:bg-white/[0.03] border-l-transparent'
                    } ${isCancelled && !isSelected ? 'opacity-70' : ''}`}
                    title={isSelected ? 'Clic para ocultar detalle' : 'Clic para ver detalle a la derecha'}
                  >
                    {/* Col 1: Comanda + Modalidad/Mesa */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${getStatusIconContainerClass(order.status)}`}
                      >
                        <ModalityIcon modality={order.modality} className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`font-black text-xs xl:text-sm tracking-tight shrink-0 ${
                              isSelected ? 'text-[var(--color-porkos-orange)]' : 'text-white'
                            }`}
                          >
                            {order.orderNumber}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-zinc-800/90 text-zinc-300 rounded font-bold border border-zinc-700/70 truncate">
                            {locationLabel}
                          </span>
                        </div>
                        {selectedOrder && (
                          <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                            {customerLabel}
                            <span className="xl:hidden text-zinc-500"> · {itemsCount}u</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Col 2: Fecha (DD/MM) y Hora */}
                    <div className="text-xs tabular-nums whitespace-nowrap flex items-center gap-1.5">
                      <span className="font-semibold text-zinc-400">
                        {formatShortDate(order.createdAt)}
                      </span>
                      <span className="text-zinc-600">·</span>
                      <span className="font-extrabold text-zinc-100">
                        {formatTime(order.createdAt)}
                      </span>
                    </div>

                    {/* Col 3: Cliente (en vista completa) */}
                    {!selectedOrder && (
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200 min-w-0">
                          <User className="w-3 h-3 text-zinc-500 shrink-0" />
                          <span className="truncate">{customerLabel}</span>
                        </div>
                        {order.customer?.phone && (
                          <div className="text-[10px] text-zinc-500 truncate pl-4 tabular-nums">
                            {order.customer.phone}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Col 4: Productos */}
                    <div className={`min-w-0 flex items-center gap-1.5 ${selectedOrder ? 'hidden xl:flex' : 'flex'}`}>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 tabular-nums shrink-0">
                        {itemsCount}u
                      </span>
                      <span className="text-xs text-zinc-300 truncate" title={itemsSummary}>
                        {itemsSummary}
                      </span>
                      {order.deliveryFee > 0 && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold shrink-0">
                          +Envío
                        </span>
                      )}
                      {noteText && (
                        <span
                          className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded font-bold shrink-0"
                          title={noteText}
                        >
                          Nota
                        </span>
                      )}
                    </div>

                    {/* Col 5: Estado + Pago */}
                    <div className="flex flex-col items-start gap-1 min-w-0">
                      <StatusIndicator
                        status={order.status}
                        size="sm"
                        pulse={order.status === 'PENDIENTE' || order.status === 'PREPARANDO'}
                      />
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap truncate max-w-full ${paymentInfo.statusBadgeClass}`}
                      >
                        {paymentInfo.statusLabel}
                        {paymentInfo.methodSummary ? ` · ${paymentInfo.methodSummary}` : ''}
                      </span>
                    </div>

                    {/* Col 6: Total + Acción */}
                    <div className="flex items-center justify-end gap-1.5 shrink-0">
                      <span
                        className={`font-black text-xs xl:text-sm tabular-nums ${
                          isCancelled ? 'line-through text-zinc-500' : 'text-white'
                        }`}
                      >
                        {formatCurrency(order.total)}
                      </span>

                      {editable && onEditOrderInSales && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditOrderInSales(order);
                          }}
                          className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer active:scale-95 border border-zinc-700/80 transition-colors"
                          title="Editar comanda en Ventas"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      )}

                      <ChevronRight
                        className={`w-4 h-4 shrink-0 transition-transform ${
                          isSelected
                            ? 'text-[var(--color-porkos-orange)] translate-x-0.5'
                            : 'text-zinc-600 group-hover:text-zinc-300'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel Lateral de Detalle con scroll interno independiente */}
          {selectedOrder && (
            <aside className="col-span-5 h-full min-h-0">
              <OrderDetailContent
                key={getOrderKey(selectedOrder)}
                order={selectedOrder}
                products={products}
                categories={categories}
                getItemThumbnail={getItemThumbnail}
                onEditOrderInSales={onEditOrderInSales}
                onSaveCustomerName={handleSaveCustomerName}
                onClose={() => setSelectedOrderKey(null)}
                hasPrevOrder={selectedOrderIndex > 0}
                hasNextOrder={selectedOrderIndex >= 0 && selectedOrderIndex < filteredOrders.length - 1}
                onPrevOrder={() => {
                  if (selectedOrderIndex > 0) {
                    setSelectedOrderKey(getOrderKey(filteredOrders[selectedOrderIndex - 1]));
                  }
                }}
                onNextOrder={() => {
                  if (selectedOrderIndex >= 0 && selectedOrderIndex < filteredOrders.length - 1) {
                    setSelectedOrderKey(getOrderKey(filteredOrders[selectedOrderIndex + 1]));
                  }
                }}
                variant="panel"
              />
            </aside>
          )}
        </div>
      ) : viewMode === 'list' ? (
        /* VISTA DE LISTA COMPACTA (Móvil / Tablet) */
        <div className="space-y-2">
          {filteredOrders.map((order) => {
            const orderKey = getOrderKey(order);
            const paymentInfo = getOrderPaymentInfo(order);
            const itemsSummary = getOrderItemsSummary(order);
            const itemsCount = getOrderItemsCount(order);
            const editable = isOrderEditable(order);
            const isCancelled = order.status === 'CANCELADO';

            return (
              <div
                key={orderKey}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectOrderRow(order)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectOrderRow(order);
                  }
                }}
                className={`group bg-[#121216] hover:bg-[#16161c] border border-[var(--color-porkos-border)] hover:border-zinc-700 rounded-2xl px-3 py-2.5 transition-all cursor-pointer active:scale-[0.99] shadow-xs text-xs space-y-2 ${
                  isCancelled ? 'opacity-75' : ''
                }`}
                title="Toca para ver el detalle y seguimiento del pedido"
              >
                {/* Fila superior: Comanda + Modalidad | Total + Editar */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${getStatusIconContainerClass(order.status)}`}
                    >
                      <ModalityIcon modality={order.modality} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-black text-[13px] text-white shrink-0">
                          {order.orderNumber}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-zinc-800/60 text-zinc-400 rounded-md font-medium border border-zinc-700/50 truncate">
                          {getOrderLocationLabel(order, { short: true })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-400 min-w-0">
                        <User className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
                        <span className="truncate font-medium">
                          {getOrderCustomerLabel(order, 'Cliente')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tablet: productos al centro */}
                  <div className="hidden md:flex flex-1 min-w-0 items-center gap-1.5 text-zinc-400 text-xs px-2">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 tabular-nums shrink-0">
                      {itemsCount}u
                    </span>
                    <span className="truncate">{itemsSummary}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-auto">
                    <div className="text-right">
                      <span
                        className={`font-black text-sm tabular-nums block ${
                          isCancelled ? 'line-through text-zinc-500' : 'text-white'
                        }`}
                      >
                        {formatCurrency(order.total)}
                      </span>
                      <span className="hidden sm:block text-[10px] text-zinc-400 tabular-nums font-medium">
                        {formatShortDate(order.createdAt)} · {formatTime(order.createdAt)}
                      </span>
                    </div>

                    {editable && onEditOrderInSales && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditOrderInSales(order);
                        }}
                        className="p-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer active:scale-95 border border-zinc-700/80"
                        title="Editar comanda"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
                  </div>
                </div>

                {/* Fila intermedia de estado y pago */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <StatusIndicator
                      status={order.status}
                      size="sm"
                      pulse={order.status === 'PENDIENTE' || order.status === 'PREPARANDO'}
                    />
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${paymentInfo.statusBadgeClass}`}
                    >
                      {paymentInfo.statusLabel}
                      {paymentInfo.methodSummary ? ` · ${paymentInfo.methodSummary}` : ''}
                    </span>
                  </div>

                  <span className="sm:hidden text-[10px] text-zinc-400 tabular-nums font-semibold">
                    {formatShortDate(order.createdAt)} · {formatTime(order.createdAt)}
                  </span>
                </div>

                {/* Resumen de productos visible en móvil sin abrir modal */}
                <div className="md:hidden flex items-center gap-1.5 text-[11px] text-zinc-400 pt-1.5 border-t border-zinc-800/60">
                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 tabular-nums shrink-0">
                    {itemsCount}u
                  </span>
                  <span className="truncate text-zinc-300">{itemsSummary}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA DE TARJETAS COMPACTAS Y EQUILIBRADAS (Móvil / Tablet) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
          {filteredOrders.map((order) => {
            const orderKey = getOrderKey(order);
            const paymentInfo = getOrderPaymentInfo(order);
            const isCancelled = order.status === 'CANCELADO';
            const editable = isOrderEditable(order);
            const noteText = formatOrderNote(order.generalNotes);

            return (
              <div
                key={orderKey}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectOrderRow(order)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectOrderRow(order);
                  }
                }}
                className={`group bg-[#121216] hover:bg-[#16161c] border border-[var(--color-porkos-border)] hover:border-zinc-700 rounded-2xl p-3 sm:p-3.5 transition-colors duration-200 cursor-pointer flex flex-col justify-between gap-2.5 active:scale-[0.99] shadow-sm ${
                  isCancelled ? 'opacity-75' : ''
                }`}
                title="Toca para ver el detalle y seguimiento del pedido"
              >
                {/* Cabecera limpia: Comanda + Modalidad sutil | Total */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${getStatusIconContainerClass(order.status)}`}
                      >
                        <ModalityIcon modality={order.modality} className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-black text-sm text-white tracking-tight">
                            {order.orderNumber}
                          </h4>
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-medium bg-zinc-800/60 text-zinc-400 border border-zinc-700/50">
                            {getOrderLocationLabel(order)}
                          </span>
                        </div>

                        {/* Cliente inline con tono sobrio */}
                        <div className="flex items-center gap-1 text-[11px] text-zinc-400 mt-0.5 min-w-0">
                          {editingCustomerNameOrder === orderKey ? (
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
                                setEditingCustomerNameOrder(orderKey);
                                setTempCustomerName(order.customerName || order.customer?.name || '');
                              }}
                              className="group/cust inline-flex items-center gap-1 cursor-pointer text-zinc-300 hover:text-white font-semibold truncate max-w-[165px]"
                              title="Clic para editar el nombre del cliente"
                            >
                              <User className="w-3 h-3 text-zinc-500 group-hover/cust:text-zinc-300 shrink-0" />
                              <span className="truncate">{getOrderCustomerLabel(order, 'Cliente')}</span>
                              <Edit3 className="w-2.5 h-2.5 text-zinc-600 group-hover/cust:text-zinc-300 shrink-0" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className={`font-black text-base tabular-nums ${
                          isCancelled ? 'line-through text-zinc-500' : 'text-white'
                        }`}
                      >
                        {formatCurrency(order.total)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
                    </div>
                  </div>

                  {/* Franja de estado y pago */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <StatusIndicator
                      status={order.status}
                      size="sm"
                      pulse={order.status === 'PENDIENTE' || order.status === 'PREPARANDO'}
                    />
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${paymentInfo.statusBadgeClass}`}
                    >
                      {paymentInfo.statusLabel}
                      {paymentInfo.methodSummary ? ` · ${paymentInfo.methodSummary}` : ''}
                    </span>
                  </div>
                </div>

                {/* Lista compacta de productos con badge de consumo sutil */}
                <div className="bg-[#0C0C0F] rounded-xl px-2.5 py-2 border border-zinc-800/80 divide-y divide-zinc-800/45">
                  {order.items && order.items.length > 0 ? (
                    <>
                      {(expandedOrderIds[orderKey] ? order.items : order.items.slice(0, 4)).map((item, idx) => (
                        <div
                          key={idx}
                          className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2 text-[11px]"
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <ProductThumbnail
                              src={item.image}
                              thumbnailUrl={getItemThumbnail(item)}
                              name={item.name}
                              isBeverage={isProductBeverage(item)}
                              isDessert={isProductDessert(item)}
                              className="w-5 h-5 rounded-md shrink-0"
                              iconSize="w-3 h-3"
                            />
                            <span className="font-black text-[var(--color-porkos-orange)] tabular-nums shrink-0">
                              {item.quantity}×
                            </span>
                            <span className="font-medium text-zinc-200 truncate">
                              {item.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <ItemConsumptionBadge item={item} orderModality={order.modality} subtle />
                            {item.subtotal !== undefined && (
                              <span className="text-[11px] font-bold text-zinc-300 tabular-nums min-w-[52px] text-right">
                                {formatCurrency(item.subtotal)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                      {order.items.length > 4 && (
                        <div className="pt-1.5 pb-0.5 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedOrderIds((prev) => ({
                                ...prev,
                                [orderKey]: !prev[orderKey],
                              }));
                            }}
                            className="text-[10px] font-bold text-[var(--color-porkos-orange)] hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                          >
                            {expandedOrderIds[orderKey] ? (
                              <>
                                <ChevronUp className="w-3 h-3" />
                                <span>Mostrar menos</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3" />
                                <span>Ver {order.items.length - 4} productos más ({order.items.length} total)</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-zinc-500 italic py-1 block">Sin productos</span>
                  )}

                  {order.deliveryFee > 0 && (
                    <div className="pt-1.5 flex items-center justify-between text-[10px] text-emerald-300/90 font-semibold">
                      <span className="inline-flex items-center gap-1">
                        <Bike className="w-3 h-3 text-emerald-400" />
                        <span>Envío Delivery</span>
                      </span>
                      <span className="tabular-nums">+{formatCurrency(order.deliveryFee)}</span>
                    </div>
                  )}
                </div>

                {/* Barra inferior: Fecha (DD/MM) y hora + nota + acción */}
                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[var(--color-porkos-border)]/70 text-[10px]">
                  <div className="flex items-center gap-1.5 text-zinc-500 min-w-0">
                    <span className="inline-flex items-center gap-1 text-zinc-300 font-semibold tabular-nums shrink-0">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      {formatShortDate(order.createdAt)} · {formatTime(order.createdAt)}
                    </span>
                    {noteText && (
                      <span className="truncate italic text-amber-300/80 max-w-[130px]" title={order.generalNotes}>
                        • &ldquo;{noteText}&rdquo;
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    {editable && onEditOrderInSales ? (
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
                    ) : (
                      <span className="text-[10px] font-semibold text-zinc-500">
                        Ver detalle
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalle de Orden (solo en móvil/tablet; en desktop se abre a la derecha) */}
      <Modal
        isOpen={!isDesktop && Boolean(selectedOrder)}
        onClose={() => setSelectedOrderKey(null)}
        title={selectedOrder?.orderNumber ? `Comanda ${selectedOrder.orderNumber}` : 'Detalle'}
        subtitle={`${getOrderLocationLabel(selectedOrder)} · ${formatShortDate(selectedOrder?.createdAt)} ${formatTime(selectedOrder?.createdAt)}`}
        maxWidth="max-w-xl"
      >
        {selectedOrder && (
          <OrderDetailContent
            key={getOrderKey(selectedOrder)}
            order={selectedOrder}
            products={products}
            categories={categories}
            getItemThumbnail={getItemThumbnail}
            onEditOrderInSales={onEditOrderInSales}
            onSaveCustomerName={handleSaveCustomerName}
            onClose={() => setSelectedOrderKey(null)}
            variant="modal"
          />
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
                              type="text"
                              inputMode="decimal"
                              value={itemPrice}
                              onChange={(e) => {
                                const raw = e.target.value.replace(',', '.');
                                if (/^\d*(\.\d{0,2})?$/.test(raw)) {
                                  setItemPrice(raw);
                                  setIsPriceCustomized(true);
                                }
                              }}
                              onFocus={(e) => {
                                const target = e.target;
                                setTimeout(() => target.select(), 0);
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
                                      type="text"
                                      inputMode="decimal"
                                      autoFocus
                                      value={tempItemPrice}
                                      onChange={(e) => {
                                        const raw = e.target.value.replace(',', '.');
                                        if (/^\d*(\.\d{0,2})?$/.test(raw)) {
                                          setTempItemPrice(raw);
                                        }
                                      }}
                                      onFocus={(e) => {
                                        const target = e.target;
                                        setTimeout(() => target.select(), 0);
                                      }}
                                      onBlur={() => handleUpdateManualItemPrice(item.id, tempItemPrice)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleUpdateManualItemPrice(item.id, tempItemPrice);
                                        }
                                        if (e.key === 'Escape') setEditingItemPriceId(null);
                                      }}
                                      className="w-16 bg-transparent text-white font-black text-xs focus:outline-none"
                                      placeholder="0.00"
                                    />
                                    <button
                                      type="button"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => handleUpdateManualItemPrice(item.id, tempItemPrice)}
                                      className="p-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded text-xs cursor-pointer active:scale-90"
                                      title="Guardar precio"
                                    >
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    </button>
                                    <button
                                      type="button"
                                      onMouseDown={(e) => e.preventDefault()}
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
