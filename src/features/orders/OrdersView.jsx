import { useState, useMemo } from 'react';
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
  Package,
  Edit3,
  Plus,
  Minus,
  Trash2,
  Lock,
  Check,
} from 'lucide-react';
import { formatCurrency, formatTime, formatElapsedTime } from '../../utils/formatters';
import { ORDER_STATUS, PAYMENT_STATUS } from '../../types/constants';
import Modal from '../../components/ui/Modal';

function EditOrderModal({ order, isOpen, onClose, onSave, onEditInSales, tables = [] }) {
  const [items, setItems] = useState(() => (order?.items ? order.items.map((i) => ({ ...i, customization: { ...(i.customization || {}) } })) : []));
  const [tableId, setTableId] = useState(() => order?.tableId || '');
  const [customerName, setCustomerName] = useState(() => order?.customerName || order?.customer?.name || '');
  const [customerPhone, setCustomerPhone] = useState(() => order?.customer?.phone || '');
  const [customerAddress, setCustomerAddress] = useState(() => order?.customer?.address || '');
  const [customerReference, setCustomerReference] = useState(() => order?.customer?.reference || '');
  const [deliveryFee, setDeliveryFee] = useState(() => order?.deliveryFee || 0);
  const [generalNotes, setGeneralNotes] = useState(() => order?.generalNotes || '');
  const [errorMessage, setErrorMessage] = useState(null);

  if (!order) return null;

  const isDelivered = order.status === 'ENTREGADO';
  const isMesa = order.modality === 'MESA';
  const isDelivery = order.modality === 'DELIVERY';

  const updateItemQty = (idx, delta) => {
    setItems((prev) => {
      const next = [...prev];
      const newQty = next[idx].quantity + delta;
      if (newQty <= 0) {
        return next.filter((_, i) => i !== idx);
      }
      next[idx] = {
        ...next[idx],
        quantity: newQty,
        subtotal: next[idx].unitPrice * newQty,
      };
      return next;
    });
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItemNotes = (idx, notes) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        customization: {
          ...next[idx].customization,
          itemNotes: notes,
        },
      };
      return next;
    });
  };

  const itemsSubtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const packagingsTotal = order.packagingsTotal || 0;
  const currentDeliveryFee = isDelivery ? (parseFloat(deliveryFee) || 0) : 0;
  const total = Math.max(0, itemsSubtotal + packagingsTotal + currentDeliveryFee - (order.discount || 0));

  const handleSave = () => {
    if (isDelivered) {
      setErrorMessage('Esta comanda ya ha sido entregada y no puede ser modificada.');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('⚠️ La comanda debe contener al menos 1 producto.');
      return;
    }

    if (isMesa && !tableId) {
      setErrorMessage('⚠️ Debes seleccionar un número de mesa obligatorio.');
      return;
    }

    if (isDelivery) {
      if (!customerName.trim()) {
        setErrorMessage('⚠️ Ingresa el nombre del cliente para delivery.');
        return;
      }
      if (!customerAddress.trim()) {
        setErrorMessage('⚠️ Ingresa la dirección exacta de entrega.');
        return;
      }
    }

    const selectedTableObj = tables.find((t) => t.id === tableId);
    const updated = {
      ...order,
      tableId: isMesa ? tableId : null,
      tableName: isMesa ? (selectedTableObj?.label || order.tableName || 'Mesa') : null,
      customerName: customerName.trim() || null,
      customer: isDelivery
        ? {
            name: customerName.trim(),
            phone: customerPhone.trim(),
            address: customerAddress.trim(),
            reference: customerReference.trim(),
            deliveryFee: currentDeliveryFee,
          }
        : null,
      items,
      generalNotes: generalNotes.trim(),
      subtotal: itemsSubtotal,
      deliveryFee: currentDeliveryFee,
      total,
      updatedAt: new Date(),
    };

    onSave(updated);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Editar Comanda: ${order.orderNumber}`}
      subtitle={`Modalidad: ${isMesa ? 'Mesa' : isDelivery ? 'Delivery' : order.modality}`}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 text-xs">
        {isDelivered ? (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>Esta comanda ya fue entregada y se encuentra bloqueada para edición.</span>
          </div>
        ) : (
          <>
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-2">
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Configuración de Mesa obligatoria */}
            {isMesa && (
              <div className="bg-black/50 p-3 rounded-xl border border-zinc-800 space-y-1.5">
                <label className="text-zinc-300 font-bold block">
                  Número de Mesa * <span className="text-amber-400 font-normal">(Requerido)</span>
                </label>
                <select
                  value={tableId}
                  onChange={(e) => {
                    setTableId(e.target.value);
                    setErrorMessage(null);
                  }}
                  required
                  className="w-full bg-black/70 border border-zinc-700 rounded-lg p-2 text-white font-bold text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Selecciona una mesa obligatoria --</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} ({t.status === 'OCCUPIED' && t.id !== order.tableId ? 'Abierta' : 'Disponible'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Datos de Delivery */}
            {isDelivery && (
              <div className="bg-black/50 p-3 rounded-xl border border-zinc-800 space-y-2">
                <span className="font-extrabold text-emerald-400 text-xs block">
                  Datos del Cliente (Delivery)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nombre del cliente *"
                    className="bg-black/70 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Celular / WhatsApp"
                    className="bg-black/70 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Dirección exacta de entrega *"
                  className="w-full bg-black/70 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={customerReference}
                    onChange={(e) => setCustomerReference(e.target.value)}
                    placeholder="Referencia de entrega"
                    className="bg-black/70 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                  <div className="relative flex items-center">
                    <span className="absolute left-2 text-zinc-400 text-xs font-bold">S/</span>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                      placeholder="Costo envío"
                      className="w-full bg-black/70 border border-zinc-800 rounded-lg pl-7 pr-2 py-1.5 text-xs text-emerald-300 font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Cliente en salón o recojo */}
            {!isDelivery && (
              <div className="bg-black/40 p-2.5 rounded-xl border border-zinc-800">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nombre del cliente o comensal..."
                  className="w-full bg-black/70 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            {/* Lista de Productos y edición de cantidades */}
            <div className="bg-black/50 p-3 rounded-xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                <h5 className="font-extrabold text-white text-xs">
                  Productos en la Comanda ({items.length})
                </h5>
                <span className="text-[10px] text-zinc-500">Usa + / - para cambiar cantidades</span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col gap-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white text-xs">
                        {item.name}
                        {item.customization?.packaging?.price > 0 && (
                          <span className="text-[10px] text-blue-300 block font-normal">
                            📦 {item.customization.packaging.name} (+{formatCurrency(item.customization.packaging.price)})
                          </span>
                        )}
                      </div>

                      {/* Control de cantidad */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateItemQty(idx, -1)}
                          className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center font-bold cursor-pointer active:scale-95"
                          title="Restar 1"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center font-black text-white text-xs">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateItemQty(idx, 1)}
                          className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center font-bold cursor-pointer active:scale-95"
                          title="Sumar 1"
                        >
                          <Plus className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 cursor-pointer ml-1"
                          title="Eliminar plato"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <span className="font-extrabold text-white text-xs ml-2 w-16 text-right">
                          {formatCurrency(item.subtotal)}
                        </span>
                      </div>
                    </div>

                    {/* Notas de plato */}
                    <input
                      type="text"
                      value={item.customization?.itemNotes || ''}
                      onChange={(e) => updateItemNotes(idx, e.target.value)}
                      placeholder="Nota para cocina (ej. sin cebolla, bajo en azúcar)..."
                      className="w-full bg-black/60 border border-zinc-800 rounded-lg px-2 py-1 text-[11px] text-amber-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Notas generales de la comanda */}
            <div className="bg-black/40 p-2.5 rounded-xl border border-zinc-800 space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 block">
                Notas Generales de la Comanda:
              </label>
              <input
                type="text"
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Observaciones de la orden..."
                className="w-full bg-black/60 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Totales */}
            <div className="p-3 rounded-xl bg-black/60 border border-zinc-800 space-y-1 text-xs font-semibold">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} ítems):</span>
                <span>{formatCurrency(itemsSubtotal)}</span>
              </div>
              {packagingsTotal > 0 && (
                <div className="flex justify-between text-zinc-400">
                  <span>Empaques:</span>
                  <span>{formatCurrency(packagingsTotal)}</span>
                </div>
              )}
              {currentDeliveryFee > 0 && (
                <div className="flex justify-between text-zinc-400">
                  <span>Costo Delivery:</span>
                  <span>{formatCurrency(currentDeliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-extrabold text-sm pt-1 border-t border-zinc-800">
                <span>Total Actualizado:</span>
                <span className="text-[var(--color-porkos-orange)]">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Botones de Guardar y Abrir en Ventas (flotantes abajo) */}
            <div className="sticky -bottom-4 sm:-bottom-6 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3.5 bg-[#141414]/95 backdrop-blur-md border-t border-zinc-800 z-20 space-y-2 shadow-2xl">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="py-2.5 px-3 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer active:scale-95 transition-all"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Guardar Cambios</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer transition-all"
                >
                  Cancelar
                </button>
              </div>

              {onEditInSales && (
                <button
                  type="button"
                  onClick={() => {
                    onEditInSales(order);
                    onClose();
                  }}
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-850 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Abrir en Ventas para Añadir Platos de la Carta</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default function OrdersView({
  orders = [],
  onUpdateOrder,
  onEditOrderInSales,
  tables = [],
}) {
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'HISTORY'
  const [filterModality, setFilterModality] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingModalOrder, setEditingModalOrder] = useState(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
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

          {/* Search bar */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por N° pedido, cliente o mesa..."
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
            const payConf = PAYMENT_STATUS[order.paymentStatus] || {};
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
                      : 'border-zinc-850 opacity-90'
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
                      {order.customerName && (
                        <span className="text-amber-400 font-bold truncate">
                          • {order.customerName}
                        </span>
                      )}
                      <span className="text-zinc-500 text-[11px]">
                        ({order.items?.length || 0} items)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Status Pill, Elapsed, Total, Tap CTA */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-850">
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
                        payConf.badgeClass || 'text-zinc-400 bg-zinc-850'
                      }`}
                    >
                      {payConf.label || order.paymentStatus}
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingModalOrder(order);
                      }}
                      className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-amber-500 text-zinc-400 hover:text-black transition-colors shrink-0 cursor-pointer"
                      title="Editar comanda"
                      aria-label="Editar comanda"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span
                      className="p-1.5 text-zinc-600 shrink-0"
                      title="Comanda entregada (No editable)"
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
                          ? 'bg-zinc-850 text-emerald-400 border-emerald-500/30 font-bold'
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
              <div>
                <span className="text-zinc-500 text-[10px] block">Cliente:</span>
                <span className="font-bold text-white text-sm">
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
                <span className="text-zinc-500 text-[10px] block">Hora de registro:</span>
                <span className="font-bold text-zinc-200">
                  {formatTime(selectedOrder.createdAt)}
                </span>
                <span className="text-[10px] text-zinc-500 block">
                  {formatElapsedTime(selectedOrder.createdAt)}
                </span>
              </div>
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
                <>
                  {onEditOrderInSales && (
                    <button
                      type="button"
                      onClick={() => {
                        const orderToEdit = selectedOrder;
                        setSelectedOrder(null);
                        onEditOrderInSales(orderToEdit);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                      <span>Añadir Platos del Menú</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const orderToEdit = selectedOrder;
                      setSelectedOrder(null);
                      setEditingModalOrder(orderToEdit);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/20 transition-all cursor-pointer ml-auto"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar Comanda</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-bold ml-auto py-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Comanda Entregada (Bloqueada para edición)</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Edición de Comanda */}
      {editingModalOrder && (
        <EditOrderModal
          key={editingModalOrder.orderNumber}
          order={editingModalOrder}
          isOpen={Boolean(editingModalOrder)}
          onClose={() => setEditingModalOrder(null)}
          onSave={(updated) => {
            if (onUpdateOrder) {
              onUpdateOrder(updated);
            }
          }}
          onEditInSales={onEditOrderInSales}
          tables={tables}
        />
      )}
    </div>
  );
}
