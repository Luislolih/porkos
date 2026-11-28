import { Utensils, Bike, ShoppingBag, Store, Package } from 'lucide-react';

const ICON_MAP = {
  MESA: { Icon: Utensils, colorClass: 'text-blue-400' },
  DELIVERY: { Icon: Bike, colorClass: 'text-emerald-400' },
  PARA_LLEVAR: { Icon: ShoppingBag, colorClass: 'text-amber-400' },
  CONSUMO_EXTERNO: { Icon: Utensils, colorClass: 'text-purple-400' },
  MARKET: { Icon: Store, colorClass: 'text-purple-400' },
};

export default function ModalityIcon({ modality, className = 'w-4 h-4' }) {
  const entry = ICON_MAP[modality] || { Icon: Package, colorClass: 'text-zinc-400' };
  const Icon = entry.Icon;
  return <Icon className={`${className} ${entry.colorClass}`} />;
}
