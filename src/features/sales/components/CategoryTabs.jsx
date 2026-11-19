import { Utensils, UtensilsCrossed, CupSoda, Cake, Store, Cookie } from 'lucide-react';
import { SALES_MODES } from '../../../types/constants';

const RESTAURANT_TABS = [
  { id: 'ALL', label: 'TODO', icon: Utensils },
  { id: 'COMIDA', label: 'COMIDA', icon: UtensilsCrossed },
  { id: 'BEBIDAS', label: 'BEBIDAS', icon: CupSoda },
  { id: 'POSTRES', label: 'POSTRES', icon: Cake },
  { id: 'MARKET', label: 'MARKET', icon: Store },
];

const MARKET_TABS = [
  { id: 'MARKET_ALL', label: 'TODO EL MARKET', icon: Store },
  { id: 'MARKET_BEBIDAS', label: 'BEBIDAS / SODAS', icon: CupSoda },
  { id: 'MARKET_SNACKS', label: 'POSTRES & SNACKS', icon: Cookie },
];

export default function CategoryTabs({
  salesMode = SALES_MODES.RESTAURANT,
  selectedLine = 'ALL',
  onSelectLine,
}) {
  const isMarket = salesMode === SALES_MODES.MARKET;
  const tabs = isMarket ? MARKET_TABS : RESTAURANT_TABS;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      {tabs.map((tab) => {
        const isSelected =
          selectedLine === tab.id ||
          (isMarket && tab.id === 'MARKET_ALL' && selectedLine === 'ALL');
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectLine(tab.id)}
            className={`
              px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer border active:scale-95 shadow-sm
              ${
                isSelected
                  ? 'bg-[var(--color-porkos-orange)] text-black border-transparent shadow-orange-500/20'
                  : 'bg-zinc-900/90 text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700'
              }
            `}
          >
            <Icon className={`w-4 h-4 ${isSelected ? 'text-black' : 'text-zinc-500'}`} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
