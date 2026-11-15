import { useState } from 'react';
import { UtensilsCrossed, Plus, Edit2, Trash2, Sliders, Tag } from 'lucide-react';
import { useCatalog } from '../../context/useCatalog';
import { PRODUCT_LINES, SUBCATEGORIES } from '../../types/defaultCatalog';
import { formatCurrency } from '../../utils/formatters';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

export default function CatalogView() {
  const {
    products,
    creams,
    categories,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleProductActive,
    addCream,
    updateCream,
    deleteCream,
    toggleCreamActive,
  } = useCatalog();

  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'creams'

  // Modales de Producto
  const [editingProduct, setEditingProduct] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Form state de Producto
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('cat_burgers');
  const [prodLine, setProdLine] = useState('CLASICO');
  const [prodSubcategory, setProdSubcategory] = useState('hamburguesas');
  const [prodType, setProdType] = useState('RESTAURANTE');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCost, setProdCost] = useState('');
  const [prodImage, setProdImage] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodKitchen, setProdKitchen] = useState(true);
  const [prodHasPapas, setProdHasPapas] = useState(true);
  const [prodHasSalad, setProdHasSalad] = useState(true);
  const [prodHasTemperature, setProdHasTemperature] = useState(false);
  const [prodSelectedCreams, setProdSelectedCreams] = useState([]);

  // Modales de Crema
  const [isCreamModalOpen, setIsCreamModalOpen] = useState(false);
  const [editingCream, setEditingCream] = useState(null);
  const [creamName, setCreamName] = useState('');
  const [creamShortName, setCreamShortName] = useState('');
  const [creamColor, setCreamColor] = useState('#FBBF24');

  // Abrir modal de nuevo producto
  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdCategory('cat_burgers');
    setProdLine('CLASICO');
    setProdSubcategory('hamburguesas');
    setProdType('RESTAURANTE');
    setProdPrice('');
    setProdCost('');
    setProdImage('');
    setProdDescription('');
    setProdKitchen(true);
    setProdHasPapas(true);
    setProdHasSalad(true);
    setProdHasTemperature(false);
    setProdSelectedCreams(creams.map((c) => c.id));
    setIsProductModalOpen(true);
  };

  // Abrir modal de edición de producto
  const handleOpenEditProduct = (prod) => {
    setEditingProduct(prod);
    setProdName(prod.name);
    setProdCategory(prod.categoryId);
    setProdLine(prod.line || (prod.type === 'MARKET' ? 'BEBIDAS_MARKET' : 'CLASICO'));
    setProdSubcategory(prod.subcategory || 'hamburguesas');
    setProdType(prod.type);
    setProdPrice(prod.price.toString());
    setProdCost((prod.cost || '').toString());
    setProdImage(prod.image || '');
    setProdDescription(prod.description || '');
    setProdKitchen(prod.requiresKitchen ?? true);
    setProdHasPapas(Boolean(prod.modifiers?.some((m) => m.id === 'mod_papas' || m.id === 'mod_corte_papas')));
    setProdHasSalad(Boolean(prod.saladConfig?.enabled || prod.categoryId === 'cat_burgers'));
    setProdHasTemperature(Boolean(prod.temperatureConfig?.enabled));
    setProdSelectedCreams(prod.creamsConfig?.availableCreamIds || creams.map((c) => c.id));
    setIsProductModalOpen(true);
  };

  // Guardar Producto (Crear o Actualizar)
  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (!prodName.trim() || !prodPrice) return;

    // Modificadores condicionales
    const modifiers = [];
    if (prodHasPapas) {
      modifiers.push({
        id: 'mod_papas',
        name: 'Tipo de Papas',
        required: true,
        defaultOptionId: 'fritas',
        options: [
          { id: 'fritas', name: 'Papas Fritas', priceDelta: 0 },
          { id: 'al_hilo', name: 'Papas al Hilo', priceDelta: 0 },
          { id: 'sin_papas', name: 'Sin Papas', priceDelta: 0 },
        ],
      });
    }

    const productPayload = {
      name: prodName.trim(),
      categoryId: prodCategory,
      line: prodLine,
      subcategory: prodSubcategory,
      type: prodType,
      price: parseFloat(prodPrice) || 0,
      cost: parseFloat(prodCost) || 0,
      image: prodImage.trim(),
      description: prodDescription.trim(),
      requiresKitchen: prodKitchen,
      modifiers,
      saladConfig: prodHasSalad
        ? {
            enabled: true,
            defaultMode: 'CON_ENSALADA',
            ingredients: ['Lechuga', 'Tomate', 'Pepinillo'],
          }
        : null,
      temperatureConfig: prodHasTemperature
        ? {
            enabled: true,
            defaultOption: 'HELADA',
          }
        : null,
      creamsConfig: {
        enabled: prodSelectedCreams.length > 0,
        availableCreamIds: prodSelectedCreams,
        defaultCreamIds: [], // Sin cremas marcadas por defecto
        defaultMode: 'CUSTOM',
      },
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productPayload);
    } else {
      addProduct(productPayload);
    }

    setIsProductModalOpen(false);
  };

  // Abrir modal de crema
  const handleOpenNewCream = () => {
    setEditingCream(null);
    setCreamName('');
    setCreamShortName('');
    setCreamColor('#FBBF24');
    setIsCreamModalOpen(true);
  };

  const handleOpenEditCream = (cream) => {
    setEditingCream(cream);
    setCreamName(cream.name);
    setCreamShortName(cream.shortName || '');
    setCreamColor(cream.color);
    setIsCreamModalOpen(true);
  };

  const handleSaveCream = (e) => {
    e.preventDefault();
    if (!creamName.trim()) return;

    const shortName = creamShortName.trim().toUpperCase() || creamName.trim().slice(0, 4).toUpperCase();
    const creamPayload = {
      name: creamName.trim(),
      shortName,
      color: creamColor,
    };

    if (editingCream) {
      updateCream(editingCream.id, creamPayload);
    } else {
      addCream(creamPayload);
    }

    setIsCreamModalOpen(false);
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-6">
      {/* Header */}
      <div className="bg-[var(--color-porkos-surface)] p-4 rounded-2xl border border-[var(--color-porkos-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/20 text-[var(--color-porkos-orange)] border border-orange-500/30">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Administración de Catálogo
            </h2>
            <p className="text-xs text-[var(--color-porkos-muted)]">
              Configura productos, precios, fotos, papas, ensaladas y cremas
            </p>
          </div>
        </div>

        {/* Action Buttons & Tab Switch */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-zinc-800 text-xs font-bold">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-[var(--color-porkos-orange)] text-black font-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Productos ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('creams')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'creams'
                  ? 'bg-[var(--color-porkos-orange)] text-black font-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Cremas ({creams.length})
            </button>
          </div>

          {activeTab === 'products' ? (
            <Button
              onClick={handleOpenNewProduct}
              icon={Plus}
              size="sm"
              className="text-xs font-bold"
            >
              Nuevo Producto
            </Button>
          ) : (
            <Button
              onClick={handleOpenNewCream}
              icon={Plus}
              size="sm"
              className="text-xs font-bold"
            >
              Nueva Crema
            </Button>
          )}
        </div>
      </div>

      {/* --- TAB 1: PRODUCTOS --- */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <div
              key={p.id}
              className={`
                bg-[var(--color-porkos-surface)] border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all
                ${p.active ? 'border-[var(--color-porkos-border)]' : 'border-zinc-800/40 opacity-60'}
              `}
            >
              {/* Product Info */}
              <div className="flex gap-3 items-start">
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-16 h-16 rounded-xl object-cover bg-black/40 shrink-0 border border-zinc-800"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-black/60 flex items-center justify-center text-[10px] text-zinc-500 font-bold shrink-0 uppercase border border-zinc-800">
                    Sin foto
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-bold text-sm text-white truncate">
                      {p.name}
                    </h4>
                  </div>
                  <span className="text-sm text-[var(--color-porkos-orange)] font-extrabold block mt-0.5">
                    {formatCurrency(p.price)}
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1 text-[10px]">
                    <span className="bg-zinc-800 text-zinc-300 px-1.5 py-0.2 rounded font-bold uppercase">
                      {p.type}
                    </span>
                    {p.requiresKitchen && (
                      <span className="bg-orange-500/10 text-orange-400 px-1.5 py-0.2 rounded font-bold">
                        Cocina
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Badges of dynamic options */}
              <div className="flex flex-wrap gap-1 text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/80">
                {p.modifiers?.some((m) => m.id === 'mod_papas') && (
                  <span className="bg-black/50 px-2 py-0.5 rounded border border-zinc-800">
                    🍟 Papas Fritas/Hilo
                  </span>
                )}
                {p.saladConfig?.enabled && (
                  <span className="bg-black/50 px-2 py-0.5 rounded border border-zinc-800">
                    🥗 Ensalada Dinámica
                  </span>
                )}
                {p.temperatureConfig?.enabled && (
                  <span className="bg-black/50 px-2 py-0.5 rounded border border-zinc-800">
                    ❄️ Helada/Sin Helar
                  </span>
                )}
                {p.creamsConfig?.enabled && (
                  <span className="bg-black/50 px-2 py-0.5 rounded border border-zinc-800">
                    🥫 {p.creamsConfig.availableCreamIds?.length || 0} cremas
                  </span>
                )}
              </div>

              {/* Action Buttons: Edit, Toggle, Delete */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEditProduct(p)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
                    title="Editar producto"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`¿Seguro que deseas eliminar "${p.name}"?`)) {
                        deleteProduct(p.id);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-900/40 text-rose-400 transition-colors cursor-pointer"
                    title="Eliminar producto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Active switch */}
                <button
                  onClick={() => toggleProductActive(p.id)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                    p.active ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                  title={p.active ? 'Desactivar producto' : 'Activar producto'}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      p.active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- TAB 2: CREMAS CONFIGURABLES --- */}
      {activeTab === 'creams' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {creams.map((c) => (
            <div
              key={c.id}
              className={`
                bg-[var(--color-porkos-surface)] border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all
                ${c.active ? 'border-[var(--color-porkos-border)]' : 'border-zinc-800/40 opacity-60'}
              `}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-7 h-7 rounded-full border-2 border-white/20 shadow-md shrink-0"
                  style={{ backgroundColor: c.color }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-white truncate">{c.name}</h4>
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono font-black text-orange-400 border border-zinc-700">
                      {c.shortName || c.name.slice(0, 4).toUpperCase()}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold ${c.active ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {c.active ? 'Activa para ventas' : 'Desactivada'}
                  </span>
                </div>
              </div>

              {/* Botones de crema */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEditCream(c)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
                    title="Editar crema"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar la crema "${c.name}"?`)) {
                        deleteCream(c.id);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-900/40 text-rose-400 transition-colors cursor-pointer"
                    title="Eliminar crema"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => toggleCreamActive(c.id)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                    c.active ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                  title={c.active ? 'Desactivar crema' : 'Activar crema'}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      c.active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- MODAL CREAR / EDITAR PRODUCTO --- */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? `Editar: ${editingProduct.name}` : 'Nuevo Producto'}
        subtitle="Configura nombre, precio, foto y opciones dinámicas"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
          {/* Nombre y Categoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-bold mb-1">Nombre del Producto *</label>
              <input
                type="text"
                required
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                placeholder="Ej. Hamburguesa Parrillera..."
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)]"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-bold mb-1">Categoría</label>
              <select
                value={prodCategory}
                onChange={(e) => setProdCategory(e.target.value)}
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clasificación: Línea y Subcategoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-black/30 p-3 rounded-xl border border-zinc-800/80">
            <div>
              <label className="block text-zinc-300 font-bold mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[var(--color-porkos-orange)]" />
                Línea Principal (Filtro Superior)
              </label>
              <select
                value={prodLine}
                onChange={(e) => setProdLine(e.target.value)}
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)] cursor-pointer"
              >
                {Object.values(PRODUCT_LINES)
                  .filter((pl) => pl.id !== 'ALL')
                  .map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.label}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-bold mb-1">Subcategoría (Filtro Secundario)</label>
              <select
                value={prodSubcategory}
                onChange={(e) => setProdSubcategory(e.target.value)}
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)] cursor-pointer"
              >
                {SUBCATEGORIES.filter((s) => s.id !== 'all').map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tipo (Restaurante o Market) y Cocina */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-black/40 p-3 rounded-xl border border-zinc-800">
            <div>
              <label className="block text-zinc-300 font-bold mb-1">Modalidad de Venta</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setProdType('RESTAURANTE')}
                  className={`flex-1 py-2 rounded-lg font-bold border ${
                    prodType === 'RESTAURANTE'
                      ? 'bg-[var(--color-porkos-orange)] text-black border-transparent'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  Restaurante
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProdType('MARKET');
                    setProdKitchen(false);
                  }}
                  className={`flex-1 py-2 rounded-lg font-bold border ${
                    prodType === 'MARKET'
                      ? 'bg-blue-500 text-white border-transparent'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  Market (Rápido)
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-zinc-300 font-bold">¿Requiere Cocina?</label>
                <span className="text-[10px] text-zinc-500">Muestra la orden en pantalla KDS</span>
              </div>
              <input
                type="checkbox"
                checked={prodKitchen}
                onChange={(e) => setProdKitchen(e.target.checked)}
                className="w-5 h-5 accent-[var(--color-porkos-orange)] cursor-pointer"
              />
            </div>
          </div>

          {/* Precio y Costo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-bold mb-1">Precio de Venta (S/) *</label>
              <input
                type="number"
                step="0.50"
                required
                value={prodPrice}
                onChange={(e) => setProdPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-white font-extrabold text-sm focus:outline-none focus:border-[var(--color-porkos-orange)]"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-bold mb-1">Costo Referencial (S/)</label>
              <input
                type="number"
                step="0.50"
                value={prodCost}
                onChange={(e) => setProdCost(e.target.value)}
                placeholder="0.00"
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-300 font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)]"
              />
            </div>
          </div>

          {/* URL de Fotografía */}
          <div>
            <label className="block text-zinc-300 font-bold mb-1">URL de Fotografía</label>
            <input
              type="url"
              value={prodImage}
              onChange={(e) => setProdImage(e.target.value)}
              placeholder="https://..."
              className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[var(--color-porkos-orange)]"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-zinc-300 font-bold mb-1">Descripción / Ingredientes</label>
            <textarea
              rows={2}
              value={prodDescription}
              onChange={(e) => setProdDescription(e.target.value)}
              placeholder="Carne 150g, pan artesanal..."
              className="w-full bg-black/60 border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-[var(--color-porkos-orange)]"
            />
          </div>

          {/* Configuración Dinámica de Opciones Gastronómicas */}
          {prodType === 'RESTAURANTE' && (
            <div className="space-y-3 bg-black/50 p-3 rounded-xl border border-zinc-800">
              <label className="block text-zinc-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[var(--color-porkos-orange)]" />
                Opciones y Modificadores Dinámicos
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Papas */}
                <label className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodHasPapas}
                    onChange={(e) => setProdHasPapas(e.target.checked)}
                    className="accent-[var(--color-porkos-orange)]"
                  />
                  <span className="font-semibold text-zinc-200">🍟 Papas Fritas/Hilo</span>
                </label>

                {/* Ensalada */}
                <label className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodHasSalad}
                    onChange={(e) => setProdHasSalad(e.target.checked)}
                    className="accent-[var(--color-porkos-orange)]"
                  />
                  <span className="font-semibold text-zinc-200">🥗 Ensalada (Tom/Pep/Lech)</span>
                </label>

                {/* Temperatura */}
                <label className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodHasTemperature}
                    onChange={(e) => setProdHasTemperature(e.target.checked)}
                    className="accent-[var(--color-porkos-orange)]"
                  />
                  <span className="font-semibold text-zinc-200">❄️ Helada / Sin Helar</span>
                </label>
              </div>

              {/* Selección de cremas disponibles para este producto */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                <span className="text-zinc-400 font-semibold block text-[11px]">
                  Cremas permitidas para este plato:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {creams.map((c) => {
                    const isSelected = prodSelectedCreams.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setProdSelectedCreams((prev) =>
                            prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                          );
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-800 text-white border-[var(--color-porkos-orange)]'
                            : 'bg-black/60 text-zinc-600 border-zinc-800'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        <span>{c.name}</span>
                        <span>{isSelected ? '✓' : ''}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Botones de guardar */}
          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsProductModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL CREAR / EDITAR CREMA --- */}
      <Modal
        isOpen={isCreamModalOpen}
        onClose={() => setIsCreamModalOpen(false)}
        title={editingCream ? `Editar Crema: ${editingCream.name}` : 'Nueva Crema'}
        subtitle="Configura el nombre y color de identificación"
      >
        <form onSubmit={handleSaveCream} className="space-y-4 text-xs">
          <div>
            <label className="block text-zinc-300 font-bold mb-1">Nombre de la Crema *</label>
            <input
              type="text"
              required
              value={creamName}
              onChange={(e) => setCreamName(e.target.value)}
              placeholder="Ej. Mayonesa Casera..."
              className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)]"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-bold mb-1">Abreviatura / Diminutivo en Comandas *</label>
            <input
              type="text"
              maxLength={6}
              value={creamShortName}
              onChange={(e) => setCreamShortName(e.target.value.toUpperCase())}
              placeholder="Ej. MAYO, KET, MOS, AJÍ, BBQ"
              className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono font-bold uppercase tracking-wider focus:outline-none focus:border-[var(--color-porkos-orange)]"
            />
            <span className="text-[10px] text-zinc-400 mt-1 block">
              Aparecerá en los tickets de cocina y resumen del pedido.
            </span>
          </div>

          <div>
            <label className="block text-zinc-300 font-bold mb-1">Color Identificador</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={creamColor}
                onChange={(e) => setCreamColor(e.target.value)}
                className="w-10 h-10 rounded-xl border border-zinc-700 bg-transparent cursor-pointer"
              />
              <span className="font-mono text-zinc-300 font-bold">{creamColor}</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCreamModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingCream ? 'Actualizar Crema' : 'Crear Crema'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
