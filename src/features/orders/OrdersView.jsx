import { useState, useMemo, useEffect } from 'react';
import {
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
  Calendar,
  User,
  ClipboardList,
} from 'lucide-react';
import { formatCurrency, formatTime, formatDate, formatElapsedTime } from '../../utils/formatters';
import { ORDER_STATUS, PAYMENT_STATUS } from '../../types/constants';
import Modal from '../../components/ui/Modal';
import ItemConsumptionBadge from '../../components/ui/ItemConsumptionBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import SearchInput from '../../components/ui/SearchInput';
import Button from '../../components/ui/Button';

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

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  const filteredOrders = useMemo(() => {
    const list = orders.filter((o) => {
      if (activeTab === 'ACTIVE') {
        const isActive = o.status === 'PENDIENTE' || o.status === 'PREPARANDO' || o.status === 'LISTO';
        if (!isActive) return false;
      } else if (activeTab === 'HISTORY') {
        const isHistory = o.status === 'ENTREGADO' || o.status === 'CANCELADO';
        if (!isHistory) return false;
      }

      if (filterModality !== 'ALL') {
        if (filterModality === 'MESA' && o.modality !== 'MESA') return false;
        if (filterModality === 'DELIVERY' && o.modality !== 'DELIVERY') return false;
        if (filterModality === 'PARA_LLEVAR' && o.modality !== 'PARA_LLEVAR' && o.modality !== 'CONSUMO_EXTERNO') return false;
        if (filterModality === 'MARKET' && o.modality !== 'MARKET') return false;
      }

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
        return <Utensils className="w-4 h-4 text-blue-400" />;
      case 'DELIVERY':
        return <Bike className="w-4 h-4 text-emerald-400" />;
      case 'PARA_LLEVAR':
        return <ShoppingBag className="w-4 h-4 text-amber-400" />;
      case 'CONSUMO_EXTERNO':
        return <Utensils className="w-4 h-4 text-purple-400" />;
      case 'MARKET':
        return <Store className="w-4 h-4 text-purple-400" />;
      default:
        return <Package className="w-4 h-4 text-zinc-400" />;
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
    <div className="space-y-4 pb-20 lg:pb-6">
      <PageHeader
        title="Historial y Seguimiento"
        subtitle="Monitorea comandas activas, revisa tickets y audita todas las ventas del restaurante."
        icon={ClipboardList}
        badge={
          <span className="text-xs font-black px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
            {orders.length} comandas registradas
          </span>
        }
        actions={
          onClearAllOrders && orders.length > 0 ? (
            <button
              type="button"
              onClick={() => setIsConfirmClearOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer active:scale-95 shadow-xs"
              title="Eliminar historial completo de pedidos"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Vaciar Historial</span>
            </button>
          ) : undefined
        }
      />

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-[#121215] p-3 sm:p-4 rounded-2xl border border-[var(--color-porkos-border)] space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Segmented Control / Tabs */}
          <div className="flex bg-[#0C0C0F] p-1 rounded-xl border border-zinc-800 shrink-0">
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
                    px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 active:scale-95 touch-manipulation select-none
                    ${
                      isSelected
                        ? 'bg-[var(--color-porkos-orange)] text-zinc-950 font-black shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isSelected ? 'bg-zinc-950 text-white' : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-md">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              placeholder="Buscar comanda, cliente, mesa..."
              size="sm"
            />
          </div>
        </div>

        {/* Filter Pills: Modalidad */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs pt-1 border-t border-[var(--color-porkos-border)]">
          <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider shrink-0 mr-1">
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
                  px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer border active:scale-95 touch-manipulation
                  ${
                    isSelected
                      ? 'bg-zinc-800 text-white border-zinc-600 font-black shadow-xs'
                      : 'bg-[#141418] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white'
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
      <div className="space-y-2.5">
        {filteredOrders.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No se encontraron pedidos"
            description={
              searchQuery
                ? 'No hay resultados que coincidan con la búsqueda actual.'
                : 'No hay pedidos en la categoría o filtro seleccionado.'
            }
            action={
              searchQuery
                ? {
                    label: 'Limpiar búsqueda',
                    onClick: () => setSearchQuery(''),
                  }
                : undefined
            }
          />
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
                  group bg-[#121216] hover:bg-[#16161B] border rounded-2xl p-3.5 sm:p-4 transition-all duration-120 cursor-pointer flex flex-col gap-2.5 active:scale-[0.99] shadow-sm
                  ${
                    !isFinished
                      ? 'border-[var(--color-porkos-border)] hover:border-[var(--color-porkos-orange)]/60'
                      : 'border-[var(--color-porkos-border)]/70 opacity-90'
                  }
                `}
                title="Toca para ver el detalle y seguimiento del pedido"
              >
                {/* Cabecera del pedido */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border ${
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-sm sm:text-base text-white group-hover:text-[var(--color-porkos-orange)] transition-colors">
                          {order.orderNumber}
                        </h4>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {order.tableName || (order.modality === 'PARA_LLEVAR' ? 'Para Llevar' : order.modality === 'CONSUMO_EXTERNO' ? 'Ir Comiendo' : order.modality === 'DELIVERY' ? 'Delivery' : 'Market Directo')}
                        </span>
                      </div>

                      {/* Cliente inline con edición rápida */}
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
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
                              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-[var(--color-porkos-orange)] font-bold w-32"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveCustomerName(order)}
                              className="p-1 rounded bg-[var(--color-porkos-orange)] text-zinc-950 cursor-pointer font-bold"
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
                            className="group/cust inline-flex items-center gap-1 cursor-pointer text-amber-300 hover:text-amber-200 font-bold truncate"
                            title="Clic para editar el nombre del cliente"
                          >
                            <User className="w-3 h-3 text-zinc-500 group-hover/cust:text-amber-300 shrink-0" />
                            <span>{order.customerName || order.customer?.name || 'Cliente'}</span>
                            <Edit3 className="w-2.5 h-2.5 text-zinc-500 group-hover/cust:text-amber-300 shrink-0" />
                          </button>
                        )}

                        {order.createdBy?.name && (
                          <span className="text-zinc-500 text-[11px] font-medium hidden sm:inline">
                            • Por: <strong className="text-zinc-400 font-semibold">{order.createdBy.name}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Derecha: Badges de Estado y Total */}
                  <div className="flex items-center gap-3 shrink-0 ml-auto">
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-1.5">
                      <span
                        className={`text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-full border whitespace-nowrap ${
                          statusConf.badgeClass || 'bg-zinc-800 text-zinc-300 border-zinc-700'
                        }`}
                      >
                        {statusConf.label || order.status}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                          payConf.badgeClass || 'text-zinc-400 bg-zinc-800'
                        }`}
                      >
                        {payConf.label || effectivePaymentStatus}
                      </span>
                    </div>

                    <div className="text-right pl-2 border-l border-zinc-800 shrink-0">
                      <div className="font-black text-base sm:text-lg text-white group-hover:text-[var(--color-porkos-orange)] transition-colors">
                        {formatCurrency(order.total)}
                      </div>
                      <div className="text-[10px] text-zinc-400 flex items-center justify-end gap-1 font-medium">
                        <Calendar className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
                        <span>{formatDate(order.createdAt)}</span>
                        <span className="text-zinc-600">•</span>
                        <Clock className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
                        <span>{formatTime(order.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chips de Productos */}
                <div className="bg-[#0C0C0F] rounded-xl p-2 sm:p-2.5 border border-zinc-900 flex flex-wrap items-center gap-1.5">
                  {order.items && order.items.length > 0 ? (
                    <>
                      {order.items.slice(0, 5).map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-200 px-2.5 py-1 rounded-lg text-xs"
                        >
                          <span className="font-black text-[var(--color-porkos-orange)]">
                            {item.quantity}×
                          </span>
                          <span className="font-semibold text-zinc-300 truncate max-w-[130px] sm:max-w-[180px]">
                            {item.name}
                          </span>
                          <ItemConsumptionBadge item={item} orderModality={order.modality} />
                        </span>
                      ))}
                      {order.items.length > 5 && (
                        <span className="inline-flex items-center text-[11px] font-bold text-zinc-400 bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-700">
                          +{order.items.length - 5} más
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-zinc-500 italic">Sin productos</span>
                  )}

                  {order.deliveryFee > 0 && (
                    <span className="inline-flex items-center gap-1 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                      <Bike className="w-3.5 h-3.5 text-emerald-400" />
                      Delivery ({formatCurrency(order.deliveryFee)})
                    </span>
                  )}
                </div>

                {/* Barra inferior */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--color-porkos-border)]/60 text-xs">
                  <div className="flex items-center gap-2 text-zinc-500 text-[11px] min-w-0">
                    <span className="inline-flex items-center gap-1 bg-[#0C0C0F] px-2 py-0.5 rounded-md border border-zinc-800 text-zinc-400 font-medium">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      {formatElapsedTime(order.createdAt)}
                    </span>
                    {order.generalNotes && (
                      <span className="truncate italic text-amber-300 max-w-[200px] sm:max-w-xs">
                        &ldquo;{order.generalNotes}&rdquo;
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    {/* Botón Editar Comanda */}
                    {((order.status !== 'ENTREGADO' && order.status !== 'CANCELADO') ||
                      ((order.modality === 'MESA' || Boolean(order.tableId)) && order.paymentStatus !== 'PAID' && order.status !== 'CANCELADO')) ? (
                      onEditOrderInSales && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditOrderInSales(order);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-[var(--color-porkos-orange)] text-zinc-200 hover:text-zinc-950 text-xs font-bold transition-all cursor-pointer active:scale-95 border border-zinc-700"
                          title="Editar comanda"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Editar</span>
                        </button>
                      )
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-zinc-500 text-[10px] font-semibold"
                        title="Comanda finalizada"
                      >
                        <Lock className="w-3 h-3" />
                        <span className="hidden sm:inline">Finalizada</span>
                      </span>
                    )}

                    {/* Botón Ver Detalle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(order);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-800 group-hover:bg-[var(--color-porkos-orange)] text-zinc-200 group-hover:text-zinc-950 text-xs font-bold transition-all cursor-pointer active:scale-95 border border-zinc-700"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Detalle</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Detalle de Orden */}
      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={`Detalle de Comanda: ${selectedOrder?.orderNumber}`}
        subtitle={`Modalidad: ${selectedOrder?.tableName || (selectedOrder?.modality === 'CONSUMO_EXTERNO' ? 'Ir Comiendo' : selectedOrder?.modality)}`}
        maxWidth="max-w-xl"
      >
        {selectedOrder && (
          <div className="space-y-4 text-xs">
            {/* Timeline */}
            <div className="bg-[#0C0C0F] p-3.5 rounded-2xl border border-[var(--color-porkos-border)] space-y-2.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 block">
                Progreso del Pedido
              </span>

              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
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
                          ? 'bg-[var(--color-porkos-orange)] text-zinc-950 border-[var(--color-porkos-orange)] font-black shadow-md'
                          : isDone
                          ? 'bg-zinc-800 text-emerald-400 border-emerald-500/30 font-bold'
                          : 'bg-zinc-900/60 text-zinc-600 border-zinc-800'
                      }`}
                    >
                      <StepIcon className="w-3.5 h-3.5" />
                      <span className="text-[10px] leading-tight font-bold">{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Datos del Cliente y Registro */}
            <div className="bg-[#0C0C0F] p-3 rounded-2xl border border-[var(--color-porkos-border)] flex items-center justify-between text-xs">
              <div className="flex-1 pr-3">
                <span className="text-zinc-500 text-[10px] font-bold block uppercase tracking-wider">Cliente:</span>
                <span className="font-extrabold text-white text-sm">
                  {selectedOrder.customerName || selectedOrder.customer?.name || 'Cliente en Salón'}
                </span>
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
                <span className="text-zinc-500 text-[10px] font-bold block uppercase tracking-wider">Registrado:</span>
                <span className="font-bold text-zinc-200">
                  {formatTime(selectedOrder.createdAt)}
                </span>
                <span className="text-[10px] text-zinc-500 block">
                  {formatElapsedTime(selectedOrder.createdAt)}
                </span>
              </div>
            </div>

            {/* Ingresado por */}
            <div className="bg-[#0C0C0F] px-3.5 py-2.5 rounded-xl border border-[var(--color-porkos-border)] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-zinc-400">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px]">
                  Operador:{' '}
                  <strong className="text-zinc-200 font-bold">
                    {selectedOrder.createdBy?.name || selectedOrder.createdBy?.email?.split('@')[0] || 'Caja'}
                  </strong>
                </span>
              </div>
              {selectedOrder.createdBy?.email && (
                <span className="text-[10px] text-zinc-500 font-mono">
                  {selectedOrder.createdBy.email}
                </span>
              )}
            </div>

            {/* Productos */}
            <div className="bg-[#0C0C0F] p-3 rounded-2xl space-y-2 border border-[var(--color-porkos-border)]">
              <h5 className="font-black text-white uppercase tracking-wider text-[11px]">
                Platos y Artículos ({selectedOrder.items?.length || 0})
              </h5>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5 scrollbar-none">
                {selectedOrder.items?.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[#141418] border border-zinc-800 flex justify-between items-start text-xs"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-white">
                          {item.quantity}× {item.name}
                        </span>
                        <ItemConsumptionBadge item={item} orderModality={selectedOrder.modality} />
                      </div>

                      {item.customization?.saladSummary && (
                        <p className="text-[10px] text-emerald-400 font-semibold">
                          • {item.customization.saladSummary}
                        </p>
                      )}

                      {item.customization?.selectedModifiers?.map((m) => (
                        <p key={m.groupId} className="text-[10px] text-zinc-400">
                          • {m.optionName}
                        </p>
                      ))}

                      {item.customization?.creamsSummary && item.customization.creamsSummary.trim() !== '' && (
                        <p className="text-[11px] text-[var(--color-porkos-orange)] font-bold">
                          Cremas: {item.customization.creamsSummary}
                        </p>
                      )}

                      {item.customization?.selectedExtras?.map((e, eIdx) => {
                        const clean = (e?.name || e?.label || (typeof e === 'string' ? e : '') || 'Extra').replace(/^Extra\s+/i, '');
                        const qty = e?.quantity || 1;
                        const totalExtraPrice = (e?.unitPrice || e?.price || 0) * qty;
                        return (
                          <div
                            key={e?.id || `ord_extra_${eIdx}`}
                            className="flex items-center justify-between text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20"
                          >
                            <span className="flex items-center gap-1.5 min-w-0 truncate">
                              <span className="bg-amber-400 text-zinc-950 px-1.5 py-0.2 rounded text-[10px] font-black shrink-0">
                                {qty}x
                              </span>
                              <span className="truncate">{clean}</span>
                            </span>
                            {totalExtraPrice > 0 && (
                              <span className="text-[10px] text-amber-200/90 font-black shrink-0 ml-2">
                                +{formatCurrency(totalExtraPrice)}
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {item.customization?.packaging && item.customization.packaging.price > 0 && (
                        <p className="text-[10px] text-blue-300 font-medium">
                          📦 {item.customization.packaging.name || 'Empaque'}
                        </p>
                      )}

                      {item.customization?.temperature && (
                        <p className="text-[10px] text-cyan-300 font-bold">
                          {item.customization.temperature === 'HELADA' ? '❄️ Helada' : '🌡️ Sin Helar'}
                        </p>
                      )}

                      {item.customization?.itemNotes && (
                        <p className="text-[10px] text-amber-300 italic">
                          &ldquo;{item.customization.itemNotes}&rdquo;
                        </p>
                      )}
                    </div>

                    <span className="font-black text-white text-xs shrink-0 ml-2">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totales */}
            <div className="space-y-1.5 pt-2 border-t border-[var(--color-porkos-border)] font-semibold text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedOrder.subtotal)}</span>
              </div>
              {selectedOrder.packagingsTotal > 0 && (
                <div className="flex justify-between text-zinc-400">
                  <span>Empaques / Tápers:</span>
                  <span>{formatCurrency(selectedOrder.packagingsTotal)}</span>
                </div>
              )}
              {selectedOrder.deliveryFee > 0 && (
                <div className="flex justify-between text-zinc-400">
                  <span>Costo Delivery:</span>
                  <span>{formatCurrency(selectedOrder.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-black text-base pt-1.5 border-t border-zinc-800">
                <span>Total:</span>
                <span className="text-[var(--color-porkos-orange)]">
                  {formatCurrency(selectedOrder.total)}
                </span>
              </div>
            </div>

            {/* Acciones */}
            <div className="pt-2 border-t border-[var(--color-porkos-border)] flex items-center justify-between gap-2">
              {((selectedOrder.status !== 'ENTREGADO' && selectedOrder.status !== 'CANCELADO') ||
                ((selectedOrder.modality === 'MESA' || Boolean(selectedOrder.tableId)) && selectedOrder.paymentStatus !== 'PAID' && selectedOrder.status !== 'CANCELADO')) ? (
                onEditOrderInSales && (
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={() => {
                      const orderToEdit = selectedOrder;
                      setSelectedOrder(null);
                      onEditOrderInSales(orderToEdit);
                    }}
                    icon={Edit3}
                    className="ml-auto"
                  >
                    Editar en Ventas
                  </Button>
                )
              ) : (
                <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-semibold ml-auto py-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Comanda Finalizada</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmación para Vaciar Historial */}
      <ConfirmDialog
        isOpen={isConfirmClearOpen}
        onClose={() => !isClearing && setIsConfirmClearOpen(false)}
        onConfirm={async () => {
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
        title="¿Vaciar todo el historial de pedidos?"
        message={`Se eliminarán permanentemente ${orders.length} pedidos registrados tanto en la nube como localmente. Esta acción no se puede deshacer.`}
        confirmText="Sí, vaciar historial"
        cancelText="Conservar pedidos"
        variant="danger"
        isLoading={isClearing}
      />
    </div>
  );
}
