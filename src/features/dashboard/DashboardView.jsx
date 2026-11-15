import { useMemo } from 'react';
import { DollarSign, ShoppingCart, TrendingUp, Flame, Store, Utensils } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function DashboardView({ orders = [] }) {
  // Métricas calculadas
  const metrics = useMemo(() => {
    const totalSales = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const paidSales = orders
      .filter((o) => o.paymentStatus === 'PAID')
      .reduce((sum, o) => sum + (o.total || 0), 0);
    const pendingSales = totalSales - paidSales;
    const orderCount = orders.length;
    const averageTicket = orderCount > 0 ? totalSales / orderCount : 0;
    const kitchenPendingCount = orders.filter(
      (o) => o.status === 'PENDIENTE' || o.status === 'PREPARANDO'
    ).length;

    // Conteo por modalidad
    const restaurantCount = orders.filter((o) => o.modality !== 'MARKET').length;
    const marketCount = orders.filter((o) => o.modality === 'MARKET').length;

    return {
      totalSales,
      paidSales,
      pendingSales,
      orderCount,
      averageTicket,
      kitchenPendingCount,
      restaurantCount,
      marketCount,
    };
  }, [orders]);

  return (
    <div className="space-y-5 pb-20 lg:pb-6">
      {/* Header */}
      <div className="bg-[var(--color-porkos-surface)] p-4 rounded-2xl border border-[var(--color-porkos-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Dashboard Operativo PORKOS
          </h2>
          <p className="text-xs text-[var(--color-porkos-muted)]">
            Métricas de ventas en tiempo real
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-xl border border-zinc-800 text-xs font-bold">
          <button type="button" className="px-3 py-1.5 rounded-lg bg-[var(--color-porkos-orange)] text-black cursor-pointer">
            Hoy
          </button>
          <button type="button" className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white cursor-pointer">
            Ayer
          </button>
          <button type="button" className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white cursor-pointer">
            Últimos 7 días
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Ventas */}
        <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase tracking-wider">
            <span>Ventas del Día</span>
            <DollarSign className="w-4 h-4 text-[var(--color-porkos-orange)]" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-white block tracking-tight">
            {formatCurrency(metrics.totalSales)}
          </span>
          <span className="text-[11px] text-emerald-400 font-semibold block">
            {formatCurrency(metrics.paidSales)} cobrado
          </span>
        </div>

        {/* Total Pedidos */}
        <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase tracking-wider">
            <span>N° Pedidos</span>
            <ShoppingCart className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-white block tracking-tight">
            {metrics.orderCount}
          </span>
          <span className="text-[11px] text-zinc-400 font-semibold block">
            {metrics.restaurantCount} Restaurante / {metrics.marketCount} Market
          </span>
        </div>

        {/* Ticket Promedio */}
        <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase tracking-wider">
            <span>Ticket Promedio</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-white block tracking-tight">
            {formatCurrency(metrics.averageTicket)}
          </span>
          <span className="text-[11px] text-zinc-400 font-semibold block">
            Por comanda
          </span>
        </div>

        {/* Cocina Activa */}
        <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase tracking-wider">
            <span>En Cocina</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-[var(--color-porkos-orange)] block tracking-tight">
            {metrics.kitchenPendingCount}
          </span>
          <span className="text-[11px] text-zinc-400 font-semibold block">
            Comandas en preparación
          </span>
        </div>
      </div>

      {/* Distribution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Restaurante vs Market */}
        <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-5 rounded-2xl space-y-4">
          <h3 className="font-bold text-sm text-white uppercase tracking-wider">
            Distribución de Operaciones
          </h3>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-[var(--color-porkos-orange)]" />
                  Restaurante (Comidas preparadas)
                </span>
                <span>{metrics.restaurantCount} pedidos</span>
              </div>
              <div className="h-2.5 bg-black/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-porkos-orange)] rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      metrics.orderCount > 0
                        ? (metrics.restaurantCount / metrics.orderCount) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-blue-400" />
                  Market (Venta directa)
                </span>
                <span>{metrics.marketCount} pedidos</span>
              </div>
              <div className="h-2.5 bg-black/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      metrics.orderCount > 0
                        ? (metrics.marketCount / metrics.orderCount) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cuentas y Cobros */}
        <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-5 rounded-2xl space-y-4">
          <h3 className="font-bold text-sm text-white uppercase tracking-wider">
            Estado de Caja & Cobranzas
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-3 rounded-xl bg-black/40 border border-zinc-800/80">
              <span className="text-zinc-400 font-semibold">Dinero Efectivamente Cobrado:</span>
              <span className="font-black text-emerald-400 text-sm">
                {formatCurrency(metrics.paidSales)}
              </span>
            </div>

            <div className="flex justify-between p-3 rounded-xl bg-black/40 border border-zinc-800/80">
              <span className="text-zinc-400 font-semibold">Cuentas Pendientes de Cobro (Mesas/Delivery):</span>
              <span className="font-black text-amber-400 text-sm">
                {formatCurrency(metrics.pendingSales)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
