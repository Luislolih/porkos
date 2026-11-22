import { Utensils, Store, Search, Users, Bike, ShoppingBag, User, X } from 'lucide-react';
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
    { id: ORDER_MODALITIES.PARA_LLEVAR.id, label: 'Para Llevar', icon: ShoppingBag },
    { id: ORDER_MODALITIES.CONSUMO_EXTERNO.id, label: 'Ir Comiendo', icon: Utensils },
    { id: ORDER_MODALITIES.DELIVERY.id, label: 'Delivery', icon: Bike },
  ];

  return (
    <div className="space-y-2.5">
      {/* Top Bar: Selector de Modo (Restaurante vs Market) + Barra de Búsqueda Rápida */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Toggle Mode Segmented Control */}
        <div className="flex bg-[#121216] p-1 rounded-2xl border border-[var(--color-porkos-border)] shrink-0 shadow-xs">
          <button
            type="button"
            onClick={() => {
              setSalesMode(SALES_MODES.RESTAURANT);
              setModality(ORDER_MODALITIES.MESA.id);
            }}
            className={`
              flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer select-none active:scale-95 touch-manipulation
              ${
                salesMode === SALES_MODES.RESTAURANT
                  ? 'bg-[var(--color-porkos-orange)] text-zinc-950 shadow-md shadow-orange-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
              }
            `}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span className="tracking-wide">RESTAURANTE</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSalesMode(SALES_MODES.MARKET);
              setModality('MARKET');
              setSelectedTable(null);
            }}
            className={`
              flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer select-none active:scale-95 touch-manipulation
              ${
                salesMode === SALES_MODES.MARKET
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
              }
            `}
          >
            <Store className="w-3.5 h-3.5" />
            <span className="tracking-wide">MARKET</span>
          </button>
        </div>

        {/* Barra de Búsqueda: Desktop con placeholder, mobile solo lupa */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar producto"
            className="w-full bg-[#121216] border border-[var(--color-porkos-border)] hover:border-zinc-700 focus:border-[var(--color-porkos-orange)] focus:ring-1 focus:ring-[var(--color-porkos-orange)]/30 rounded-2xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder:text-transparent md:placeholder:text-zinc-500 font-medium transition-all focus:outline-none"
            aria-label="Buscar producto"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              title="Borrar búsqueda"
              aria-label="Borrar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Control de Operación en Restaurante: Modalidades de atención y Mesas */}
      {salesMode === SALES_MODES.RESTAURANT && (
        <div className="bg-[#121216] p-2.5 sm:p-3 rounded-2xl border border-[var(--color-porkos-border)] space-y-2.5 shadow-sm">
          {/* Fila 1: Chips de Modalidades + Input de Cliente */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Modalidades */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none">
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
                      flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border select-none active:scale-95 touch-manipulation
                      ${
                        isSelected
                          ? 'bg-zinc-800 text-white border-zinc-600 shadow-xs'
                          : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border-zinc-800/80 hover:bg-zinc-800/40'
                      }
                    `}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        isSelected ? 'text-[var(--color-porkos-orange)]' : 'text-zinc-500'
                      }`}
                    />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Nombre del Cliente */}
            <div className="relative flex-1 sm:w-56 sm:flex-initial min-w-[140px]">
              <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nombre del cliente..."
                className="w-full bg-[#0E0E11] border border-zinc-800 hover:border-zinc-700 focus:border-[var(--color-porkos-orange)] rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-zinc-500 font-medium focus:outline-none transition-colors"
              />
              {customerName && (
                <button
                  type="button"
                  onClick={() => setCustomerName('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5 rounded cursor-pointer"
                  title="Borrar nombre"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Fila 2 (Solo si es MESA): Botones de selección rápida de mesa */}
          {modality === ORDER_MODALITIES.MESA.id && (
            <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-porkos-border)]/80 w-full animate-fade-in-smooth">
              <div className="flex items-center gap-1.5 text-[11px] font-black text-zinc-400 shrink-0 uppercase tracking-wider">
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
                    const shortText = matchNum
                      ? `M${matchNum[0]}`
                      : t.label?.length > 4
                      ? t.label.slice(0, 4)
                      : t.label;

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTable(isSelected ? null : t)}
                        title={`${t.label} • ${isOccupied ? 'Mesa con comanda activa' : 'Mesa libre'}`}
                        className={`
                          w-10 h-10 sm:w-11 sm:h-11 rounded-xl shrink-0 flex flex-col items-center justify-center transition-all cursor-pointer border active:scale-90 select-none relative touch-manipulation
                          ${
                            isSelected
                              ? 'bg-[var(--color-porkos-orange)] text-zinc-950 border-[var(--color-porkos-orange)] font-black shadow-md shadow-orange-500/25 ring-2 ring-[var(--color-porkos-orange)]/40'
                              : isOccupied
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:border-amber-400/80 hover:bg-amber-500/25'
                              : 'bg-zinc-900 text-zinc-200 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800'
                          }
                        `}
                      >
                        <span className="text-[11px] sm:text-xs font-black leading-tight tracking-tight">
                          {shortText}
                        </span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                            isSelected
                              ? 'bg-zinc-950'
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
                <div className="shrink-0 flex items-center gap-1.5 pl-2 text-xs border-l border-zinc-800">
                  <span className="font-extrabold text-[var(--color-porkos-orange)] text-xs hidden md:inline">
                    {selectedTable.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedTable(null)}
                    className="text-[10px] text-zinc-400 hover:text-rose-400 font-bold px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-rose-500/40 cursor-pointer transition-colors"
                    title="Deseleccionar mesa"
                  >
                    Quitar
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
