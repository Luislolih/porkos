import { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import { formatCurrency } from '../../../utils/formatters';
import { useCatalog } from '../../../context/useCatalog';

function CustomizerForm({
  product,
  initialCustomization = null,
  modality = 'MESA',
  onConfirm,
  onClose,
}) {
  const {
    creams: catalogCreams,
    packagings: catalogPackagings,
    extras: catalogExtras,
  } = useCatalog();

  // 1. Ensalada
  const hasSalad = Boolean(
    product.saladConfig?.enabled ||
    product.categoryId === 'cat_clasico' ||
    product.line === 'CLASICO'
  );
  const [saladMode, setSaladMode] = useState(() => {
    return initialCustomization?.saladDetail?.mode || 'CON_ENSALADA';
  });

  // 2. Papas: Fritas, Al Hilo, Sin Papas
  const hasPapasModifier = Boolean(
    product.modifiers?.some((m) => m.id === 'mod_papas' || m.id === 'mod_corte_papas' || m.name?.toLowerCase().includes('papa')) ||
    product.categoryId === 'cat_clasico' ||
    product.categoryId === 'cat_artesanal' ||
    product.line === 'CLASICO' ||
    product.line === 'ARTESANAL'
  );

  const [selectedModifiers, setSelectedModifiers] = useState(() => {
    const initialMods = {};
    if (initialCustomization?.selectedModifiers?.length > 0) {
      initialCustomization.selectedModifiers.forEach((m) => {
        initialMods[m.groupId] = m.optionId;
      });
    } else if (product.modifiers?.length > 0) {
      product.modifiers.forEach((mod) => {
        initialMods[mod.id] = mod.defaultOptionId;
      });
    } else if (hasPapasModifier) {
      initialMods['mod_papas'] = 'fritas';
    }
    return initialMods;
  });

  // Identificar si es producto de Market (bebidas, snacks, postres, etc.)
  const isMarketProduct = Boolean(
    product.type === 'MARKET' ||
    product.line === 'MARKET' ||
    product.categoryId === 'cat_market' ||
    product.categoryId === 'cat_bebidas' ||
    product.line === 'BEBIDAS_MARKET' ||
    product.marketSubtype
  );

  // 3. Cremas: lista dinámica de cremas activas (NUNCA para productos de Market)
  const availableCreams = isMarketProduct
    ? []
    : (catalogCreams || []).filter(
        (c) =>
          c.active &&
          (product.creamsConfig?.availableCreamIds?.length
            ? product.creamsConfig.availableCreamIds.includes(c.id)
            : true)
      );

  const [selectedCreams, setSelectedCreams] = useState(() => {
    if (isMarketProduct) return [];
    if (initialCustomization?.creamsDetail?.selected) {
      return initialCustomization.creamsDetail.selected;
    }
    // Por defecto SIN cremas marcadas (el usuario las elige tocando cada caja)
    return [];
  });

  // 4. Extras compatibles dinámicos
  const allExtras = catalogExtras || [];
  const compatibleExtras = allExtras.filter((e) => {
    if (!e.active) return false;
    if (product.availableExtraIds && product.availableExtraIds.length > 0) {
      return product.availableExtraIds.includes(e.id);
    }
    const cats = (e.compatibleCategories || []).map((c) =>
      c === 'cat_burgers' || c === 'cat_salchipapas' || c === 'cat_choripanes' ? 'cat_clasico' : c
    );
    if (product.categoryId && (cats.includes(product.categoryId) || (cats.includes('cat_clasico') && product.categoryId === 'cat_artesanal'))) {
      return true;
    }
    return product.type === 'RESTAURANTE';
  });

  const [selectedExtras, setSelectedExtras] = useState(() => {
    return initialCustomization?.selectedExtras || [];
  });

  // 5. Empaques asociados estrictamente a este producto
  const allPackagings = catalogPackagings || [];
  const associatedPaidPackagings = allPackagings.filter((pkg) => {
    if (!pkg.active || pkg.id === 'pkg_ninguno') return false;
    const isAssociatedInProduct = product.availablePackagingIds?.includes(pkg.id);
    const isAssociatedInPkg = pkg.applicableProductIds?.includes(product.id);
    return isAssociatedInProduct || isAssociatedInPkg;
  });

  const nonePackaging = { id: 'pkg_ninguno', name: 'Sin Empaque / Salón', price: 0 };
  const availablePackagings = [nonePackaging, ...associatedPaidPackagings];
  const hasPaidPackaging = associatedPaidPackagings.length > 0;

  const [selectedPackaging, setSelectedPackaging] = useState(() => {
    if (initialCustomization?.packaging) {
      const match = availablePackagings.find((p) => p.id === initialCustomization.packaging.id);
      if (match) return match;
    }
    // Solo si es para llevar o delivery, seleccionar por defecto el packaging asociado al producto
    const isTakeoutOrDelivery =
      modality === 'PARA_LLEVAR' ||
      modality === 'DELIVERY' ||
      modality === 'LLEVAR';

    if (isTakeoutOrDelivery && associatedPaidPackagings.length > 0) {
      return associatedPaidPackagings[0];
    }

    // En mesas, ir comiendo o cualquier otra modalidad: permitir elegir pero NO poner por defecto
    return nonePackaging;
  });

  // 6. Temperatura: Para bebidas o productos con configuración explícita
  const isBeverage = Boolean(
    product.marketSubtype === 'BEBIDA' ||
    product.line === 'BEBIDAS_MARKET' ||
    product.categoryId === 'cat_bebidas' ||
    Boolean(product.temperatureConfig?.enabled) ||
    initialCustomization?.temperature ||
    product.name?.toLowerCase().includes('jugo') ||
    product.name?.toLowerCase().includes('gaseosa') ||
    product.name?.toLowerCase().includes('refresco') ||
    product.name?.toLowerCase().includes('chicha') ||
    product.name?.toLowerCase().includes('agua') ||
    product.name?.toLowerCase().includes('cerveza') ||
    product.name?.toLowerCase().includes('cola') ||
    product.name?.toLowerCase().includes('inka')
  );

  const hasTemperature = Boolean(product.temperatureConfig?.enabled ?? isBeverage);
  const [temperature, setTemperature] = useState(() => {
    if (initialCustomization?.temperature) return initialCustomization.temperature;
    if (hasTemperature) return product.temperatureConfig?.defaultOption || 'HELADA';
    return null;
  });

  // 7. Notas
  const [notes, setNotes] = useState(() => {
    return initialCustomization?.itemNotes || '';
  });

  const toggleCream = (creamId) => {
    setSelectedCreams((prev) =>
      prev.includes(creamId) ? prev.filter((id) => id !== creamId) : [...prev, creamId]
    );
  };

  const toggleExtra = (extra) => {
    setSelectedExtras((prev) => {
      const exists = prev.find((e) => e.id === extra.id);
      if (exists) {
        return prev.filter((e) => e.id !== extra.id);
      }
      return [...prev, { id: extra.id, name: extra.name, unitPrice: extra.price, quantity: 1 }];
    });
  };

  // Totales
  const extrasTotal = selectedExtras.reduce(
    (sum, ext) => sum + ext.unitPrice * (ext.quantity || 1),
    0
  );
  const packagingPrice = selectedPackaging?.price || 0;
  const currentTotal = product.price + extrasTotal + packagingPrice;

  // Confirmar
  const handleConfirm = () => {
    let summary = '';
    if (!isMarketProduct) {
      if (selectedCreams.length > 0) {
        const creamDiminutives = selectedCreams
          .map((id) => {
            const c = availableCreams.find((cream) => cream.id === id);
            return c?.shortName || c?.name || '';
          })
          .filter(Boolean);
        summary = creamDiminutives.join(', ');
      } else {
        summary = 'SIN CREMAS';
      }
    }

    const formattedModifiers = [];
    if (product.modifiers?.length > 0) {
      product.modifiers.forEach((mod) => {
        const optId = selectedModifiers[mod.id];
        const opt = mod.options?.find((o) => o.id === optId);
        if (opt) {
          formattedModifiers.push({
            groupId: mod.id,
            groupName: mod.name,
            optionId: opt.id,
            optionName: opt.name,
            priceDelta: opt.priceDelta || 0,
          });
        }
      });
    } else if (hasPapasModifier) {
      const papaOptId = selectedModifiers['mod_papas'] || 'fritas';
      const papaNames = {
        fritas: 'Papas Fritas',
        al_hilo: 'Papas al Hilo',
        sin_papas: 'Sin Papas',
      };
      formattedModifiers.push({
        groupId: 'mod_papas',
        groupName: 'Tipo de Papas',
        optionId: papaOptId,
        optionName: papaNames[papaOptId] || 'Papas Fritas',
        priceDelta: 0,
      });
    }

    const customization = {
      temperature: hasTemperature ? temperature : null,
      creamsSummary: summary,
      creamsDetail: isMarketProduct
        ? { selected: [], mode: 'NONE' }
        : {
            selected: selectedCreams,
            mode: 'CUSTOM',
          },
      saladSummary: hasSalad ? (saladMode === 'SIN_ENSALADA' ? 'SIN ENSALADA' : 'CON ENSALADA') : '',
      saladDetail: {
        mode: saladMode,
      },
      selectedModifiers: formattedModifiers,
      selectedExtras,
      packaging: selectedPackaging,
      itemNotes: notes.trim(),
    };

    onConfirm(product, customization);
    onClose();
  };

  return (
    <div className="space-y-3 pb-1 text-xs">
      {/* 1. ENSALADA (ORDEN SOLICITADO: 1º ENSALADA) */}
      {hasSalad && (
        <div className="space-y-1.5 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
          <span className="text-xs font-black text-white uppercase tracking-wider block">
            1. Ensalada
          </span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { mode: 'CON_ENSALADA', label: 'CON ENSALADA' },
              { mode: 'SIN_ENSALADA', label: 'SIN ENSALADA' },
            ].map((sOpt) => {
              const isSelected = saladMode === sOpt.mode;
              return (
                <button
                  key={sOpt.mode}
                  type="button"
                  onClick={() => setSaladMode(sOpt.mode)}
                  className={`
                    h-12 sm:h-14 rounded-xl font-black text-xs sm:text-sm border-2 transition-all active:scale-95 cursor-pointer flex items-center justify-center
                    ${
                      isSelected
                        ? 'bg-[var(--color-porkos-orange)] text-black border-[var(--color-porkos-orange)] shadow-md'
                        : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                    }
                  `}
                >
                  {sOpt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. PAPAS (ORDEN SOLICITADO: 2º PAPAS) */}
      {hasPapasModifier && (
        <div className="space-y-1.5 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
          <span className="text-xs font-black text-white uppercase tracking-wider block">
            2. Papas
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'fritas', label: 'FRITAS' },
              { id: 'al_hilo', label: 'AL HILO' },
              { id: 'sin_papas', label: 'SIN PAPAS' },
            ].map((pOpt) => {
              const currentPapa = selectedModifiers['mod_papas'] || 'fritas';
              const isSelected = currentPapa === pOpt.id;
              return (
                <button
                  key={pOpt.id}
                  type="button"
                  onClick={() =>
                    setSelectedModifiers((prev) => ({ ...prev, mod_papas: pOpt.id }))
                  }
                  className={`
                    h-12 sm:h-14 rounded-xl font-black text-xs sm:text-sm border-2 transition-all active:scale-95 cursor-pointer flex items-center justify-center
                    ${
                      isSelected
                        ? 'bg-[var(--color-porkos-orange)] text-black border-[var(--color-porkos-orange)] shadow-md'
                        : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                    }
                  `}
                >
                  {pOpt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. CREMAS (ORDEN SOLICITADO: 3º CREMAS) */}
      {availableCreams.length > 0 && (
        <div className="space-y-2 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              3. Cremas ({selectedCreams.length})
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCreams(availableCreams.map((c) => c.id))}
                className="text-xs font-bold px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 cursor-pointer"
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setSelectedCreams([])}
                className="text-xs font-bold px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-rose-400 border border-zinc-700 cursor-pointer"
              >
                Ninguna
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {availableCreams.map((cream) => {
              const isSelected = selectedCreams.includes(cream.id);
              const short = cream.shortName || cream.name.slice(0, 4).toUpperCase();
              return (
                <button
                  key={cream.id}
                  type="button"
                  onClick={() => toggleCream(cream.id)}
                  className={`
                    h-14 sm:h-16 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer relative
                    ${
                      isSelected
                        ? 'bg-[var(--color-porkos-orange)] text-black border-[var(--color-porkos-orange)] shadow-md shadow-orange-500/20'
                        : 'bg-zinc-900/90 text-white border-zinc-800 hover:border-zinc-700'
                    }
                  `}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full border ${isSelected ? 'border-black/40' : 'border-white/30'}`}
                    style={{ backgroundColor: cream.color }}
                  />
                  <span className="text-sm sm:text-base font-black tracking-wider leading-none">
                    {short}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. EXTRAS (ORDEN SOLICITADO: 4º EXTRAS) */}
      {compatibleExtras.length > 0 && (
        <div className="space-y-1.5 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
          <span className="text-xs font-black text-white uppercase tracking-wider block">
            4. Extras
          </span>
          <div className="grid grid-cols-2 gap-2">
            {compatibleExtras.map((ext) => {
              const isSelected = selectedExtras.some((e) => e.id === ext.id);
              const cleanName = ext.name.replace(/^Extra\s+/i, '');
              return (
                <button
                  key={ext.id}
                  type="button"
                  onClick={() => toggleExtra(ext)}
                  className={`
                    h-12 sm:h-14 px-3 rounded-xl border-2 flex items-center justify-between transition-all active:scale-95 cursor-pointer
                    ${
                      isSelected
                        ? 'bg-[var(--color-porkos-orange)] text-black border-[var(--color-porkos-orange)] font-black shadow-md'
                        : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                    }
                  `}
                >
                  <span className="text-xs font-bold truncate">{cleanName}</span>
                  <span className={`text-xs font-black ml-1 shrink-0 ${isSelected ? 'text-black' : 'text-orange-400'}`}>
                    +{formatCurrency(ext.price)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. PACKAGING / EMPAQUE */}
      {hasPaidPackaging && (
        <div className="space-y-1.5 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-white uppercase tracking-wider block">
              5. Packaging / Empaque
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availablePackagings.map((pkg) => {
              const isSelected = selectedPackaging?.id === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPackaging(pkg)}
                  className={`
                    h-12 sm:h-14 p-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer
                    ${
                      isSelected
                        ? 'bg-[var(--color-porkos-orange)] text-black border-[var(--color-porkos-orange)] font-black shadow-md'
                        : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                    }
                  `}
                >
                  <span className="text-xs font-bold leading-tight truncate">{pkg.name}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-black font-extrabold' : 'text-zinc-500 font-semibold'}`}>
                    {pkg.price > 0 ? `+${formatCurrency(pkg.price)}` : 'Gratis'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. TEMPERATURA */}
      {hasTemperature && (
        <div className="space-y-1.5 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-white uppercase tracking-wider block">
              6. Temperatura
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'HELADA', label: '❄️ Helada' },
              { id: 'SIN_HELAR', label: '🌡️ Sin Helar' },
            ].map((tOpt) => (
              <button
                key={tOpt.id}
                type="button"
                onClick={() => setTemperature(tOpt.id)}
                className={`
                  h-12 rounded-xl font-black text-xs sm:text-sm border-2 transition-all active:scale-95 cursor-pointer flex items-center justify-center
                  ${
                    temperature === tOpt.id
                      ? 'bg-[var(--color-porkos-orange)] text-black border-[var(--color-porkos-orange)] shadow-md'
                      : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                  }
                `}
              >
                {tOpt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 7. NOTA RÁPIDA */}
      <div className="bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-white uppercase tracking-wider block">
            7. Nota rápida
          </span>
        </div>

        {/* Chips de atajo rápido contextuales */}
        <div className="flex flex-wrap gap-1.5">
          {(isBeverage
            ? ['Fresco', 'Sin azúcar', 'Poca azúcar', 'Con hielo', 'Sin hielo', 'Para llevar']
            : ['Bien cocida', 'Término medio', 'Sin sal', 'Poco picante', 'Cebolla pochada', 'Para llevar']
          ).map((chip) => {
            const isChipSelected = notes.toLowerCase().includes(chip.toLowerCase());
            return (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  if (isChipSelected) {
                    const regex = new RegExp(`(^|,\\s*)${chip}`, 'i');
                    const updated = notes.replace(regex, '').replace(/^,\s*/, '').trim();
                    setNotes(updated);
                  } else {
                    const updated = notes.trim() ? `${notes.trim()}, ${chip}` : chip;
                    setNotes(updated);
                  }
                }}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer active:scale-95 ${
                  isChipSelected
                    ? 'bg-[var(--color-porkos-orange)] text-black border-transparent shadow-sm'
                    : 'bg-black/60 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {chip}
              </button>
            );
          })}
        </div>

        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={isBeverage ? 'Ej. Fresco, sin azúcar, poco hielo...' : 'Ej: bien cocida, cebolla pochada...'}
          className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--color-porkos-orange)]"
        />
      </div>

      {/* BOTÓN CONFIRMAR */}
      <div className="pt-2 sticky bottom-0 bg-transparent">
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full bg-[var(--color-porkos-orange)] hover:bg-orange-500 text-black font-black text-sm sm:text-base py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-orange-500/20 active:scale-[0.98] transition-all cursor-pointer"
        >
          <span>{initialCustomization ? 'Guardar Cambios' : 'Añadir a la Comanda'}</span>
          <span>•</span>
          <span>{formatCurrency(currentTotal)}</span>
        </button>
      </div>
    </div>
  );
}

export default function QuickCustomizerModal({
  isOpen,
  onClose,
  product,
  initialCustomization = null,
  modality = 'MESA',
  onConfirm,
  cartItemId = null,
}) {
  if (!isOpen || !product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        initialCustomization
          ? `Modificar: ${product.name}`
          : product.name
      }
      subtitle={`Precio base: ${formatCurrency(product.price)}`}
      maxWidth="max-w-lg"
    >
      <CustomizerForm
        key={(cartItemId || product.id) + (initialCustomization ? '_editing' : '_adding')}
        product={product}
        initialCustomization={initialCustomization}
        modality={modality}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    </Modal>
  );
}
