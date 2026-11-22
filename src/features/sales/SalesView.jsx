import { useState, useMemo, useEffect, useRef } from 'react';
import { SALES_MODES, ORDER_MODALITIES } from '../../types/constants';
import { useCart } from '../../context/useCart';
import { useCatalog } from '../../context/useCatalog';
import SalesHeader from './components/SalesHeader';
import CategoryTabs from './components/CategoryTabs';
import ProductCard from './components/ProductCard';
import QuickCustomizerModal from './components/QuickCustomizerModal';
import CartView from './components/CartView';
import QuickPaymentModal from './components/QuickPaymentModal';
import ScrollToTopButton from '../../components/ui/ScrollToTopButton';
import { formatCurrency } from '../../utils/formatters';
import { getNextOrderNumber } from '../../utils/orderNumber';
import { isProductBeverage, isProductMarket, isProductFood, isProductDessert, isProductSnack } from '../../utils/productCategories';
import { sanitizeText, sanitizeNotes } from '../../utils/security';
import { useAuth } from '../../context/useAuth';
import Toast from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import { UtensilsCrossed, Edit3 } from 'lucide-react';

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
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(() => Boolean(editingOrder));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [drawerDragY, setDrawerDragY] = useState(0);
  const [isDraggingDrawer, setIsDraggingDrawer] = useState(false);
  const drawerStartYRef = useRef(0);
  const lastEditingOrderIdRef = useRef(null);

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

  const handleDrawerTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    drawerStartYRef.current = e.touches[0].clientY;
    setIsDraggingDrawer(true);
  };

  const handleDrawerTouchMove = (e) => {
    if (!isDraggingDrawer || !e.touches || e.touches.length === 0) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - drawerStartYRef.current;
    if (deltaY > 0) {
      setDrawerDragY(deltaY);
    } else {
      setDrawerDragY(0);
    }
  };

  const handleDrawerTouchEnd = () => {
    if (!isDraggingDrawer) return;
    setIsDraggingDrawer(false);
    if (drawerDragY > 60) {
      setIsMobileCartOpen(false);
    }
    setDrawerDragY(0);
  };

  const [successToast, setSuccessToast] = useState(null);

  const { products, categories = [], packagings: catalogPackagings, recordProductSales } = useCatalog();

  // Prevenir scroll en el fondo (ventas) al abrir el cajón de comanda en móvil
  useEffect(() => {
    if (!isMobileCartOpen) return;
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isMobileCartOpen]);

  // Filtrar productos por Categorías principales: TODAS, CLÁSICO, ARTESANAL, MARKET y Búsqueda
  // Ordenados POR DEFECTO de mayor a menor salida según el histórico (salesCount)
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

    // Ordenar de mayor salida a menor salida
    return list.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
  }, [products, categories, salesMode, selectedLine, searchQuery]);

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
      product.modifiers?.forEach((mod) => {
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
    const baseProd = products.find((p) => p.id === cartItem.productId) || {
      id: cartItem.productId,
      name: cartItem.name,
      price: cartItem.basePrice || cartItem.unitPrice,
    };
    setEditingCartItem(cartItem);
    setCustomizingProduct(baseProd);
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

  const showToast = (message) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 2500);
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
      {/* Toast Notification */}
      {successToast && (
        <Toast
          message={successToast}
          type="success"
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
          />

          {/* Categorías contextuales (Restaurante o Market) */}
          <CategoryTabs
            salesMode={salesMode}
            selectedLine={selectedLine}
            onSelectLine={setSelectedLine}
          />

          {/* Grid de Productos (Ordenados de mayor a menor salida) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3.5">
            {filteredAndSortedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickAdd={handleQuickAdd}
                onCustomize={handleOpenCustomizer}
                isMarketMode={salesMode === SALES_MODES.MARKET}
              />
            ))}
          </div>

          {filteredAndSortedProducts.length === 0 && (
            <EmptyState
              icon={UtensilsCrossed}
              title={products.length === 0 ? 'El catálogo está vacío' : 'No se encontraron productos'}
              description={
                products.length === 0
                  ? 'Agrega productos en el módulo de Catálogo para empezar a vender.'
                  : 'No hay productos que coincidan con la búsqueda o categoría seleccionada.'
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

      {/* Mobile Cart Drawer */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end overscroll-contain">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm touch-none transition-opacity"
            style={{ opacity: Math.max(0.2, 1 - drawerDragY / 300) }}
            onClick={() => setIsMobileCartOpen(false)}
          />
          <div
            className="relative z-10 max-h-[88vh] h-full flex flex-col bg-[var(--color-porkos-surface)] rounded-t-3xl border-t border-[var(--color-porkos-border)] shadow-2xl overflow-hidden overscroll-contain"
            style={{
              transform: drawerDragY > 0 ? `translateY(${drawerDragY}px)` : undefined,
              transition: isDraggingDrawer ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Tirador superior deslizante: arrastrar hacia abajo para cerrar o pulsar */}
            <div
              className="w-full py-2.5 flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0 touch-none bg-black/40 border-b border-zinc-800/80 group select-none"
              onTouchStart={handleDrawerTouchStart}
              onTouchMove={handleDrawerTouchMove}
              onTouchEnd={handleDrawerTouchEnd}
              onClick={() => setIsMobileCartOpen(false)}
              title="Desliza hacia abajo o toca para cerrar"
            >
              <div className="w-16 h-1.5 bg-zinc-500 rounded-full group-hover:bg-[var(--color-porkos-orange)] transition-colors shadow-xs" />
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              <CartView
                isMarketMode={salesMode === SALES_MODES.MARKET}
                onSendToKitchen={handleSendToKitchen}
                onCheckout={handleOpenCheckout}
                onSettleTable={onSettleTableOrder}
                onEditItem={handleEditCartItem}
                onCloseMobileCart={() => setIsMobileCartOpen(false)}
                tables={tables}
                onSaveEditedOrder={handleSaveEditedOrder}
                onCancelEditing={handleCancelEditing}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}

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

      {/* Quick Payment Modal */}
      <QuickPaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        total={total}
        onConfirmPayment={handleConfirmPayment}
        isSubmitting={isSubmitting}
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
