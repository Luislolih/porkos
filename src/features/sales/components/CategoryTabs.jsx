import { PRODUCT_LINES, SUBCATEGORIES } from '../../../types/defaultCatalog';

export default function CategoryTabs({
  selectedLine,
  onSelectLine,
  selectedSubcategory,
  onSelectSubcategory,
}) {
  return (
    <div className="space-y-2">
      {/* 1. Macro-categorías principales: TODOS | CLÁSICO | ARTESANAL | BEBIDAS & MARKET */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {Object.values(PRODUCT_LINES).map((line) => {
          const isSelected = selectedLine === line.id;
          return (
            <button
              key={line.id}
              onClick={() => {
                onSelectLine(line.id);
                onSelectSubcategory('all'); // reset subcategory on line change
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

      {/* 2. Subcategorías: Todas | Hamburguesas | Choriporkos | Salchiporkos | etc. */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {SUBCATEGORIES.map((sub) => {
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
