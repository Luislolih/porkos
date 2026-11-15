import { useState, useMemo } from 'react';
import { Search, Filter, Eye } from 'lucide-react';
import { formatCurrency, formatTime } from '../../utils/formatters';
import { ORDER_STATUS, PAYMENT_STATUS } from '../../types/constants';
import Modal from '../../components/ui/Modal';

export default function OrdersView({ orders = [] }) {
  const [filterModality, setFilterModality] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (filterModality !== 'ALL' && o.modality !== filterModality) return false;
      if (filterStatus !== 'ALL' && o.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesNum = o.orderNumber?.toLowerCase().includes(query);
        const matchesClient = o.customer?.name?.toLowerCase().includes(query);
        const matchesPhone = o.customer?.phone?.includes(query);
        return matchesNum || matchesClient || matchesPhone;
      }
      return true;
    });
  }, [orders, filterModality, filterStatus, searchQuery]);

  return (
    <div className="space-y-4 pb-20 lg:pb-6">
      {/* Filters Bar */}
      <div className="bg-[var(--color-porkos-surface)] p-4 rounded-2xl border border-[var(--color-porkos-border)] space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Historial de Pedidos y Ventas
          </h2>

          {/* Search bar */}
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por N° pedido o cliente..."
              className="w-full bg-black/50 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--color-porkos-orange)]"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-800/80 text-xs">
          <span className="text-zinc-500 font-bold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Modalidad:
          </span>
          {['ALL', 'MESA', 'DELIVERY', 'PARA_LLEVAR', 'MARKET'].map((mod) => (
            <button
              key={mod}
              type="button"
              onClick={() => setFilterModality(mod)}
              className={`
                px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer
                ${
                  filterModality === mod
                    ? 'bg-zinc-700 text-white font-bold'
                    : 'bg-zinc-800/70 text-zinc-400 hover:text-white'
                }
              `}
            >
              {mod === 'ALL' ? 'Todas' : mod === 'PARA_LLEVAR' ? 'Para Llevar' : mod}
            </button>
          ))}
          <span className="text-zinc-500 font-bold flex items-center gap-1 ml-2">
            Estado:
          </span>
          {['ALL', 'PENDIENTE', 'PREPARANDO', 'LISTO', 'ENTREGADO'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`
                px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer
                ${
                  filterStatus === st
                    ? 'bg-[var(--color-porkos-orange)] text-black font-bold'
                    : 'bg-zinc-800/70 text-zinc-400 hover:text-white'
                }
              `}
            >
              {st === 'ALL' ? 'Todos' : ORDER_STATUS[st]?.label || st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List / Table */}
      <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            <p className="font-semibold text-sm">No se encontraron pedidos</p>
            <p className="text-xs text-zinc-600 mt-1">
              Las nuevas ventas y comandas aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/40 text-zinc-400 font-bold uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Pedido</th>
                  <th className="py-3 px-4">Hora</th>
                  <th className="py-3 px-4">Modalidad</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Pago</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {filteredOrders.map((order) => {
                  const statusConf = ORDER_STATUS[order.status] || {};
                  const payConf = PAYMENT_STATUS[order.paymentStatus] || {};
                  return (
                    <tr
                      key={order.orderNumber}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3.5 px-4 font-black text-white">
                        {order.orderNumber}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400">
                        {formatTime(order.createdAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-zinc-200 block">
                          {order.tableName || order.modality}
                        </span>
                        {order.customerName && (
                          <span className="text-[10px] text-orange-400/90 font-medium block">
                            {order.customerName}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            statusConf.badgeClass || 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {statusConf.label || order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            payConf.badgeClass || 'text-zinc-300'
                          }`}
                        >
                          {payConf.label || order.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-white text-sm">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          title="Ver Detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={`Detalle de Venta ${selectedOrder?.orderNumber}`}
        subtitle={`Modalidad: ${selectedOrder?.tableName || selectedOrder?.modality}`}
      >
        {selectedOrder && (
          <div className="space-y-4 text-xs">
            <div className="bg-black/50 p-3 rounded-xl space-y-2 border border-zinc-800">
              <h5 className="font-bold text-white uppercase tracking-wider text-[11px]">
                Productos Registrados
              </h5>
              <div className="space-y-2">
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-white">
                        {item.quantity}x {item.name}
                      </span>
                      {item.customization?.creamsSummary && (
                        <p className="text-[11px] text-orange-300">
                          Cremas: {item.customization.creamsSummary}
                        </p>
                      )}
                      {item.customization?.selectedModifiers?.map((m) => (
                        <p key={m.groupId} className="text-[10px] text-zinc-400">
                          • {m.optionName}
                        </p>
                      ))}
                      {item.customization?.selectedExtras?.map((e) => (
                        <p key={e.id} className="text-[10px] text-emerald-400">
                          + {e.name}
                        </p>
                      ))}
                    </div>
                    <span className="font-bold text-white">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1 pt-2 border-t border-zinc-800 font-semibold">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedOrder.subtotal)}</span>
              </div>
              {selectedOrder.packagingsTotal > 0 && (
                <div className="flex justify-between text-zinc-400">
                  <span>Empaques:</span>
                  <span>{formatCurrency(selectedOrder.packagingsTotal)}</span>
                </div>
              )}
              {selectedOrder.deliveryFee > 0 && (
                <div className="flex justify-between text-zinc-400">
                  <span>Delivery:</span>
                  <span>{formatCurrency(selectedOrder.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-extrabold text-sm pt-1 border-t border-zinc-800">
                <span>Total:</span>
                <span className="text-[var(--color-porkos-orange)]">
                  {formatCurrency(selectedOrder.total)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
