import { Utensils, Package, ShoppingBag, Bike } from 'lucide-react';
import { resolveItemConsumptionType } from '../../types/constants';

const CONSUMPTION_CONFIG = {
  DELIVERY: {
    Icon: Bike,
    label: 'Delivery',
    title: 'Envío por Delivery',
    vividClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-black uppercase tracking-wide',
    vividIconClass: 'text-emerald-400',
    subtleClass: 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50 font-medium',
    subtleIconClass: 'text-emerald-400/70',
  },
  PARA_LLEVAR: {
    Icon: ShoppingBag,
    label: 'Llevar',
    title: 'Para llevar (con empaque)',
    vividClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-black uppercase tracking-wide shadow-xs',
    vividIconClass: 'text-amber-400',
    subtleClass: 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50 font-medium',
    subtleIconClass: 'text-amber-400/70',
  },
  CONSUMO_EXTERNO: {
    Icon: Package,
    label: 'Ir comiendo',
    title: 'Para ir comiendo al paso',
    vividClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-black uppercase tracking-wide',
    vividIconClass: 'text-purple-400',
    subtleClass: 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50 font-medium',
    subtleIconClass: 'text-purple-400/70',
  },
  MESA: {
    Icon: Utensils,
    label: 'Mesa',
    title: 'Para comer en mesa / salón',
    vividClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30 font-black uppercase tracking-wide',
    vividIconClass: 'text-blue-400',
    subtleClass: 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50 font-medium',
    subtleIconClass: 'text-blue-400/70',
  },
};

/**
 * Insignia visual y compacta que muestra si un producto es para Mesa, Ir Comiendo, Llevar o Delivery.
 * Usa `subtle={true}` en vistas de historial para integrarse sin ruido visual.
 */
export default function ItemConsumptionBadge({
  item,
  orderModality,
  subtle = false,
  className = '',
}) {
  const rawType = resolveItemConsumptionType(item, orderModality);
  const key = orderModality === 'DELIVERY' || rawType === 'DELIVERY' ? 'DELIVERY' : rawType;
  const config = CONSUMPTION_CONFIG[key] || CONSUMPTION_CONFIG.MESA;
  const { Icon } = config;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border shrink-0 ${
        subtle
          ? `px-1.5 py-0.2 text-[9px] leading-tight ${config.subtleClass}`
          : `px-1.5 py-0.5 text-[10px] ${config.vividClass}`
      } ${className}`}
      title={config.title}
    >
      <Icon
        className={`w-2.5 h-2.5 shrink-0 ${subtle ? config.subtleIconClass : config.vividIconClass}`}
      />
      <span>{config.label}</span>
    </span>
  );
}
