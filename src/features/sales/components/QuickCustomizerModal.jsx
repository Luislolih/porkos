import { useState } from 'react';
import { Package, Utensils, Check } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { formatCurrency } from '../../../utils/formatters';
import { DEFAULT_EXTRAS, DEFAULT_PACKAGINGS } from '../../../types/defaultCatalog';
import { useCatalog } from '../../../context/useCatalog';

function CustomizerForm({ product, initialCustomization = null, onConfirm, onClose }) {
  const { creams: catalogCreams } = useCatalog();

  // 1. Temperatura
  const [temperature, setTemperature] = useState(() => {
    if (initialCustomization?.temperature) return initialCustomization.temperature;
    return product.temperatureConfig?.defaultOption || 'HELADA';
  });

  // 2. Cremas: lista dinámica de cremas activas
  const availableCreams = catalogCreams.filter(
    (c) => c.active && (product.creamsConfig?.availableCreamIds?.length ? product.creamsConfig.availableCreamIds.includes(c.id) : true)
  );

  const [selectedCreams, setSelectedCreams] = useState(() => {
    if (initialCustomization?.creamsDetail?.selected) {
      return initialCustomization.creamsDetail.selected;
    }
    // Por defecto SIN CREMAS pre-marcadas (el usuario las elige individualmente)
    return [];
  });

  const [creamsMode, setCreamsMode] = useState(() => {
    return initialCustomization?.creamsDetail?.mode || 'CUSTOM';
  });

  // 3. Papas: Fritas, Al Hilo, Sin Papas
  const hasPapasModifier = Boolean(
    product.modifiers?.some((m) => m.id === 'mod_papas' || m.id === 'mod_corte_papas' || m.name?.toLowerCase().includes('papa')) ||
    product.categoryId === 'cat_burgers' ||
    product.categoryId === 'cat_salchipapas'
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

  // 4. Ensalada
  const saladIngredients = product.saladConfig?.ingredients || ['Lechuga', 'Tomate', 'Pepinillo'];
  const hasSalad = Boolean(product.saladConfig?.enabled || product.categoryId === 'cat_burgers');

  const [saladMode, setSaladMode] = useState(() => {
    return initialCustomization?.saladDetail?.mode || 'CON_ENSALADA';
  });

  const [selectedSaladItems, setSelectedSaladItems] = useState(() => {
    if (initialCustomization?.saladDetail?.items) {
      return initialCustomization.saladDetail.items;
    }
    return saladIngredients;
  });

  // 5. Extras compatibles
  const compatibleExtras = DEFAULT_EXTRAS.filter((e) => {
    if (!e.active) return false;
    if (product.availableExtraIds && product.availableExtraIds.length > 0) {
      return product.availableExtraIds.includes(e.id);
    }
    if (product.categoryId && e.compatibleCategories?.includes(product.categoryId)) {
      return true;
    }
    return product.type === 'RESTAURANTE';
  });

  const [selectedExtras, setSelectedExtras] = useState(() => {
    return initialCustomization?.selectedExtras || [];
  });

  // 6. Empaque / Taper para este producto individual
  const [selectedPackaging, setSelectedPackaging] = useState(() => {
    if (initialCustomization?.packaging) {
      return initialCustomization.packaging;
    }
    return DEFAULT_PACKAGINGS[0]; // Sin empaque / Salón
  });

  // 7. Notas específicas del producto
  const [notes, setNotes] = useState(() => {
    return initialCustomization?.itemNotes || '';
  });

  // Acciones de Cremas
  const handleCreamPreset = (preset) => {
    setCreamsMode(preset);
    if (preset === 'NONE') {
      setSelectedCreams([]);
    } else if (preset === 'ALL') {
      setSelectedCreams(availableCreams.map((c) => c.id));
    }
  };

  const toggleCream = (creamId) => {
    setCreamsMode('CUSTOM');
    setSelectedCreams((prev) =>
      prev.includes(creamId) ? prev.filter((id) => id !== creamId) : [...prev, creamId]
    );
  };

  // Acciones de Ensalada
  const handleSaladPreset = (preset) => {
    setSaladMode(preset);
    if (preset === 'CON_ENSALADA') {
      setSelectedSaladItems(saladIngredients);
    } else if (preset === 'SIN_ENSALADA') {
      setSelectedSaladItems([]);
    }
  };

  const toggleSaladItem = (item) => {
    setSaladMode('PERSONALIZADA');
    setSelectedSaladItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const setOnlySaladItem = (item) => {
    setSaladMode('PERSONALIZADA');
    setSelectedSaladItems([item]);
  };

  // Acciones de Extras
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
    let summary = 'SIN CREMAS';
    if (selectedCreams.length > 0) {
      const creamDiminutives = selectedCreams
        .map((id) => {
          const c = availableCreams.find((cream) => cream.id === id);
          return c?.shortName || c?.name || '';
        })
        .filter(Boolean);
      summary = creamDiminutives.join(', ');
      if (creamsMode === 'LOW') {
        summary += ' (POCAS)';
      }
    }

    const formattedModifiers = [];
    if (product.modifiers?.length > 0) {
      product.modifiers.forEach((mod) => {
        const optId = selectedModifiers[mod.id];
        const opt = mod.options.find((o) => o.id === optId);
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

    let saladSummary = '';
    if (hasSalad) {
      if (saladMode === 'SIN_ENSALADA' || selectedSaladItems.length === 0) {
        saladSummary = 'SIN ENSALADA';
      } else if (saladMode === 'CON_ENSALADA' && selectedSaladItems.length === saladIngredients.length) {
        saladSummary = 'CON ENSALADA COMPLETA';
      } else {
        saladSummary = `SOLO ${selectedSaladItems.join(' + ').toUpperCase()}`;
      }
    }

    const customization = {
      temperature: product.temperatureConfig?.enabled ? temperature : null,
      creamsSummary: summary,
      creamsDetail: {
        selected: selectedCreams,
        mode: creamsMode,
      },
      saladSummary,
      saladDetail: {
        mode: saladMode,
        items: selectedSaladItems,
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
    <div className="space-y-4 pb-1 text-xs">
      {/* 1. SELECCIÓN DE PAPAS (FRITAS / AL HILO / SIN PAPAS) */}
      {hasPapasModifier && (
        <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80">
          <label className="text-[11px] font-extrabold text-orange-400 uppercase tracking-wider block flex items-center gap-1.5">
            🍟 Tipo de Papas
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'fritas', label: 'Papas Fritas' },
              { id: 'al_hilo', label: 'Papas al Hilo' },
              { id: 'sin_papas', label: 'Sin Papas' },
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
                    py-2 px-2 rounded-xl font-bold transition-all border text-center cursor-pointer text-xs
                    ${
                      isSelected
                        ? 'bg-[var(--color-porkos-orange)] text-black border-transparent font-black shadow-md'
                        : 'bg-zinc-900/80 text-zinc-300 border-zinc-800 hover:border-zinc-700'
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

      {/* 2. CREMAS (BOTONES DINÁMICOS CON DIMINUTIVO) */}
      {availableCreams.length > 0 && (
        <div className="space-y-2 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-extrabold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
              🥫 Cremas ({selectedCreams.length} seleccionadas)
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleCreamPreset('ALL')}
                className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  selectedCreams.length === availableCreams.length
                    ? 'bg-zinc-700 text-white border-zinc-500'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => handleCreamPreset('NONE')}
                className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  selectedCreams.length === 0
                    ? 'bg-rose-950/60 text-rose-300 border-rose-800'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                Sin Cremas
              </button>
            </div>
          </div>

          {/* Grid de cada crema con su diminutivo */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {availableCreams.map((cream) => {
              const isSelected = selectedCreams.includes(cream.id);
              const short = cream.shortName || cream.name.slice(0, 4).toUpperCase();
              return (
                <button
                  key={cream.id}
                  type="button"
                  onClick={() => toggleCream(cream.id)}
                  className={`
                    flex items-center justify-between p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer
                    ${
                      isSelected
                        ? 'bg-zinc-800 text-white border-[var(--color-porkos-orange)] shadow-sm'
                        : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/50"
                      style={{ backgroundColor: cream.color }}
                    />
                    <span className="truncate">{cream.name}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ml-1 shrink-0 ${
                      isSelected
                        ? 'bg-[var(--color-porkos-orange)] text-black'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {short}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedCreams.length > 0 && (
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setCreamsMode((prev) => (prev === 'LOW' ? 'CUSTOM' : 'LOW'))}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                  creamsMode === 'LOW'
                    ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                {creamsMode === 'LOW' ? '✓ Pocas Cremas' : 'Marcar: Pocas Cremas'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. ENSALADA */}
      {hasSalad && (
        <div className="space-y-2 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-extrabold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
              🥗 Ensalada
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSaladPreset('CON_ENSALADA')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer ${
                  saladMode === 'CON_ENSALADA'
                    ? 'bg-zinc-700 text-white border-zinc-500 font-black'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                }`}
              >
                Completa
              </button>
              <button
                type="button"
                onClick={() => handleSaladPreset('SIN_ENSALADA')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer ${
                  saladMode === 'SIN_ENSALADA'
                    ? 'bg-rose-950/60 text-rose-300 border-rose-800 font-black'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                }`}
              >
                Sin Ensalada
              </button>
            </div>
          </div>

          <div className="space-y-1.5 pt-0.5">
            <div className="grid grid-cols-3 gap-1.5">
              {saladIngredients.map((ing) => {
                const isIncluded = selectedSaladItems.includes(ing);
                return (
                  <button
                    key={ing}
                    type="button"
                    onClick={() => toggleSaladItem(ing)}
                    className={`
                      py-1.5 px-2 rounded-lg text-xs font-semibold transition-all border text-center flex items-center justify-center gap-1 cursor-pointer
                      ${
                        isIncluded
                          ? 'bg-zinc-800 text-emerald-300 border-emerald-500/50'
                          : 'bg-black/40 text-zinc-500 border-zinc-900 line-through'
                      }
                    `}
                  >
                    <span>{isIncluded ? '✓' : '✕'}</span>
                    <span>{ing}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-zinc-500">Solo:</span>
              {saladIngredients.map((ing) => (
                <button
                  key={`only_${ing}`}
                  type="button"
                  onClick={() => setOnlySaladItem(ing)}
                  className="text-[10px] font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800 cursor-pointer"
                >
                  {ing}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. EXTRAS INDIVIDUALES PARA ESTE PRODUCTO */}
      {compatibleExtras.length > 0 && (
        <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80">
          <label className="text-[11px] font-extrabold text-orange-400 uppercase tracking-wider block flex items-center gap-1.5">
            🧀 Extras para este plato
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {compatibleExtras.map((ext) => {
              const isSelected = selectedExtras.some((e) => e.id === ext.id);
              return (
                <button
                  key={ext.id}
                  type="button"
                  onClick={() => toggleExtra(ext)}
                  className={`
                    flex items-center justify-between p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer
                    ${
                      isSelected
                        ? 'bg-zinc-800 text-white border-[var(--color-porkos-orange)]'
                        : 'bg-zinc-900/60 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                    }
                  `}
                >
                  <span className="flex items-center gap-1.5">
                    {isSelected && <Check className="w-3.5 h-3.5 text-orange-400" />}
                    <span>{ext.name}</span>
                  </span>
                  <span className="text-[var(--color-porkos-orange)] font-bold">
                    +{formatCurrency(ext.price)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. EMPAQUE / TAPER PARA ESTE PRODUCTO */}
      <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80">
        <label className="text-[11px] font-extrabold text-orange-400 uppercase tracking-wider block flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5" /> Empaque / Taper para este producto
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {DEFAULT_PACKAGINGS.map((pkg) => {
            const isSelected = selectedPackaging?.id === pkg.id;
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setSelectedPackaging(pkg)}
                className={`
                  p-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer text-left
                  ${
                    isSelected
                      ? 'bg-zinc-800 text-white border-blue-400 font-bold shadow-sm'
                      : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                  }
                `}
              >
                <span className="flex items-center gap-1.5 truncate">
                  {pkg.price > 0 ? (
                    <Package className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  ) : (
                    <Utensils className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  )}
                  <span className="truncate">{pkg.name}</span>
                </span>
                <span className={`text-[10px] font-bold shrink-0 ml-1 ${pkg.price > 0 ? 'text-blue-300' : 'text-zinc-500'}`}>
                  {pkg.price > 0 ? `+${formatCurrency(pkg.price)}` : 'Gratis'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. TEMPERATURA (SI APLICA) */}
      {product.temperatureConfig?.enabled && (
        <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80">
          <label className="text-[11px] font-extrabold text-orange-400 uppercase tracking-wider block">
            Temperatura de la Bebida
          </label>
          <div className="grid grid-cols-2 gap-2">
            {['HELADA', 'SIN_HELAR'].map((temp) => (
              <button
                key={temp}
                type="button"
                onClick={() => setTemperature(temp)}
                className={`
                  py-2 px-3 rounded-xl font-bold transition-all border cursor-pointer text-center
                  ${
                    temperature === temp
                      ? 'bg-zinc-800 text-cyan-300 border-cyan-500 font-black shadow-sm'
                      : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                  }
                `}
              >
                {temp === 'HELADA' ? '❄️ Helada' : '🌡️ Sin Helar'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 7. NOTAS DE PREPARACIÓN */}
      <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80">
        <label className="text-[11px] font-extrabold text-orange-400 uppercase tracking-wider block">
          Nota Específica para este Plato
        </label>
        <div className="flex flex-wrap gap-1 pb-1">
          {['Papas bien doradas', 'Cremas aparte', 'Término medio', 'Sin sal'].map((sug) => (
            <button
              key={sug}
              type="button"
              onClick={() => setNotes((prev) => (prev ? `${prev}, ${sug}` : sug))}
              className="text-[10px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-800 cursor-pointer"
            >
              +{sug}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ej: Bien cocida, cebolla pochada..."
          className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--color-porkos-orange)]"
        />
      </div>

      {/* BOTÓN CONFIRMAR */}
      <div className="pt-2 border-t border-zinc-800">
        <Button
          onClick={handleConfirm}
          fullWidth
          size="lg"
          className="text-sm font-black"
        >
          <span>
            {initialCustomization
              ? 'Guardar Cambios en este Ítem'
              : 'Añadir a la Comanda'}
          </span>
          <span>•</span>
          <span>{formatCurrency(currentTotal)}</span>
        </Button>
      </div>
    </div>
  );
}

export default function QuickCustomizerModal({
  isOpen,
  onClose,
  product,
  initialCustomization = null,
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
        onConfirm={onConfirm}
        onClose={onClose}
      />
    </Modal>
  );
}
