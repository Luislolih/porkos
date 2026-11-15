import { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { formatCurrency } from '../../../utils/formatters';
import { DEFAULT_EXTRAS } from '../../../types/defaultCatalog';
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
    (c) => c.active && (product.creamsConfig?.availableCreamIds?.includes(c.id) ?? true)
  );

  const [selectedCreams, setSelectedCreams] = useState(() => {
    if (initialCustomization?.creamsDetail?.selected) {
      return initialCustomization.creamsDetail.selected;
    }
    if (!product.creamsConfig?.enabled) return [];
    if (product.creamsConfig?.defaultCreamIds?.length > 0) {
      return product.creamsConfig.defaultCreamIds;
    }
    return availableCreams.slice(0, 2).map((c) => c.id);
  });

  const [creamsMode, setCreamsMode] = useState(() => {
    return initialCustomization?.creamsDetail?.mode || 'NORMAL';
  });

  // 3. Papas
  const [selectedModifiers, setSelectedModifiers] = useState(() => {
    const initialMods = {};
    if (initialCustomization?.selectedModifiers?.length > 0) {
      initialCustomization.selectedModifiers.forEach((m) => {
        initialMods[m.groupId] = m.optionId;
      });
    } else {
      product.modifiers?.forEach((mod) => {
        initialMods[mod.id] = mod.defaultOptionId;
      });
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

  // 5. Extras
  const compatibleExtras = DEFAULT_EXTRAS.filter((e) =>
    product.availableExtraIds?.includes(e.id)
  );
  const [selectedExtras, setSelectedExtras] = useState(() => {
    return initialCustomization?.selectedExtras || [];
  });

  // 6. Notas
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
    } else if (preset === 'NORMAL') {
      setSelectedCreams(
        product.creamsConfig?.defaultCreamIds?.length
          ? product.creamsConfig.defaultCreamIds
          : availableCreams.slice(0, 2).map((c) => c.id)
      );
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
  const currentTotal = product.price + extrasTotal;

  // Confirmar
  const handleConfirm = () => {
    let summary = 'SIN CREMAS';
    if (creamsMode !== 'NONE' && selectedCreams.length > 0) {
      const creamNames = selectedCreams
        .map((id) => availableCreams.find((c) => c.id === id)?.name)
        .filter(Boolean);
      summary = creamNames.join(' + ').toUpperCase();
      if (creamsMode === 'LOW') {
        summary += ' (POCAS)';
      }
    }

    const formattedModifiers = [];
    product.modifiers?.forEach((mod) => {
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
      itemNotes: notes.trim(),
    };

    onConfirm(product, customization);
    onClose();
  };

  return (
    <div className="space-y-4 pb-1 text-xs">
      {/* 1. SELECCIÓN DE TEMPERATURA (SI APLICA) */}
      {product.temperatureConfig?.enabled && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
            Temperatura
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
                      ? 'bg-zinc-800 text-white border-zinc-500 font-extrabold shadow-sm'
                      : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                  }
                `}
              >
                {temp === 'HELADA' ? '❄️ Helada' : 'Sin Helar'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. PAPAS (FRITAS O AL HILO O SIN PAPAS) */}
      {product.modifiers?.map((mod) => (
        <div key={mod.id} className="space-y-1.5">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
            {mod.name}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {mod.options.map((opt) => {
              const isSelected = selectedModifiers[mod.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    setSelectedModifiers((prev) => ({ ...prev, [mod.id]: opt.id }))
                  }
                  className={`
                    py-2 px-2.5 rounded-xl font-bold transition-all border text-center cursor-pointer
                    ${
                      isSelected
                        ? 'bg-[var(--color-porkos-orange)] text-black border-transparent font-black shadow-sm'
                        : 'bg-zinc-900/80 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                    }
                  `}
                >
                  {opt.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* 3. ENSALADA */}
      {hasSalad && (
        <div className="space-y-2 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Ensalada
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSaladPreset('CON_ENSALADA')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer ${
                  saladMode === 'CON_ENSALADA'
                    ? 'bg-zinc-700 text-white border-zinc-600 font-black'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                }`}
              >
                Con Ensalada
              </button>
              <button
                type="button"
                onClick={() => handleSaladPreset('SIN_ENSALADA')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer ${
                  saladMode === 'SIN_ENSALADA'
                    ? 'bg-rose-950/60 text-rose-300 border-rose-800/60 font-black'
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
                          ? 'bg-zinc-800 text-zinc-100 border-zinc-600'
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

      {/* 4. CREMAS */}
      {availableCreams.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Cremas
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleCreamPreset('NORMAL')}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                  creamsMode === 'NORMAL'
                    ? 'bg-zinc-800 text-white border-zinc-600'
                    : 'text-zinc-400 border-transparent hover:text-white'
                }`}
              >
                Predeterminadas
              </button>
              <button
                type="button"
                onClick={() => handleCreamPreset('ALL')}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                  creamsMode === 'ALL'
                    ? 'bg-zinc-800 text-white border-zinc-600'
                    : 'text-zinc-400 border-transparent hover:text-white'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => handleCreamPreset('NONE')}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                  creamsMode === 'NONE'
                    ? 'bg-rose-950/40 text-rose-300 border-rose-900/60'
                    : 'text-zinc-400 border-transparent hover:text-white'
                }`}
              >
                Sin Cremas
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {availableCreams.map((cream) => {
              const isSelected = selectedCreams.includes(cream.id);
              return (
                <button
                  key={cream.id}
                  type="button"
                  onClick={() => toggleCream(cream.id)}
                  className={`
                    flex items-center justify-between p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer
                    ${
                      isSelected
                        ? 'bg-zinc-800 text-white border-zinc-600 shadow-sm'
                        : 'bg-zinc-900/60 text-zinc-400 border-zinc-800/80 hover:border-zinc-700'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/40"
                      style={{ backgroundColor: cream.color }}
                    />
                    <span className="truncate">{cream.name}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      isSelected
                        ? 'bg-zinc-700 text-white'
                        : 'text-zinc-600'
                    }`}
                  >
                    {isSelected ? 'SÍ' : 'NO'}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedCreams.length > 0 && (
            <div className="pt-0.5 flex justify-end">
              <button
                type="button"
                onClick={() => setCreamsMode((prev) => (prev === 'LOW' ? 'CUSTOM' : 'LOW'))}
                className={`text-[11px] font-medium px-2.5 py-0.5 rounded-lg border transition-all cursor-pointer ${
                  creamsMode === 'LOW'
                    ? 'bg-amber-950/40 text-amber-300 border-amber-800/50'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                }`}
              >
                {creamsMode === 'LOW' ? '✓ Pocas Cremas' : 'Pocas Cremas'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5. EXTRAS */}
      {compatibleExtras.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
            Extras Disponibles
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
                  <span>{ext.name}</span>
                  <span className="text-[var(--color-porkos-orange)] font-bold">
                    +{formatCurrency(ext.price)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. NOTAS */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
          Nota de Preparación
        </label>
        <div className="flex flex-wrap gap-1 pb-0.5">
          {['Papas bien doradas', 'Cremas aparte', 'Pan tostado', 'Sin sal'].map(
            (sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => setNotes((prev) => (prev ? `${prev}, ${sug}` : sug))}
                className="text-[10px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-800 cursor-pointer"
              >
                +{sug}
              </button>
            )
          )}
        </div>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Indicación breve para cocina..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
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
        key={product.id + (initialCustomization ? '_editing' : '_adding')}
        product={product}
        initialCustomization={initialCustomization}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    </Modal>
  );
}
