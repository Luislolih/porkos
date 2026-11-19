import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Eye,
  Clock,
  CheckCircle2,
  Flame,
  ChefHat,
  ShoppingBag,
  Bike,
  Store,
  Utensils,
  X,
  Check,
  Package,
  Edit3,
  Trash2,
  Lock,
  UserCheck,
} from 'lucide-react';
import { formatCurrency, formatTime, formatElapsedTime } from '../../utils/formatters';
import { ORDER_STATUS, PAYMENT_STATUS } from '../../types/constants';
import Modal from '../../components/ui/Modal';

export default function OrdersView({
  orders = [],
  onEditOrderInSales,
  onUpdateOrder,
  onClearAllOrders,
}) {
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'HISTORY'
  const [filterModality, setFilterModality] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingCustomerNameOrder, setEditingCustomerNameOrder] = useState(null);
  const [tempCustomerName, setTempCustomerName] = useState('');
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [, setTick] = useState(0);

  const handleSaveCustomerName = (order) => {
    if (!order) return;
    const newName = tempCustomerName.trim();
    const updated = {
      ...order,
      customerName: newName || null,
      customer: order.customer ? { ...order.customer, name: newName } : (newName ? { name: newName } : null),
    };
    if (onUpdateOrder) {
      onUpdateOrder(updated);
    }
    if (selectedOrder && selectedOrder.orderNumber === order.orderNumber) {
      setSelectedOrder(updated);
    }
    setEditingCustomerNameOrder(null);
  };

  // Actualizar tiempos transcurridos en tiempo real cada 20 segundos
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 20000);
    return () => clearInterval(timer);
  }, []);

  const filteredOrders = useMemo(() => {
    const list = orders.filter((o) => {
      // Filtro por pestaña (Activas vs Historial)
      if (activeTab === 'ACTIVE') {
        const isActive = o.status === 'PENDIENTE' || o.status === 'PREPARANDO' || o.status === 'LISTO';
        if (!isActive) return false;
      } else if (activeTab === 'HISTORY') {
        const isHistory = o.status === 'ENTREGADO' || o.status === 'CANCELADO';
        if (!isHistory) return false;
      }

      // Filtro por Modalidad
      if (filterModality !== 'ALL') {
        if (filterModality === 'MESA' && o.modality !== 'MESA') return false;
        if (filterModality === 'DELIVERY' && o.modality !== 'DELIVERY') return false;
        if (filterModality === 'PARA_LLEVAR' && o.modality !== 'PARA_LLEVAR' && o.modality !== 'CONSUMO_EXTERNO') return false;
        if (filterModality === 'MARKET' && o.modality !== 'MARKET') return false;
      }

      // Búsqueda por texto
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesNum = o.orderNumber?.toLowerCase().includes(query);
        const matchesClient = o.customerName?.toLowerCase().includes(query) || o.customer?.name?.toLowerCase().includes(query);
        const matchesPhone = o.customer?.phone?.includes(query);
        const matchesTable = o.tableName?.toLowerCase().includes(query);
        return matchesNum || matchesClient || matchesPhone || matchesTable;
      }

      return true;
    });

    // Ordenar de forma consistente: más recientes al inicio
    return list.sort((a, b) => {
      const timeA = a.createdAt?.getTime ? a.createdAt.getTime() : new Date(a.createdAt || 0).getTime();
      const timeB = b.createdAt?.getTime ? b.createdAt.getTime() : new Date(b.createdAt || 0).getTime();
      if (!isNaN(timeA) && !isNaN(timeB) && timeB !== timeA) {
        return timeB - timeA;
      }
      return (b.orderNumber || '').localeCompare(a.orderNumber || '', undefined, { numeric: true });
    });
  }, [orders, activeTab, filterModality, searchQuery]);

  const activeCount = useMemo(() => {
    return orders.filter((o) => o.status === 'PENDIENTE' || o.status === 'PREPARANDO' || o.status === 'LISTO').length;
  }, [orders]);

  const historyCount = useMemo(() => {
    return orders.filter((o) => o.status === 'ENTREGADO' || o.status === 'CANCELADO').length;
  }, [orders]);

  const getModalityIcon = (mod) => {
    switch (mod) {
      case 'MESA':
        return <Utensils className="w-3.5 h-3.5 text-blue-400" />;
      case 'DELIVERY':
        return <Bike className="w-3.5 h-3.5 text-emerald-400" />;
      case 'PARA_LLEVAR':
        return <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />;
      case 'CONSUMO_EXTERNO':
        return <Utensils className="w-3.5 h-3.5 text-purple-400" />;
      case 'MARKET':
        return <Store className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Package className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const getStepStatusIndex = (status) => {
    switch (status) {
      case 'PENDIENTE':
        return 0;
      case 'PREPARANDO':
        return 1;
      case 'LISTO':
        return 2;
      case 'ENTREGADO':
        return 3;
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-3 pb-20 lg:pb-6">
      {/* Filters Bar */}
      <div className="bg-[var(--color-porkos-surface)] p-3 sm:p-4 rounded-2xl border border-[var(--color-porkos-border)] space-y-3">
        {/* Top: Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Segmented Control / Tabs */}
          <div className="flex bg-black/60 p-1 rounded-xl border border-zinc-800 shrink-0">
            {[
              { id: 'ALL', label: 'Todas', count: orders.length },
              { id: 'ACTIVE', label: 'En Curso', count: activeCount },
              { id: 'HISTORY', label: 'Historial', count: historyCount },
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5
                    ${
                      isSelected
                        ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }
                  `}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-black text-white font-extrabold'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search bar & Vaciar Historial */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar pedido, cliente, mesa..."
                className="w-full bg-black/50 border border-zinc-800 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--color-porkos-orange)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {onClearAllOrders && orders.length > 0 && (
              <button
                type="button"
                onClick={() => setIsConfirmClearOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 cursor-pointer transition-all shrink-0 active:scale-95"
                title="Eliminar todo el historial de pedidos"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vaciar Historial</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills: Modalidad */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
          <span className="text-zinc-500 font-semibold text-[11px] shrink-0 mr-1">
            Modalidad:
          </span>
          {[
            { id: 'ALL', label: 'Todas' },
            { id: 'MESA', label: 'Mesas' },
            { id: 'PARA_LLEVAR', label: 'Para Llevar' },
            { id: 'DELIVERY', label: 'Delivery' },
            { id: 'MARKET', label: 'Market' },
          ].map((m) => {
            const isSelected = filterModality === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setFilterModality(m.id)}
                className={`
                  px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border
                  ${
                    isSelected
                      ? 'bg-zinc-800 text-white border-zinc-600 font-bold shadow-xs'
                      : 'bg-zinc-900/60 text-zinc-400 border-zinc-800/80 hover:text-white'
                  }
                `}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders List / Cards */}
      <div className="space-y-2">
        {filteredOrders.length === 0 ? (
          <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl py-12 text-center text-zinc-500">
            <p className="font-bold text-sm text-zinc-400">No se encontraron pedidos</p>
            <p className="text-xs text-zinc-600 mt-1">
              Prueba cambiando los filtros o la búsqueda
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const statusConf = ORDER_STATUS[order.status] || {};
            const isTable = order.modality === 'MESA' || Boolean(order.tableId);
            const effectivePaymentStatus = isTable ? (order.paymentStatus || 'PENDING') : 'PAID';
            const payConf = PAYMENT_STATUS[effectivePaymentStatus] || {};
            const isFinished = order.status === 'ENTREGADO' || order.status === 'CANCELADO';

            return (
              <div
                key={order.orderNumber}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedOrder(order)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedOrder(order);
                  }
                }}
                className={`
                  group bg-[#141414] border rounded-2xl p-3 sm:p-3.5 transition-all cursor-pointer flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 hover:border-zinc-700 active:scale-[0.99]
                  ${
                    !isFinished
                      ? 'border-zinc-800 hover:border-[var(--color-porkos-orange)]/50'
                      : 'border-zinc-800 opacity-90'
                  }
                `}
                title="Toca para ver el seguimiento y detalle del pedido"
              >
                {/* Left: Info, Number, Client, Modality */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      order.status === 'ENTREGADO'
                        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                        : order.status === 'LISTO'
                        ? 'bg-amber-950/40 border-amber-500/30 text-amber-400'
                        : 'bg-orange-950/40 border-orange-500/30 text-[var(--color-porkos-orange)]'
                    }`}
                  >
                    {getModalityIcon(order.modality)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm sm:text-base text-white group-hover:text-[var(--color-porkos-orange)] transition-colors">
                        {order.orderNumber}
                      </h4>
                      <span className="text-[11px] text-zinc-500 font-semibold">
                        {formatTime(order.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5 flex-wrap">
                      <span className="font-semibold text-zinc-300">
                        {order.tableName || (order.modality === 'PARA_LLEVAR' ? 'Para Llevar' : order.modality === 'CONSUMO_EXTERNO' ? 'Ir Comiendo' : order.modality)}
                      </span>
                      {editingCustomerNameOrder === order.orderNumber ? (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            autoFocus
                            value={tempCustomerName}
                            onChange={(e) => setTempCustomerName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveCustomerName(order);
                              if (e.key === 'Escape') setEditingCustomerNameOrder(null);
                            }}
                            className="bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-[var(--color-porkos-orange)] font-bold w-28"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveCustomerName(order)}
                            className="p-1 rounded bg-[var(--color-porkos-orange)] text-black cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCustomerNameOrder(null)}
                            className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCustomerNameOrder(order.orderNumber);
                            setTempCustomerName(order.customerName || order.customer?.name || '');
                          }}
                          className="group/cust inline-flex items-center gap-1 cursor-pointer text-amber-400 hover:text-amber-300 font-bold truncate"
                          title="Clic para editar nombre del cliente"
                        >
                          <span>• {order.customerName || 'Cliente'}</span>
                          <Edit3 className="w-2.5 h-2.5 text-zinc-500 group-hover/cust:text-amber-300" />
                        </button>
                      )}
                      <span className="text-zinc-500 text-[11px]">
                        ({order.items?.length || 0} items)
                      </span>
                      {order.createdBy?.name && (
                        <span className="text-zinc-400 text-[11px] font-medium">
                          • Por: <strong className="text-zinc-300 font-semibold">{order.createdBy.name}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Status Pill, Elapsed, Total, Tap CTA */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                        statusConf.badgeClass || 'bg-zinc-800 text-zinc-300 border-zinc-700'
                      }`}
                    >
                      {statusConf.label || order.status}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        payConf.badgeClass || 'text-zinc-400 bg-zinc-800'
                      }`}
                    >
                      {payConf.label || effectivePaymentStatus}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-black text-sm sm:text-base text-white">
                      {formatCurrency(order.total)}
                    </div>
                    <div className="text-[10px] text-zinc-500 flex items-center justify-end gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{formatElapsedTime(order.createdAt)}</span>
                    </div>
                  </div>

                  {/* Botón de Edición (solo antes de ser entregada) */}
                  {order.status !== 'ENTREGADO' && order.status !== 'CANCELADO' ? (
                    onEditOrderInSales && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditOrderInSales(order);
                        }}
                        className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-[var(--color-porkos-orange)] text-zinc-400 hover:text-black transition-colors shrink-0 cursor-pointer"
                        title="Editar comanda"
                        aria-label="Editar comanda"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )
                  ) : (
                    <span
                      className="p-1.5 text-zinc-600 shrink-0"
                      title="Comanda entregada"
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                  )}

                  <button
                    type="button"
                    className="p-1.5 rounded-lg bg-zinc-800/80 group-hover:bg-[var(--color-porkos-orange)] text-zinc-400 group-hover:text-black transition-colors shrink-0"
                    aria-label="Ver detalle"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Seguimiento y Detalle de la Orden */}
      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={`Seguimiento: ${selectedOrder?.orderNumber}`}
        subtitle={`Modalidad: ${selectedOrder?.tableName || (selectedOrder?.modality === 'CONSUMO_EXTERNO' ? 'Ir Comiendo' : selectedOrder?.modality)}`}
        maxWidth="max-w-xl"
      >
        {selectedOrder && (
          <div className="space-y-4 text-xs">
            {/* Timeline de Seguimiento */}
            <div className="bg-black/60 p-3 sm:p-4 rounded-2xl border border-zinc-800 space-y-2.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 block">
                Estado del Pedido
              </span>

              <div className="grid grid-cols-4 gap-1 sm:gap-2">
                {[
                  { id: 'PENDIENTE', label: '1. Recibido', icon: Clock },
                  { id: 'PREPARANDO', label: '2. Cocina', icon: Flame },
                  { id: 'LISTO', label: '3. Listo', icon: ChefHat },
                  { id: 'ENTREGADO', label: '4. Entregado', icon: CheckCircle2 },
                ].map((step, idx) => {
                  const currentIdx = getStepStatusIndex(selectedOrder.status);
                  const isDone = idx < currentIdx;
                  const isCurrent = idx === currentIdx;
                  const StepIcon = step.icon;

                  return (
                    <div
                      key={step.id}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center gap-1 transition-all ${
                        isCurrent
                          ? 'bg-[var(--color-porkos-orange)] text-black border-[var(--color-porkos-orange)] font-black shadow-md'
                          : isDone
                          ? 'bg-zinc-800 text-emerald-400 border-emerald-500/30 font-bold'
                          : 'bg-zinc-900/60 text-zinc-600 border-zinc-800'
                      }`}
                    >
                      <StepIcon className="w-3.5 h-3.5" />
                      <span className="text-[10px] leading-tight">{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Datos del Cliente y Modalidad */}
            <div className="bg-black/40 p-3 rounded-xl border border-zinc-800/80 flex items-center justify-between text-xs">
              <div className="flex-1 pr-3">
                <span className="text-zinc-500 text-[10px] block">Cliente:</span>
                {editingCustomerNameOrder === selectedOrder.orderNumber ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      type="text"
                      autoFocus
                      value={tempCustomerName}
                      onChange={(e) => setTempCustomerName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveCustomerName(selectedOrder);
                        if (e.key === 'Escape') setEditingCustomerNameOrder(null);
                      }}
                      placeholder="Nombre del cliente..."
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[var(--color-porkos-orange)] font-bold w-full max-w-[200px]"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveCustomerName(selectedOrder)}
                      className="p-1.5 rounded-lg bg-[var(--color-porkos-orange)] text-black font-bold hover:bg-orange-400 cursor-pointer"
                      title="Guardar nombre"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCustomerNameOrder(null)}
                      className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                      title="Cancelar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      setEditingCustomerNameOrder(selectedOrder.orderNumber);
                      setTempCustomerName(selectedOrder.customerName || selectedOrder.customer?.name || '');
                    }}
                    className="group/cust inline-flex items-center gap-1.5 cursor-pointer mt-0.5"
                    title="Clic para editar el nombre del cliente"
                  >
                    <span className="font-bold text-white text-sm group-hover/cust:text-[var(--color-porkos-orange)] transition-colors">
                      {selectedOrder.customerName || selectedOrder.customer?.name || 'Cliente en Salón'}
                    </span>
                    <Edit3 className="w-3 h-3 text-zinc-500 group-hover/cust:text-[var(--color-porkos-orange)] transition-colors" />
                  </div>
                )}
                {selectedOrder.customer?.phone && (
                  <p className="text-[11px] text-zinc-400">Tel: {selectedOrder.customer.phone}</p>
                )}
                {selectedOrder.customer?.address && (
                  <p className="text-[11px] text-zinc-400 truncate">
                    Dir: {selectedOrder.customer.address}
                  </p>
                )}
              </div>

              <div className="text-right">
                <span className="text-zinc-500 text-[10px] block">Hora de registro:</span>
                <span className="font-bold text-zinc-200">
                  {formatTime(selectedOrder.createdAt)}
                </span>
                <span className="text-[10px] text-zinc-500 block">
                  {formatElapsedTime(selectedOrder.createdAt)}
                </span>
              </div>
            </div>

            {/* Historial sutil: Responsable que ingresó la comanda */}
            <div className="bg-zinc-900/60 px-3 py-2 rounded-xl border border-zinc-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-zinc-400">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px]">
                  Ingresado por:{' '}
                  <strong className="text-zinc-200 font-bold">
                    {selectedOrder.createdBy?.name || selectedOrder.createdBy?.email?.split('@')[0] || 'Caja / Mostrador'}
                  </strong>
                </span>
              </div>
              {selectedOrder.createdBy?.email && (
                <span className="text-[10px] text-zinc-500 font-mono">
                  {selectedOrder.createdBy.email}
                </span>
              )}
            </div>

            {/* Detalle de Productos y Opciones */}
            <div className="bg-black/50 p-3 rounded-xl space-y-2 border border-zinc-800">
              <h5 className="font-bold text-white uppercase tracking-wider text-[11px]">
                Productos del Pedido ({selectedOrder.items?.length || 0})
              </h5>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {selectedOrder.items?.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60 flex justify-between items-start text-xs"
                  >
                    <div className="space-y-0.5">
                      <span className="font-extrabold text-white">
                        {item.quantity}× {item.name}
                      </span>

                      {/* 1. Ensalada */}
                      {item.customization?.saladSummary && (
                        <p className="text-[10px] text-emerald-400 font-medium">
                          • {item.customization.saladSummary}
                        </p>
                      )}

                      {/* 2. Papas y Modificadores */}
                      {item.customization?.selectedModifiers?.map((m) => (
                        <p key={m.groupId} className="text-[10px] text-zinc-400">
                          • {m.optionName}
                        </p>
                      ))}

                      {/* 3. Cremas (solo si existen y no es market vacío) */}
                      {item.customization?.creamsSummary && item.customization.creamsSummary.trim() !== '' && (
                        <p className="text-[11px] text-orange-400 font-semibold">
                          Cremas: {item.customization.creamsSummary}
                        </p>
                      )}

                      {/* 4. Extras */}
                      {item.customization?.selectedExtras?.map((e) => (
                        <p key={e.id} className="text-[10px] text-amber-300 font-medium">
                          + {e.name}
                        </p>
                      ))}

                      {/* 5. Empaque individual */}
                      {item.customization?.packaging && item.customization.packaging.price > 0 && (
                        <p className="text-[10px] text-blue-300 font-medium">
                          📦 {item.customization.packaging.name}
                        </p>
                      )}

                      {/* 6. Temperatura */}
                      {item.customization?.temperature && (
                        <p className="text-[10px] text-cyan-300 font-bold">
                          {item.customization.temperature === 'HELADA' ? '❄️ Helada' : '🌡️ Sin Helar'}
                        </p>
                      )}

                      {/* 7. Nota */}
                      {item.customization?.itemNotes && (
                        <p className="text-[10px] text-amber-300 italic">
                          &ldquo;{item.customization.itemNotes}&rdquo;
                        </p>
                      )}
                    </div>

                    <span className="font-extrabold text-white text-xs shrink-0 ml-2">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totales y Pago */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-800 font-semibold text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedOrder.subtotal)}</span>
              </div>
              {selectedOrder.packagingsTotal > 0 && (
                <div className="flex justify-between text-zinc-400">
                  <span>Empaques / Tapers:</span>
                  <span>{formatCurrency(selectedOrder.packagingsTotal)}</span>
                </div>
              )}
              {selectedOrder.deliveryFee > 0 && (
                <div className="flex justify-between text-zinc-400">
                  <span>Costo Delivery:</span>
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

            {/* Acciones de la Comanda: Edición permitida solo antes de entrega (flotante abajo) */}
            <div className="sticky -bottom-4 sm:-bottom-6 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3.5 bg-[#141414]/95 backdrop-blur-md border-t border-zinc-800 z-20 flex items-center justify-between flex-wrap gap-2 shadow-2xl">
              {selectedOrder.status !== 'ENTREGADO' && selectedOrder.status !== 'CANCELADO' ? (
                onEditOrderInSales && (
                  <button
                    type="button"
                    onClick={() => {
                      const orderToEdit = selectedOrder;
                      setSelectedOrder(null);
                      onEditOrderInSales(orderToEdit);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-[var(--color-porkos-orange)] hover:bg-orange-500 text-black shadow-lg shadow-orange-500/20 transition-all cursor-pointer ml-auto active:scale-95"
                  >
                    <Edit3 className="w-4 h-4 stroke-[2.5]" />
                    <span>Editar Comanda</span>
                  </button>
                )
              ) : (
                <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-semibold ml-auto py-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Comanda Entregada</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>


      {/* Modal de Confirmación para Vaciar Historial */}
      <Modal
        isOpen={isConfirmClearOpen}
        onClose={() => !isClearing && setIsConfirmClearOpen(false)}
        title="¿Vaciar todo el historial de pedidos?"
        subtitle="Esta acción eliminará todas las comandas registradas en la nube y localmente."
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-zinc-300">
            Se eliminarán permanentemente <strong className="text-white font-black">{orders.length} pedidos</strong>. Tu caja y comandas quedarán en cero para poder registrar nuevos pedidos limpios.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              disabled={isClearing}
              onClick={() => setIsConfirmClearOpen(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isClearing}
              onClick={async () => {
                setIsClearing(true);
                try {
                  if (onClearAllOrders) {
                    await onClearAllOrders();
                  }
                  setIsConfirmClearOpen(false);
                } finally {
                  setIsClearing(false);
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 cursor-pointer transition-all active:scale-95"
            >
              {isClearing ? 'Vaciando...' : 'Sí, Vaciar Historial'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
