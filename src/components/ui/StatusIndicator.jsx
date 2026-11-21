export default function StatusIndicator({
  status,
  label,
  pulse = false,
  size = 'md',
  className = '',
}) {
  const statusConfig = {
    PENDIENTE: {
      color: 'bg-amber-400',
      bg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      text: 'Pendiente',
    },
    PREPARANDO: {
      color: 'bg-[var(--color-porkos-orange)]',
      bg: 'bg-orange-500/15 text-[var(--color-porkos-orange)] border-orange-500/35',
      text: 'Preparando',
    },
    LISTO: {
      color: 'bg-emerald-400',
      bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
      text: 'Listo',
    },
    ENTREGADO: {
      color: 'bg-zinc-400',
      bg: 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60',
      text: 'Entregado',
    },
    CANCELADO: {
      color: 'bg-rose-400',
      bg: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
      text: 'Cancelado',
    },
    ONLINE: {
      color: 'bg-emerald-400',
      bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      text: 'En línea',
    },
    OFFLINE: {
      color: 'bg-zinc-500',
      bg: 'bg-zinc-800 text-zinc-400 border-zinc-700',
      text: 'Desconectado',
    },
    OCCUPIED: {
      color: 'bg-amber-400',
      bg: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
      text: 'Ocupada',
    },
    AVAILABLE: {
      color: 'bg-emerald-400',
      bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
      text: 'Disponible',
    },
  };

  const config = statusConfig[status] || {
    color: 'bg-zinc-400',
    bg: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    text: status || 'Estado',
  };

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full border font-bold uppercase tracking-wider select-none shrink-0
        ${sizeClasses[size] || sizeClasses.md}
        ${config.bg}
        ${className}
      `}
    >
      <span className="relative flex items-center justify-center">
        {pulse && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${config.color}`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full ${dotSizes[size] || dotSizes.md} ${config.color}`}
        />
      </span>
      <span>{label || config.text}</span>
    </span>
  );
}
