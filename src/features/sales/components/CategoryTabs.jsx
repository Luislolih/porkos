import { Utensils, Beef, Flame, CupSoda } from 'lucide-react';

const CATEGORY_TABS = [
  { id: 'ALL', label: 'TODAS', icon: Utensils },
  { id: 'CLASICO', label: 'CLÁSICO', icon: Beef },
  { id: 'ARTESANAL', label: 'ARTESANAL', icon: Flame },
  { id: 'MARKET', label: 'MARKET', icon: CupSoda },
];

export default function CategoryTabs({
  selectedLine = 'ALL',
  onSelectLine,
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      {CATEGORY_TABS.map((tab) => {
        const isSelected = selectedLine === tab.id;
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
