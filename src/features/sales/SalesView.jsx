import { useState, useMemo, useEffect, useRef } from 'react';
import { SALES_MODES, ORDER_MODALITIES } from '../../types/constants';
import { useCart } from '../../context/useCart';
import { useCatalog } from '../../context/useCatalog';
import SalesHeader from './components/SalesHeader';
import CategoryTabs from './components/CategoryTabs';
import ProductCard from './components/ProductCard';
import QuickCustomizerModal from './components/QuickCustomizerModal';
import CustomMenuItemModal from './components/CustomMenuItemModal';
import CartView from './components/CartView';
import MobileCartDrawer from './components/MobileCartDrawer';
import QuickPaymentModal from './components/QuickPaymentModal';
import ReorderCategoryModal from './components/ReorderCategoryModal';
import ScrollToTopButton from '../../components/ui/ScrollToTopButton';
import { formatCurrency } from '../../utils/formatters';
import { getNextOrderNumber } from '../../utils/orderNumber';
import { isProductBeverage, isProductMarket, isProductFood, isProductDessert, isProductSnack } from '../../utils/productCategories';
import { sanitizeText, sanitizeNotes } from '../../utils/security';
import { forceUnlockScroll } from '../../utils/scrollLock';
import { useAuth } from '../../context/useAuth';
import Toast from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import { UtensilsCrossed, Edit3, Plus, ArrowUpDown } from 'lucide-react';

export default function SalesView({
  onOrderCreated,
  tables = [],
  orders = [],
  onSettleTableOrder,
  onOrderUpdated,
  onReturnToOrders,
}) {
  const { user } = useAuth();
  const {
    items,
    addItem,
    addCustomItem,
    updateCustomItem,
    updateItemCustomization,
    total,
    itemCount,
    modality,
    selectedTable,
    customerName,
    customer,
    packagings,
    generalNotes,
    itemsSubtotal,
    packagingsTotal,
    deliveryFee,
    discount,
    clearCart,
    editingOrder,
    cancelEditingOrder,
  } = useCart();

  const [salesMode, setSalesMode] = useState(SALES_MODES.RESTAURANT);
  const [selectedLine, setSelectedLine] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [editingCartItem, setEditingCartItem] = useState(null);
  const [isCustomMenuOpen, setIsCustomMenuOpen] = useState(false);
  const [editingCustomItem, setEditingCustomItem] = useState(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(() => Boolean(editingOrder));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastEditingOrderIdRef = useRef(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      forceUnlockScroll();
    };
  }, []);

  // Failsafe: cuando no hay ningún modal ni drawer abierto en Ventas, asegurar que el body scroll esté libre
  useEffect(() => {
    if (!isMobileCartOpen && !customizingProduct && !isCustomMenuOpen && !isPaymentOpen && !isReorderModalOpen) {
      forceUnlockScroll();
    }
  }, [isMobileCartOpen, customizingProduct, isCustomMenuOpen, isPaymentOpen, isReorderModalOpen]);

  // Al entrar a editar una comanda (desde Mesas o Pedidos), abrir automáticamente la comanda desplegada
  useEffect(() => {
    if (editingOrder) {
      const orderKey = editingOrder.orderNumber || editingOrder.id || 'editing';
      if (lastEditingOrderIdRef.current !== orderKey) {
        lastEditingOrderIdRef.current = orderKey;
        setIsMobileCartOpen(true);
      }
    } else {
      lastEditingOrderIdRef.current = null;
    }
  }, [editingOrder]);

  const [successToast, setSuccessToast] = useState(null);

  const {
    products,
    categories = [],
    packagings: catalogPackagings,
    recordProductSales,
    categoryOrderMap = {},
    saveCategoryOrder,
    resetCategoryOrder,
  } = useCatalog();

  // Filtrar productos por Categorías principales: TODAS, CLÁSICO, ARTESANAL, MARKET y Búsqueda
  // Ordenados según la carta física configurada manualmente, o por mayor salida (salesCount)
  const filteredAndSortedProducts = useMemo(() => {
    const list = products.filter((prod) => {
      // 1. En modo MARKET (Caja Rápida): mostrar productos de Market filtrados por sus categorías
      if (salesMode === SALES_MODES.MARKET) {
        if (!isProductMarket(prod, categories)) return false;

        if (selectedLine === 'MARKET_BEBIDAS') {
          return isProductBeverage(prod);
        }
        if (selectedLine === 'MARKET_SNACKS') {
          return isProductSnack(prod);
        }
        if (selectedLine === 'MARKET_POSTRES') {
          return isProductDessert(prod, categories);
        }
        return true; // MARKET_ALL
      } else {
        // 2. En modo RESTAURANTE: filtrar por categoría (TODO, COMIDA, BEBIDAS, POSTRES, MARKET)
        if (selectedLine === 'COMIDA') {
          // Comida: Todo producto gastronómico que NO sea bebida, no sea postre y no sea de Market
          if (!isProductFood(prod, categories) || isProductMarket(prod, categories) || isProductDessert(prod, categories) || isProductBeverage(prod)) return false;
        } else if (selectedLine === 'BEBIDAS') {
          // Bebidas: TODAS las bebidas (tanto de restaurante como de market: gaseosas, cervezas, aguas, jugos)
          if (!isProductBeverage(prod)) return false;
        } else if (selectedLine === 'POSTRES') {
          // Postres: TODOS los postres (tanto de restaurante como postres de market: helados, chocotejas, tortas)
          if (!isProductDessert(prod, categories)) return false;
        } else if (selectedLine === 'MARKET') {
          // Market: Todo producto registrado en Market (bebidas, snacks, postres de market)
          if (!isProductMarket(prod, categories)) return false;
        }
      }

      // 2. Búsqueda por texto
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          prod.name.toLowerCase().includes(query) ||
          prod.description?.toLowerCase().includes(query)
        );
      }

      return true;
    });

    // Ordenamiento: si la categoría tiene un orden manual configurado por la administración para la carta, respetarlo
    const manualOrder = categoryOrderMap?.[selectedLine];
    if (Array.isArray(manualOrder) && manualOrder.length > 0) {
      return list.sort((a, b) => {
        const indexA = manualOrder.indexOf(a.id);
        const indexB = manualOrder.indexOf(b.id);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return (b.salesCount || 0) - (a.salesCount || 0);
      });
    }

    // Orden por defecto: de mayor salida a menor salida (salesCount)
    return list.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
  }, [products, categories, salesMode, selectedLine, searchQuery, categoryOrderMap]);

  // Etiqueta legible de la categoría actualmente seleccionada
  const selectedCategoryLabel = useMemo(() => {
    if (salesMode === SALES_MODES.MARKET) {
      if (selectedLine === 'MARKET_BEBIDAS') return 'Bebidas Market';
      if (selectedLine === 'MARKET_SNACKS') return 'Snacks Market';
      if (selectedLine === 'MARKET_POSTRES') return 'Postres Market';
      return 'Market (Todo)';
    }
    if (selectedLine === 'COMIDA') return 'Comida';
    if (selectedLine === 'BEBIDAS') return 'Bebidas';
    if (selectedLine === 'POSTRES') return 'Postres';
    if (selectedLine === 'MARKET') return 'Market';
    return 'Toda la Carta';
  }, [salesMode, selectedLine]);

  // Añadir rápido (Por defecto SIN cremas marcadas, el usuario las personaliza o pide directo)
  const handleQuickAdd = (product) => {
    // Si la modalidad es para llevar o delivery, asociar el packaging predeterminado del producto
    const isTakeoutOrDelivery =
      salesMode !== SALES_MODES.MARKET &&
      (modality === 'PARA_LLEVAR' ||
        modality === 'DELIVERY' ||
        modality === 'LLEVAR');

    const defaultConsumptionType =
      salesMode === SALES_MODES.MARKET
        ? 'MESA'
        : isTakeoutOrDelivery
        ? (modality === 'DELIVERY' ? 'DELIVERY' : 'PARA_LLEVAR')
        : modality === 'CONSUMO_EXTERNO'
        ? 'CONSUMO_EXTERNO'
        : 'MESA';

    let defaultPackaging = null;
    if (isTakeoutOrDelivery) {
      defaultPackaging =
        (catalogPackagings || []).find(
          (pkg) =>
            pkg.active &&
            pkg.id !== 'pkg_ninguno' &&
            (product.availablePackagingIds?.includes(pkg.id) ||
              pkg.applicableProductIds?.includes(product.id))
        ) ||
        (catalogPackagings || []).find((pkg) => pkg.active && pkg.id !== 'pkg_ninguno') ||
        null;
    }

    if (product.type === 'MARKET' || product.line === 'MARKET' || product.type === SALES_MODES.MARKET) {
      // Productos de market en comandas: SIN cremas, SIN papas, SIN modificadores
      addItem(product, {
        temperature: product.temperatureConfig?.enabled ? (product.temperatureConfig?.defaultOption || 'HELADA') : null,
        creamsSummary: '',
        creamsDetail: { selected: [], mode: 'NONE' },
        saladSummary: '',
        selectedModifiers: [],
        selectedExtras: [],
        removedIngredients: [],
        packaging: null,
        itemNotes: '',
        consumptionType: defaultConsumptionType,
      });
    } else {
      const defaultMods = [];
      const hasPapas = Boolean(
        product.hasPapas === true ||
        product.papasConfig?.enabled === true ||
        (product.hasPapas !== false &&
          product.papasConfig?.enabled !== false &&
          product.modifiers?.some((m) => m.id === 'mod_papas' || m.id === 'mod_corte_papas' || m.name?.toLowerCase().includes('papa')))
      );

      product.modifiers?.forEach((mod) => {
        const isPapaMod = mod.id === 'mod_papas' || mod.id === 'mod_corte_papas' || mod.name?.toLowerCase().includes('papa');
        if (isPapaMod && !hasPapas) {
          return;
        }
        const defaultOpt = mod.options.find((o) => o.id === mod.defaultOptionId) || mod.options[0];
        if (defaultOpt) {
          defaultMods.push({
            groupId: mod.id,
            groupName: mod.name,
            optionId: defaultOpt.id,
            optionName: defaultOpt.name,
            priceDelta: defaultOpt.priceDelta || 0,
          });
        }
      });

      // SIN CREMAS marcadas por defecto
      addItem(product, {
        temperature: product.temperatureConfig?.enabled ? (product.temperatureConfig?.defaultOption || 'HELADA') : null,
        creamsSummary: '',
        creamsDetail: {
          selected: [],
          mode: 'NONE',
        },
        saladSummary: (product.saladConfig?.enabled === true || product.hasSalad === true) ? 'CON ENSALADA' : '',
        selectedModifiers: defaultMods,
        selectedExtras: [],
        packaging: defaultPackaging,
        removedIngredients: [],
        itemNotes: '',
        consumptionType: defaultConsumptionType,
      });
    }

    showToast(`"${product.name}" añadido`);
  };

  const handleOpenCustomizer = (product) => {
    setEditingCartItem(null);
    setCustomizingProduct(product);
  };

  const handleEditCartItem = (cartItem) => {
    if (cartItem.isCustomMenuItem || cartItem.productId?.startsWith('custom_')) {
      setEditingCustomItem(cartItem);
      setIsCustomMenuOpen(true);
      return;
    }
    const baseProd = products.find((p) => p.id === cartItem.productId) || {
      id: cartItem.productId,
      name: cartItem.name,
      price: cartItem.basePrice || cartItem.unitPrice,
    };
    setEditingCartItem(cartItem);
    setCustomizingProduct(baseProd);
  };

  const handleOpenCustomMenu = () => {
    setEditingCustomItem(null);
    setIsCustomMenuOpen(true);
  };

  const handleConfirmCustomItem = (customData) => {
    if (editingCustomItem) {
      updateCustomItem(editingCustomItem.itemId, customData);
      showToast(`"${customData.name}" actualizado en comanda`);
      setEditingCustomItem(null);
    } else {
      addCustomItem(customData);
      showToast(`"${customData.name}" añadido a la comanda`);
    }
  };

  const handleConfirmCustomization = (product, customization) => {
    if (editingCartItem) {
      updateItemCustomization(editingCartItem.itemId, customization);
      showToast(`"${editingCartItem.name}" actualizado en comanda`);
      setEditingCartItem(null);
    } else {
      addItem(product, customization);
      showToast(`"${product.name}" personalizado añadido`);
    }
  };

  const showToast = (message, duration = 1200) => {
    setSuccessToast(message);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setSuccessToast(null);
    }, duration);
  };

  // Crear la orden y enviar a cocina (con protección de concurrencia y doble clic)
  const handleSendToKitchen = async () => {
    if (isSubmitting) return;
    if (items.length === 0) return;

    // Exigir número de mesa si la modalidad es MESA
    if (salesMode !== SALES_MODES.MARKET && (modality === 'MESA' || modality === ORDER_MODALITIES.MESA.id)) {
      if (!selectedTable?.id) {
        showToast('Debes seleccionar un número de mesa para continuar');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const hasKitchenItems = items.some((i) => Boolean(i.requiresKitchen) && !isProductMarket(i));
      const isTable = modality === 'MESA' || modality === ORDER_MODALITIES.MESA?.id;
      const isDelivery = modality === 'DELIVERY';
      const isMarketSale = salesMode === SALES_MODES.MARKET;

      // En modo Restaurante:
      // - Si tiene productos de cocina: PENDIENTE (Cocina)
      // - Si NO tiene cocina (ej. productos de market, bebidas, postres): PENDIENTE (va a Pendientes de Entrega)
      // En modo Market (caja rápida de mostrador): entregado
      const orderStatus = isMarketSale ? 'ENTREGADO' : 'PENDIENTE';

      const operatorName = user?.displayName || user?.fullName || (user?.email ? user.email.split('@')[0] : 'Cajero');
      const operatorEmail = user?.email || 'caja@porkos.pe';

      const rawName = (customerName?.trim() || customer.name?.trim()) || (isDelivery ? 'Cliente Delivery' : null);
      const clientName = rawName ? sanitizeText(rawName, 100) : null;
      const rawAddress = customer.address?.trim() || (isDelivery ? 'Dirección por coordinar' : null);
      const deliveryAddress = rawAddress ? sanitizeText(rawAddress, 180) : null;
      const cleanNotes = generalNotes ? sanitizeNotes(generalNotes, 300) : '';

      const orderData = {
        orderNumber: getNextOrderNumber(orders, isMarketSale ? 'M' : 'P'),
        modality: isMarketSale ? 'MARKET' : (isTable ? 'MESA' : modality),
        status: orderStatus,
        paymentStatus: isTable ? 'PENDING' : 'PAID',
        tableId: isTable ? (selectedTable?.id || null) : null,
        tableName: isTable ? (selectedTable?.label || null) : null,
        customerName: clientName,
        customer: isDelivery ? { ...customer, name: clientName || '', address: deliveryAddress } : null,
        items: [...items],
        packagings: [...packagings],
        generalNotes: cleanNotes,
        subtotal: itemsSubtotal,
        packagingsTotal,
        deliveryFee,
        discount: discount || 0,
        total,
        createdBy: {
          uid: user?.uid || null,
          email: operatorEmail,
          name: operatorName,
        },
        createdAt: new Date(),
      };

      // Actualizar conteo local de salidas
      recordProductSales(items);

      if (onOrderCreated) {
        await onOrderCreated(orderData);
      }

      const isAddingToOpenTable = selectedTable?.status === 'OCCUPIED';

      clearCart();
      setIsMobileCartOpen(false);
      showToast(
        isTable
          ? hasKitchenItems
            ? isAddingToOpenTable
              ? `Comanda ${orderData.orderNumber} enviada a Cocina (${selectedTable.label})`
              : `Comanda ${orderData.orderNumber} enviada a Cocina`
            : `Pedido ${orderData.orderNumber} en Pendientes de Entrega (${selectedTable.label})`
          : isDelivery
          ? hasKitchenItems
            ? `Pedido Delivery ${orderData.orderNumber} enviado a Cocina`
            : `Pedido Delivery ${orderData.orderNumber} en Pendientes de Entrega`
          : isMarketSale
          ? `Venta ${orderData.orderNumber} entregada`
          : hasKitchenItems
          ? `Comanda ${orderData.orderNumber} enviada a Cocina`
          : `Pedido ${orderData.orderNumber} en Pendientes de Entrega`
      );
    } catch (err) {
      console.error('Error registrando comanda:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCheckout = () => {
    // Exigir número de mesa si la modalidad es MESA
    if (salesMode !== SALES_MODES.MARKET && (modality === 'MESA' || modality === ORDER_MODALITIES.MESA.id)) {
      if (!selectedTable?.id) {
        showToast('Debes seleccionar un número de mesa para continuar');
        return;
      }
    }

    setIsPaymentOpen(true);
  };

  // Guardar edición de comanda activa existente (con protección de concurrencia)
  const handleSaveEditedOrder = async () => {
    if (isSubmitting) return;
    if (!editingOrder) return;

    // Verificar si la orden ya fue entregada y pagada (finalizada)
    const isUnpaidTable = (editingOrder.modality === 'MESA' || Boolean(editingOrder.tableId)) && editingOrder.paymentStatus !== 'PAID';
    if (editingOrder.status === 'ENTREGADO' && !isUnpaidTable) {
      showToast('⚠️ Esta comanda ya fue finalizada y no puede ser modificada');
      cancelEditingOrder();
      return;
    }

    // Exigir número de mesa si la modalidad es MESA
    if (salesMode !== SALES_MODES.MARKET && (modality === 'MESA' || modality === ORDER_MODALITIES.MESA.id)) {
      if (!selectedTable?.id) {
        showToast('Debes seleccionar un número de mesa para la comanda');
        return;
      }
    }

    if (items.length === 0) {
      showToast('⚠️ La comanda debe tener al menos 1 producto');
      return;
    }

    setIsSubmitting(true);
    try {
      const rawEditName = (customerName?.trim() || customer.name?.trim()) || (modality === 'DELIVERY' ? 'Cliente Delivery' : null);
      const clientName = rawEditName ? sanitizeText(rawEditName, 100) : null;
      const rawEditAddress = customer.address?.trim() || (modality === 'DELIVERY' ? 'Dirección por coordinar' : null);
      const deliveryAddress = rawEditAddress ? sanitizeText(rawEditAddress, 180) : null;
      const cleanNotes = generalNotes ? sanitizeNotes(generalNotes, 300) : '';

      const updatedOrder = {
        ...editingOrder,
        modality,
        tableId: modality === 'MESA' ? (selectedTable?.id || null) : null,
        tableName: modality === 'MESA' ? (selectedTable?.label || null) : null,
        customerName: clientName,
        customer: modality === 'DELIVERY' ? { ...customer, name: clientName || '', address: deliveryAddress } : null,
        items: [...items],
        packagings: [...packagings],
        generalNotes: cleanNotes,
        subtotal: itemsSubtotal,
        packagingsTotal,
        deliveryFee,
        discount: discount || 0,
        total,
        mergedOrderNumbers: editingOrder.mergedOrderNumbers || null,
        updatedAt: new Date(),
      };

      if (onOrderUpdated) {
        await onOrderUpdated(updatedOrder);
      }

      cancelEditingOrder();
      clearCart();
      setIsMobileCartOpen(false);
      showToast(`Comanda ${updatedOrder.orderNumber} actualizada`);
      if (onReturnToOrders) {
        onReturnToOrders();
      }
    } catch (err) {
      console.error('Error actualizando comanda:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEditing = () => {
    cancelEditingOrder();
    clearCart();
    setIsMobileCartOpen(false);
    if (onReturnToOrders) {
      onReturnToOrders();
    }
  };

  // Cobro directo (con protección de doble envío)
  const handleConfirmPayment = async (paymentDetail) => {
    if (isSubmitting) return;
    if (items.length === 0) return;

    setIsSubmitting(true);
    try {
      const isMarketSale = salesMode === SALES_MODES.MARKET;
      const operatorName = user?.displayName || user?.fullName || (user?.email ? user.email.split('@')[0] : 'Cajero');
      const operatorEmail = user?.email || 'caja@porkos.pe';

      const hasKitchenItems = items.some((i) => Boolean(i.requiresKitchen) && !isProductMarket(i));
      const isDelivery = !isMarketSale && modality === 'DELIVERY';
      const orderStatus = isMarketSale ? 'ENTREGADO' : 'PENDIENTE';

      const rawPaymentClient = isMarketSale
        ? 'Venta Mostrador'
        : ((customerName?.trim() || customer.name?.trim()) || (isDelivery ? 'Cliente Delivery' : null));
      const clientName = rawPaymentClient ? sanitizeText(rawPaymentClient, 100) : null;
      const rawPaymentAddress = customer.address?.trim() || (isDelivery ? 'Dirección por coordinar' : null);
      const deliveryAddress = rawPaymentAddress ? sanitizeText(rawPaymentAddress, 180) : null;
      const cleanNotes = isMarketSale ? 'Venta directa en caja' : (generalNotes ? sanitizeNotes(generalNotes, 300) : '');

      const orderData = {
        orderNumber: getNextOrderNumber(orders, isMarketSale ? 'M' : 'P'),
        modality: isMarketSale ? 'MARKET' : modality,
        status: orderStatus,
        paymentStatus: 'PAID',
        tableId: isMarketSale ? null : (selectedTable?.id || null),
        tableName: isMarketSale ? null : (selectedTable?.label || null),
        customerName: clientName,
        customer: isDelivery ? { ...customer, name: clientName || '', address: deliveryAddress } : null,
        items: [...items],
        packagings: isMarketSale ? [] : [...packagings],
        generalNotes: cleanNotes,
        subtotal: itemsSubtotal,
        packagingsTotal: isMarketSale ? 0 : packagingsTotal,
        deliveryFee: isMarketSale ? 0 : deliveryFee,
        discount: 0,
        total,
        createdBy: {
          uid: user?.uid || null,
          email: operatorEmail,
          name: operatorName,
        },
        payments: [
          {
            ...paymentDetail,
            paidAt: new Date(),
          },
        ],
        createdAt: new Date(),
      };

      // Actualizar conteo local de salidas
      recordProductSales(items);

      if (onOrderCreated) {
        await onOrderCreated(orderData, Boolean(orderData.tableId));
      }

      clearCart();
      setIsPaymentOpen(false);
      setIsMobileCartOpen(false);
      showToast(
        isMarketSale
          ? `Venta Market ${orderData.orderNumber} cobrada con éxito`
          : hasKitchenItems
          ? `Comanda ${orderData.orderNumber} cobrada y enviada a Cocina`
          : `Pedido ${orderData.orderNumber} cobrado y enviado a Pendientes de Entrega`
      );
    } catch (err) {
      console.error('Error procesando cobro:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative pb-24 lg:pb-8">
      {/* Toast Notification: Sutil, superior y ágil */}
      {successToast && (
        <Toast
          message={successToast}
          type="success"
          position="top"
          duration={1200}
          onClose={() => setSuccessToast(null)}
        />
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Products & Filters */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3.5">
          {/* Banner superior si está editando comanda desde Pedidos */}
          {editingOrder && (
            <div className="bg-amber-500/15 border border-amber-500/40 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs animate-in fade-in">
              <div className="flex items-center gap-2.5 text-amber-300 font-bold">
                <Edit3 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Editando comanda <strong>{editingOrder.tableName ? `${editingOrder.tableName} (${editingOrder.orderNumber})` : editingOrder.orderNumber}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEditing}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold border border-zinc-700 cursor-pointer active:scale-95"
                >
                  Cancelar y Volver
                </button>
                <button
                  type="button"
                  onClick={() => setIsMobileCartOpen(true)}
                  className="lg:hidden px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black cursor-pointer active:scale-95 shadow-md shadow-amber-500/20"
                >
                  Ver Comanda
                </button>
              </div>
            </div>
          )}

          <SalesHeader
            salesMode={salesMode}
            setSalesMode={(mode) => {
              setSalesMode(mode);
              setSelectedLine(mode === SALES_MODES.MARKET ? 'MARKET_ALL' : 'ALL');
            }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            tables={tables}
            onOpenReorder={() => setIsReorderModalOpen(true)}
          />

          {/* Categorías contextuales (Restaurante o Market) */}
          <CategoryTabs
            salesMode={salesMode}
            selectedLine={selectedLine}
            onSelectLine={setSelectedLine}
            onOpenCustomMenu={salesMode !== SALES_MODES.MARKET ? handleOpenCustomMenu : undefined}
            onOpenReorder={() => setIsReorderModalOpen(true)}
            isCustomOrderActive={Boolean(categoryOrderMap?.[selectedLine])}
          />

          {/* Barra fija visible: título de sección + botón destacado 'Ordenar Carta' */}
          <div className="flex items-center justify-between gap-2 px-1 pt-1 pb-0.5 select-none">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider truncate">
                {selectedCategoryLabel}
              </span>
              <span className="text-[11px] font-bold text-zinc-400 bg-[#121216] border border-zinc-800 px-2 py-0.5 rounded-full shrink-0">
                {filteredAndSortedProducts.length} {filteredAndSortedProducts.length === 1 ? 'producto' : 'productos'}
              </span>
              {categoryOrderMap?.[selectedLine] && (
                <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded-full shrink-0 hidden sm:inline-flex">
                  Orden Carta Activo
                </span>
              )}
            </div>

            {/* Botón directo y siempre visible: Ordenar Carta */}
            <button
              type="button"
              onClick={() => setIsReorderModalOpen(true)}
              className="px-3.5 py-1.5 sm:py-2 rounded-xl bg-[var(--color-porkos-orange)] hover:bg-[var(--color-porkos-orange-hover)] text-zinc-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
              title={`Organizar el orden de los productos en ${selectedCategoryLabel} para que coincida con tu carta física`}
            >
              <ArrowUpDown className="w-4 h-4 stroke-[2.5]" />
              <span>Ordenar Carta</span>
              {categoryOrderMap?.[selectedLine] && (
                <span className="w-2 h-2 rounded-full bg-zinc-950 animate-pulse" />
              )}
            </button>
          </div>

          {/* Grid de Productos (Ordenados de mayor a menor salida) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3.5">
            {filteredAndSortedProducts.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={idx < 12}
                onQuickAdd={handleQuickAdd}
                onCustomize={handleOpenCustomizer}
                isMarketMode={salesMode === SALES_MODES.MARKET}
              />
            ))}
          </div>

          {filteredAndSortedProducts.length === 0 && (
            <div className="space-y-3">
              <EmptyState
                icon={UtensilsCrossed}
                title={products.length === 0 ? 'El catálogo está vacío' : 'No se encontraron productos'}
                description={
                  products.length === 0
                    ? 'Agrega productos en el módulo de Catálogo para empezar a vender.'
                    : `No hay productos en la carta que coincidan con "${searchQuery}".`
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
              {searchQuery && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleOpenCustomMenu()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <Plus className="w-4 h-4 text-amber-400 stroke-[2.5]" />
                    <span>Agregar &ldquo;{searchQuery}&rdquo; como menú fuera de carta</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Desktop Cart */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-20 h-[calc(100vh-6rem)]">
          <CartView
            isMarketMode={salesMode === SALES_MODES.MARKET}
            onSendToKitchen={handleSendToKitchen}
            onCheckout={handleOpenCheckout}
            onSettleTable={onSettleTableOrder}
            onEditItem={handleEditCartItem}
            onOpenCustomMenu={handleOpenCustomMenu}
            tables={tables}
            onSaveEditedOrder={handleSaveEditedOrder}
            onCancelEditing={handleCancelEditing}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>

      {/* Mobile Floating Cart Summary Button */}
      {items.length > 0 && (
        <div className="lg:hidden fixed bottom-16 left-3 right-3 z-30 animate-in slide-in-from-bottom-4">
          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className={`w-full ${
              editingOrder
                ? 'bg-amber-500 text-black shadow-amber-500/30'
                : 'bg-[var(--color-porkos-orange)] text-black shadow-orange-500/30'
            } p-3.5 rounded-2xl flex items-center justify-between font-black shadow-xl active:scale-[0.98] transition-all cursor-pointer`}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-black text-white text-xs flex items-center justify-center font-extrabold">
                {itemCount}
              </div>
              <span className="text-sm uppercase tracking-tight">
                {editingOrder
                  ? `Ver Comanda (${editingOrder.orderNumber})`
                  : salesMode === SALES_MODES.MARKET
                  ? 'Ver Venta Market'
                  : 'Ver Comanda'}
              </span>
            </div>
            <span className="text-base font-black">{formatCurrency(total)}</span>
          </button>
        </div>
      )}

      {/* Mobile Cart Drawer con Gestos Fluidos y Leyes UX */}
      <MobileCartDrawer
        isOpen={isMobileCartOpen}
        onClose={() => setIsMobileCartOpen(false)}
      >
        <CartView
          isMarketMode={salesMode === SALES_MODES.MARKET}
          onSendToKitchen={handleSendToKitchen}
          onCheckout={handleOpenCheckout}
          onSettleTable={onSettleTableOrder}
          onEditItem={handleEditCartItem}
          onOpenCustomMenu={handleOpenCustomMenu}
          onCloseMobileCart={() => setIsMobileCartOpen(false)}
          tables={tables}
          onSaveEditedOrder={handleSaveEditedOrder}
          onCancelEditing={handleCancelEditing}
          isSubmitting={isSubmitting}
        />
      </MobileCartDrawer>

      {/* Quick Customizer Modal */}
      <QuickCustomizerModal
        isOpen={Boolean(customizingProduct)}
        onClose={() => {
          setCustomizingProduct(null);
          setEditingCartItem(null);
        }}
        product={customizingProduct}
        cartItemId={editingCartItem?.itemId}
        initialCustomization={editingCartItem?.customization || null}
        modality={modality}
        onConfirm={handleConfirmCustomization}
      />

      {/* Custom Menu Item Modal (Fuera de carta) */}
      <CustomMenuItemModal
        isOpen={isCustomMenuOpen}
        onClose={() => {
          setIsCustomMenuOpen(false);
          setEditingCustomItem(null);
        }}
        editingItem={editingCustomItem}
        initialName={searchQuery}
        modality={modality}
        onConfirm={handleConfirmCustomItem}
      />

      {/* Quick Payment Modal */}
      <QuickPaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        total={total}
        onConfirmPayment={handleConfirmPayment}
        isSubmitting={isSubmitting}
      />

      {/* Reorder Category Modal (Ordenar Carta) */}
      <ReorderCategoryModal
        key={`${selectedLine}_${isReorderModalOpen}`}
        isOpen={isReorderModalOpen}
        onClose={() => setIsReorderModalOpen(false)}
        initialCategory={selectedLine}
        salesMode={salesMode}
        products={products}
        categories={categories}
        categoryOrderMap={categoryOrderMap}
        onSaveOrder={saveCategoryOrder}
        onResetOrder={resetCategoryOrder}
        onShowToast={showToast}
      />

      {/* Flecha flotante a la derecha en mobile y al borde del catálogo en desktop */}
      <ScrollToTopButton
        className={
          items.length > 0
            ? "bottom-36 right-4 sm:bottom-36 sm:right-6 lg:bottom-6 lg:right-[43%] xl:right-[35%]"
            : "bottom-20 right-4 sm:bottom-20 sm:right-6 lg:bottom-6 lg:right-[43%] xl:right-[35%]"
        }
      />
    </div>
  );
}
