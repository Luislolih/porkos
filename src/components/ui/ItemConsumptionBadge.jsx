import { Utensils, Package, ShoppingBag, Bike } from 'lucide-react';
import { resolveItemConsumptionType } from '../../types/constants';

/**
 * Insignia visual y compacta que muestra si un producto es para Mesa, Ir Comiendo o Llevar
 */
export default function ItemConsumptionBadge({ item, orderModality, className = '' }) {
  const type = resolveItemConsumptionType(item, orderModality);

  if (orderModality === 'DELIVERY' || type === 'DELIVERY') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase tracking-wide shrink-0 ${className}`}
      >
        <Bike className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
        <span>Delivery</span>
      </span>
    );
  }

  if (type === 'PARA_LLEVAR') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wide shrink-0 shadow-xs ${className}`}
        title="Para llevar (con empaque)"
      >
        <ShoppingBag className="w-2.5 h-2.5 text-amber-400 shrink-0" />
        <span>Llevar</span>
      </span>
    );
  }

  if (type === 'CONSUMO_EXTERNO') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase tracking-wide shrink-0 ${className}`}
        title="Para ir comiendo al paso"
      >
        <Package className="w-2.5 h-2.5 text-purple-400 shrink-0" />
        <span>Ir comiendo</span>
      </span>
    );
  }

  // Por defecto MESA / SALÓN
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-blue-500/15 text-blue-300 border border-blue-500/30 uppercase tracking-wide shrink-0 ${className}`}
      title="Para comer en mesa / salón"
    >
      <Utensils className="w-2.5 h-2.5 text-blue-400 shrink-0" />
      <span>Mesa</span>
    </span>
  );
}
