import { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { formatCurrency } from '../../../utils/formatters';
import { PAYMENT_METHODS } from '../../../types/constants';
import { Banknote, QrCode, Smartphone, ArrowRightLeft, CreditCard, Check } from 'lucide-react';

export default function QuickPaymentModal({
  isOpen,
  onClose,
  total,
  onConfirmPayment,
  isSubmitting = false,
}) {
  const [selectedMethod, setSelectedMethod] = useState(PAYMENT_METHODS.EFECTIVO.id);
  const [cashGiven, setCashGiven] = useState('');
  const [reference, setReference] = useState('');

  const cashAmount = parseFloat(cashGiven) || 0;
  const change = Math.max(0, cashAmount - total);
  const isCash = selectedMethod === PAYMENT_METHODS.EFECTIVO.id;

  const quickCashOptions = [total, 20, 50, 100].filter(
    (val, idx, arr) => val >= total && arr.indexOf(val) === idx
  );

  const methodIcons = {
    EFECTIVO: Banknote,
    YAPE: QrCode,
    PLIN: Smartphone,
    TRANSFERENCIA: ArrowRightLeft,
    TARJETA: CreditCard,
  };

  const methodColors = {
    EFECTIVO: {
      active: 'bg-emerald-500 text-zinc-950 border-emerald-400 font-black shadow-lg shadow-emerald-500/20',
      idle: 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-500/5',
      accent: 'text-emerald-400',
    },
    YAPE: {
      active: 'bg-purple-600 text-white border-purple-500 font-black shadow-lg shadow-purple-600/20',
      idle: 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-purple-500/50 hover:bg-purple-500/5',
      accent: 'text-purple-400',
    },
    PLIN: {
      active: 'bg-cyan-500 text-zinc-950 border-cyan-400 font-black shadow-lg shadow-cyan-500/20',
      idle: 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-cyan-500/50 hover:bg-cyan-500/5',
      accent: 'text-cyan-400',
    },
    TRANSFERENCIA: {
      active: 'bg-blue-600 text-white border-blue-500 font-black shadow-lg shadow-blue-600/20',
      idle: 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-blue-500/50 hover:bg-blue-500/5',
      accent: 'text-blue-400',
    },
    TARJETA: {
      active: 'bg-amber-500 text-zinc-950 border-amber-400 font-black shadow-lg shadow-amber-500/20',
      idle: 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-amber-500/50 hover:bg-amber-500/5',
      accent: 'text-amber-400',
    },
  };

  const handleConfirm = () => {
    if (isSubmitting) return;
    const finalCash = isCash ? (cashAmount > 0 ? cashAmount : total) : total;
    const finalChange = isCash ? Math.max(0, Math.round((finalCash - total) * 100) / 100) : 0;
    onConfirmPayment({
      method: selectedMethod,
      amount: total,
      cashGiven: finalCash,
      change: finalChange,
      reference: reference.trim().replace(/[<>]/g, '').slice(0, 100),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? undefined : onClose}
      title="Registrar Cobro"
      subtitle="Selecciona el método de pago para finalizar"
      maxWidth="max-w-md"
      showClose={!isSubmitting}
    >
      <div className="space-y-4">
        {/* Total Prominent Banner */}
        <div className="bg-[#0C0C0F] border border-[var(--color-porkos-border)] rounded-2xl p-4 text-center shadow-inner">
          <span className="text-[11px] text-zinc-400 font-bold block uppercase tracking-wider">
            Total a Cobrar
          </span>
          <span className="text-3xl sm:text-4xl font-black text-[var(--color-porkos-orange)] mt-1 block tracking-tight">
            {formatCurrency(total)}
          </span>
        </div>

        {/* Métodos de Pago */}
        <div className="space-y-2">
          <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider block">
            Método de Pago
          </label>
          <div className="grid grid-cols-3 gap-2">
            {Object.values(PAYMENT_METHODS).map((pm) => {
              const isSelected = selectedMethod === pm.id;
              const Icon = methodIcons[pm.id] || Banknote;
              const style = methodColors[pm.id] || methodColors.EFECTIVO;

              return (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setSelectedMethod(pm.id)}
                  className={`
                    p-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 touch-manipulation select-none
                    ${isSelected ? style.active : style.idle}
                  `}
                >
                  <Icon className={`w-5 h-5 ${isSelected ? 'stroke-[2.5]' : style.accent}`} />
                  <span className="truncate w-full">{pm.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Efectivo: Monto recibido & Vuelto */}
        {isCash && (
          <div className="space-y-3 bg-[#0C0C0F] p-3.5 rounded-2xl border border-[var(--color-porkos-border)]">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                Efectivo Recibido (S/)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-400">
                  S/
                </span>
                <input
                  type="number"
                  step="0.50"
                  value={cashGiven}
                  onChange={(e) => setCashGiven(e.target.value)}
                  placeholder={total.toString()}
                  className="w-full bg-[#141418] border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2.5 text-base sm:text-lg font-black text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Fichas de atajo para efectivo */}
            <div className="flex flex-wrap gap-1.5">
              {quickCashOptions.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setCashGiven(amt.toString())}
                  className="text-xs font-bold bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-xl border border-zinc-800 transition-all cursor-pointer active:scale-95 touch-manipulation"
                >
                  {amt === total ? 'Monto Exacto' : `S/ ${amt}`}
                </button>
              ))}
            </div>

            {/* Desglose de Vuelto */}
            {cashAmount > 0 && (
              <div className="flex justify-between items-center pt-2.5 border-t border-zinc-800/80 text-sm">
                <span className="text-zinc-400 font-bold">Vuelto a entregar:</span>
                <span
                  className={`font-black text-base sm:text-lg ${
                    cashAmount < total ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {cashAmount < total
                    ? `Faltan ${formatCurrency(total - cashAmount)}`
                    : formatCurrency(change)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Pagos Digitales: Número de Operación / Referencia */}
        {!isCash && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 block">
              Número de Operación / Referencia (Opcional)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej. 182947..."
              className="w-full bg-[#0C0C0F] border border-[var(--color-porkos-border)] hover:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--color-porkos-orange)] transition-colors"
            />
          </div>
        )}

        {/* Botón Principal de Confirmación */}
        <div className="pt-2">
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleConfirm}
            isLoading={isSubmitting}
            icon={Check}
            className="text-sm sm:text-base font-black py-3.5 shadow-lg shadow-orange-500/25"
          >
            {isSubmitting
              ? 'Procesando cobro...'
              : `Confirmar Cobro • ${formatCurrency(total)}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
