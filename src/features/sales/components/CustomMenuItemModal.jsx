import { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import { formatCurrency } from '../../../utils/formatters';
import { Plus, Minus, Utensils, Package, Flame, Zap, ShoppingBag, Users } from 'lucide-react';
import { useCatalog } from '../../../context/useCatalog';

function CustomMenuItemForm({
  editingItem = null,
  initialName = '',
  modality = 'MESA',
  onConfirm,
  onClose,
}) {
  const { packagings: catalogPackagings = [] } = useCatalog();

  const [name, setName] = useState(() => editingItem?.name || initialName || '');
  const [price, setPrice] = useState(() =>
    editingItem?.unitPrice !== undefined ? String(editingItem.unitPrice) : ''
  );
  const [quantity, setQuantity] = useState(() => editingItem?.quantity || 1);
  const [requiresKitchen, setRequiresKitchen] = useState(() =>
    editingItem?.requiresKitchen !== undefined ? Boolean(editingItem.requiresKitchen) : true
  );
  const [consumptionType, setConsumptionType] = useState(() => {
    if (editingItem?.consumptionType) return editingItem.consumptionType;
    if (editingItem?.customization?.consumptionType) return editingItem.customization.consumptionType;
    if (modality === 'DELIVERY') return 'DELIVERY';
    if (modality === 'PARA_LLEVAR') return 'PARA_LLEVAR';
    if (modality === 'CONSUMO_EXTERNO') return 'CONSUMO_EXTERNO';
    return 'MESA';
  });
  const [selectedPackaging, setSelectedPackaging] = useState(() => {
    if (editingItem?.customization?.packaging) return editingItem.customization.packaging;
    const isTakeout = modality === 'PARA_LLEVAR' || modality === 'DELIVERY';
    if (isTakeout) {
      return catalogPackagings.find((p) => p.active && p.id !== 'pkg_ninguno') || null;
    }
    return null;
  });
  const [notes, setNotes] = useState(() => editingItem?.customization?.itemNotes || '');

  const parsedPrice = Math.max(0, parseFloat(price) || 0);
  const pkgPrice = selectedPackaging?.price || 0;
  const unitTotal = Math.round((parsedPrice + (selectedPackaging ? pkgPrice : 0)) * 100) / 100;
  const lineTotal = Math.round(unitTotal * quantity * 100) / 100;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onConfirm({
      name: name.trim(),
      price: unitTotal,
      quantity,
      requiresKitchen,
      consumptionType,
      packaging: selectedPackaging,
      notes: notes.trim(),
    });

    onClose();
  };

  const handleStepPrice = (delta) => {
    const curr = parseFloat(price) || 0;
    const nextVal = Math.max(0, Math.round((curr + delta) * 100) / 100);
    setPrice(nextVal.toFixed(2));
  };

  const isTakeoutOrDelivery =
    consumptionType === 'PARA_LLEVAR' || consumptionType === 'DELIVERY' || modality === 'DELIVERY';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-xs">
      {/* 1. Nombre del plato o producto */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-black text-zinc-300 uppercase tracking-wider">
          Nombre del Plato o Menú <span className="text-[var(--color-porkos-orange)]">*</span>
        </label>
        <input
          type="text"
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Menú Ejecutivo, Porción Especial de Chicharrón, Plato del Día..."
          className="w-full bg-[#121216] border border-zinc-800 hover:border-zinc-700 focus:border-[var(--color-porkos-orange)] focus:ring-1 focus:ring-[var(--color-porkos-orange)]/40 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white placeholder:text-zinc-500 focus:outline-none transition-colors"
        />
      </div>

      {/* 2. Precio Unitario y Cantidad */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Precio Unitario con Steppers (+/- 0.50) */}
        <div className="space-y-1.5 bg-[#0C0C0F] p-3 rounded-xl border border-[var(--color-porkos-border)]">
          <label className="block text-[11px] font-black text-zinc-300 uppercase tracking-wider">
            Precio Unitario (S/)
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleStepPrice(-0.5)}
              className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-90 text-zinc-200 flex items-center justify-center font-black transition-all cursor-pointer border border-zinc-700/80 shrink-0"
              title="Restar S/ 0.50"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 pointer-events-none">
                S/
              </span>
              <input
                type="number"
                step="0.50"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#141418] border border-zinc-800 focus:border-amber-500 rounded-lg pl-8 pr-2 py-2 text-center text-sm font-black text-white focus:outline-none transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={() => handleStepPrice(0.5)}
              className="w-9 h-9 rounded-lg bg-[var(--color-porkos-orange)]/20 hover:bg-[var(--color-porkos-orange)] text-[var(--color-porkos-orange)] hover:text-zinc-950 active:scale-90 flex items-center justify-center font-black transition-all cursor-pointer border border-orange-500/40 shrink-0"
              title="Aumentar S/ 0.50"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Cantidad con Steppers */}
        <div className="space-y-1.5 bg-[#0C0C0F] p-3 rounded-xl border border-[var(--color-porkos-border)]">
          <label className="block text-[11px] font-black text-zinc-300 uppercase tracking-wider">
            Cantidad
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-90 text-zinc-200 flex items-center justify-center font-black transition-all cursor-pointer border border-zinc-700/80 shrink-0"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full bg-[#141418] border border-zinc-800 focus:border-amber-500 rounded-lg py-2 text-center text-sm font-black text-white focus:outline-none transition-colors"
            />

            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-90 text-zinc-200 flex items-center justify-center font-black transition-all cursor-pointer border border-zinc-700/80 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Destino del Producto (Mesa / Ir Comiendo / Llevar) */}
      {modality !== 'DELIVERY' && (
        <div className="space-y-1.5 bg-[#0C0C0F] p-3 rounded-xl border border-[var(--color-porkos-border)]">
          <label className="block text-[11px] font-black text-zinc-300 uppercase tracking-wider">
            Destino del Plato
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'MESA', label: 'Mesa', icon: Users, color: 'border-blue-500/50 bg-blue-950/30 text-blue-200' },
              { id: 'CONSUMO_EXTERNO', label: 'Ir Comiendo', icon: Utensils, color: 'border-purple-500/50 bg-purple-950/30 text-purple-200' },
              { id: 'PARA_LLEVAR', label: 'Llevar', icon: ShoppingBag, color: 'border-amber-500/50 bg-amber-950/30 text-amber-200' },
            ].map((dest) => {
              const isSelected = consumptionType === dest.id;
              const Icon = dest.icon;
              return (
                <button
                  key={dest.id}
                  type="button"
                  onClick={() => {
                    setConsumptionType(dest.id);
                    if (dest.id === 'PARA_LLEVAR' && !selectedPackaging) {
                      const defaultPkg = catalogPackagings.find((p) => p.active && p.id !== 'pkg_ninguno');
                      if (defaultPkg) setSelectedPackaging(defaultPkg);
                    } else if (dest.id !== 'PARA_LLEVAR') {
                      setSelectedPackaging(null);
                    }
                  }}
                  className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1.5 font-black text-xs transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? `${dest.color} ring-1 ring-white/20 shadow-xs`
                      : 'bg-[#141418] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{dest.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Táper / Empaque (solo si es Para Llevar o Delivery) */}
      {isTakeoutOrDelivery && catalogPackagings.length > 0 && (
        <div className="space-y-1.5 bg-[#0C0C0F] p-3 rounded-xl border border-[var(--color-porkos-border)]">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-blue-400" />
              <span>Empaque / Táper</span>
            </label>
            {selectedPackaging && selectedPackaging.price > 0 && (
              <span className="text-[10px] text-blue-400 font-bold">
                +{formatCurrency(selectedPackaging.price)} c/u
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedPackaging(null)}
              className={`p-2 rounded-lg border text-left font-bold text-[11px] transition-all cursor-pointer ${
                !selectedPackaging
                  ? 'bg-zinc-800 border-zinc-600 text-white shadow-xs'
                  : 'bg-[#141418] border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Sin táper adicional
            </button>
            {catalogPackagings
              .filter((p) => p.active && p.id !== 'pkg_ninguno')
              .map((pkg) => {
                const isSelected = selectedPackaging?.id === pkg.id;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPackaging(pkg)}
                    className={`p-2 rounded-lg border text-left font-bold text-[11px] transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500/60 text-blue-200 shadow-xs'
                        : 'bg-[#141418] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="truncate">{pkg.name}</div>
                    <div className="text-[10px] text-blue-400 font-black">+{formatCurrency(pkg.price)}</div>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* 5. ¿Requiere preparación en Cocina? */}
      <div className="space-y-1.5 bg-[#0C0C0F] p-3 rounded-xl border border-[var(--color-porkos-border)]">
        <label className="block text-[11px] font-black text-zinc-300 uppercase tracking-wider">
          Área de Preparación
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRequiresKitchen(true)}
            className={`p-2 rounded-xl border flex items-center justify-center gap-1.5 font-black text-xs transition-all cursor-pointer active:scale-95 ${
              requiresKitchen
                ? 'bg-orange-950/40 border-[var(--color-porkos-orange)] text-orange-200 shadow-xs'
                : 'bg-[#141418] border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span>Enviar a Cocina</span>
          </button>

          <button
            type="button"
            onClick={() => setRequiresKitchen(false)}
            className={`p-2 rounded-xl border flex items-center justify-center gap-1.5 font-black text-xs transition-all cursor-pointer active:scale-95 ${
              !requiresKitchen
                ? 'bg-blue-950/40 border-blue-500 text-blue-200 shadow-xs'
                : 'bg-[#141418] border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Entrega Directa / Caja</span>
          </button>
        </div>
      </div>

      {/* 6. Nota o especificaciones */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-black text-zinc-300 uppercase tracking-wider">
          Nota / Especificaciones (Opcional)
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ej. Sin cebolla, término medio, cremas aparte..."
          className="w-full bg-[#121216] border border-zinc-800 hover:border-zinc-700 focus:border-[var(--color-porkos-orange)] rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 font-medium focus:outline-none transition-colors"
        />
      </div>

      {/* Botón de Confirmación con Resumen de Precio */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={!name.trim()}
          className="w-full py-3 px-4 rounded-xl font-black text-sm bg-[var(--color-porkos-orange)] hover:bg-[var(--color-porkos-orange-hover)] text-zinc-950 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
        >
          <span>{editingItem ? 'Guardar Cambios' : 'Añadir a la Comanda'}</span>
          <span>•</span>
          <span>{formatCurrency(lineTotal)}</span>
        </button>
      </div>
    </form>
  );
}

export default function CustomMenuItemModal({
  isOpen,
  onClose,
  editingItem = null,
  initialName = '',
  modality = 'MESA',
  onConfirm,
}) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? 'Editar Menú Fuera de Carta' : 'Menú Fuera de Carta / Personalizado'}
      subtitle="Registra un plato o producto especial que no esté en la carta regular"
      size="md"
    >
      <CustomMenuItemForm
        key={editingItem?.itemId || `new_custom_${isOpen ? 'open' : 'closed'}`}
        editingItem={editingItem}
        initialName={initialName}
        modality={modality}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    </Modal>
  );
}
