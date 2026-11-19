import { useState, useMemo, useEffect } from 'react';
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
import { useAuth } from '../../context/useAuth';
import { CheckCircle2, UtensilsCrossed, Edit3 } from 'lucide-react';

export default function SalesView({
  onOrderCreated,
  tables = [],
  orders = [],
  onSettleTableOrder,
  onOrderUpdated,
  onReturnToOrders,
}) {
  const { user } = useAuth();
  const [salesMode, setSalesMode] = useState(SALES_MODES.RESTAURANT);
  const [selectedLine, setSelectedLine] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [editingCartItem, setEditingCartItem] = useState(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [successToast, setSuccessToast] = useState(null);

  const { products, categories = [], packagings: catalogPackagings, recordProductSales } = useCatalog();

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

    let defaultPackaging = null;
    if (isTakeoutOrDelivery) {
      defaultPackaging =
        (catalogPackagings || []).find(
          (pkg) =>
            pkg.active &&
            pkg.id !== 'pkg_ninguno' &&
            (product.availablePackagingIds?.includes(pkg.id) ||
              pkg.applicableProductIds?.includes(product.id))
        ) || null;
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

  // Crear la orden y enviar a cocina (alimenta el histórico de ventas)
  const handleSendToKitchen = () => {
    // Exigir número de mesa si la modalidad es MESA
    if (salesMode !== SALES_MODES.MARKET && (modality === 'MESA' || modality === ORDER_MODALITIES.MESA.id)) {
      if (!selectedTable?.id) {
        showToast('Debes seleccionar un número de mesa para continuar');
        return;
      }
    }

    if (modality === 'DELIVERY') {
      const clientName = customerName?.trim() || customer.name?.trim();
      if (!clientName) {
        showToast('⚠️ Ingresa el nombre del cliente para delivery');
        return;
      }
    }

    const hasKitchenItems = items.some((i) => i.requiresKitchen);
    const isTable = modality === 'MESA' || modality === ORDER_MODALITIES.MESA?.id;
    const isDelivery = modality === 'DELIVERY';
    const isMarketSale = salesMode === SALES_MODES.MARKET || (!hasKitchenItems && !isTable && !isDelivery);

    let orderStatus;
    if (hasKitchenItems) {
      orderStatus = 'PENDIENTE';
    } else if (isDelivery) {
      // Pedido de delivery que no requiere cocina (market, bebidas, snacks): queda LISTO para despacho
      orderStatus = 'LISTO';
    } else if (isTable) {
      // Pedido a mesa sin preparación de cocina: entregado directo a mesa
      orderStatus = 'ENTREGADO';
    } else {
      orderStatus = 'ENTREGADO';
    }

    const operatorName = user?.displayName || user?.fullName || (user?.email ? user.email.split('@')[0] : 'Cajero');
    const operatorEmail = user?.email || 'caja@porkos.pe';

    const clientName = (customerName?.trim() || customer.name?.trim()) || (isDelivery ? 'Cliente Delivery' : null);
    const deliveryAddress = customer.address?.trim() || (isDelivery ? 'Dirección por coordinar' : null);

    const orderData = {
      orderNumber: getNextOrderNumber(orders, isTable ? 'P' : (isMarketSale ? 'M' : 'P')),
      modality: isTable ? 'MESA' : (isMarketSale && salesMode === SALES_MODES.MARKET ? 'MARKET' : modality),
      status: orderStatus,
      paymentStatus: isTable ? 'PENDING' : 'PAID',
      tableId: isTable ? (selectedTable?.id || null) : null,
      tableName: isTable ? (selectedTable?.label || null) : null,
      customerName: clientName,
      customer: isDelivery ? { ...customer, name: clientName || '', address: deliveryAddress } : null,
      items: [...items],
      packagings: [...packagings],
      generalNotes,
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

    // Actualizar histórico de ventas de los productos
    recordProductSales(items);

    if (onOrderCreated) {
      onOrderCreated(orderData);
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
          : `Pedido ${orderData.orderNumber} sumado a ${selectedTable.label}`
        : isDelivery
        ? hasKitchenItems
          ? `Pedido Delivery ${orderData.orderNumber} enviado a Cocina`
          : `Pedido Delivery ${orderData.orderNumber} listo para despacho`
        : isMarketSale
        ? `Venta ${orderData.orderNumber} entregada`
        : hasKitchenItems
        ? `Comanda ${orderData.orderNumber} enviada a Cocina`
        : `Pedido ${orderData.orderNumber} registrado (Listo)`
    );
  };

  const handleOpenCheckout = () => {
    // Exigir número de mesa si la modalidad es MESA
    if (salesMode !== SALES_MODES.MARKET && (modality === 'MESA' || modality === ORDER_MODALITIES.MESA.id)) {
      if (!selectedTable?.id) {
        showToast('Debes seleccionar un número de mesa para continuar');
        return;
      }
    }

    if (salesMode !== SALES_MODES.MARKET && modality === 'DELIVERY') {
      const clientName = customerName?.trim() || customer.name?.trim();
      if (!clientName) {
        showToast('⚠️ Ingresa el nombre del cliente para delivery');
        return;
      }
    }
    setIsPaymentOpen(true);
  };

  // Guardar edición de comanda activa existente
  const handleSaveEditedOrder = () => {
    if (!editingOrder) return;

    // Verificar si la orden ya fue entregada
    if (editingOrder.status === 'ENTREGADO') {
      showToast('⚠️ Esta comanda ya fue entregada y no puede ser modificada');
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

    if (modality === 'DELIVERY') {
      const clientName = customerName?.trim() || customer.name?.trim();
      if (!clientName) {
        showToast('⚠️ Ingresa el nombre del cliente para delivery');
        return;
      }
    }

    if (items.length === 0) {
      showToast('⚠️ La comanda debe tener al menos 1 producto');
      return;
    }

    const clientName = (customerName?.trim() || customer.name?.trim()) || (modality === 'DELIVERY' ? 'Cliente Delivery' : null);
    const deliveryAddress = customer.address?.trim() || (modality === 'DELIVERY' ? 'Dirección por coordinar' : null);

    const updatedOrder = {
      ...editingOrder,
      modality,
      tableId: modality === 'MESA' ? (selectedTable?.id || null) : null,
      tableName: modality === 'MESA' ? (selectedTable?.label || null) : null,
      customerName: clientName,
      customer: modality === 'DELIVERY' ? { ...customer, name: clientName || '', address: deliveryAddress } : null,
      items: [...items],
      packagings: [...packagings],
      generalNotes,
      subtotal: itemsSubtotal,
      packagingsTotal,
      deliveryFee,
      discount: discount || 0,
      total,
      updatedAt: new Date(),
    };

    if (onOrderUpdated) {
      onOrderUpdated(updatedOrder);
    }

    cancelEditingOrder();
    setIsMobileCartOpen(false);
    showToast(`Comanda ${updatedOrder.orderNumber} actualizada`);
    if (onReturnToOrders) {
      onReturnToOrders();
    }
  };

  const handleCancelEditing = () => {
    cancelEditingOrder();
    setIsMobileCartOpen(false);
    if (onReturnToOrders) {
      onReturnToOrders();
    }
  };

  // Cobro directo (alimenta el histórico de ventas)
  const handleConfirmPayment = (paymentDetail) => {
    const isMarketSale = salesMode === SALES_MODES.MARKET;
    const operatorName = user?.displayName || user?.fullName || (user?.email ? user.email.split('@')[0] : 'Cajero');
    const operatorEmail = user?.email || 'caja@porkos.pe';

    const hasKitchenItems = items.some((i) => i.requiresKitchen);
    const isDelivery = !isMarketSale && modality === 'DELIVERY';
    const orderStatus = isMarketSale
      ? 'ENTREGADO'
      : (hasKitchenItems ? 'PENDIENTE' : (isDelivery ? 'LISTO' : 'ENTREGADO'));

    const clientName = isMarketSale
      ? 'Venta Mostrador'
      : ((customerName?.trim() || customer.name?.trim()) || (isDelivery ? 'Cliente Delivery' : null));
    const deliveryAddress = customer.address?.trim() || (isDelivery ? 'Dirección por coordinar' : null);

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
      generalNotes: isMarketSale ? 'Venta directa en caja' : generalNotes,
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

    // Actualizar histórico de ventas de los productos
    recordProductSales(items);

    if (onOrderCreated) {
      onOrderCreated(orderData, Boolean(orderData.tableId));
    }

    clearCart();
    setIsPaymentOpen(false);
    setIsMobileCartOpen(false);
    showToast(
      isMarketSale
        ? `Venta Market ${orderData.orderNumber} cobrada con éxito`
        : `Pedido ${orderData.orderNumber} cobrado con éxito`
    );
  };

  return (
    <div className="relative pb-24 lg:pb-8">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-black font-bold text-xs px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successToast}</span>
        </div>
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
                <span>Editando comanda <strong>{editingOrder.orderNumber}</strong></span>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-3.5">
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
            <div className="py-12 text-center text-zinc-500 bg-[var(--color-porkos-surface)] border border-dashed border-zinc-800 rounded-2xl p-8 max-w-md mx-auto my-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-[var(--color-porkos-orange)] border border-orange-500/20 flex items-center justify-center mx-auto">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-white">
                  {products.length === 0 ? 'Tu catálogo está vacío' : 'No se encontraron productos'}
                </p>
                <p className="text-xs text-zinc-400">
                  {products.length === 0
                    ? 'Agrega productos en el menú Catálogo.'
                    : 'Prueba otro término de búsqueda.'}
                </p>
              </div>
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
            tables={tables}
            onSaveEditedOrder={handleSaveEditedOrder}
            onCancelEditing={handleCancelEditing}
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm touch-none"
            onClick={() => setIsMobileCartOpen(false)}
          />
          <div className="relative z-10 max-h-[88vh] h-full flex flex-col bg-[var(--color-porkos-surface)] rounded-t-3xl border-t border-[var(--color-porkos-border)] shadow-2xl overflow-hidden overscroll-contain">
            {/* Tirador superior para cerrar o deslizar */}
            <div
              className="w-full py-2.5 flex items-center justify-center cursor-pointer shrink-0 touch-none bg-black/30 border-b border-zinc-800/60"
              onClick={() => setIsMobileCartOpen(false)}
              title="Toca para cerrar"
            >
              <div className="w-12 h-1 bg-zinc-600 rounded-full" />
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
      />

      {/* Flecha flotante para subir al inicio en listas largas */}
      <ScrollToTopButton />
    </div>
  );
}
