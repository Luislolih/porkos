import { useState } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  Flame,
  ChefHat,
  Edit3,
  UserCheck,
  User,
  Check,
  X,
  XCircle,
  ChevronUp,
  ChevronDown,
  FileText,
  Phone,
  MapPin,
} from 'lucide-react';
import { formatCurrency, formatDate, formatTime } from '../../../utils/formatters';
import { doesProductSupportCreams, isProductBeverage, isProductDessert } from '../../../utils/productCategories';
import { resolveItemConsumptionType } from '../../../types/constants';
import ItemConsumptionBadge from '../../../components/ui/ItemConsumptionBadge';
import ProductThumbnail from '../../../components/ui/ProductThumbnail';
import StatusIndicator from '../../../components/ui/StatusIndicator';
import Button from '../../../components/ui/Button';
import ModalityIcon from './ModalityIcon';
import {
  formatOrderNote,
  getOrderCustomerLabel,
  getOrderItemsCount,
  getOrderLocationLabel,
  getOrderPaymentInfo,
  getStatusIconContainerClass,
  getStepStatusIndex,
  isOrderEditable,
} from '../orderHelpers';

const TIMELINE_STEPS = [
  { id: 'PENDIENTE', label: 'Recibido', icon: Clock },
  { id: 'PREPARANDO', label: 'Cocina', icon: Flame },
  { id: 'LISTO', label: 'Listo', icon: ChefHat },
  { id: 'ENTREGADO', label: 'Entregado', icon: CheckCircle2 },
];

export default function OrderDetailContent({
  order,
  products = [],
  categories = [],
  getItemThumbnail,
  onEditOrderInSales,
  onSaveCustomerName,
  onClose,
  onPrevOrder,
  onNextOrder,
  hasPrevOrder = false,
  hasNextOrder = false,
  variant = 'panel', // 'panel' (desktop side panel) | 'modal' (mobile modal)
}) {
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [tempCustomerName, setTempCustomerName] = useState('');

  if (!order) return null;

  const isPanel = variant === 'panel';
  const editable = isOrderEditable(order);
  const isCancelled = order.status === 'CANCELADO';
  const paymentInfo = getOrderPaymentInfo(order);
  const locationLabel = getOrderLocationLabel(order);
  const customerLabel = getOrderCustomerLabel(order, 'Cliente en Salón');
  const totalUnits = getOrderItemsCount(order);
  const noteText = formatOrderNote(order.generalNotes);
  const operatorName =
    order.createdBy?.name ||
    order.registeredBy ||
    order.createdBy?.email?.split('@')[0] ||
    'Caja';
  const hasFeeOrDiscount =
    (order.packagingsTotal || 0) > 0 ||
    (order.deliveryFee || 0) > 0 ||
    (order.discount || 0) > 0;
  const currentStepIdx = getStepStatusIndex(order.status);

  const handleStartCustomerEdit = () => {
    setTempCustomerName(order.customerName || order.customer?.name || '');
    setIsEditingCustomer(true);
  };

  const handleCommitCustomerEdit = () => {
    if (onSaveCustomerName) {
      onSaveCustomerName(order, tempCustomerName);
    }
    setIsEditingCustomer(false);
  };

  const statusAndTimelineBlock = isCancelled ? (
    <div className="bg-rose-950/25 border border-rose-500/30 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
      <p className="text-[11px] text-rose-200/85 font-medium leading-snug">
        Comanda anulada — no suma en las ventas del turno.
      </p>
    </div>
  ) : (
    <div className="grid grid-cols-4 gap-1.5">
      {TIMELINE_STEPS.map((step, idx) => {
        const isDone = idx < currentStepIdx;
        const isCurrent = idx === currentStepIdx;
        const StepIcon = step.icon;

        return (
          <div
            key={step.id}
            className={`px-1.5 py-1.5 rounded-xl border flex items-center justify-center gap-1 text-center transition-colors ${
              isCurrent
                ? 'bg-[var(--color-porkos-orange)] text-zinc-950 border-[var(--color-porkos-orange)] font-black shadow-xs'
                : isDone
                ? 'bg-zinc-900/90 text-emerald-400 border-emerald-500/25 font-bold'
                : 'bg-zinc-900/40 text-zinc-600 border-zinc-800/70'
            }`}
          >
            <StepIcon className="w-3 h-3 shrink-0" />
            <span className="text-[10px] leading-none font-bold truncate">{step.label}</span>
          </div>
        );
      })}
    </div>
  );

  const clientBlock = (
    <div className="bg-[#0C0C0F] px-3 py-2.5 rounded-xl border border-[var(--color-porkos-border)] space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          {isEditingCustomer ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                value={tempCustomerName}
                onChange={(e) => setTempCustomerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCommitCustomerEdit();
                  if (e.key === 'Escape') setIsEditingCustomer(false);
                }}
                placeholder="Nombre del cliente..."
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[var(--color-porkos-orange)] font-bold w-full max-w-[180px]"
              />
              <button
                type="button"
                onClick={handleCommitCustomerEdit}
                className="p-1.5 rounded-lg bg-[var(--color-porkos-orange)] text-zinc-950 cursor-pointer font-bold shrink-0"
                title="Guardar nombre"
              >
                <Check className="w-3 h-3 stroke-[3]" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditingCustomer(false)}
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer shrink-0"
                title="Cancelar"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="font-bold text-white text-xs sm:text-[13px] truncate">
                {customerLabel}
              </span>
              {onSaveCustomerName && (
                <button
                  type="button"
                  onClick={handleStartCustomerEdit}
                  className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors cursor-pointer shrink-0"
                  title="Editar nombre del cliente"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        <div
          className="flex items-center gap-1.5 text-[11px] text-zinc-400 shrink-0"
          title={order.createdBy?.email || operatorName}
        >
          <UserCheck className="w-3.5 h-3.5 text-emerald-400/80 shrink-0" />
          <span className="font-semibold text-zinc-300 truncate max-w-[110px]">
            {operatorName}
          </span>
        </div>
      </div>

      {(order.customer?.phone || order.customer?.address || order.isManualPastOrder) && (
        <div className="pt-1.5 border-t border-zinc-800/70 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-zinc-400">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
            {order.customer?.phone && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Phone className="w-3 h-3 text-zinc-500 shrink-0" />
                <span>{order.customer.phone}</span>
              </span>
            )}
            {order.customer?.address && (
              <span className="inline-flex items-center gap-1 min-w-0">
                <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                <span className="truncate max-w-[230px]">{order.customer.address}</span>
              </span>
            )}
          </div>
          {order.isManualPastOrder && (
            <span className="px-1.5 py-0.2 rounded bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 font-semibold text-[10px]">
              Manual
            </span>
          )}
        </div>
      )}
    </div>
  );

  const noteBlock = noteText ? (
    <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl px-3 py-2 text-[11px] text-amber-200/90 flex items-start gap-2">
      <FileText className="w-3.5 h-3.5 text-amber-400/80 shrink-0 mt-0.5" />
      <span className="italic break-words">{noteText}</span>
    </div>
  ) : null;

  const itemsBlock = (
    <div className="bg-[#0C0C0F] rounded-xl border border-[var(--color-porkos-border)] overflow-hidden">
      <div className="px-3 py-2 bg-[#141418]/70 border-b border-zinc-800/70 flex items-center justify-between">
        <span className="font-black text-zinc-300 uppercase tracking-wider text-[10px]">
          Productos ({order.items?.length || 0})
        </span>
        <span className="text-[11px] font-semibold text-zinc-400 tabular-nums">
          {totalUnits} unid.
        </span>
      </div>

      {order.items && order.items.length > 0 ? (
        <div className="divide-y divide-zinc-800/55">
          {order.items.map((item, idx) => {
            const catalogProd = products.find((p) => p.id === (item.productId || item.id)) || item;
            const supportsCreams = doesProductSupportCreams(catalogProd, categories);
            const creamsText = supportsCreams ? item.customization?.creamsSummary?.trim() : '';
            const resolvedType = resolveItemConsumptionType(item, order.modality);
            const showDiffConsumption =
              order.modality !== 'MARKET' &&
              order.modality !== 'DELIVERY' &&
              resolvedType !== order.modality;

            return (
              <div
                key={item.itemId || `${idx}-${item.name}`}
                className="px-3 py-2.5 flex items-start gap-2.5 text-xs"
              >
                <ProductThumbnail
                  src={item.image}
                  thumbnailUrl={getItemThumbnail ? getItemThumbnail(item) : (item.thumbnailUrl || item.image)}
                  name={item.name}
                  isBeverage={isProductBeverage(item)}
                  isDessert={isProductDessert(item)}
                  priority={true}
                  className="w-10 h-10 rounded-lg shrink-0"
                  iconSize="w-4 h-4"
                />

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className="bg-zinc-800 text-[var(--color-porkos-orange)] border border-zinc-700/80 px-1.5 py-0.2 rounded font-black text-[11px] shrink-0 tabular-nums">
                        {item.quantity}×
                      </span>
                      <span className="font-bold text-white text-xs sm:text-[13px] leading-snug break-words">
                        {item.name}
                      </span>
                      {showDiffConsumption && (
                        <ItemConsumptionBadge item={item} orderModality={order.modality} subtle />
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-1">
                      <span className="font-black text-white text-xs sm:text-[13px] tabular-nums block">
                        {formatCurrency(item.subtotal)}
                      </span>
                      {item.quantity > 1 && item.unitPrice !== undefined && (
                        <span className="text-[10px] text-zinc-500 tabular-nums block">
                          {formatCurrency(item.unitPrice)} c/u
                        </span>
                      )}
                    </div>
                  </div>

                  {item.customization?.saladSummary && (
                    <p className="text-[10px] text-emerald-400/90 font-medium">
                      • {item.customization.saladSummary}
                    </p>
                  )}

                  {item.customization?.selectedModifiers?.map((m) => (
                    <p key={m.groupId || m.optionName} className="text-[10px] text-zinc-400">
                      • {m.optionName}
                    </p>
                  ))}

                  {creamsText && (
                    <p className="text-[11px] text-[var(--color-porkos-orange)] font-semibold">
                      Cremas: {creamsText}
                    </p>
                  )}

                  {item.customization?.selectedExtras?.map((e, eIdx) => {
                    const clean = (e?.name || e?.label || (typeof e === 'string' ? e : '') || 'Extra').replace(/^Extra\s+/i, '');
                    const qty = e?.quantity || 1;
                    const totalExtraPrice = (e?.unitPrice || e?.price || 0) * qty;
                    return (
                      <div
                        key={e?.id || `ord_extra_${eIdx}`}
                        className="flex items-center justify-between text-[10px] font-semibold text-amber-300/90 bg-amber-500/8 px-2 py-0.5 rounded-md border border-amber-500/20"
                      >
                        <span className="flex items-center gap-1.5 min-w-0 truncate">
                          <span className="font-black text-amber-300 shrink-0">{qty}×</span>
                          <span className="truncate">{clean}</span>
                        </span>
                        {totalExtraPrice > 0 && (
                          <span className="text-amber-200/90 font-bold shrink-0 ml-2 tabular-nums">
                            +{formatCurrency(totalExtraPrice)}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {item.customization?.packaging && item.customization.packaging.price > 0 && (
                    <p className="text-[10px] text-zinc-400 font-medium">
                      Empaque: {item.customization.packaging.name || 'Táper'}
                    </p>
                  )}

                  {item.customization?.temperature && (
                    <p className="text-[10px] text-cyan-300/90 font-semibold">
                      {item.customization.temperature === 'HELADA' ? 'Helada' : 'Sin Helar'}
                    </p>
                  )}

                  {item.customization?.itemNotes && (
                    <p className="text-[10px] text-amber-300/90 italic">
                      &ldquo;{item.customization.itemNotes}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-zinc-500 italic py-4 text-center">Sin productos registrados</p>
      )}
    </div>
  );

  const totalsBlock = (
    <div className="space-y-1.5 text-xs">
      {hasFeeOrDiscount && (
        <div className="space-y-1 pb-1.5 border-b border-zinc-800/80 text-[11px]">
          <div className="flex justify-between text-zinc-400">
            <span>Subtotal</span>
            <span className="tabular-nums text-zinc-200 font-semibold">{formatCurrency(order.subtotal)}</span>
          </div>
          {order.packagingsTotal > 0 && (
            <div className="flex justify-between text-zinc-400">
              <span>Empaques / Tápers</span>
              <span className="tabular-nums text-zinc-200 font-semibold">{formatCurrency(order.packagingsTotal)}</span>
            </div>
          )}
          {order.deliveryFee > 0 && (
            <div className="flex justify-between text-zinc-400">
              <span>Costo Delivery</span>
              <span className="tabular-nums text-zinc-200 font-semibold">{formatCurrency(order.deliveryFee)}</span>
            </div>
          )}
          {order.discount > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Descuento</span>
              <span className="tabular-nums font-semibold">-{formatCurrency(order.discount)}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center text-white font-black text-base">
        <span>Total</span>
        <span
          className={`tabular-nums ${
            isCancelled ? 'line-through text-zinc-500' : 'text-[var(--color-porkos-orange)]'
          }`}
        >
          {formatCurrency(order.total)}
        </span>
      </div>

      {paymentInfo.methods.length > 1 && (
        <div className="flex items-center justify-end gap-1.5 flex-wrap pt-0.5">
          {paymentInfo.methods.map((pm, idx) => (
            <span
              key={`${pm.method}-${idx}`}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-300 border border-zinc-700/60 tabular-nums"
            >
              {pm.label}: {formatCurrency(pm.amount)}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  // Vista móvil dentro de Modal: ordenada para priorizar estado, productos, cliente y total
  if (!isPanel) {
    return (
      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <StatusIndicator
            status={order.status}
            size="sm"
            pulse={order.status === 'PENDIENTE' || order.status === 'PREPARANDO'}
          />
          <span
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${paymentInfo.statusBadgeClass}`}
          >
            {paymentInfo.statusLabel}
            {paymentInfo.methodSummary ? ` · ${paymentInfo.methodSummary}` : ''}
          </span>
        </div>

        {statusAndTimelineBlock}
        {itemsBlock}
        {clientBlock}
        {noteBlock}

        <div className="bg-[#0C0C0F] px-3.5 py-3 rounded-xl border border-[var(--color-porkos-border)]">
          {totalsBlock}
        </div>

        {editable && onEditOrderInSales && (
          <Button
            type="button"
            variant="primary"
            size="md"
            fullWidth
            onClick={() => {
              if (onClose) onClose();
              onEditOrderInSales(order);
            }}
            icon={Edit3}
          >
            Editar en Ventas
          </Button>
        )}
      </div>
    );
  }

  // Vista Desktop: panel lateral con scroll interno independiente y cabecera/pie fijos
  return (
    <div className="flex flex-col h-full min-h-0 bg-[#121216] border border-[var(--color-porkos-border)] rounded-2xl shadow-2xl overflow-hidden">
      {/* Cabecera fija del panel derecho */}
      <div className="bg-[#16161C] border-b border-[var(--color-porkos-border)] px-4 py-3 shrink-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${getStatusIconContainerClass(order.status)}`}
            >
              <ModalityIcon modality={order.modality} className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <h3 className="text-base font-black text-white tracking-tight">
                {order.orderNumber}
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-800/80 text-zinc-300 border border-zinc-700/70 truncate max-w-[130px]">
                {locationLabel}
              </span>
              <StatusIndicator
                status={order.status}
                size="sm"
                pulse={order.status === 'PENDIENTE' || order.status === 'PREPARANDO'}
              />
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {(onPrevOrder || onNextOrder) && (
              <div className="flex items-center bg-[#0C0C0F] rounded-lg border border-zinc-800 p-0.5 mr-1">
                <button
                  type="button"
                  disabled={!hasPrevOrder}
                  onClick={onPrevOrder}
                  className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                  title="Pedido más reciente"
                  aria-label="Pedido anterior en la lista"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={!hasNextOrder}
                  onClick={onNextOrder}
                  className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                  title="Pedido anterior en el tiempo"
                  aria-label="Siguiente pedido en la lista"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Cerrar detalle (Esc)"
                aria-label="Cerrar panel de detalle"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px] pt-1 border-t border-zinc-800/60">
          <div className="flex items-center gap-1.5 text-zinc-400 tabular-nums">
            <Calendar className="w-3 h-3 text-zinc-500" />
            <span className="font-semibold text-zinc-300">{formatDate(order.createdAt)}</span>
            <span className="text-zinc-600">•</span>
            <Clock className="w-3 h-3 text-zinc-500" />
            <span className="font-bold text-white">{formatTime(order.createdAt)}</span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${paymentInfo.statusBadgeClass}`}
          >
            {paymentInfo.statusLabel}
            {paymentInfo.methodSummary ? ` · ${paymentInfo.methodSummary}` : ''}
          </span>
        </div>
      </div>

      {/* Cuerpo con scroll interno independiente */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-3.5 space-y-3 overscroll-contain">
        {statusAndTimelineBlock}
        {clientBlock}
        {noteBlock}
        {itemsBlock}
      </div>

      {/* Pie fijo: Totales siempre visibles + botón Editar si aplica */}
      <div className="bg-[#15151B] border-t border-[var(--color-porkos-border)] px-4 py-3 shrink-0 space-y-2.5">
        {totalsBlock}
        {editable && onEditOrderInSales && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            fullWidth
            onClick={() => {
              if (onClose) onClose();
              onEditOrderInSales(order);
            }}
            icon={Edit3}
          >
            Editar en Ventas
          </Button>
        )}
      </div>
    </div>
  );
}
