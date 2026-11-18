import { useState, useRef } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Edit2,
  Trash2,
  Sliders,
  Tag,
  Package,
  Sparkles,
  Camera,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useCatalog } from '../../context/useCatalog';
import { formatCurrency } from '../../utils/formatters';
import { uploadProductImage } from '../../services/storageService';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ProductThumbnail from '../../components/ui/ProductThumbnail';
import { isProductBeverage } from '../../utils/productCategories';

export default function CatalogView() {
  const {
    products,
    creams,
    categories,
    extras,
    packagings,
    isLoadingCatalog,
    firestoreError,
    syncLocalToFirestore,
    clearAllCatalog,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleProductActive,
    addCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryActive,
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

  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'categories' | 'creams' | 'extras' | 'packagings'
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusToast, setStatusToast] = useState(null);

  // Modales de Categoría
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState('RESTAURANTE');
  const [catIcon, setCatIcon] = useState('UtensilsCrossed');

  // Modales de Producto
  const [editingProduct, setEditingProduct] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Form state de Producto
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('cat_comida');
  const [prodLine, setProdLine] = useState('COMIDA');
  const [prodType, setProdType] = useState('RESTAURANTE');
  const [prodMarketSubtype, setProdMarketSubtype] = useState('BEBIDA'); // 'BEBIDA' | 'JUGO' | 'COMIDA'
  const [prodIsJuice, setProdIsJuice] = useState(false);
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

  // Estados de carga de foto
  const fileInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState(null);
  const [imageStorageSource, setImageStorageSource] = useState(null); // 'firebase' | 'local' | null

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
  const [extraCategories, setExtraCategories] = useState(['cat_comida']);

  // Modales de Packaging / Empaque
  const [isPackagingModalOpen, setIsPackagingModalOpen] = useState(false);
  const [editingPackaging, setEditingPackaging] = useState(null);
  const [pkgName, setPkgName] = useState('');
  const [pkgPrice, setPkgPrice] = useState('');
  const [pkgApplicableProductIds, setPkgApplicableProductIds] = useState([]);

  // Manejar selección y subida de fotografía del plato
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setImageUploadError(null);

    // 1. Mostrar preview local temporal de inmediato
    const tempBlobUrl = URL.createObjectURL(file);
    setImagePreview(tempBlobUrl);

    try {
      const result = await uploadProductImage(file, editingProduct?.id);
      if (result?.url) {
        setProdImage(result.url);
        setImagePreview(result.url);
        setImageStorageSource('firebase');
      } else if (result?.localPreviewUrl) {
        // En Plan Spark (sin Storage): mantenemos la vista previa local sin persistir Base64 en Firestore
        setProdImage('');
        setImagePreview(result.localPreviewUrl);
        setImageStorageSource('local_preview');
      }
    } catch (err) {
      console.error('Error procesando foto:', err);
      setImageUploadError(err.message || 'Hubo un problema al procesar la foto.');
      setImagePreview(prodImage || '');
      setImageStorageSource(null);
    } finally {
      setIsUploadingImage(false);
      try {
        URL.revokeObjectURL(tempBlobUrl);
      } catch {
        // ignore
      }
    }
  };

  const handleRemovePhoto = () => {
    setProdImage('');
    setImagePreview('');
    setImageStorageSource(null);
    setImageUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 1. Abrir modal de nuevo producto
  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdCategory('cat_comida');
    setProdLine('COMIDA');
    setProdType('RESTAURANTE');
    setProdPrice('');
    setProdCost('');
    setProdImage('');
    setImagePreview('');
    setImageStorageSource(null);
    setProdDescription('');
    setProdKitchen(true);
    setProdMarketSubtype('BEBIDA');
    setProdIsJuice(false);
    setProdHasPapas(true);
    setProdHasSalad(true);
    setProdHasTemperature(false);
    setProdSelectedCreams(creams.map((c) => c.id));
    setProdAvailablePackagingIds([]);
    setImageUploadError(null);
    setIsProductModalOpen(true);
  };

  // Abrir modal de edición de producto
  const handleOpenEditProduct = (prod) => {
    setEditingProduct(prod);
    setProdName(prod.name);
    const cat = prod.categoryId || (prod.line === 'MARKET' ? 'cat_market' : prod.line === 'BEBIDAS' ? 'cat_bebidas' : 'cat_comida');
    const line = prod.line || (cat === 'cat_market' ? 'MARKET' : cat === 'cat_bebidas' ? 'BEBIDAS' : 'COMIDA');
    const type = line === 'MARKET' ? 'MARKET' : 'RESTAURANTE';

    setProdCategory(cat);
    setProdLine(line);
    setProdType(type);

    const isBeverage = isProductBeverage(prod);

    const isJuiceProduct = Boolean(
      prod.isJuice ||
      prod.marketSubtype === 'JUGO' ||
      prod.juiceConfig?.enabled ||
      prod.name?.toLowerCase().includes('jugo') ||
      prod.name?.toLowerCase().includes('batido') ||
      prod.name?.toLowerCase().includes('licuado')
    );

    setProdIsJuice(isJuiceProduct);
    setProdMarketSubtype(isJuiceProduct ? 'JUGO' : (prod.marketSubtype || (isBeverage ? 'BEBIDA' : 'COMIDA')));
    setProdPrice(prod.price.toString());
    setProdCost((prod.cost || '').toString());
    const existingImg = prod.image || '';
    setProdImage(existingImg);
    setImagePreview(existingImg);
    setImageStorageSource(
      existingImg.startsWith('http')
        ? 'web_url'
        : null
    );
    setProdDescription(prod.description || '');
    setProdKitchen(line === 'MARKET' ? false : (prod.requiresKitchen ?? true));
    setProdHasPapas(Boolean(prod.modifiers?.some((m) => m.id === 'mod_papas' || m.id === 'mod_corte_papas')));
    setProdHasSalad(Boolean(prod.saladConfig?.enabled || cat === 'cat_clasico' || cat === 'cat_comida'));
    setProdHasTemperature(Boolean(isBeverage));
    setProdSelectedCreams(prod.creamsConfig?.availableCreamIds || creams.map((c) => c.id));
    setProdAvailablePackagingIds(prod.availablePackagingIds || []);
    setImageUploadError(null);
    setIsProductModalOpen(true);
  };

  // Guardar Producto
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!prodName.trim() || !prodPrice || isUploadingImage) return;
    setIsSavingProduct(true);

    try {
      const modifiers = [];
      if (prodHasPapas && prodType === 'RESTAURANTE') {
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

      // Sanitizar imagen: Solo URLs http o https válidas. NUNCA Base64 ni blob en Firestore
      let cleanImage = prodImage.trim();
      if (!cleanImage.startsWith('http://') && !cleanImage.startsWith('https://')) {
        cleanImage = '';
      }

      const isMarket = prodType === 'MARKET' || prodLine === 'MARKET' || prodCategory === 'cat_market';
      const isDrink = isMarket
        ? (prodMarketSubtype === 'BEBIDA' || prodMarketSubtype === 'JUGO')
        : (prodCategory === 'cat_bebidas' || prodIsJuice || prodHasTemperature);

      const productPayload = {
        name: prodName.trim(),
        categoryId: prodCategory,
        line: prodLine,
        type: prodType,
        isJuice: Boolean(isDrink && prodIsJuice),
        juiceConfig: isDrink && prodIsJuice ? { enabled: true } : null,
        marketSubtype: isMarket ? (prodIsJuice ? 'JUGO' : prodMarketSubtype || 'COMIDA') : null,
        price: parseFloat(prodPrice) || 0,
        cost: parseFloat(prodCost) || 0,
        image: cleanImage,
        description: prodDescription.trim(),
        requiresKitchen: prodType === 'MARKET' ? false : prodKitchen,
        modifiers,
        availablePackagingIds: prodAvailablePackagingIds,
        saladConfig: !isMarket && !isDrink && prodHasSalad && prodType === 'RESTAURANTE'
          ? {
              enabled: true,
              defaultMode: 'CON_ENSALADA',
              ingredients: ['Lechuga', 'Tomate', 'Pepinillo'],
            }
          : null,
        temperatureConfig: isDrink
          ? {
              enabled: true,
              defaultOption: 'HELADA',
            }
          : null,
        creamsConfig: {
          enabled: !isMarket && !isDrink && prodType === 'RESTAURANTE' && prodSelectedCreams.length > 0,
          availableCreamIds: !isMarket && !isDrink && prodType === 'RESTAURANTE' ? prodSelectedCreams : [],
          defaultCreamIds: [],
          defaultMode: 'CUSTOM',
        },
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productPayload);
        setStatusToast({
          type: 'success',
          msg: `Producto "${prodName}" actualizado con éxito`,
        });
      } else {
        const result = await addProduct(productPayload);
        if (result?.firestoreResult && !result.firestoreResult.success) {
          setStatusToast({
            type: 'warning',
            msg: `Producto guardado en tu navegador. (Aviso: Firebase rechazó con ${result.firestoreResult.error?.code || 'error'})`,
          });
        } else {
          setStatusToast({
            type: 'success',
            msg: `Producto "${prodName}" creado y sincronizado`,
          });
        }
      }

      setIsProductModalOpen(false);
    } catch (err) {
      console.error('Error al guardar producto:', err);
      setStatusToast({
        type: 'error',
        msg: 'Hubo un error al guardar el producto',
      });
    } finally {
      setIsSavingProduct(false);
      setTimeout(() => setStatusToast(null), 5000);
    }
  };

  // 1.5. Categorías Handlers
  const handleOpenNewCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatType('RESTAURANTE');
    setCatIcon('UtensilsCrossed');
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatType(cat.type || 'RESTAURANTE');
    setCatIcon(cat.icon || 'UtensilsCrossed');
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const payload = {
      name: catName.trim(),
      type: catType,
      icon: catIcon,
    };

    if (editingCategory) {
      await updateCategory(editingCategory.id, payload);
      setStatusToast({ type: 'success', msg: `Categoría "${catName}" actualizada` });
    } else {
      await addCategory(payload);
      setStatusToast({ type: 'success', msg: `Categoría "${catName}" creada con éxito` });
    }

    setIsCategoryModalOpen(false);
    setTimeout(() => setStatusToast(null), 4000);
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
    setExtraCategories(['cat_comida']);
    setIsExtraModalOpen(true);
  };

  const handleOpenEditExtra = (extra) => {
    setEditingExtra(extra);
    setExtraName(extra.name);
    setExtraPrice((extra.price || 0).toString());
    const rawCats = extra.compatibleCategories || [];
    const normalizedCats = rawCats.map((c) =>
      c === 'cat_burgers' || c === 'cat_salchipapas' || c === 'cat_choripanes' || c === 'cat_clasico' || c === 'cat_artesanal'
        ? 'cat_comida'
        : c
    );
    setExtraCategories(normalizedCats.length > 0 ? Array.from(new Set(normalizedCats)) : ['cat_comida']);
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
      {/* Toast Notification */}
      {statusToast && (
        <div
          className={`p-3 rounded-xl font-bold text-xs flex items-center justify-between gap-2 shadow-lg animate-in fade-in slide-in-from-top-2 ${
            statusToast.type === 'error'
              ? 'bg-rose-950/80 border border-rose-500/50 text-rose-200'
              : statusToast.type === 'warning'
              ? 'bg-amber-950/80 border border-amber-500/50 text-amber-200'
              : 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{statusToast.msg}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusToast(null)}
            className="text-zinc-400 hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Banner de Estado de Conexión / Reglas de Firebase */}
      {firestoreError && (
        <div className="bg-amber-950/30 border border-amber-500/40 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5 text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">Modo Local Activo (Firebase requiere configurar Reglas)</p>
              <p className="text-zinc-400 text-[11px] mt-0.5">
                Tus productos se guardan de forma segura en este navegador. Para que aparezcan en tu consola de Firebase en la nube, debes habilitar las Reglas de Firestore.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsRulesModalOpen(true)}
              className="text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
            >
              Ver Solución de Reglas
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSyncing}
              onClick={async () => {
                setIsSyncing(true);
                const res = await syncLocalToFirestore();
                setIsSyncing(false);
                if (res.success) {
                  setStatusToast({
                    type: 'success',
                    msg: '¡Sincronizado exitosamente con Firebase!',
                  });
                } else {
                  setStatusToast({
                    type: 'warning',
                    msg: 'Aún sin permisos en Firebase. Revisa las reglas en Firebase Console.',
                  });
                }
                setTimeout(() => setStatusToast(null), 5000);
              }}
              className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-bold"
            >
              {isSyncing ? 'Sincronizando...' : 'Reintentar Nube'}
            </Button>
          </div>
        </div>
      )}

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
          </div>
        </div>

        {/* Action Buttons & Tab Switch */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* 4 Pestañas Principales */}
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-zinc-800 text-xs font-bold overflow-x-auto scrollbar-none">
            <button
              type="button"
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
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'categories'
                  ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Categorías ({categories.length})</span>
            </button>

            <button
              type="button"
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
              type="button"
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
              type="button"
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

          {activeTab === 'categories' && (
            <Button
              onClick={handleOpenNewCategory}
              icon={Plus}
              size="sm"
              className="text-xs font-bold shrink-0"
            >
              Nueva Categoría
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

          {/* Botón para vaciar catálogo demo y empezar 100% de cero */}
          {(products.length > 0 || creams.length > 0 || extras.length > 0 || packagings.length > 0) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsClearConfirmOpen(true)}
              className="text-zinc-500 hover:text-rose-400 border border-zinc-800 hover:border-rose-900/40 text-xs shrink-0"
              title="Vaciar catálogo para empezar 100% de cero"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-500" />
              Vaciar Catálogo
            </Button>
          )}
        </div>
      </div>

      {/* Estado de carga inicial desde Firestore */}
      {isLoadingCatalog ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
          <Loader2 className="w-8 h-8 text-[var(--color-porkos-orange)] animate-spin" />
          <span className="text-xs font-bold uppercase tracking-wider">Cargando catálogo en tiempo real...</span>
        </div>
      ) : (
        <>
          {/* ============================================================== */}
          {/* --- TAB 1: PRODUCTOS --- */}
          {/* ============================================================== */}
      {activeTab === 'products' && (
        <>
          {products.length === 0 ? (
            <div className="bg-[var(--color-porkos-surface)] border border-dashed border-zinc-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center max-w-lg mx-auto space-y-3.5 my-6">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-[var(--color-porkos-orange)] border border-orange-500/20 flex items-center justify-center">
                <UtensilsCrossed className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No tienes productos creados aún</h3>
                <p className="text-xs text-zinc-400">
                  Crea tu primer plato o bebida con su fotografía real, precio y opciones de papas, ensalada o cremas.
                </p>
              </div>
              <Button type="button" onClick={handleOpenNewProduct} icon={Plus}>
                Crear Primer Producto
              </Button>
            </div>
          ) : (
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
                  <ProductThumbnail
                    src={p.image}
                    name={p.name}
                    isBeverage={isProductBeverage(p)}
                    className="w-16 h-16"
                    iconSize="w-7 h-7"
                  />

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
                      {p.type === 'MARKET' && (
                        <span className={`px-1.5 py-0.2 rounded font-bold ${p.marketSubtype === 'BEBIDA' || p.temperatureConfig?.enabled ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30' : 'bg-purple-950/60 text-purple-300 border border-purple-500/30'}`}>
                          {p.marketSubtype === 'BEBIDA' || p.temperatureConfig?.enabled ? '🥤 Bebida (Helar)' : '🍪 Comida / Snack'}
                        </span>
                      )}
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
                      type="button"
                      onClick={() => handleOpenEditProduct(p)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
                      title="Editar producto"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
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
                    type="button"
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
      </>
      )}

      {/* ============================================================== */}
      {/* --- TAB: CATEGORÍAS CONFIGURABLES --- */}
      {/* ============================================================== */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((cat) => {
              const assignedProductsCount = products.filter((p) => p.categoryId === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className={`bg-[var(--color-porkos-surface)] border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all ${
                    cat.active ? 'border-[var(--color-porkos-border)]' : 'border-zinc-800/40 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-[var(--color-porkos-orange)] shrink-0" />
                        <h4 className="font-extrabold text-sm text-white truncate">{cat.name}</h4>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 text-[10px]">
                        <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                          cat.type === 'MARKET' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                        }`}>
                          {cat.type}
                        </span>
                        <span className="text-zinc-500 font-semibold">
                          {assignedProductsCount} plato{assignedProductsCount === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditCategory(cat)}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
                        title="Editar categoría"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Eliminar la categoría "${cat.name}"?`)) {
                            deleteCategory(cat.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-900/40 text-rose-400 transition-colors cursor-pointer"
                        title="Eliminar categoría"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleCategoryActive(cat.id)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                        cat.active ? 'bg-emerald-500' : 'bg-zinc-700'
                      }`}
                      title={cat.active ? 'Desactivar categoría' : 'Activar categoría'}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                          cat.active ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* --- TAB 2: CREMAS CONFIGURABLES --- */}
      {/* ============================================================== */}
      {activeTab === 'creams' && (
        <>
          {creams.length === 0 ? (
            <div className="bg-[var(--color-porkos-surface)] border border-dashed border-zinc-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center max-w-lg mx-auto space-y-3.5 my-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No tienes cremas registradas</h3>
                <p className="text-xs text-zinc-400">
                  Agrega salsas caseras como Mayonesa, Ají PORKOS, Tártara con su abreviatura (MAYO, AJÍ) para selección táctil rápida en caja.
                </p>
              </div>
              <Button type="button" onClick={handleOpenNewCream} icon={Plus}>
                Agregar Nueva Crema
              </Button>
            </div>
          ) : (
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
                    type="button"
                    onClick={() => handleOpenEditCream(c)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
                    title="Editar crema"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
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
                  type="button"
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
      </>
      )}

      {/* ============================================================== */}
      {/* --- TAB 3: EXTRAS CONFIGURABLES --- */}
      {/* ============================================================== */}
      {activeTab === 'extras' && (
        <>
          {extras.length === 0 ? (
            <div className="bg-[var(--color-porkos-surface)] border border-dashed border-zinc-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center max-w-lg mx-auto space-y-3.5 my-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <Plus className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No tienes adicionales registrados</h3>
                <p className="text-xs text-zinc-400">
                  Agrega adicionales como Extra Queso Cheddar, Extra Huevo, Porción de Papas para sumarlos a tus platos en comanda.
                </p>
              </div>
              <Button type="button" onClick={handleOpenNewExtra} icon={Plus}>
                Agregar Nuevo Extra
              </Button>
            </div>
          ) : (
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
                  {(ext.compatibleCategories || []).map((catId) => {
                    const normalizedId =
                      catId === 'cat_burgers' || catId === 'cat_salchipapas' || catId === 'cat_choripanes' || catId === 'cat_clasico' || catId === 'cat_artesanal'
                        ? 'cat_comida'
                        : catId;
                    const cat = categories.find((c) => c.id === normalizedId);
                    const label =
                      cat?.name ||
                      (normalizedId === 'cat_comida'
                        ? 'Comida'
                        : normalizedId === 'cat_bebidas'
                        ? 'Bebidas'
                        : 'Market');
                    return (
                      <span key={catId} className="bg-zinc-800/80 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700/60 font-semibold">
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Botones de extra */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEditExtra(ext)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
                    title="Editar extra"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
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
                  type="button"
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
      </>
      )}

      {/* ============================================================== */}
      {/* --- TAB 4: PACKAGING / EMPAQUES (ASOCIADOS A PRODUCTOS) --- */}
      {/* ============================================================== */}
      {activeTab === 'packagings' && (
        <div className="space-y-4">
          {packagings.length === 0 ? (
            <div className="bg-[var(--color-porkos-surface)] border border-dashed border-zinc-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center max-w-lg mx-auto space-y-3.5 my-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                <Package className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No tienes empaques registrados</h3>
                <p className="text-xs text-zinc-400">
                  Crea empaques como Bolsa Kraft o Taper Térmico y asócialos a tus hamburguesas o salchipapas para pedidos Para Llevar o Delivery.
                </p>
              </div>
              <Button type="button" onClick={handleOpenNewPackaging} icon={Plus}>
                Agregar Nuevo Empaque
              </Button>
            </div>
          ) : (
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
                        type="button"
                        onClick={() => handleOpenEditPackaging(pkg)}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
                        title="Editar empaque y productos asociados"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {!isDefaultOption && (
                        <button
                          type="button"
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
                        type="button"
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
          )}
        </div>
      )}
      </>
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
        <form onSubmit={handleSaveProduct} className="space-y-4 text-xs sm:text-sm">
          {/* Nombre del Producto */}
          <div>
            <label className="block text-zinc-300 font-bold mb-1">Nombre del Producto *</label>
            <input
              type="text"
              required
              value={prodName}
              onChange={(e) => setProdName(e.target.value)}
              placeholder="Ej. Hamburguesa Parrillera, Inka Cola 500ml..."
              className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)]"
            />
          </div>

          {/* Categoría Única Oficial: CLÁSICO, ARTESANAL, MARKET */}
          <div className="bg-black/40 p-3 rounded-xl border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-zinc-300 font-bold flex items-center gap-1.5 text-xs">
                <Tag className="w-3.5 h-3.5 text-[var(--color-porkos-orange)]" />
                Categoría del Producto *
              </label>
              <span className="text-[10px] text-zinc-500 font-medium">
                Pestaña principal en Ventas
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cat_comida', line: 'COMIDA', type: 'RESTAURANTE', label: 'COMIDA', desc: 'Hamburguesas, Papas...' },
                { id: 'cat_bebidas', line: 'BEBIDAS', type: 'RESTAURANTE', label: 'BEBIDAS', desc: 'Jugos, Refrescos...' },
                { id: 'cat_market', line: 'MARKET', type: 'MARKET', label: 'MARKET', desc: 'Snacks, Golosinas...' },
              ].map((opt) => {
                const isSelected = prodCategory === opt.id || prodLine === opt.line;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setProdCategory(opt.id);
                      setProdLine(opt.line);
                      setProdType(opt.type);
                      if (opt.id === 'cat_bebidas') {
                        setProdHasTemperature(true);
                        setProdMarketSubtype('BEBIDA');
                        setProdKitchen(true);
                      } else if (opt.type === 'MARKET') {
                        setProdKitchen(false);
                        setProdAvailablePackagingIds([]);
                        setProdHasTemperature(prodMarketSubtype === 'BEBIDA');
                      } else {
                        setProdKitchen(true);
                        setProdHasTemperature(false);
                      }
                    }}
                    className={`py-2.5 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 text-center ${
                      isSelected
                        ? 'bg-[var(--color-porkos-orange)] text-black border-transparent shadow-sm'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className={`text-[10px] font-semibold truncate ${isSelected ? 'text-black/80' : 'text-zinc-500'}`}>
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Si es MARKET o Bebida: selector de tipo Bebida vs Jugo vs Comida/Snack */}
          {(prodType === 'MARKET' || prodLine === 'MARKET' || prodCategory === 'cat_market' || prodCategory === 'cat_bebidas') && (
            <div className="bg-blue-950/20 p-3 rounded-xl border border-blue-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-zinc-200 font-bold flex items-center gap-1.5 text-xs">
                  <span>Tipo de Producto *</span>
                </label>
                <span className="text-[10px] text-zinc-400">
                  Define temperatura y notas
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setProdMarketSubtype('BEBIDA');
                    setProdIsJuice(false);
                    setProdHasTemperature(true);
                  }}
                  className={`py-2 px-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    prodMarketSubtype === 'BEBIDA' && !prodIsJuice
                      ? 'bg-blue-600 text-white border-transparent font-black shadow-md'
                      : 'bg-black/50 text-zinc-400 hover:text-white border-zinc-800'
                  }`}
                >
                  <span className="text-sm">🥤</span>
                  <span className="truncate">Bebida / Soda</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProdMarketSubtype('JUGO');
                    setProdIsJuice(true);
                    setProdHasTemperature(true);
                  }}
                  className={`py-2 px-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    prodIsJuice || prodMarketSubtype === 'JUGO'
                      ? 'bg-[var(--color-porkos-orange)] text-black border-transparent font-black shadow-md'
                      : 'bg-black/50 text-zinc-400 hover:text-white border-zinc-800'
                  }`}
                >
                  <span className="text-sm">🍹</span>
                  <span className="truncate">Tipo Jugo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProdMarketSubtype('COMIDA');
                    setProdIsJuice(false);
                    setProdHasTemperature(false);
                  }}
                  className={`py-2 px-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    prodMarketSubtype === 'COMIDA' && !prodIsJuice
                      ? 'bg-blue-600 text-white border-transparent font-black shadow-md'
                      : 'bg-black/50 text-zinc-400 hover:text-white border-zinc-800'
                  }`}
                >
                  <span className="text-sm">🍪</span>
                  <span className="truncate">Snack / Postre</span>
                </button>
              </div>
            </div>
          )}

          {/* Opción Tipo Jugo / Batido (permite notas de azúcar en comanda) - Solo para bebidas */}
          {(prodCategory === 'cat_bebidas' || prodMarketSubtype === 'BEBIDA' || prodMarketSubtype === 'JUGO') && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-zinc-800">
              <div>
                <label className="text-zinc-200 font-bold text-xs cursor-pointer">
                  🍹 ¿Es Tipo Jugo / Bebida Natural?
                </label>
                <span className="text-[10px] text-zinc-500 block">
                  Permite elegir en caja: sin azúcar, bajo azúcar, poco azúcar, etc.
                </span>
              </div>
              <input
                type="checkbox"
                checked={prodIsJuice}
                onChange={(e) => {
                  setProdIsJuice(e.target.checked);
                  if (e.target.checked) {
                    setProdHasTemperature(true);
                    setProdMarketSubtype('JUGO');
                  } else {
                    setProdMarketSubtype('BEBIDA');
                  }
                }}
                className="w-5 h-5 accent-[var(--color-porkos-orange)] cursor-pointer"
              />
            </div>
          )}

          {/* Si es restaurante: opción de cocina */}
          {prodType === 'RESTAURANTE' && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-zinc-800">
              <label className="text-zinc-300 font-bold text-xs cursor-pointer">¿Requiere Cocina?</label>
              <input
                type="checkbox"
                checked={prodKitchen}
                onChange={(e) => setProdKitchen(e.target.checked)}
                className="w-5 h-5 accent-[var(--color-porkos-orange)] cursor-pointer"
              />
            </div>
          )}

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
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white font-extrabold focus:outline-none focus:border-[var(--color-porkos-orange)]"
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
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-zinc-300 font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)]"
              />
            </div>
          </div>

          {/* Carga y Gestión de Fotografía */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-zinc-300 font-bold text-xs">
                URL de Imagen Web (Opcional - Sincronizada en la nube)
              </label>
              {prodImage && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Quitar foto
                </button>
              )}
            </div>

            <input
              type="url"
              value={prodImage}
              onChange={(e) => {
                const val = e.target.value.trim();
                setProdImage(val);
                setImagePreview(val);
                setImageStorageSource(val.startsWith('http') ? 'web_url' : null);
              }}
              placeholder="https://ejemplo.com/hamburguesa.jpg (Cloudinary, Imgur, direct link)"
              className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-[var(--color-porkos-orange)]"
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-zinc-700 bg-black/60 group">
                <img
                  src={imagePreview}
                  alt="Vista previa plato"
                  className="w-full h-40 object-cover"
                />
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={handleRemovePhoto}
                    icon={Trash2}
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="w-full h-20 rounded-xl border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/60 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer p-3 group"
              >
                <Camera className="w-5 h-5 text-zinc-500 group-hover:text-[var(--color-porkos-orange)] transition-colors" />
                <span className="text-[11px] font-bold text-zinc-400 group-hover:text-zinc-200">
                  O seleccionar archivo desde tu galería / PC para vista previa local
                </span>
              </button>
            )}

            {/* Mensajes informativos de imagen */}
            {imageStorageSource === 'web_url' && (
              <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                ✓ Enlace web válido
              </p>
            )}

            {imageStorageSource === 'local_preview' && (
              <p className="text-[10px] text-amber-400 font-medium">
                ⓘ Vista previa local
              </p>
            )}

            {imageUploadError && (
              <p className="text-xs text-rose-400 font-semibold mt-1">{imageUploadError}</p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-zinc-300 font-bold mb-1">Descripción / Ingredientes</label>
            <textarea
              rows={2}
              value={prodDescription}
              onChange={(e) => setProdDescription(e.target.value)}
              placeholder="Carne 150g, pan artesanal..."
              className="w-full bg-black/60 border border-zinc-800 rounded-xl p-3 text-base sm:text-sm text-white focus:outline-none focus:border-[var(--color-porkos-orange)]"
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

          {/* Botones de guardar flotantes */}
          <div className="sticky -bottom-4 sm:-bottom-6 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3.5 bg-[#141414]/95 backdrop-blur-md border-t border-zinc-800 flex items-center justify-end gap-2.5 z-20 shadow-2xl">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsProductModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSavingProduct || isUploadingImage}
            >
              {isUploadingImage
                ? 'Subiendo foto...'
                : isSavingProduct
                ? 'Guardando...'
                : editingProduct
                ? 'Guardar Cambios'
                : 'Crear Producto'}
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
        <form onSubmit={handleSaveCream} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-zinc-300 font-bold mb-1">Nombre de la Crema *</label>
            <input
              type="text"
              required
              value={creamName}
              onChange={(e) => setCreamName(e.target.value)}
              placeholder="Ej. Mayonesa Casera..."
              className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)]"
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
              className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white font-mono font-bold uppercase tracking-wider focus:outline-none focus:border-[var(--color-porkos-orange)]"
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

          <div className="sticky -bottom-4 sm:-bottom-6 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3.5 bg-[#141414]/95 backdrop-blur-md border-t border-zinc-800 flex items-center justify-end gap-2.5 z-20 shadow-2xl">
            <Button
              type="button"
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
        <form onSubmit={handleSaveExtra} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-zinc-300 font-bold mb-1">Nombre del Extra *</label>
            <input
              type="text"
              required
              value={extraName}
              onChange={(e) => setExtraName(e.target.value)}
              placeholder="Ej. Extra Tocino Crocante..."
              className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)]"
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
              className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white font-black focus:outline-none focus:border-[var(--color-porkos-orange)]"
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

          <div className="sticky -bottom-4 sm:-bottom-6 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3.5 bg-[#141414]/95 backdrop-blur-md border-t border-zinc-800 flex items-center justify-end gap-2.5 z-20 shadow-2xl">
            <Button
              type="button"
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
        <form onSubmit={handleSavePackaging} className="space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-bold mb-1">Nombre del Empaque / Taper *</label>
              <input
                type="text"
                required
                value={pkgName}
                onChange={(e) => setPkgName(e.target.value)}
                placeholder="Ej. Taper Térmico Mediano..."
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)]"
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
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white font-black focus:outline-none focus:border-[var(--color-porkos-orange)]"
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

          <div className="sticky -bottom-4 sm:-bottom-6 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3.5 bg-[#141414]/95 backdrop-blur-md border-t border-zinc-800 flex items-center justify-end gap-2.5 z-20 shadow-2xl">
            <Button
              type="button"
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

      {/* Modal de Confirmación para Vaciar Catálogo */}
      <Modal
        isOpen={isClearConfirmOpen}
        onClose={() => !isClearing && setIsClearConfirmOpen(false)}
        title="¿Vaciar todo el catálogo?"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Esta acción eliminará todos los datos:</p>
              <p>Se borrarán los productos, cremas, extras y empaques de Firebase Firestore para que puedas crear tu carta real desde cero.</p>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isClearing}
              onClick={() => setIsClearConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={isClearing}
              onClick={async () => {
                setIsClearing(true);
                try {
                  await clearAllCatalog();
                  setIsClearConfirmOpen(false);
                } catch (err) {
                  console.error('Error al vaciar catálogo:', err);
                } finally {
                  setIsClearing(false);
                }
              }}
            >
              {isClearing ? 'Vaciando...' : 'Sí, Vaciar Todo'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Instructivo de Reglas de Firebase */}
      <Modal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        title="Cómo Habilitar Firebase Firestore"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs text-zinc-300">
          <p>
            Al crear un proyecto en Firebase, Google bloquea la base de datos por defecto (<code className="text-amber-400 bg-black/60 px-1 py-0.5 rounded">allow read, write: if false;</code>). Para que tu base de datos en la nube reciba los productos:
          </p>

          <ol className="list-decimal list-inside space-y-2.5 bg-black/40 p-3.5 rounded-xl border border-zinc-800">
            <li>
              Entra a tu consola de Firebase en:{' '}
              <a
                href="https://console.firebase.google.com/project/porkos-ac37d/firestore/rules"
                target="_blank"
                rel="noreferrer"
                className="text-orange-400 hover:text-orange-300 underline font-bold"
              >
                Firebase Console &gt; porkos-ac37d &gt; Firestore Database &gt; Reglas
              </a>
            </li>
            <li>
              Reemplaza las reglas actuales por:
              <pre className="mt-1.5 p-2.5 bg-black rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto border border-zinc-800">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
              </pre>
            </li>
            <li>
              Haz clic en el botón azul <strong>Publicar (Publish)</strong>.
            </li>
            <li>
              Vuelve aquí y presiona el botón <strong>"Reintentar Nube"</strong>. Todos tus productos se subirán automáticamente a Firestore.
            </li>
          </ol>

          <div className="flex justify-end pt-2">
            <Button type="button" onClick={() => setIsRulesModalOpen(false)}>
              Entendido
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Crear / Editar Categoría */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={editingCategory ? `Editar: ${editingCategory.name}` : 'Nueva Categoría'}
        subtitle="Crea o edita categorías para agrupar tus platos en ventas y cocina"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-zinc-300 font-bold mb-1">Nombre de la Categoría *</label>
            <input
              type="text"
              required
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Ej. Alitas, Costillas, Combos, Tragos..."
              className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)]"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-bold mb-1">Tipo de Categoría</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCatType('RESTAURANTE')}
                className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                  catType === 'RESTAURANTE'
                    ? 'bg-[var(--color-porkos-orange)] text-black border-transparent font-extrabold shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                Restaurante / Cocina
              </button>
              <button
                type="button"
                onClick={() => setCatType('MARKET')}
                className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                  catType === 'MARKET'
                    ? 'bg-blue-600 text-white border-transparent font-extrabold shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                Market / Bebidas
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCategoryModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
