import { useState } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Edit2,
  Trash2,
  Sliders,
  Tag,
  Package,
  Sparkles,
} from 'lucide-react';
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
    extras,
    packagings,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleProductActive,
    addCream,
    updateCream,
    deleteCream,
    toggleCreamActive,
    addExtra,
    updateExtra,
    deleteExtra,
    toggleExtraActive,
    addPackaging,
    updatePackaging,
    deletePackaging,
    togglePackagingActive,
  } = useCatalog();

  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'creams' | 'extras' | 'packagings'

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
  const [prodAvailablePackagingIds, setProdAvailablePackagingIds] = useState([]);

  // Modales de Crema
  const [isCreamModalOpen, setIsCreamModalOpen] = useState(false);
  const [editingCream, setEditingCream] = useState(null);
  const [creamName, setCreamName] = useState('');
  const [creamShortName, setCreamShortName] = useState('');
  const [creamColor, setCreamColor] = useState('#FBBF24');

  // Modales de Extra
  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState(null);
  const [extraName, setExtraName] = useState('');
  const [extraPrice, setExtraPrice] = useState('');
  const [extraCategories, setExtraCategories] = useState(['cat_burgers', 'cat_salchipapas', 'cat_choripanes']);

  // Modales de Packaging / Empaque
  const [isPackagingModalOpen, setIsPackagingModalOpen] = useState(false);
  const [editingPackaging, setEditingPackaging] = useState(null);
  const [pkgName, setPkgName] = useState('');
  const [pkgPrice, setPkgPrice] = useState('');
  const [pkgApplicableProductIds, setPkgApplicableProductIds] = useState([]);

  // 1. Abrir modal de nuevo producto
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
    setProdAvailablePackagingIds(['pkg_taper_med', 'pkg_bolsa_kraft']);
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
    setProdAvailablePackagingIds(prod.availablePackagingIds || []);
    setIsProductModalOpen(true);
  };

  // Guardar Producto
  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (!prodName.trim() || !prodPrice) return;

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
      availablePackagingIds: prodAvailablePackagingIds,
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
        defaultCreamIds: [],
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

  // 2. Cremas Handlers
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

  // 3. Extras Handlers
  const handleOpenNewExtra = () => {
    setEditingExtra(null);
    setExtraName('');
    setExtraPrice('');
    setExtraCategories(['cat_burgers', 'cat_salchipapas', 'cat_choripanes']);
    setIsExtraModalOpen(true);
  };

  const handleOpenEditExtra = (extra) => {
    setEditingExtra(extra);
    setExtraName(extra.name);
    setExtraPrice((extra.price || 0).toString());
    setExtraCategories(extra.compatibleCategories || ['cat_burgers', 'cat_salchipapas', 'cat_choripanes']);
    setIsExtraModalOpen(true);
  };

  const handleSaveExtra = (e) => {
    e.preventDefault();
    if (!extraName.trim() || !extraPrice) return;

    const extraPayload = {
      name: extraName.trim(),
      price: parseFloat(extraPrice) || 0,
      compatibleCategories: extraCategories,
    };

    if (editingExtra) {
      updateExtra(editingExtra.id, extraPayload);
    } else {
      addExtra(extraPayload);
    }

    setIsExtraModalOpen(false);
  };

  // 4. Packaging Handlers
  const handleOpenNewPackaging = () => {
    setEditingPackaging(null);
    setPkgName('');
    setPkgPrice('');
    setPkgApplicableProductIds(products.filter((p) => p.type === 'RESTAURANTE').map((p) => p.id));
    setIsPackagingModalOpen(true);
  };

  const handleOpenEditPackaging = (pkg) => {
    setEditingPackaging(pkg);
    setPkgName(pkg.name);
    setPkgPrice((pkg.price || 0).toString());
    // Combinar productos asociados explícitamente en el empaque o en los productos
    const associatedInProds = products
      .filter((p) => p.availablePackagingIds?.includes(pkg.id))
      .map((p) => p.id);
    const combined = Array.from(new Set([...(pkg.applicableProductIds || []), ...associatedInProds]));
    setPkgApplicableProductIds(combined);
    setIsPackagingModalOpen(true);
  };

  const handleSavePackaging = (e) => {
    e.preventDefault();
    if (!pkgName.trim()) return;

    const pkgPayload = {
      name: pkgName.trim(),
      price: parseFloat(pkgPrice) || 0,
      applicableProductIds: pkgApplicableProductIds,
    };

    if (editingPackaging) {
      updatePackaging(editingPackaging.id, pkgPayload);
    } else {
      addPackaging(pkgPayload);
    }

    setIsPackagingModalOpen(false);
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-6">
      {/* Header Principal */}
      <div className="bg-[var(--color-porkos-surface)] p-4 rounded-2xl border border-[var(--color-porkos-border)] flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/20 text-[var(--color-porkos-orange)] border border-orange-500/30">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Catálogo & Opciones
            </h2>
            <p className="text-xs text-zinc-400">
              Configura platos, cremas, extras y empaques asociados
            </p>
          </div>
        </div>

        {/* Action Buttons & Tab Switch */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* 4 Pestañas Principales */}
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-zinc-800 text-xs font-bold overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'products'
                  ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Productos ({products.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('creams')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'creams'
                  ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cremas ({creams.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('extras')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'extras'
                  ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Extras ({extras.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('packagings')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'packagings'
                  ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Empaques ({packagings.length})</span>
            </button>
          </div>

          {/* Botón de Agregar según la Pestaña Activa */}
          {activeTab === 'products' && (
            <Button
              onClick={handleOpenNewProduct}
              icon={Plus}
              size="sm"
              className="text-xs font-bold shrink-0"
            >
              Nuevo Producto
            </Button>
          )}

          {activeTab === 'creams' && (
            <Button
              onClick={handleOpenNewCream}
              icon={Plus}
              size="sm"
              className="text-xs font-bold shrink-0"
            >
              Nueva Crema
            </Button>
          )}

          {activeTab === 'extras' && (
            <Button
              onClick={handleOpenNewExtra}
              icon={Plus}
              size="sm"
              className="text-xs font-bold shrink-0"
            >
              Nuevo Extra
            </Button>
          )}

          {activeTab === 'packagings' && (
            <Button
              onClick={handleOpenNewPackaging}
              icon={Plus}
              size="sm"
              className="text-xs font-bold shrink-0"
            >
              Nuevo Empaque
            </Button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* --- TAB 1: PRODUCTOS --- */}
      {/* ============================================================== */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => {
            const allowedPackagingsCount = p.availablePackagingIds?.length || 0;

            return (
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
                    <h4 className="font-bold text-sm text-white truncate">
                      {p.name}
                    </h4>
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
                      🥗 Ensalada
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
                  {allowedPackagingsCount > 0 && (
                    <span className="bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20 font-bold flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {allowedPackagingsCount} empaque{allowedPackagingsCount > 1 ? 's' : ''}
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
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* --- TAB 2: CREMAS CONFIGURABLES --- */}
      {/* ============================================================== */}
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
                  className="w-8 h-8 rounded-xl border border-white/20 shadow-md shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: c.color }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-base text-[var(--color-porkos-orange)] tracking-wider">
                      {c.shortName || c.name.slice(0, 4).toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold text-zinc-400 truncate">({c.name})</span>
                  </div>
                  <span className={`text-[10px] font-bold ${c.active ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {c.active ? 'Activa' : 'Desactivada'}
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

      {/* ============================================================== */}
      {/* --- TAB 3: EXTRAS CONFIGURABLES --- */}
      {/* ============================================================== */}
      {activeTab === 'extras' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {extras.map((ext) => (
            <div
              key={ext.id}
              className={`
                bg-[var(--color-porkos-surface)] border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all
                ${ext.active ? 'border-[var(--color-porkos-border)]' : 'border-zinc-800/40 opacity-60'}
              `}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-extrabold text-sm text-white">
                    {ext.name}
                  </h4>
                  <span className="text-sm font-black text-emerald-400 shrink-0">
                    +{formatCurrency(ext.price)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2 text-[10px]">
                  {ext.compatibleCategories?.map((catId) => {
                    const cat = categories.find((c) => c.id === catId);
                    return (
                      <span key={catId} className="bg-zinc-800/80 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700/60 font-semibold">
                        {cat?.name || catId}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Botones de extra */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEditExtra(ext)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
                    title="Editar extra"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar el extra "${ext.name}"?`)) {
                        deleteExtra(ext.id);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-900/40 text-rose-400 transition-colors cursor-pointer"
                    title="Eliminar extra"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => toggleExtraActive(ext.id)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                    ext.active ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                  title={ext.active ? 'Desactivar extra' : 'Activar extra'}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      ext.active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================== */}
      {/* --- TAB 4: PACKAGING / EMPAQUES (ASOCIADOS A PRODUCTOS) --- */}
      {/* ============================================================== */}
      {activeTab === 'packagings' && (
        <div className="space-y-4">
          <div className="bg-blue-950/20 border border-blue-900/40 p-3.5 rounded-2xl flex items-center gap-3">
            <Package className="w-5 h-5 text-blue-400 shrink-0" />
            <p className="text-xs text-blue-200 leading-relaxed">
              <strong>Regla de empaques:</strong> Cada empaque está asociado a productos específicos. Solo los productos seleccionados mostrarán la opción de taper al momento de personalizar una comanda en caja.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packagings.map((pkg) => {
              // Calcular qué productos tienen este empaque asociado
              const associatedProducts = products.filter(
                (p) =>
                  pkg.applicableProductIds?.includes(p.id) ||
                  p.availablePackagingIds?.includes(pkg.id)
              );

              const isDefaultOption = pkg.id === 'pkg_ninguno';

              return (
                <div
                  key={pkg.id}
                  className={`
                    bg-[var(--color-porkos-surface)] border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all
                    ${pkg.active ? 'border-[var(--color-porkos-border)]' : 'border-zinc-800/40 opacity-60'}
                  `}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-blue-400 shrink-0" />
                        <h4 className="font-extrabold text-sm text-white">
                          {pkg.name}
                        </h4>
                      </div>
                      <span className="text-sm font-black text-white shrink-0">
                        {pkg.price > 0 ? `+${formatCurrency(pkg.price)}` : 'Gratis'}
                      </span>
                    </div>

                    {/* Productos Asociados */}
                    <div className="mt-3 pt-2.5 border-t border-zinc-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-zinc-400">
                          {isDefaultOption ? 'Aplica a:' : 'Productos asociados:'}
                        </span>
                        <span className="bg-zinc-800 text-zinc-300 font-extrabold px-2 py-0.5 rounded-md text-[10px]">
                          {isDefaultOption ? 'Todos' : `${associatedProducts.length} producto${associatedProducts.length === 1 ? '' : 's'}`}
                        </span>
                      </div>

                      {!isDefaultOption && (
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                          {associatedProducts.length === 0 ? (
                            <span className="text-[11px] text-zinc-500 italic">
                              Sin productos asignados (no aparecerá en comandas)
                            </span>
                          ) : (
                            associatedProducts.map((p) => (
                              <span
                                key={p.id}
                                className="bg-black/60 text-zinc-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-zinc-800"
                              >
                                {p.name}
                              </span>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditPackaging(pkg)}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
                        title="Editar empaque y productos asociados"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {!isDefaultOption && (
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar el empaque "${pkg.name}"?`)) {
                              deletePackaging(pkg.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-900/40 text-rose-400 transition-colors cursor-pointer"
                          title="Eliminar empaque"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {!isDefaultOption && (
                      <button
                        onClick={() => togglePackagingActive(pkg.id)}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                          pkg.active ? 'bg-emerald-500' : 'bg-zinc-700'
                        }`}
                        title={pkg.active ? 'Desactivar empaque' : 'Activar empaque'}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                            pkg.active ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* --- MODAL 1: CREAR / EDITAR PRODUCTO --- */}
      {/* ============================================================== */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? `Editar: ${editingProduct.name}` : 'Nuevo Producto'}
        subtitle="Configura nombre, precio, opciones y empaques asociados"
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
                    setProdAvailablePackagingIds([]);
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

          {/* Opciones Gastronómicas (SOLO en Restaurante) */}
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

              {/* ASOCIACIÓN DE EMPAQUES PERMITIDOS PARA ESTE PRODUCTO */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                <span className="text-zinc-300 font-bold block text-[11px] flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-400" />
                  Empaques / Tapers Permitidos para este producto:
                </span>
                <span className="text-[10px] text-zinc-500 block">
                  Solo los empaques seleccionados aparecerán cuando el cajero personalice este plato.
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                  {packagings
                    .filter((pkg) => pkg.id !== 'pkg_ninguno' && pkg.active)
                    .map((pkg) => {
                      const isChecked = prodAvailablePackagingIds.includes(pkg.id);
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => {
                            setProdAvailablePackagingIds((prev) =>
                              prev.includes(pkg.id) ? prev.filter((id) => id !== pkg.id) : [...prev, pkg.id]
                            );
                          }}
                          className={`p-2 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-blue-950/40 border-blue-500/80 text-white'
                              : 'bg-black/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-bold block truncate text-xs">{pkg.name}</span>
                            <span className="text-[10px] text-zinc-500">+{formatCurrency(pkg.price)}</span>
                          </div>
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] font-black shrink-0 ${
                              isChecked
                                ? 'bg-blue-500 border-blue-400 text-white'
                                : 'border-zinc-700 text-transparent'
                            }`}
                          >
                            ✓
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Cremas permitidas */}
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

      {/* ============================================================== */}
      {/* --- MODAL 2: CREAR / EDITAR CREMA --- */}
      {/* ============================================================== */}
      <Modal
        isOpen={isCreamModalOpen}
        onClose={() => setIsCreamModalOpen(false)}
        title={editingCream ? `Editar Crema: ${editingCream.name}` : 'Nueva Crema'}
        subtitle="Configura el nombre y abreviatura para la comanda"
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

      {/* ============================================================== */}
      {/* --- MODAL 3: CREAR / EDITAR EXTRA --- */}
      {/* ============================================================== */}
      <Modal
        isOpen={isExtraModalOpen}
        onClose={() => setIsExtraModalOpen(false)}
        title={editingExtra ? `Editar Extra: ${editingExtra.name}` : 'Nuevo Extra'}
        subtitle="Configura ingredientes adicionales y su precio"
      >
        <form onSubmit={handleSaveExtra} className="space-y-4 text-xs">
          <div>
            <label className="block text-zinc-300 font-bold mb-1">Nombre del Extra *</label>
            <input
              type="text"
              required
              value={extraName}
              onChange={(e) => setExtraName(e.target.value)}
              placeholder="Ej. Extra Tocino Crocante..."
              className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)]"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-bold mb-1">Precio Adicional (S/) *</label>
            <input
              type="number"
              step="0.50"
              required
              value={extraPrice}
              onChange={(e) => setExtraPrice(e.target.value)}
              placeholder="2.50"
              className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-white font-black text-sm focus:outline-none focus:border-[var(--color-porkos-orange)]"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-bold mb-1.5">Categorías Compatibles</label>
            <div className="grid grid-cols-2 gap-2">
              {categories
                .filter((c) => c.type === 'RESTAURANTE')
                .map((cat) => {
                  const isChecked = extraCategories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setExtraCategories((prev) =>
                          prev.includes(cat.id) ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                        );
                      }}
                      className={`p-2 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-orange-500/10 border-[var(--color-porkos-orange)] text-white'
                          : 'bg-black/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <span className="font-bold">{cat.name}</span>
                      <span className="text-xs font-black">{isChecked ? '✓' : ''}</span>
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsExtraModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingExtra ? 'Actualizar Extra' : 'Crear Extra'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* --- MODAL 4: CREAR / EDITAR EMPAQUE (CON ASOCIACIÓN) --- */}
      {/* ============================================================== */}
      <Modal
        isOpen={isPackagingModalOpen}
        onClose={() => setIsPackagingModalOpen(false)}
        title={editingPackaging ? `Editar Empaque: ${editingPackaging.name}` : 'Nuevo Empaque'}
        subtitle="Configura el empaque y asócialo a los productos permitidos"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSavePackaging} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-bold mb-1">Nombre del Empaque / Taper *</label>
              <input
                type="text"
                required
                value={pkgName}
                onChange={(e) => setPkgName(e.target.value)}
                placeholder="Ej. Taper Térmico Mediano..."
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)]"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-bold mb-1">Costo Adicional (S/)</label>
              <input
                type="number"
                step="0.50"
                value={pkgPrice}
                onChange={(e) => setPkgPrice(e.target.value)}
                placeholder="1.00"
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-white font-black text-sm focus:outline-none focus:border-[var(--color-porkos-orange)]"
              />
            </div>
          </div>

          {/* ASOCIACIÓN DE PRODUCTOS */}
          <div className="space-y-2 bg-black/40 p-3 rounded-xl border border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-zinc-200 font-bold block">
                  Asociar a Productos ({pkgApplicableProductIds.length} seleccionados)
                </label>
                <span className="text-[10px] text-zinc-500">
                  Solo estos productos mostrarán este empaque al ordenar
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPkgApplicableProductIds(products.map((p) => p.id))}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 cursor-pointer"
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setPkgApplicableProductIds([])}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-rose-400 border border-zinc-700 cursor-pointer"
                >
                  Ninguno
                </button>
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
              {products.map((prod) => {
                const isSelected = pkgApplicableProductIds.includes(prod.id);
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => {
                      setPkgApplicableProductIds((prev) =>
                        prev.includes(prod.id) ? prev.filter((id) => id !== prod.id) : [...prev, prod.id]
                      );
                    }}
                    className={`w-full p-2 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500/70 text-white'
                        : 'bg-black/50 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-bold text-xs block truncate">{prod.name}</span>
                      <span className="text-[10px] text-zinc-500 uppercase">{prod.line} • {formatCurrency(prod.price)}</span>
                    </div>

                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center border text-xs font-black shrink-0 ${
                        isSelected
                          ? 'bg-blue-500 border-blue-400 text-white'
                          : 'border-zinc-700 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsPackagingModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingPackaging ? 'Actualizar Empaque' : 'Crear Empaque'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
