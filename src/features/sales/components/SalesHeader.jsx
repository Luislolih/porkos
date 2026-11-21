import { Utensils, Store, Search, Users, Bike, ShoppingBag } from 'lucide-react';
import { SALES_MODES, ORDER_MODALITIES } from '../../../types/constants';
import { useCart } from '../../../context/useCart';

export default function SalesHeader({
  salesMode,
  setSalesMode,
  searchQuery,
  setSearchQuery,
  tables = [],
}) {
  const {
    modality,
    setModality,
    selectedTable,
    setSelectedTable,
    customerName,
    setCustomerName,
  } = useCart();

  const modalitiesList = [
    { id: ORDER_MODALITIES.MESA.id, label: 'Mesa', icon: Users },
    { id: ORDER_MODALITIES.PARA_LLEVAR.id, label: 'Llevar', icon: ShoppingBag },
    { id: ORDER_MODALITIES.CONSUMO_EXTERNO.id, label: 'Ir comiendo', icon: Utensils },
    { id: ORDER_MODALITIES.DELIVERY.id, label: 'Delivery', icon: Bike },
  ];

  return (
    <div className="space-y-2">
      {/* Upper bar: Mode Selector (RESTAURANTE vs MARKET) + Lupa al costado en la misma fila */}
      <div className="flex items-center gap-2">
        {/* Toggle Mode */}
        <div className="flex bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => {
              setSalesMode(SALES_MODES.RESTAURANT);
              setModality(ORDER_MODALITIES.MESA.id);
            }}
            className={`
              flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer
              ${
                salesMode === SALES_MODES.RESTAURANT
                  ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }
            `}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>RESTAURANTE</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSalesMode(SALES_MODES.MARKET);
              setModality('MARKET');
              setSelectedTable(null);
            }}
            className={`
              flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer
              ${
                salesMode === SALES_MODES.MARKET
                  ? 'bg-blue-600 text-white font-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }
            `}
          >
            <Store className="w-3.5 h-3.5" />
            <span>MARKET</span>
          </button>
        </div>

        {/* Solo la Lupa al costado para no quitar espacio vertical */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar..."
            className="w-full bg-black/60 border border-zinc-800 rounded-xl pl-9 pr-7 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Lower bar: Modalidades + Mesa (Botones cuadrados) + 'Nombre cliente' a la derecha */}
      {salesMode === SALES_MODES.RESTAURANT && (
        <div className="bg-black/40 p-2 rounded-xl border border-zinc-800/80 space-y-2">
          {/* Fila superior: Modalidades y Nombre de cliente */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Modalidades */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none">
              {modalitiesList.map((m) => {
                const Icon = m.icon;
                const isSelected = modality === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setModality(m.id);
                      if (m.id !== ORDER_MODALITIES.MESA.id) {
                        setSelectedTable(null);
                      }
                    }}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border
                      ${
                        isSelected
                          ? 'bg-zinc-800 text-white border-zinc-700/60 shadow-xs font-bold'
                          : 'bg-transparent text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-800/40'
                      }
                    `}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[var(--color-porkos-orange)]' : 'text-zinc-500'}`} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Nombre cliente */}
            <div className="relative flex-1 sm:w-48 sm:flex-initial">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nombre cliente"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 font-medium"
              />
            </div>
          </div>

          {/* Fila inferior si es MESA: Selector de mesas personalizado con botones cuadrados */}
          {modality === ORDER_MODALITIES.MESA.id && (
            <div className="flex items-center gap-2 pt-1.5 border-t border-zinc-800/60 w-full animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 text-xs font-black text-zinc-400 shrink-0 uppercase tracking-wide">
                <Utensils className="w-3.5 h-3.5 text-[var(--color-porkos-orange)]" />
                <span className="hidden sm:inline">Mesas:</span>
                <span className="sm:hidden">Mesa:</span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none flex-1 py-0.5">
                {tables.length === 0 ? (
                  <span className="text-xs text-zinc-500 italic">No hay mesas configuradas</span>
                ) : (
                  tables.map((t) => {
                    const isSelected = selectedTable?.id === t.id;
                    const isOccupied = t.status === 'OCCUPIED';
                    const matchNum = t.label?.match(/\d+/);
                    const shortText = matchNum ? `M${matchNum[0]}` : (t.label?.length > 4 ? t.label.slice(0, 4) : t.label);

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          // Un solo toque para cambiar de mesa al instante
                          setSelectedTable(isSelected ? null : t);
                        }}
                        title={`${t.label} • ${isOccupied ? 'Mesa con comanda abierta' : 'Mesa libre'}`}
                        className={`
                          w-10 h-10 sm:w-11 sm:h-11 rounded-xl shrink-0 flex flex-col items-center justify-center transition-all cursor-pointer border active:scale-90 select-none relative
                          ${
                            isSelected
                              ? 'bg-[var(--color-porkos-orange)] text-black border-[var(--color-porkos-orange)] font-black shadow-md shadow-orange-500/30 ring-2 ring-[var(--color-porkos-orange)]/50'
                              : isOccupied
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:border-amber-400/80 hover:bg-amber-500/25'
                              : 'bg-zinc-900/90 text-zinc-200 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800'
                          }
                        `}
                      >
                        <span className="text-[11px] sm:text-xs font-black leading-tight tracking-tight">
                          {shortText}
                        </span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                            isSelected
                              ? 'bg-black'
                              : isOccupied
                              ? 'bg-amber-400 animate-pulse'
                              : 'bg-emerald-400'
                          }`}
                        />
                      </button>
                    );
                  })
                )}
              </div>

              {selectedTable && (
                <div className="shrink-0 flex items-center gap-1.5 pl-1.5 text-xs border-l border-zinc-800">
                  <span className="font-extrabold text-[var(--color-porkos-orange)] text-xs hidden md:inline">
                    {selectedTable.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedTable(null)}
                    className="text-[10px] text-zinc-400 hover:text-rose-400 font-bold px-1.5 py-0.5 rounded border border-zinc-800 hover:border-rose-500/40 cursor-pointer transition-colors"
                    title="Deseleccionar mesa"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
