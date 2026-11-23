import { useState, useMemo } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  RotateCcw,
  Check,
  UtensilsCrossed,
  CupSoda,
  Cake,
  Store,
  Utensils,
  Cookie,
  SlidersHorizontal,
} from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import ProductThumbnail from '../../../components/ui/ProductThumbnail';
import { formatCurrency } from '../../../utils/formatters';
import {
  isProductFood,
  isProductBeverage,
  isProductDessert,
  isProductMarket,
  isProductSnack,
} from '../../../utils/productCategories';
import { SALES_MODES } from '../../../types/constants';

const RESTAURANT_CATEGORIES = [
  { id: 'ALL', label: 'TODO', icon: Utensils },
  { id: 'COMIDA', label: 'COMIDA', icon: UtensilsCrossed },
  { id: 'BEBIDAS', label: 'BEBIDAS', icon: CupSoda },
  { id: 'POSTRES', label: 'POSTRES', icon: Cake },
  { id: 'MARKET', label: 'MARKET', icon: Store },
];

const MARKET_CATEGORIES = [
  { id: 'MARKET_ALL', label: 'TODO', icon: Store },
  { id: 'MARKET_BEBIDAS', label: 'BEBIDAS', icon: CupSoda },
  { id: 'MARKET_SNACKS', label: 'SNACKS', icon: Cookie },
  { id: 'MARKET_POSTRES', label: 'POSTRES', icon: Cake },
];

function ReorderCategoryList({
  activeCategory,
  categoryLabel,
  categoryProducts = [],
  savedOrder = null,
  categories = [],
  onSaveOrder,
  onResetOrder,
  onShowToast,
  onClose,
}) {
  const [orderedItems, setOrderedItems] = useState(() => {
    const list = [...categoryProducts];
    if (Array.isArray(savedOrder) && savedOrder.length > 0) {
      list.sort((a, b) => {
        const indexA = savedOrder.indexOf(a.id);
        const indexB = savedOrder.indexOf(b.id);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return (b.salesCount || 0) - (a.salesCount || 0);
      });
    } else {
      list.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
    }
    return list;
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const moveItem = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= orderedItems.length || fromIndex === toIndex) return;
    const nextList = [...orderedItems];
    const [moved] = nextList.splice(fromIndex, 1);
    nextList.splice(toIndex, 0, moved);
    setOrderedItems(nextList);
    setHasChanges(true);
  };

  const moveToTop = (index) => {
    if (index === 0) return;
    moveItem(index, 0);
  };

  const moveToBottom = (index) => {
    if (index === orderedItems.length - 1) return;
    moveItem(index, orderedItems.length - 1);
  };

  const handleResetToPopular = async () => {
    const list = [...categoryProducts].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
    setOrderedItems(list);
    setHasChanges(true);

    if (onResetOrder) {
      await onResetOrder(activeCategory);
      if (onShowToast) {
        onShowToast(`Orden de ${categoryLabel} restablecido a más vendidos`);
      }
      setHasChanges(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const ids = orderedItems.map((p) => p.id);
      if (onSaveOrder) {
        await onSaveOrder(activeCategory, ids);
      }
      if (onShowToast) {
        onShowToast(`Orden de carta guardado para ${categoryLabel}`);
      }
      onClose();
    } catch (err) {
      console.error('Error al guardar orden:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const isCustomActive = Boolean(savedOrder);

  return (
    <div className="space-y-3">
      {/* Barra de Herramientas y Resumen */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-2">
          <span className="text-zinc-300 font-bold">
            {orderedItems.length} {orderedItems.length === 1 ? 'producto' : 'productos'}
          </span>
          {isCustomActive && (
            <span className="text-[10px] bg-orange-500/15 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded-full font-bold">
              Orden personalizado activo
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleResetToPopular}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-[11px] font-semibold hover:underline cursor-pointer transition-colors"
          title="Ordenar automáticamente por cantidad de ventas histórica"
        >
          <RotateCcw className="w-3 h-3 text-zinc-500" />
          <span>Restablecer a más vendidos</span>
        </button>
      </div>

      {/* Lista interactiva de productos */}
      {orderedItems.length === 0 ? (
        <div className="py-12 text-center text-zinc-500 text-xs rounded-2xl border border-dashed border-zinc-800">
          No hay productos registrados en la categoría {categoryLabel}.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1 select-none">
          {orderedItems.map((prod, index) => {
            const isFirst = index === 0;
            const isLast = index === orderedItems.length - 1;

            return (
              <div
                key={prod.id}
                className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl bg-[#141418] hover:bg-[#18181E] border border-zinc-800/80 hover:border-zinc-700/80 transition-all duration-120 group"
              >
                {/* Izquierda: Posición + Miniatura + Info */}
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  {/* Número de Orden */}
                  <div className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-black text-xs flex items-center justify-center shrink-0">
                    {index + 1}
                  </div>

                  {/* Miniatura */}
                  <ProductThumbnail
                    src={prod.image}
                    thumbnailUrl={prod.thumbnailUrl}
                    name={prod.name}
                    isBeverage={isProductBeverage(prod)}
                    isDessert={isProductDessert(prod, categories)}
                    className="w-10 h-10 rounded-xl shrink-0 border border-zinc-800 shadow-xs"
                    iconSize="w-5 h-5"
                  />

                  {/* Datos del producto */}
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white text-xs sm:text-sm truncate">
                      {prod.name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                      <span className="font-extrabold text-[var(--color-porkos-orange)]">
                        {formatCurrency(prod.price)}
                      </span>
                      {prod.salesCount !== undefined && prod.salesCount > 0 && (
                        <span className="text-zinc-500 font-medium">
                          • {prod.salesCount} {prod.salesCount === 1 ? 'salida' : 'salidas'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Derecha: Botones ergonómicos de movimiento */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Al inicio */}
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => moveToTop(index)}
                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="Mover al primer lugar (#1)"
                    aria-label="Mover al inicio"
                  >
                    <ChevronsUp className="w-3.5 h-3.5" />
                  </button>

                  {/* Subir un puesto */}
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => moveItem(index, index - 1)}
                    className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-90 text-zinc-200 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center border border-zinc-700/60 transition-all"
                    title="Subir un puesto"
                    aria-label="Subir"
                  >
                    <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  {/* Bajar un puesto */}
                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => moveItem(index, index + 1)}
                    className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-90 text-zinc-200 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center border border-zinc-700/60 transition-all"
                    title="Bajar un puesto"
                    aria-label="Bajar"
                  >
                    <ArrowDown className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  {/* Al final */}
                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => moveToBottom(index)}
                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="Mover al último lugar"
                    aria-label="Mover al final"
                  >
                    <ChevronsDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Acciones del pie */}
      <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="text-xs font-bold"
        >
          Cerrar
        </Button>

        <Button
          type="button"
          onClick={handleSave}
          isLoading={isSaving}
          disabled={!hasChanges && isCustomActive}
          icon={Check}
          className="text-xs sm:text-sm font-black bg-[var(--color-porkos-orange)] text-zinc-950 shadow-md shadow-orange-500/20"
        >
          Guardar Orden de {categoryLabel}
        </Button>
      </div>
    </div>
  );
}

export default function ReorderCategoryModal({
  isOpen,
  onClose,
  initialCategory = 'COMIDA',
  salesMode = SALES_MODES.RESTAURANT,
  products = [],
  categories = [],
  categoryOrderMap = {},
  onSaveOrder,
  onResetOrder,
  onShowToast,
}) {
  const isMarket = salesMode === SALES_MODES.MARKET;
  const categoryTabs = isMarket ? MARKET_CATEGORIES : RESTAURANT_CATEGORIES;

  const [activeCategory, setActiveCategory] = useState(initialCategory || (isMarket ? 'MARKET_ALL' : 'COMIDA'));

  // Filtrar los productos pertenecientes a la categoría seleccionada
  const categoryProducts = useMemo(() => {
    return products.filter((prod) => {
      if (isMarket) {
        if (!isProductMarket(prod, categories)) return false;
        if (activeCategory === 'MARKET_BEBIDAS') return isProductBeverage(prod);
        if (activeCategory === 'MARKET_SNACKS') return isProductSnack(prod);
        if (activeCategory === 'MARKET_POSTRES') return isProductDessert(prod, categories);
        return true; // MARKET_ALL
      } else {
        if (activeCategory === 'COMIDA') {
          return (
            isProductFood(prod, categories) &&
            !isProductMarket(prod, categories) &&
            !isProductDessert(prod, categories) &&
            !isProductBeverage(prod)
          );
        } else if (activeCategory === 'BEBIDAS') {
          return isProductBeverage(prod);
        } else if (activeCategory === 'POSTRES') {
          return isProductDessert(prod, categories);
        } else if (activeCategory === 'MARKET') {
          return isProductMarket(prod, categories);
        }
        return true; // ALL
      }
    });
  }, [products, categories, isMarket, activeCategory]);

  if (!isOpen) return null;

  const currentTab = categoryTabs.find((t) => t.id === activeCategory);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-[var(--color-porkos-orange)]" />
          <span>Organizar Carta: {currentTab?.label || activeCategory}</span>
        </span>
      }
      subtitle="Ajusta el orden visual de los productos para que coincida exactamente con tu carta o menú físico."
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Selector de Categorías (Pestañas internas) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-zinc-800">
          {categoryTabs.map((tab) => {
            const isSelected = activeCategory === tab.id;
            const Icon = tab.icon;
            const hasCustom = Boolean(categoryOrderMap?.[tab.id]);

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveCategory(tab.id);
                }}
                className={`
                  px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 cursor-pointer border active:scale-95 touch-manipulation
                  ${
                    isSelected
                      ? 'bg-[var(--color-porkos-orange)] text-zinc-950 border-[var(--color-porkos-orange)] shadow-md shadow-orange-500/20'
                      : 'bg-[#141418] text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700'
                  }
                `}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-zinc-950' : 'text-zinc-500'}`} />
                <span>{tab.label}</span>
                {hasCustom && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-porkos-orange)]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Lista con clave única por categoría para recargar automáticamente su estado */}
        <ReorderCategoryList
          key={`${activeCategory}_${isOpen}`}
          activeCategory={activeCategory}
          categoryLabel={currentTab?.label || activeCategory}
          categoryProducts={categoryProducts}
          savedOrder={categoryOrderMap?.[activeCategory]}
          categories={categories}
          onSaveOrder={onSaveOrder}
          onResetOrder={onResetOrder}
          onShowToast={onShowToast}
          onClose={onClose}
        />
      </div>
    </Modal>
  );
}
