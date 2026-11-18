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

      {/* Lower bar: Modalidades + Mesa ('Elegir') + 'Nombre cliente' a la derecha */}
      {salesMode === SALES_MODES.RESTAURANT && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-black/40 p-1.5 rounded-xl border border-zinc-850">
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

          {/* Mesa ('Elegir') y 'Nombre cliente' a la derecha */}
          <div className="flex items-center gap-2 flex-1 sm:flex-none justify-end">
            {modality === ORDER_MODALITIES.MESA.id && (
              <select
                value={selectedTable?.id || ''}
                onChange={(e) => {
                  const table = tables.find((t) => t.id === e.target.value);
                  setSelectedTable(table || null);
                }}
                className={`text-xs rounded-xl px-3 py-1.5 font-semibold focus:outline-none shrink-0 transition-all cursor-pointer border ${
                  !selectedTable
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-600 focus:border-[var(--color-porkos-orange)]'
                    : 'bg-zinc-900 border-zinc-700/80 text-white font-bold focus:border-[var(--color-porkos-orange)]'
                }`}
              >
                <option value="">Seleccionar mesa</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.status === 'OCCUPIED' ? 'Ocupada' : 'Libre'})
                  </option>
                ))}
              </select>
            )}

            <div className="relative flex-1 sm:w-44">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nombre cliente"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 font-medium"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
