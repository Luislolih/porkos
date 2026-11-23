import { useState } from 'react';
import { Utensils, Package, ShoppingBag, Plus, Minus } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import { formatCurrency } from '../../../utils/formatters';
import { useCatalog } from '../../../context/useCatalog';
import { isProductBeverage, isProductMarket } from '../../../utils/productCategories';
import { handleInputFocusScroll } from '../../../utils/scrollIntoViewHelper';

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

  // Clasificación precisa de tipo de producto
  const isMarketProduct = isProductMarket(product);
  const isJuice = Boolean(
    product.isJuice ||
    product.marketSubtype === 'JUGO' ||
    product.juiceConfig?.enabled ||
    product.name?.toLowerCase().includes('jugo') ||
    product.name?.toLowerCase().includes('batido') ||
    product.name?.toLowerCase().includes('licuado')
  );
  const isBeverage = Boolean(
    isJuice ||
    isProductBeverage(product) ||
    Boolean(initialCustomization?.temperature)
  );

  // 1. Ensalada: Solo aparece si el producto está configurado específicamente con ensalada (hasSalad = true)
  const hasSalad = Boolean(
    !isBeverage &&
    !isMarketProduct &&
    (product.saladConfig?.enabled === true || product.hasSalad === true)
  );
  const [saladMode, setSaladMode] = useState(() => {
    return initialCustomization?.saladDetail?.mode || 'CON_ENSALADA';
  });

  // 2. Papas: Fritas, Al Hilo, Sin Papas (Solo si el producto lo tiene explícitamente configurado)
  const hasPapasModifier = Boolean(
    !isBeverage &&
    !isMarketProduct &&
    !product.isDessert &&
    product.line !== 'POSTRES' &&
    product.categoryId !== 'cat_postres' &&
    (product.hasPapas === true ||
      product.papasConfig?.enabled === true ||
      (product.hasPapas !== false &&
        product.papasConfig?.enabled !== false &&
        product.modifiers?.some(
          (m) =>
            m.id === 'mod_papas' ||
            m.id === 'mod_corte_papas' ||
            m.name?.toLowerCase().includes('papa')
        )))
  );

  const [selectedModifiers, setSelectedModifiers] = useState(() => {
    const initialMods = {};
    if (initialCustomization?.selectedModifiers?.length > 0) {
      initialCustomization.selectedModifiers.forEach((m) => {
        if (
          !hasPapasModifier &&
          (m.groupId === 'mod_papas' ||
            m.groupId === 'mod_corte_papas' ||
            m.groupName?.toLowerCase()?.includes('papa'))
        ) {
          return;
        }
        initialMods[m.groupId] = m.optionId;
      });
    } else if (product.modifiers?.length > 0) {
      product.modifiers.forEach((mod) => {
        const isPapaMod =
          mod.id === 'mod_papas' ||
          mod.id === 'mod_corte_papas' ||
          mod.name?.toLowerCase().includes('papa');
        if (isPapaMod && !hasPapasModifier) {
          return;
        }
        initialMods[mod.id] = mod.defaultOptionId;
      });
    }
    if (hasPapasModifier && !initialMods['mod_papas'] && !initialMods['mod_corte_papas']) {
      initialMods['mod_papas'] = 'fritas';
    }
    return initialMods;
  });

  // 3. Cremas: lista dinámica de cremas activas (NUNCA para bebidas ni market)
  const availableCreams = (isMarketProduct || isBeverage)
    ? []
    : (catalogCreams || []).filter(
        (c) =>
          c.active &&
          (product.creamsConfig?.availableCreamIds?.length
            ? product.creamsConfig.availableCreamIds.includes(c.id)
            : true)
      );

  const [selectedCreams, setSelectedCreams] = useState(() => {
    if (isMarketProduct || isBeverage) return [];
    if (initialCustomization?.creamsDetail?.selected) {
      return initialCustomization.creamsDetail.selected;
    }
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
      c === 'cat_burgers' || c === 'cat_salchipapas' || c === 'cat_choripanes' || c === 'cat_clasico' || c === 'cat_artesanal' ? 'cat_comida' : c
    );
    const prodCat =
      product.categoryId === 'cat_clasico' || product.categoryId === 'cat_artesanal'
        ? 'cat_comida'
        : product.categoryId || (isBeverage ? 'cat_bebidas' : 'cat_comida');

    if (prodCat && cats.includes(prodCat)) {
      return true;
    }
    return !isBeverage && product.type === 'RESTAURANTE';
  });

  const [selectedExtras, setSelectedExtras] = useState(() => {
    return (initialCustomization?.selectedExtras || []).map((e) => ({
      ...e,
      quantity: e.quantity || 1,
    }));
  });

  // 5. Empaques asociados estrictamente a este producto
  const allPackagings = catalogPackagings || [];
  const associatedPaidPackagings = allPackagings.filter((pkg) => {
    if (!pkg.active || pkg.id === 'pkg_ninguno') return false;
    const isAssociatedInProduct = product.availablePackagingIds?.includes(pkg.id);
    const isAssociatedInPkg = pkg.applicableProductIds?.includes(product.id);
    return isAssociatedInProduct || isAssociatedInPkg;
  });

  const nonePackaging = { id: 'pkg_ninguno', name: 'Sin empaque', price: 0 };
  const availablePackagings = [nonePackaging, ...associatedPaidPackagings];
  const hasPaidPackaging = associatedPaidPackagings.length > 0;

  const [consumptionType, setConsumptionType] = useState(() => {
    if (initialCustomization?.consumptionType) return initialCustomization.consumptionType;
    if (modality === 'PARA_LLEVAR' || modality === 'LLEVAR') return 'PARA_LLEVAR';
    if (modality === 'CONSUMO_EXTERNO') return 'CONSUMO_EXTERNO';
    if (modality === 'DELIVERY') return 'DELIVERY';
    return 'MESA';
  });

  const [selectedPackaging, setSelectedPackaging] = useState(() => {
    if (initialCustomization?.packaging) {
      const match = availablePackagings.find((p) => p.id === initialCustomization.packaging.id);
      if (match) return match;
    }
    const isTakeoutOrDelivery =
      consumptionType === 'PARA_LLEVAR' ||
      modality === 'PARA_LLEVAR' ||
      modality === 'DELIVERY' ||
      modality === 'LLEVAR';

    if (isTakeoutOrDelivery && associatedPaidPackagings.length > 0) {
      return associatedPaidPackagings[0];
    }

    return nonePackaging;
  });

  // 6. Temperatura para Bebidas
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

  // 8. Precio Manual Opcional
  const [manualPriceInput, setManualPriceInput] = useState(() => {
    if (initialCustomization?.manualPrice !== undefined && initialCustomization?.manualPrice !== null) {
      return String(initialCustomization.manualPrice);
    }
    return '';
  });

  const toggleCream = (creamId) => {
    setSelectedCreams((prev) =>
      prev.includes(creamId) ? prev.filter((id) => id !== creamId) : [...prev, creamId]
    );
  };

  const addExtraUnit = (extra) => {
    setSelectedExtras((prev) => {
      const match = prev.find((e) => e.id === extra.id);
      if (match) {
        return prev.map((e) =>
          e.id === extra.id ? { ...e, quantity: (e.quantity || 1) + 1 } : e
        );
      }
      return [
        ...prev,
        {
          id: extra.id,
          name: extra.name,
          unitPrice: extra.price,
          quantity: 1,
        },
      ];
    });
  };

  const removeExtraUnit = (extraId) => {
    setSelectedExtras((prev) => {
      const match = prev.find((e) => e.id === extraId);
      if (!match) return prev;
      if ((match.quantity || 1) > 1) {
        return prev.map((e) =>
          e.id === extraId ? { ...e, quantity: (e.quantity || 1) - 1 } : e
        );
      }
      return prev.filter((e) => e.id !== extraId);
    });
  };

  // Totales
  const extrasTotal = selectedExtras.reduce(
    (sum, ext) => sum + ext.unitPrice * (ext.quantity || 1),
    0
  );
  const packagingPrice = selectedPackaging?.price || 0;
  const autoCalculatedTotal = Math.round((product.price + extrasTotal + packagingPrice) * 100) / 100;
  const parsedManual = parseFloat(manualPriceInput);
  const hasValidManual = manualPriceInput !== '' && !isNaN(parsedManual) && parsedManual >= 0;
  const isCustomPriceActive = hasValidManual && Math.abs(parsedManual - autoCalculatedTotal) > 0.001;
  const currentTotal = hasValidManual ? Math.round(parsedManual * 100) / 100 : autoCalculatedTotal;

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
        const isPapaMod =
          mod.id === 'mod_papas' ||
          mod.id === 'mod_corte_papas' ||
          mod.name?.toLowerCase().includes('papa');
        if (isPapaMod && !hasPapasModifier) {
          return;
        }
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
    }

    const alreadyHasPapaMod = formattedModifiers.some(
      (m) =>
        m.groupId === 'mod_papas' ||
        m.groupId === 'mod_corte_papas' ||
        m.groupName?.toLowerCase()?.includes('papa')
    );
    if (hasPapasModifier && !alreadyHasPapaMod) {
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
      consumptionType,
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
      manualPrice: isCustomPriceActive ? currentTotal : null,
      isManualPrice: isCustomPriceActive,
    };

    onConfirm(product, customization);
    onClose();
  };

  return (
    <div className="space-y-3.5 pb-2 text-xs">
      {/* Selector de Destino / Tipo de Pedido (Mesa / Ir Comiendo / Llevar) */}
      {modality !== 'DELIVERY' && (
        <div className="space-y-2 bg-[#0C0C0F] p-3 sm:p-3.5 rounded-2xl border border-[var(--color-porkos-border)]">
          <span className="text-[11px] font-black text-zinc-300 uppercase tracking-wider block">
            Destino del Producto
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                id: 'MESA',
                label: 'Mesa',
                icon: Utensils,
                activeClass: 'bg-blue-600 text-white border-blue-500 shadow-md ring-1 ring-blue-400/50',
              },
              {
                id: 'CONSUMO_EXTERNO',
                label: 'Ir Comiendo',
                icon: Package,
                activeClass: 'bg-purple-600 text-white border-purple-500 shadow-md ring-1 ring-purple-400/50',
              },
              {
                id: 'PARA_LLEVAR',
                label: 'Para Llevar',
                icon: ShoppingBag,
                activeClass: 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md ring-1 ring-amber-400/50 font-black',
              },
            ].map((opt) => {
              const isSelected = consumptionType === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setConsumptionType(opt.id);
                    if (opt.id === 'PARA_LLEVAR') {
                      if (associatedPaidPackagings.length > 0) setSelectedPackaging(associatedPaidPackagings[0]);
                    } else {
                      setSelectedPackaging(nonePackaging);
                    }
                  }}
                  className={`
                    min-h-[44px] rounded-xl font-bold text-xs sm:text-sm border transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 touch-manipulation select-none
                    ${
                      isSelected
                        ? opt.activeClass
                        : 'bg-[#141418] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                    }
                  `}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 1. ENSALADA */}
      {hasSalad && (
        <div className="space-y-2 bg-[#0C0C0F] p-3 sm:p-3.5 rounded-2xl border border-[var(--color-porkos-border)]">
          <span className="text-[11px] font-black text-zinc-300 uppercase tracking-wider block">
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
                    min-h-[48px] rounded-xl font-black text-xs sm:text-sm border transition-all active:scale-95 cursor-pointer flex items-center justify-center select-none touch-manipulation
                    ${
                      isSelected
                        ? 'bg-[var(--color-porkos-orange)] text-zinc-950 border-[var(--color-porkos-orange)] shadow-md shadow-orange-500/20'
                        : 'bg-[#141418] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
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

      {/* 2. PAPAS */}
      {hasPapasModifier && (
        <div className="space-y-2 bg-[#0C0C0F] p-3 sm:p-3.5 rounded-2xl border border-[var(--color-porkos-border)]">
          <span className="text-[11px] font-black text-zinc-300 uppercase tracking-wider block">
            2. Tipo de Papas
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
                    min-h-[48px] rounded-xl font-black text-xs sm:text-sm border transition-all active:scale-95 cursor-pointer flex items-center justify-center select-none touch-manipulation
                    ${
                      isSelected
                        ? 'bg-[var(--color-porkos-orange)] text-zinc-950 border-[var(--color-porkos-orange)] shadow-md shadow-orange-500/20'
                        : 'bg-[#141418] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
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

      {/* 3. CREMAS */}
      {availableCreams.length > 0 && (
        <div className="space-y-2 bg-[#0C0C0F] p-3 sm:p-3.5 rounded-2xl border border-[var(--color-porkos-border)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              3. Cremas ({selectedCreams.length})
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCreams(availableCreams.map((c) => c.id))}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 cursor-pointer active:scale-95"
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setSelectedCreams([])}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/30 cursor-pointer active:scale-95"
              >
                Ninguna
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {availableCreams.map((cream) => {
              const isSelected = selectedCreams.includes(cream.id);
              const label = cream.shortName || cream.name;

              return (
                <button
                  key={cream.id}
                  type="button"
                  onClick={() => toggleCream(cream.id)}
                  className={`
                    min-h-[52px] sm:min-h-[58px] p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer relative select-none touch-manipulation
                    ${
                      isSelected
                        ? 'bg-[var(--color-porkos-orange)] text-zinc-950 border-[var(--color-porkos-orange)] shadow-md shadow-orange-500/20 font-black'
                        : 'bg-[#141418] text-zinc-300 border-zinc-800 hover:border-zinc-700'
                    }
                  `}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full border shrink-0 ${
                      isSelected ? 'border-black/50' : 'border-white/30'
                    }`}
                    style={{ backgroundColor: cream.color || '#fff' }}
                  />
                  <span className="text-xs sm:text-sm font-black tracking-tight leading-none text-center truncate max-w-full">
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. EXTRAS DINÁMICOS CON CANTIDADES */}
      {compatibleExtras.length > 0 && (
        <div className="space-y-2 bg-[#0C0C0F] p-3 sm:p-3.5 rounded-2xl border border-[var(--color-porkos-border)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-zinc-300 uppercase tracking-wider block">
              4. Extras Disponibles
            </span>
            {selectedExtras.length > 0 && (
              <span className="text-xs font-black text-[var(--color-porkos-orange)]">
                +{formatCurrency(extrasTotal)} ({selectedExtras.reduce((acc, e) => acc + (e.quantity || 1), 0)} u.)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {compatibleExtras.map((ext) => {
              const selectedItem = selectedExtras.find((e) => e.id === ext.id);
              const qty = selectedItem?.quantity || 0;
              const isSelected = qty > 0;
              const cleanName = ext.name.replace(/^Extra\s+/i, '');
              const subtotalExtra = ext.price * qty;

              return (
                <div
                  key={ext.id}
                  className={`
                    p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-all
                    ${
                      isSelected
                        ? 'bg-[#141418] border-[var(--color-porkos-orange)] shadow-sm'
                        : 'bg-[#141418]/60 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                    }
                  `}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs sm:text-sm font-extrabold truncate ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                        {cleanName}
                      </span>
                      {isSelected && (
                        <span className="bg-[var(--color-porkos-orange)] text-zinc-950 px-1.5 py-0.2 rounded text-[10px] font-black shrink-0">
                          {qty}x
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-semibold mt-0.5">
                      {isSelected ? (
                        <span className="text-[var(--color-porkos-orange)] font-black">
                          +{formatCurrency(subtotalExtra)}{' '}
                          <span className="text-zinc-400 font-normal">
                            ({qty}× {formatCurrency(ext.price)})
                          </span>
                        </span>
                      ) : (
                        <span className="text-zinc-400">+{formatCurrency(ext.price)} c/u</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isSelected ? (
                      <div className="flex items-center bg-[#0C0C0F] rounded-xl border border-zinc-700 p-0.5 shadow-xs">
                        <button
                          type="button"
                          onClick={() => removeExtraUnit(ext.id)}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs sm:text-sm flex items-center justify-center transition-all cursor-pointer active:scale-90 touch-manipulation"
                          title="Quitar unidad"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 sm:w-8 text-center font-black text-xs sm:text-sm text-white select-none">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => addExtraUnit(ext)}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[var(--color-porkos-orange)] hover:bg-[var(--color-porkos-orange-hover)] text-zinc-950 font-black text-xs sm:text-sm flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-xs touch-manipulation"
                          title="Añadir unidad"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addExtraUnit(ext)}
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-[var(--color-porkos-orange)] text-zinc-200 hover:text-zinc-950 font-bold text-xs transition-all cursor-pointer active:scale-95 border border-zinc-700 hover:border-transparent flex items-center gap-1 shadow-xs touch-manipulation"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. PACKAGING / EMPAQUE */}
      {hasPaidPackaging && (
        <div className="space-y-2 bg-[#0C0C0F] p-3 sm:p-3.5 rounded-2xl border border-[var(--color-porkos-border)]">
          <span className="text-[11px] font-black text-zinc-300 uppercase tracking-wider block">
            5. Packaging / Empaque
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availablePackagings.map((pkg) => {
              const isSelected = selectedPackaging?.id === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPackaging(pkg)}
                  className={`
                    min-h-[48px] p-2 rounded-xl border flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer touch-manipulation select-none
                    ${
                      isSelected
                        ? 'bg-[var(--color-porkos-orange)] text-zinc-950 border-[var(--color-porkos-orange)] font-black shadow-md'
                        : 'bg-[#141418] text-zinc-300 border-zinc-800 hover:border-zinc-700'
                    }
                  `}
                >
                  <span className="text-xs font-bold leading-tight truncate w-full text-center">
                    {pkg.name}
                  </span>
                  <span className={`text-[10px] ${isSelected ? 'text-zinc-950 font-black' : 'text-zinc-500 font-semibold'}`}>
                    {pkg.price > 0 ? `+${formatCurrency(pkg.price)}` : 'Incluido'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. TEMPERATURA */}
      {hasTemperature && (
        <div className="space-y-2 bg-[#0C0C0F] p-3 sm:p-3.5 rounded-2xl border border-[var(--color-porkos-border)]">
          <span className="text-[11px] font-black text-zinc-300 uppercase tracking-wider block">
            6. Temperatura
          </span>
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
                  min-h-[48px] rounded-xl font-black text-xs sm:text-sm border transition-all active:scale-95 cursor-pointer flex items-center justify-center select-none touch-manipulation
                  ${
                    temperature === tOpt.id
                      ? 'bg-[var(--color-porkos-orange)] text-zinc-950 border-[var(--color-porkos-orange)] shadow-md'
                      : 'bg-[#141418] text-zinc-300 border-zinc-800 hover:border-zinc-700'
                  }
                `}
              >
                {tOpt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* NOTA */}
      <div className="bg-[#0C0C0F] p-3 sm:p-3.5 rounded-2xl border border-[var(--color-porkos-border)] space-y-2">
        <span className="text-[11px] font-black text-zinc-300 uppercase tracking-wider block">
          NOTA
        </span>

        {isBeverage && (
          <div className="flex flex-wrap gap-1.5">
            {(isJuice ? ['Sin azúcar', 'Bajo azúcar'] : ['Con vaso', 'Sin vaso']).map((chip) => {
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
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border transition-all cursor-pointer active:scale-95 select-none ${
                    isChipSelected
                      ? 'bg-[var(--color-porkos-orange)] text-zinc-950 border-transparent shadow-xs font-black'
                      : 'bg-[#141418] text-zinc-300 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        )}

        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onFocus={handleInputFocusScroll}
          placeholder={isBeverage ? 'Indicación para despacho (ej. vaso extra)...' : 'Indicación para cocina (ej. carne bien cocida)...'}
          className="w-full bg-[#141418] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--color-porkos-orange)] transition-colors"
        />
      </div>

      {/* PRECIO CON STEPPERS (+/- 0.5) */}
      <div className="bg-[#0C0C0F] p-3 sm:p-3.5 rounded-2xl border border-[var(--color-porkos-border)] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-zinc-300 uppercase tracking-wider block">
            PRECIO
          </span>
          {isCustomPriceActive && (
            <span className="text-[10px] font-medium text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
              manual
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Flecha/Botón Menos (-0.50) */}
          <button
            type="button"
            onClick={() => {
              const currentVal = manualPriceInput !== '' && !isNaN(parseFloat(manualPriceInput))
                ? parseFloat(manualPriceInput)
                : autoCalculatedTotal;
              const nextVal = Math.max(0, Math.round((currentVal - 0.5) * 100) / 100);
              setManualPriceInput(nextVal.toFixed(2));
            }}
            className="w-11 h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-90 text-zinc-200 hover:text-white flex items-center justify-center font-black transition-all cursor-pointer border border-zinc-700/80 shrink-0 touch-manipulation"
            title="Disminuir S/ 0.50"
            aria-label="Restar 0.50"
          >
            <Minus className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Campo Central Editable */}
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs sm:text-sm pointer-events-none">
              S/
            </span>
            <input
              type="number"
              step="0.50"
              min="0"
              value={manualPriceInput !== '' ? manualPriceInput : autoCalculatedTotal.toFixed(2)}
              onChange={(e) => setManualPriceInput(e.target.value)}
              onFocus={(e) => {
                if (manualPriceInput === '') {
                  setManualPriceInput(autoCalculatedTotal.toFixed(2));
                }
                e.target.select();
                handleInputFocusScroll(e);
              }}
              placeholder={autoCalculatedTotal.toFixed(2)}
              className="w-full bg-[#141418] border border-zinc-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2.5 text-center text-sm sm:text-base text-white font-black focus:outline-none transition-colors"
              title="Clic para editar el precio manualmente"
            />
          </div>

          {/* Flecha/Botón Más (+0.50) */}
          <button
            type="button"
            onClick={() => {
              const currentVal = manualPriceInput !== '' && !isNaN(parseFloat(manualPriceInput))
                ? parseFloat(manualPriceInput)
                : autoCalculatedTotal;
              const nextVal = Math.round((currentVal + 0.5) * 100) / 100;
              setManualPriceInput(nextVal.toFixed(2));
            }}
            className="w-11 h-11 rounded-xl bg-[var(--color-porkos-orange)]/20 hover:bg-[var(--color-porkos-orange)] text-[var(--color-porkos-orange)] hover:text-zinc-950 active:scale-90 flex items-center justify-center font-black transition-all cursor-pointer border border-orange-500/40 shrink-0 touch-manipulation"
            title="Aumentar S/ 0.50"
            aria-label="Aumentar 0.50"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Espacio holgado inferior para que el teclado móvil o el botón sticky no tapen el campo al escribir */}
      <div className="h-20 sm:h-24 pointer-events-none" />

      {/* Botón flotante de confirmación sticky */}
      <div className="sticky -bottom-4 sm:-bottom-6 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3.5 bg-[#121215]/95 backdrop-blur-md border-t border-[var(--color-porkos-border)] z-20 shadow-2xl">
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full bg-[var(--color-porkos-orange)] hover:bg-[var(--color-porkos-orange-hover)] text-zinc-950 font-black text-sm sm:text-base py-3.5 sm:py-4 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-orange-500/20 active:scale-[0.98] transition-all cursor-pointer touch-manipulation"
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
          ? `Personalizar: ${product.name}`
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
