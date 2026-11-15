import { useState, useMemo } from 'react';
import { SALES_MODES } from '../../types/constants';
import { useCart } from '../../context/useCart';
import { useCatalog } from '../../context/useCatalog';
import SalesHeader from './components/SalesHeader';
import CategoryTabs from './components/CategoryTabs';
import ProductCard from './components/ProductCard';
import QuickCustomizerModal from './components/QuickCustomizerModal';
import CartView from './components/CartView';
import QuickPaymentModal from './components/QuickPaymentModal';
import { formatCurrency } from '../../utils/formatters';
import { CheckCircle2 } from 'lucide-react';

export default function SalesView({ onOrderCreated, tables = [], onSettleTableOrder }) {
  const [salesMode, setSalesMode] = useState(SALES_MODES.RESTAURANT);
  const [selectedLine, setSelectedLine] = useState('ALL');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [editingCartItem, setEditingCartItem] = useState(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [successToast, setSuccessToast] = useState(null);

  const { products, recordProductSales } = useCatalog();

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
    clearCart,
  } = useCart();

  // Filtrar productos por Línea (CLÁSICO / ARTESANAL / BEBIDAS_MARKET), Subcategoría y Búsqueda
  // Ordenados POR DEFECTO de mayor a menor salida según el histórico (salesCount)
  const filteredAndSortedProducts = useMemo(() => {
    const list = products.filter((prod) => {
      // Si estamos en modo MARKET rápido, solo mostrar productos tipo MARKET
      if (salesMode === SALES_MODES.MARKET && prod.type !== 'MARKET') return false;

      // Filtrar por Línea (si no es TODOS)
      if (selectedLine !== 'ALL' && prod.line !== selectedLine) return false;

      // Filtrar por Subcategoría (si no es todas)
      if (selectedSubcategory !== 'all' && prod.subcategory !== selectedSubcategory) return false;

      // Búsqueda por texto
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
  }, [products, salesMode, selectedLine, selectedSubcategory, searchQuery]);

  // Añadir rápido (Por defecto SIN cremas marcadas, el usuario las personaliza o pide directo)
  const handleQuickAdd = (product) => {
    if (product.type === SALES_MODES.MARKET) {
      addItem(product, {
        temperature: product.temperatureConfig?.enabled ? 'HELADA' : null,
        creamsSummary: '',
        selectedModifiers: [],
        selectedExtras: [],
        removedIngredients: [],
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
        temperature: product.temperatureConfig?.defaultOption || 'HELADA',
        creamsSummary: '',
        creamsDetail: {
          selected: [],
          mode: 'NONE',
        },
        saladSummary: product.saladConfig?.enabled ? 'CON ENSALADA COMPLETA' : '',
        selectedModifiers: defaultMods,
        selectedExtras: [],
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
    const orderData = {
      orderNumber: `P-${Math.floor(100 + Math.random() * 900)}`,
      modality,
      status: 'PENDIENTE',
      paymentStatus: 'PENDING',
      tableId: selectedTable?.id || null,
      tableName: selectedTable?.label || null,
      customerName: customerName.trim() || null,
      customer: modality === 'DELIVERY' ? customer : null,
      items: [...items],
      packagings: [...packagings],
      generalNotes,
      subtotal: itemsSubtotal,
      packagingsTotal,
      deliveryFee,
      discount: 0,
      total,
      createdAt: new Date(),
    };

    // Actualizar histórico de ventas de los productos
    recordProductSales(items);

    if (onOrderCreated) {
      onOrderCreated(orderData);
    }

    clearCart();
    setIsMobileCartOpen(false);
    showToast(`Comanda ${orderData.orderNumber} enviada a Cocina`);
  };

  // Cobro directo (alimenta el histórico de ventas)
  const handleConfirmPayment = (paymentDetail) => {
    const orderData = {
      orderNumber: `P-${Math.floor(100 + Math.random() * 900)}`,
      modality,
      status: items.some((i) => i.requiresKitchen) ? 'PENDIENTE' : 'LISTO',
      paymentStatus: 'PAID',
      tableId: selectedTable?.id || null,
      tableName: selectedTable?.label || null,
      customerName: customerName.trim() || null,
      customer: modality === 'DELIVERY' ? customer : null,
      items: [...items],
      packagings: [...packagings],
      generalNotes,
      subtotal: itemsSubtotal,
      packagingsTotal,
      deliveryFee,
      discount: 0,
      total,
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
      onOrderCreated(orderData, true);
    }

    clearCart();
    setIsMobileCartOpen(false);
    showToast(`Venta ${orderData.orderNumber} cobrada con éxito`);
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
          <SalesHeader
            salesMode={salesMode}
            setSalesMode={(mode) => {
              setSalesMode(mode);
              setSelectedLine('ALL');
              setSelectedSubcategory('all');
            }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            tables={tables}
          />

          {/* Categorías organizadas en CLÁSICO / ARTESANAL y Subcategorías */}
          <CategoryTabs
            selectedLine={selectedLine}
            onSelectLine={setSelectedLine}
            selectedSubcategory={selectedSubcategory}
            onSelectSubcategory={setSelectedSubcategory}
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
            <div className="py-16 text-center text-zinc-500">
              <p className="font-semibold text-sm">No se encontraron productos</p>
              <p className="text-xs text-zinc-600 mt-1">
                Puedes cambiar de línea o subcategoría
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Desktop Cart */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-20 h-[calc(100vh-6rem)]">
          <CartView
            onSendToKitchen={handleSendToKitchen}
            onCheckout={() => setIsPaymentOpen(true)}
            onSettleTable={onSettleTableOrder}
            onEditItem={handleEditCartItem}
          />
        </div>
      </div>

      {/* Mobile Floating Cart Summary Button */}
      {items.length > 0 && (
        <div className="lg:hidden fixed bottom-16 left-3 right-3 z-30 animate-in slide-in-from-bottom-4">
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full bg-[var(--color-porkos-orange)] text-black p-3.5 rounded-2xl flex items-center justify-between font-black shadow-xl shadow-orange-500/30 active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-black text-white text-xs flex items-center justify-center font-extrabold">
                {itemCount}
              </div>
              <span className="text-sm uppercase tracking-tight">Ver Comanda</span>
            </div>
            <span className="text-base font-black">{formatCurrency(total)}</span>
          </button>
        </div>
      )}

      {/* Mobile Cart Drawer */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsMobileCartOpen(false)}
          />
          <div className="relative z-10 max-h-[85vh] h-full flex flex-col">
            <CartView
              onSendToKitchen={handleSendToKitchen}
              onCheckout={() => setIsPaymentOpen(true)}
              onSettleTable={onSettleTableOrder}
              onEditItem={handleEditCartItem}
            />
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
        initialCustomization={editingCartItem?.customization || null}
        onConfirm={handleConfirmCustomization}
      />

      {/* Quick Payment Modal */}
      <QuickPaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        total={total}
        onConfirmPayment={handleConfirmPayment}
      />
    </div>
  );
}
