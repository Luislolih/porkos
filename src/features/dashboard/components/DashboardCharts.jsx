import { useState } from 'react';
import { formatCurrency } from '../../../utils/formatters';

/**
 * Gráfico de Anillo (SVG Donut) interactivo con hover y leyenda integrada.
 */
export function DonutChart({
  segments = [],
  centerLabel = 'Total',
  centerValue = '',
  formatValue = formatCurrency,
  size = 152,
  strokeWidth = 20,
}) {
  const [hoveredId, setHoveredId] = useState(null);

  const validSegments = segments.filter((s) => Number(s.value) > 0);
  const total = validSegments.reduce((sum, s) => sum + Number(s.value || 0), 0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const { arcs } = validSegments.reduce(
    (acc, seg) => {
      const pct = total > 0 ? seg.value / total : 0;
      const dashArray = `${pct * circumference} ${circumference}`;
      const dashOffset = -acc.cumulative * circumference;
      return {
        cumulative: acc.cumulative + pct,
        arcs: [
          ...acc.arcs,
          {
            ...seg,
            pct: pct * 100,
            dashArray,
            dashOffset,
          },
        ],
      };
    },
    { cumulative: 0, arcs: [] }
  );

  const activeSegment = arcs.find((a) => a.id === hoveredId) || null;

  if (total <= 0) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-5 py-2">
        <div
          className="rounded-full border-[14px] border-zinc-800/70 flex items-center justify-center shrink-0"
          style={{ width: size, height: size }}
        >
          <span className="text-[11px] font-bold text-zinc-500">Sin datos</span>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-2 w-full">
          {segments.map((seg) => (
            <div
              key={seg.id}
              className="p-2.5 rounded-xl bg-black/40 border border-zinc-800/80 flex items-center justify-between text-xs"
            >
              <span className="flex items-center gap-1.5 text-zinc-400 truncate">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.hex }} />
                <span className="truncate">{seg.label}</span>
              </span>
              <span className="font-mono font-bold text-zinc-500">{formatValue(0)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      {/* SVG Ring */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(39,39,42,0.55)"
            strokeWidth={strokeWidth}
          />
          {arcs.map((arc) => {
            const isHovered = hoveredId === arc.id;
            const isDimmed = hoveredId !== null && !isHovered;
            return (
              <circle
                key={arc.id}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={arc.hex}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={arc.dashArray}
                strokeDashoffset={arc.dashOffset}
                strokeLinecap="butt"
                onMouseEnter={() => setHoveredId(arc.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="transition-all duration-300 cursor-pointer"
                style={{ opacity: isDimmed ? 0.35 : 1 }}
              />
            );
          })}
        </svg>

        {/* Texto Central */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pointer-events-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 truncate max-w-full">
            {activeSegment ? activeSegment.label : centerLabel}
          </span>
          <span className="text-sm sm:text-base font-black text-white tabular-nums mt-0.5 leading-tight">
            {activeSegment ? formatValue(activeSegment.value) : centerValue || formatValue(total)}
          </span>
          {activeSegment && (
            <span className="text-[10px] font-black mt-0.5" style={{ color: activeSegment.hex }}>
              {activeSegment.pct.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex-1 w-full space-y-2">
        {segments.map((seg) => {
          const val = Number(seg.value) || 0;
          const pct = total > 0 ? (val / total) * 100 : 0;
          const isHovered = hoveredId === seg.id;
          return (
            <div
              key={seg.id}
              onMouseEnter={() => val > 0 && setHoveredId(seg.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`p-2 rounded-xl border transition-all cursor-default ${
                isHovered
                  ? 'bg-zinc-900 border-zinc-600'
                  : 'bg-black/40 border-zinc-800/80'
              }`}
            >
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="flex items-center gap-2 text-zinc-200 font-semibold truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.hex }} />
                  <span className="truncate">{seg.label}</span>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold text-zinc-400 tabular-nums">
                    {pct.toFixed(1)}%
                  </span>
                  <span className="font-mono font-black text-white tabular-nums">
                    {formatValue(val)}
                  </span>
                </div>
              </div>
              <div className="mt-1.5 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, pct)}%`, backgroundColor: seg.hex }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Gráfico de Barras Financieras Comparativas por Turno/Día o por Hora.
 */
export function FinancialBarChart({
  data = [],
  showExpenses = true,
  emptyText = 'Registra ventas para visualizar la evolución gráfica',
}) {
  const [activeIndex, setActiveIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="py-10 text-center text-xs text-zinc-500 bg-black/30 rounded-xl border border-zinc-800/70">
        {emptyText}
      </div>
    );
  }

  const maxVal = Math.max(
    1,
    ...data.map((d) => Math.max(d.sales || 0, (d.cogs || 0) + (d.expenses || 0)))
  );

  const activeItem = activeIndex !== null ? data[activeIndex] : data[data.length - 1];

  return (
    <div className="space-y-3">
      {/* Tooltip / Resumen del punto activo */}
      {activeItem && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-black/50 border border-zinc-800/90 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-black text-white">{activeItem.fullLabel || activeItem.label}</span>
            {typeof activeItem.ordersCount === 'number' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                {activeItem.ordersCount} pedidos
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
            <span className="text-emerald-400 font-black">
              Ventas: {formatCurrency(activeItem.sales || 0)}
            </span>
            {showExpenses && (
              <>
                <span className="text-orange-400 font-bold">
                  Costos+Gastos: {formatCurrency((activeItem.cogs || 0) + (activeItem.expenses || 0))}
                </span>
                <span
                  className={`font-black ${
                    (activeItem.netProfit || 0) >= 0 ? 'text-sky-400' : 'text-rose-400'
                  }`}
                >
                  Neto: {formatCurrency(activeItem.netProfit || 0)}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Barras */}
      <div className="relative pt-3 pb-1">
        {/* Líneas guía horizontales */}
        <div className="absolute inset-x-0 top-3 bottom-7 flex flex-col justify-between pointer-events-none">
          {[1, 0.5, 0].map((ratio) => (
            <div key={ratio} className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-zinc-600 w-12 text-right shrink-0">
                {formatCurrency(maxVal * ratio)}
              </span>
              <div className="flex-1 border-b border-dashed border-zinc-800/80" />
            </div>
          ))}
        </div>

        <div className="pl-14 flex items-end gap-1.5 sm:gap-2.5 h-44 overflow-x-auto scrollbar-thin">
          {data.map((d, idx) => {
            const salesH = Math.max(4, ((d.sales || 0) / maxVal) * 100);
            const totalOut = (d.cogs || 0) + (d.expenses || 0);
            const outH = totalOut > 0 ? Math.max(4, (totalOut / maxVal) * 100) : 0;
            const isSelected = activeIndex === idx;

            return (
              <div
                key={d.key || d.label}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => setActiveIndex(idx)}
                className={`flex-1 min-w-[34px] max-w-[64px] h-full flex flex-col items-center justify-end gap-1.5 cursor-pointer group`}
              >
                <div className="w-full flex-1 flex items-end justify-center gap-1 px-0.5">
                  {/* Barra Ventas */}
                  <div
                    className={`w-full max-w-[18px] rounded-t-md transition-all duration-300 ${
                      isSelected
                        ? 'bg-emerald-400 shadow-md shadow-emerald-500/25'
                        : d.isPeak
                        ? 'bg-[var(--color-porkos-orange)]'
                        : 'bg-emerald-500/80 group-hover:bg-emerald-400'
                    }`}
                    style={{ height: `${salesH}%` }}
                  />
                  {/* Barra Costos + Gastos */}
                  {showExpenses && (
                    <div
                      className={`w-full max-w-[14px] rounded-t-md transition-all duration-300 ${
                        isSelected ? 'bg-rose-400' : 'bg-rose-500/65 group-hover:bg-rose-400'
                      }`}
                      style={{ height: `${outH}%` }}
                    />
                  )}
                </div>

                <span
                  className={`text-[10px] font-bold truncate max-w-full ${
                    isSelected ? 'text-white' : d.isPeak ? 'text-[var(--color-porkos-orange)]' : 'text-zinc-500'
                  }`}
                >
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda inferior */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400 pt-1">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span>Ventas Brutas</span>
          </span>
          {showExpenses && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/80" />
              <span>Insumos + Gastos</span>
            </span>
          )}
        </div>
        <span className="text-[10px] text-zinc-500">Pasa el cursor o toca una barra para ver detalle</span>
      </div>
    </div>
  );
}

/**
 * Gráfico Visual de Cascada Financiera (P&L Waterfall).
 */
export function FinancialWaterfall({ sales = 0, cogs = 0, grossProfit = 0, totalExpenses = 0, netProfit = 0 }) {
  const maxRef = Math.max(1, sales, cogs + totalExpenses);

  const steps = [
    {
      id: 'sales',
      label: 'Ventas Brutas',
      value: sales,
      display: formatCurrency(sales),
      offsetPct: 0,
      widthPct: (sales / maxRef) * 100,
      barClass: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
      textClass: 'text-emerald-400',
      tag: '100%',
    },
    {
      id: 'cogs',
      label: '(-) Costo Insumos (COGS)',
      value: cogs,
      display: `-${formatCurrency(cogs)}`,
      offsetPct: Math.max(0, (grossProfit / maxRef) * 100),
      widthPct: (cogs / maxRef) * 100,
      barClass: 'bg-gradient-to-r from-orange-500 to-amber-500',
      textClass: 'text-orange-400',
      tag: sales > 0 ? `${((cogs / sales) * 100).toFixed(1)}%` : '0%',
    },
    {
      id: 'gross',
      label: '(=) Utilidad Bruta',
      value: grossProfit,
      display: formatCurrency(grossProfit),
      offsetPct: 0,
      widthPct: Math.max(0, (grossProfit / maxRef) * 100),
      barClass: 'bg-gradient-to-r from-sky-500 to-cyan-400',
      textClass: 'text-sky-400',
      tag: sales > 0 ? `${((grossProfit / sales) * 100).toFixed(1)}%` : '0%',
    },
    {
      id: 'expenses',
      label: '(-) Gastos & Compras',
      value: totalExpenses,
      display: `-${formatCurrency(totalExpenses)}`,
      offsetPct: Math.max(0, (netProfit / maxRef) * 100),
      widthPct: Math.min(100, (totalExpenses / maxRef) * 100),
      barClass: 'bg-gradient-to-r from-rose-500 to-pink-500',
      textClass: 'text-rose-400',
      tag: sales > 0 ? `${((totalExpenses / sales) * 100).toFixed(1)}%` : '0%',
    },
    {
      id: 'net',
      label: '(=) Balance Operativo Neto',
      value: netProfit,
      display: formatCurrency(netProfit),
      offsetPct: 0,
      widthPct: Math.max(0, (Math.abs(netProfit) / maxRef) * 100),
      barClass:
        netProfit >= 0
          ? 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-md shadow-emerald-500/20'
          : 'bg-gradient-to-r from-rose-600 to-rose-400',
      textClass: netProfit >= 0 ? 'text-emerald-300' : 'text-rose-400',
      tag: sales > 0 ? `${((netProfit / sales) * 100).toFixed(1)}%` : '0%',
      highlight: true,
    },
  ];

  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div
          key={step.id}
          className={`p-3 rounded-xl border transition-all ${
            step.highlight
              ? netProfit >= 0
                ? 'bg-emerald-950/25 border-emerald-500/40'
                : 'bg-rose-950/25 border-rose-500/40'
              : 'bg-black/40 border-zinc-800/80'
          }`}
        >
          <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
            <span className={`font-bold ${step.highlight ? 'text-white' : 'text-zinc-300'}`}>
              {step.label}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 tabular-nums">
                {step.tag}
              </span>
              <span className={`font-mono font-black text-sm tabular-nums ${step.textClass}`}>
                {step.display}
              </span>
            </div>
          </div>

          <div className="h-2.5 bg-zinc-950 rounded-full overflow-hidden relative border border-zinc-800/60">
            <div
              className={`h-full rounded-full transition-all duration-500 absolute top-0 ${step.barClass}`}
              style={{
                left: `${Math.min(98, Math.max(0, step.offsetPct))}%`,
                width: `${Math.min(100, Math.max(step.value !== 0 ? 2 : 0, step.widthPct))}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Desglose Visual de Gastos por Categoría.
 */
export function ExpenseCategoryBars({ expenses = [] }) {
  const categoryMap = {};
  let total = 0;

  expenses.forEach((e) => {
    const cat = (e.category || 'Otros').trim();
    const amt = Number(e.amount) || 0;
    if (amt <= 0) return;
    categoryMap[cat] = (categoryMap[cat] || 0) + amt;
    total += amt;
  });

  const sorted = Object.entries(categoryMap)
    .map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
      pct: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  if (sorted.length === 0) {
    return (
      <p className="text-xs text-zinc-500 py-6 text-center">
        No hay egresos registrados en este período
      </p>
    );
  }

  const maxCat = sorted[0]?.amount || 1;

  return (
    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
      {sorted.map((item, idx) => (
        <div key={item.category} className="space-y-1">
          <div className="flex items-center justify-between text-xs gap-2">
            <span className="font-semibold text-zinc-200 truncate flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-zinc-500 w-4">#{idx + 1}</span>
              <span className="truncate">{item.category}</span>
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-bold text-zinc-400 tabular-nums">
                {item.pct.toFixed(1)}%
              </span>
              <span className="font-mono font-black text-rose-400 tabular-nums">
                {formatCurrency(item.amount)}
              </span>
            </div>
          </div>
          <div className="h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/60">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-orange-400 rounded-full transition-all duration-500"
              style={{ width: `${(item.amount / maxCat) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
