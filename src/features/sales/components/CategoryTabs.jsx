import { PRODUCT_LINES } from '../../../types/defaultCatalog';

export default function CategoryTabs({
  salesMode = 'RESTAURANTE',
  selectedLine,
  onSelectLine,
  selectedSubcategory,
  onSelectSubcategory,
}) {
  // En modo MARKET (Rápido), mostrar únicamente las categorías de market
  if (salesMode === 'MARKET') {
    const marketFilters = [
      { id: 'all', label: 'Todos de Market' },
      { id: 'bebidas', label: 'Gaseosas & Bebidas' },
      { id: 'market', label: 'Snacks & Postres' },
    ];

    return (
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {marketFilters.map((sub) => {
          const isSelected = selectedSubcategory === sub.id;
          return (
            <button
              key={sub.id}
              onClick={() => onSelectSubcategory(sub.id)}
              className={`
                px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer border
                ${
                  isSelected
                    ? 'bg-blue-600 text-white border-transparent shadow-sm'
                    : 'bg-zinc-900/90 text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700'
                }
              `}
            >
              {sub.label}
            </button>
          );
        })}
      </div>
    );
  }

  // En modo RESTAURANTE, mostrar las líneas gastronómicas y subcategorías completas (incluido bebidas y market)
  const restaurantLines = [
    PRODUCT_LINES.ALL,
    PRODUCT_LINES.CLASICO,
    PRODUCT_LINES.ARTESANAL,
    PRODUCT_LINES.BEBIDAS_MARKET,
  ];

  const restaurantSubcategories = [
    { id: 'all', label: 'Todas las categorías' },
    { id: 'hamburguesas', label: 'Hamburguesas' },
    { id: 'choripanes', label: 'Choriporkos' },
    { id: 'salchipapas', label: 'Salchiporkos' },
    { id: 'bebidas', label: 'Bebidas & Gaseosas' },
    { id: 'market', label: 'Snacks & Postres' },
  ];

  return (
    <div className="space-y-2">
      {/* 1. Macro-categorías principales gastronómicas */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {restaurantLines.map((line) => {
          const isSelected = selectedLine === line.id;
          return (
            <button
              key={line.id}
              onClick={() => {
                onSelectLine(line.id);
                onSelectSubcategory('all');
              }}
              className={`
                px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer border
                ${
                  isSelected
                    ? 'bg-[var(--color-porkos-orange)] text-black border-transparent shadow-sm'
                    : 'bg-zinc-900/80 text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700'
                }
              `}
            >
              {line.label}
            </button>
          );
        })}
      </div>

      {/* 2. Subcategorías gastronómicas */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {restaurantSubcategories.map((sub) => {
          const isSelected = selectedSubcategory === sub.id;
          return (
            <button
              key={sub.id}
              onClick={() => onSelectSubcategory(sub.id)}
              className={`
                px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer border
                ${
                  isSelected
                    ? 'bg-zinc-800 text-white border-zinc-600 shadow-sm'
                    : 'bg-black/40 text-zinc-500 hover:text-zinc-300 border-zinc-800/80 hover:border-zinc-700'
                }
              `}
            >
              {sub.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
