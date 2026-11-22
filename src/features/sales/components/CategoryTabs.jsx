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
  { id: 'MARKET_ALL', label: 'TODO', icon: Store },
  { id: 'MARKET_BEBIDAS', label: 'BEBIDAS', icon: CupSoda },
  { id: 'MARKET_SNACKS', label: 'SNACKS', icon: Cookie },
  { id: 'MARKET_POSTRES', label: 'POSTRES', icon: Cake },
];

export default function CategoryTabs({
  salesMode = SALES_MODES.RESTAURANT,
  selectedLine = 'ALL',
  onSelectLine,
}) {
  const isMarket = salesMode === SALES_MODES.MARKET;
  const tabs = isMarket ? MARKET_TABS : RESTAURANT_TABS;

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none select-none">
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
              px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all duration-120 flex items-center gap-2 cursor-pointer border active:scale-95 touch-manipulation shadow-xs
              ${
                isSelected
                  ? 'bg-[var(--color-porkos-orange)] text-zinc-950 border-[var(--color-porkos-orange)] shadow-md shadow-orange-500/20'
                  : 'bg-[#121215] text-zinc-400 hover:text-white border-[var(--color-porkos-border)] hover:border-zinc-700 hover:bg-[#18181D]'
              }
            `}
          >
            <Icon
              className={`w-4 h-4 shrink-0 ${isSelected ? 'text-zinc-950 stroke-[2.5]' : 'text-zinc-500'}`}
            />
            <span className="tracking-wide">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
