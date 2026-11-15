import { Utensils, Store, Search, Users, Bike, ShoppingBag, Package, User } from 'lucide-react';
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
    { id: ORDER_MODALITIES.CONSUMO_EXTERNO.id, label: 'Fuera', icon: Package },
    { id: ORDER_MODALITIES.DELIVERY.id, label: 'Delivery', icon: Bike },
  ];

  return (
    <div className="space-y-3">
      {/* Upper bar: Mode Selector (RESTAURANTE vs MARKET) + Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Toggle Mode */}
        <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => {
              setSalesMode(SALES_MODES.RESTAURANT);
              setModality(ORDER_MODALITIES.MESA.id);
            }}
            className={`
              flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer
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
              flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer
              ${
                salesMode === SALES_MODES.MARKET
                  ? 'bg-blue-600 text-white font-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }
            `}
          >
            <Store className="w-3.5 h-3.5" />
            <span>MARKET (Rápido)</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre (ej. Doble, Inca Kola, Chori)..."
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Lower bar: Modality, Table & Customer Name (Restaurant mode) */}
      {salesMode === SALES_MODES.RESTAURANT && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-800/80">
          {/* Modalidades */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
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
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border
                    ${
                      isSelected
                        ? 'bg-zinc-800 text-white border-zinc-600 shadow-sm font-bold'
                        : 'bg-transparent text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-800/60'
                    }
                  `}
                >
                  <Icon className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Selector de Mesa si es MESA */}
            {modality === ORDER_MODALITIES.MESA.id && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-zinc-400 font-medium">Mesa:</span>
                <select
                  value={selectedTable?.id || ''}
                  onChange={(e) => {
                    const table = tables.find((t) => t.id === e.target.value);
                    setSelectedTable(table || null);
                  }}
                  className="bg-black/60 border border-zinc-800 text-white text-xs rounded-lg px-2.5 py-1.5 font-bold focus:outline-none focus:border-zinc-600"
                >
                  <option value="">Elegir Mesa...</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} ({t.status === 'OCCUPIED' ? 'Abierta' : 'Libre'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Input Nombre de Cliente con Placeholder Contextual */}
            <div className="relative flex-1 min-w-[150px]">
              <User className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={
                  modality === ORDER_MODALITIES.PARA_LLEVAR.id
                    ? 'Nombre para el recojo *'
                    : modality === ORDER_MODALITIES.DELIVERY.id
                    ? 'Cliente para delivery *'
                    : 'Nombre cliente / comensal...'
                }
                className="w-full bg-black/60 border border-zinc-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
