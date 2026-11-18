import { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { formatCurrency } from '../../../utils/formatters';
import { PAYMENT_METHODS } from '../../../types/constants';

export default function QuickPaymentModal({
  isOpen,
  onClose,
  total,
  onConfirmPayment,
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

  const handleConfirm = () => {
    onConfirmPayment({
      method: selectedMethod,
      amount: total,
      cashGiven: isCash ? cashAmount : total,
      change: isCash ? change : 0,
      reference: reference.trim(),
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Cobro"
      subtitle="Selecciona el método de pago para finalizar"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Total Prominent Banner */}
        <div className="bg-black/50 border border-zinc-800 rounded-2xl p-4 text-center">
          <span className="text-xs text-zinc-400 font-semibold block uppercase tracking-wider">
            Total a Cobrar
          </span>
          <span className="text-3xl font-black text-[var(--color-porkos-orange)] mt-0.5 block tracking-tight">
            {formatCurrency(total)}
          </span>
        </div>

        {/* Payment Methods */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
            Método de Pago
          </label>
          <div className="grid grid-cols-3 gap-2">
            {Object.values(PAYMENT_METHODS).map((pm) => {
              const isSelected = selectedMethod === pm.id;
              return (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setSelectedMethod(pm.id)}
                  className={`
                    p-3 rounded-xl border text-xs font-bold transition-all text-center
                    ${
                      isSelected
                        ? 'bg-[var(--color-porkos-orange)] text-black border-transparent shadow-md'
                        : 'bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:border-zinc-500'
                    }
                  `}
                >
                  {pm.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Efectivo: Monto recibido & Vuelto */}
        {isCash && (
          <div className="space-y-3 bg-black/40 p-3 rounded-xl border border-zinc-800">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">
                Efectivo Recibido (S/)
              </label>
              <input
                type="number"
                step="0.50"
                value={cashGiven}
                onChange={(e) => setCashGiven(e.target.value)}
                placeholder={total.toString()}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-base font-bold text-white focus:outline-none focus:border-[var(--color-porkos-orange)]"
              />
            </div>

            {/* Quick cash chips */}
            <div className="flex flex-wrap gap-1.5">
              {quickCashOptions.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setCashGiven(amt.toString())}
                  className="text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-700"
                >
                  {amt === total ? 'Monto Exacto' : `S/ ${amt}`}
                </button>
              ))}
            </div>

            {/* Vuelto display */}
            {cashAmount > 0 && (
              <div className="flex justify-between items-center pt-2 border-t border-zinc-800 text-sm">
                <span className="text-zinc-400 font-semibold">Vuelto a entregar:</span>
                <span
                  className={`font-black text-base ${
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

        {/* Yape / Plin / Transferencia: Reference number */}
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
              className="w-full bg-black/40 border border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--color-porkos-orange)]"
            />
          </div>
        )}

        {/* Confirm Payment button (flotante abajo) */}
        <div className="sticky -bottom-4 sm:-bottom-6 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3.5 bg-[#141414]/95 backdrop-blur-md border-t border-zinc-800 z-20 shadow-2xl">
          <Button
            onClick={handleConfirm}
            fullWidth
            size="lg"
            disabled={isCash && cashAmount > 0 && cashAmount < total}
            className="text-base"
          >
            Confirmar y Finalizar Venta
          </Button>
        </div>
      </div>
    </Modal>
  );
}
