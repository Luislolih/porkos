import { useState, useRef, useMemo } from 'react';
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
  HardDrive,
} from 'lucide-react';
import { useCatalog } from '../../context/useCatalog';
import { formatCurrency } from '../../utils/formatters';
import {
  uploadProductImage,
  deleteProductImageFromStorage,
  calculateCatalogStorageStats,
  testStorageConnection,
  formatBytes,
} from '../../services/storageService';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SearchInput from '../../components/ui/SearchInput';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import LoadingState from '../../components/ui/LoadingState';
import Toast from '../../components/ui/Toast';
import ProductThumbnail from '../../components/ui/ProductThumbnail';
import ScrollToTopButton from '../../components/ui/ScrollToTopButton';
import { isProductBeverage, isProductDessert, isProductSnack } from '../../utils/productCategories';

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

  // Estadísticas de almacenamiento de fotos WebP
  const catalogStorageStats = useMemo(() => calculateCatalogStorageStats(products), [products]);

  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'categories' | 'creams' | 'extras' | 'packagings'
  const [productSearchQuery, setProductSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return products;
    const q = productSearchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const nameMatch = p.name?.toLowerCase().includes(q);
      const descMatch = p.description?.toLowerCase().includes(q);
      const typeMatch = p.type?.toLowerCase().includes(q);
      const lineMatch = p.line?.toLowerCase().includes(q);
      const subtypeMatch = p.marketSubtype?.toLowerCase().includes(q);
      return Boolean(nameMatch || descMatch || typeMatch || lineMatch || subtypeMatch);
    });
  }, [products, productSearchQuery]);

  // Dialogs & Modals state
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Deletion Confirm Dialog state for items
  const [itemToDelete, setItemToDelete] = useState(null); // { type: 'product'|'category'|'cream'|'extra'|'packaging', data: object }

  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [isTestingStorage, setIsTestingStorage] = useState(false);
  const [storageTestResult, setStorageTestResult] = useState(null);
  const [hasCopiedStorageRules, setHasCopiedStorageRules] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusToast, setStatusToast] = useState(null);

  const handleTestStorage = async () => {
    setIsTestingStorage(true);
    setStorageTestResult(null);
    try {
      const res = await testStorageConnection();
      setStorageTestResult(res);
    } catch (err) {
      setStorageTestResult({
        success: false,
        message: err.message || 'Error desconocido al probar Firebase Storage',
        errorCode: err.code || 'error',
      });
    } finally {
      setIsTestingStorage(false);
    }
  };

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
  const [prodMarketSubtype, setProdMarketSubtype] = useState('BEBIDA');
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
  const [prodThumbnailUrl, setProdThumbnailUrl] = useState('');
  const [prodImageMetadata, setProdImageMetadata] = useState(null);
  const [imageStats, setImageStats] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState(null);
  const [imageStorageSource, setImageStorageSource] = useState(null);

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

    const tempBlobUrl = URL.createObjectURL(file);
    setImagePreview(tempBlobUrl);

    try {
      const result = await uploadProductImage(file, editingProduct?.id);
      if (result?.url) {
        setProdImage(result.url);
        setProdThumbnailUrl(result.thumbnailUrl || result.url);
        setProdImageMetadata(result.imageMetadata || null);
        setImageStats({
          originalSize: result.originalSize,
          optimizedSize: result.optimizedSize,
          reductionPercent: result.reductionPercent,
        });
        setImagePreview(result.url);
        setImageStorageSource('firebase');
      } else if (result?.localPreviewUrl) {
        setProdImage(result.localPreviewUrl);
        setProdThumbnailUrl(result.localPreviewUrl);
        setProdImageMetadata(null);
        setImageStats({
          originalSize: result.originalSize,
          optimizedSize: result.optimizedSize,
          reductionPercent: result.reductionPercent,
        });
        setImagePreview(result.localPreviewUrl);
        setImageStorageSource('local_optimized');
        if (result.errorCode === 'storage/unauthorized') {
          setImageUploadError('Aviso: Firebase Storage rechazó la subida por reglas de seguridad. Tu foto se comprimió y se guardará para verse en la app.');
        } else if (result.errorCode === 'storage/bucket-not-found') {
          setImageUploadError('Aviso: El bucket de Firebase Storage no está activado. Tu foto se comprimió localmente a WebP.');
        } else {
          setImageUploadError(result.errorMessage || 'Foto optimizada lista para guardar en la app.');
        }
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
    setProdThumbnailUrl('');
    setProdImageMetadata(null);
    setImageStats(null);
    setImagePreview('');
    setImageStorageSource(null);
    setImageUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Abrir modal de nuevo producto
  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdCategory('cat_comida');
    setProdLine('COMIDA');
    setProdType('RESTAURANTE');
    setProdPrice('');
    setProdCost('');
    setProdImage('');
    setProdThumbnailUrl('');
    setProdImageMetadata(null);
    setImageStats(null);
    setImagePreview('');
    setImageStorageSource(null);
    setProdDescription('');
    setProdKitchen(true);
    setProdMarketSubtype('SNACK');
    setProdIsJuice(false);
    setProdHasPapas(true);
    setProdHasSalad(false);
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

    const isMarketProd = Boolean(
      prod.type === 'MARKET' ||
      prod.line === 'MARKET' ||
      prod.line === 'BEBIDAS_MARKET' ||
      prod.categoryId === 'cat_market' ||
      prod.categoryId === 'cat_bebidas_market' ||
      prod.categoryId === 'cat_snacks' ||
      (typeof prod.id === 'string' && prod.id.startsWith('mkt_'))
    );

    const rawCat = prod.categoryId || 'cat_comida';
    const rawLine = prod.line || 'COMIDA';
    let cat;
    let line;
    let type;

    if (isMarketProd) {
      cat = 'cat_market';
      line = 'MARKET';
      type = 'MARKET';
    } else if (
      rawCat === 'cat_burgers' ||
      rawCat === 'cat_salchipapas' ||
      rawCat === 'cat_choripanes' ||
      rawCat === 'cat_clasico' ||
      rawCat === 'cat_artesanal'
    ) {
      cat = 'cat_comida';
      line = 'COMIDA';
      type = 'RESTAURANTE';
    } else if (rawCat === 'cat_postres' || rawLine === 'POSTRES') {
      cat = 'cat_postres';
      line = 'POSTRES';
      type = 'RESTAURANTE';
    } else if (rawCat === 'cat_bebidas' || rawLine === 'BEBIDAS') {
      cat = 'cat_bebidas';
      line = 'BEBIDAS';
      type = 'RESTAURANTE';
    } else {
      cat = 'cat_comida';
      line = 'COMIDA';
      type = 'RESTAURANTE';
    }

    setProdCategory(cat);
    setProdLine(line);
    setProdType(type);

    const isBeverage = isProductBeverage(prod);
    const isDessert = isProductDessert(prod, categories);

    const isJuiceProduct = Boolean(
      prod.isJuice ||
      prod.marketSubtype === 'JUGO' ||
      prod.juiceConfig?.enabled ||
      prod.name?.toLowerCase().includes('jugo') ||
      prod.name?.toLowerCase().includes('batido') ||
      prod.name?.toLowerCase().includes('licuado')
    );

    setProdIsJuice(isJuiceProduct);

    let subtype = prod.marketSubtype;
    if (isMarketProd) {
      if (subtype === 'POSTRE' || isDessert) {
        subtype = 'POSTRE';
      } else if (subtype === 'BEBIDA' || isBeverage || isJuiceProduct) {
        subtype = isJuiceProduct ? 'JUGO' : 'BEBIDA';
      } else {
        subtype = 'SNACK';
      }
    } else if (cat === 'cat_postres') {
      subtype = 'POSTRE';
    } else if (cat === 'cat_bebidas') {
      subtype = isJuiceProduct ? 'JUGO' : 'BEBIDA';
    } else {
      subtype = 'COMIDA';
    }

    setProdMarketSubtype(subtype);
    setProdPrice(prod.price.toString());
    setProdCost((prod.cost || '').toString());
    const existingImg = prod.image || '';
    setProdImage(existingImg);
    setProdThumbnailUrl(prod.thumbnailUrl || existingImg);
    setProdImageMetadata(prod.imageMetadata || null);
    setImageStats(null);
    setImagePreview(existingImg);
    setImageStorageSource(existingImg.startsWith('http') ? 'web_url' : null);
    setProdDescription(prod.description || '');
    setProdKitchen(isMarketProd ? false : (prod.requiresKitchen ?? (cat !== 'cat_postres')));
    setProdHasPapas(Boolean(prod.modifiers?.some((m) => m.id === 'mod_papas' || m.id === 'mod_corte_papas')));
    setProdHasSalad(Boolean(prod.saladConfig?.enabled === true || prod.hasSalad === true));
    setProdHasTemperature(Boolean(isBeverage || subtype === 'BEBIDA' || subtype === 'JUGO'));
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

      let cleanImage = prodImage.trim();
      if (
        !cleanImage.startsWith('http://') &&
        !cleanImage.startsWith('https://') &&
        !cleanImage.startsWith('data:image/')
      ) {
        cleanImage = '';
      }

      if (
        editingProduct &&
        editingProduct.image &&
        editingProduct.image !== cleanImage &&
        (editingProduct.imageMetadata || editingProduct.image.includes('firebasestorage'))
      ) {
        deleteProductImageFromStorage(editingProduct.imageMetadata || editingProduct.image).catch(() => {});
      }

      const isMarket = prodType === 'MARKET' || prodLine === 'MARKET' || prodCategory === 'cat_market';
      const isDrink = isMarket
        ? (prodMarketSubtype === 'BEBIDA' || prodMarketSubtype === 'JUGO')
        : (prodCategory === 'cat_bebidas' || prodIsJuice || prodHasTemperature);
      const isDessert = isMarket
        ? prodMarketSubtype === 'POSTRE'
        : (prodCategory === 'cat_postres' || prodLine === 'POSTRES');

      const productPayload = {
        name: prodName.trim(),
        categoryId: isMarket ? 'cat_market' : prodCategory,
        line: isMarket ? 'MARKET' : (isDessert ? 'POSTRES' : (isDrink ? 'BEBIDAS' : 'COMIDA')),
        type: isMarket ? 'MARKET' : 'RESTAURANTE',
        isJuice: Boolean(isDrink && prodIsJuice),
        juiceConfig: isDrink && prodIsJuice ? { enabled: true } : null,
        isDessert: Boolean(isDessert),
        marketSubtype: isMarket
          ? (prodIsJuice ? 'JUGO' : (prodMarketSubtype || 'SNACK'))
          : (isDessert ? 'POSTRE' : (isDrink ? (prodIsJuice ? 'JUGO' : 'BEBIDA') : 'COMIDA')),
        price: parseFloat(prodPrice) || 0,
        cost: parseFloat(prodCost) || 0,
        image: cleanImage,
        thumbnailUrl: prodThumbnailUrl || cleanImage,
        imageMetadata: prodImageMetadata || (cleanImage === editingProduct?.image ? editingProduct?.imageMetadata : null),
        description: prodDescription.trim(),
        requiresKitchen: isMarket ? false : (isDessert ? false : prodKitchen),
        modifiers,
        availablePackagingIds: prodAvailablePackagingIds,
        hasSalad: Boolean(!isMarket && !isDrink && !isDessert && prodHasSalad && prodType === 'RESTAURANTE'),
        saladConfig: !isMarket && !isDrink && !isDessert && prodHasSalad && prodType === 'RESTAURANTE'
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
          enabled: !isMarket && !isDrink && !isDessert && prodType === 'RESTAURANTE' && prodSelectedCreams.length > 0,
          availableCreamIds: !isMarket && !isDrink && !isDessert && prodType === 'RESTAURANTE' ? prodSelectedCreams : [],
          defaultCreamIds: [],
          defaultMode: 'CUSTOM',
        },
      };

      if (editingProduct) {
        const updateResult = await updateProduct(editingProduct.id, productPayload);
        if (updateResult?.firestoreResult && !updateResult.firestoreResult.success) {
          setStatusToast({
            type: 'warning',
            msg: `Producto actualizado en navegador. (${updateResult.firestoreResult.error?.code || 'error'})`,
          });
        } else {
          setStatusToast({
            type: 'success',
            msg: `Producto "${prodName}" actualizado con éxito`,
          });
        }
      } else {
        const result = await addProduct(productPayload);
        if (result?.firestoreResult && !result.firestoreResult.success) {
          setStatusToast({
            type: 'warning',
            msg: `Producto guardado en navegador. (${result.firestoreResult.error?.code || 'error'})`,
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
      setTimeout(() => setStatusToast(null), 4000);
    }
  };

  // Categorías Handlers
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

  // Cremas Handlers
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
      setStatusToast({ type: 'success', msg: `Crema "${creamName}" actualizada` });
    } else {
      addCream(creamPayload);
      setStatusToast({ type: 'success', msg: `Crema "${creamName}" agregada` });
    }

    setIsCreamModalOpen(false);
    setTimeout(() => setStatusToast(null), 3000);
  };

  // Extras Handlers
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
      setStatusToast({ type: 'success', msg: `Extra "${extraName}" actualizado` });
    } else {
      addExtra(extraPayload);
      setStatusToast({ type: 'success', msg: `Extra "${extraName}" agregado` });
    }

    setIsExtraModalOpen(false);
    setTimeout(() => setStatusToast(null), 3000);
  };

  // Packaging Handlers
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
      setStatusToast({ type: 'success', msg: `Empaque "${pkgName}" actualizado` });
    } else {
      addPackaging(pkgPayload);
      setStatusToast({ type: 'success', msg: `Empaque "${pkgName}" registrado` });
    }

    setIsPackagingModalOpen(false);
    setTimeout(() => setStatusToast(null), 3000);
  };

  // Confirm delete item handler
  const handleConfirmItemDelete = () => {
    if (!itemToDelete) return;
    const { type, data } = itemToDelete;

    if (type === 'product') {
      if (data.imageMetadata || data.image) {
        deleteProductImageFromStorage(data.imageMetadata || data.image).catch(() => {});
      }
      deleteProduct(data.id);
      setStatusToast({ type: 'success', msg: `Producto "${data.name}" eliminado` });
    } else if (type === 'category') {
      deleteCategory(data.id);
      setStatusToast({ type: 'success', msg: `Categoría "${data.name}" eliminada` });
    } else if (type === 'cream') {
      deleteCream(data.id);
      setStatusToast({ type: 'success', msg: `Crema "${data.name}" eliminada` });
    } else if (type === 'extra') {
      deleteExtra(data.id);
      setStatusToast({ type: 'success', msg: `Extra "${data.name}" eliminado` });
    } else if (type === 'packaging') {
      deletePackaging(data.id);
      setStatusToast({ type: 'success', msg: `Empaque "${data.name}" eliminado` });
    }

    setItemToDelete(null);
    setTimeout(() => setStatusToast(null), 3000);
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-8">
      {/* Toast Notification */}
      {statusToast && (
        <Toast
          message={statusToast.msg}
          type={statusToast.type || 'info'}
          onClose={() => setStatusToast(null)}
        />
      )}

      {/* Page Header */}
      <PageHeader
        title="Catálogo & Carta"
        subtitle="Administra platos, bebidas, cremas caseras, adicionales y empaques para comandas"
        icon={UtensilsCrossed}
        badge={`${products.length} productos`}
        actions={
          <div className="flex items-center gap-2">
            {activeTab === 'products' && (
              <Button
                onClick={handleOpenNewProduct}
                icon={Plus}
                size="sm"
                className="font-bold text-xs"
              >
                Nuevo Producto
              </Button>
            )}
            {activeTab === 'categories' && (
              <Button
                onClick={handleOpenNewCategory}
                icon={Plus}
                size="sm"
                className="font-bold text-xs"
              >
                Nueva Categoría
              </Button>
            )}
            {activeTab === 'creams' && (
              <Button
                onClick={handleOpenNewCream}
                icon={Plus}
                size="sm"
                className="font-bold text-xs"
              >
                Nueva Crema
              </Button>
            )}
            {activeTab === 'extras' && (
              <Button
                onClick={handleOpenNewExtra}
                icon={Plus}
                size="sm"
                className="font-bold text-xs"
              >
                Nuevo Extra
              </Button>
            )}
            {activeTab === 'packagings' && (
              <Button
                onClick={handleOpenNewPackaging}
                icon={Plus}
                size="sm"
                className="font-bold text-xs"
              >
                Nuevo Empaque
              </Button>
            )}

            {(products.length > 0 || creams.length > 0 || extras.length > 0 || packagings.length > 0) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsClearConfirmOpen(true)}
                className="text-xs text-rose-400 border-zinc-800 hover:border-rose-900/60 hover:bg-rose-950/20"
                title="Vaciar catálogo para empezar de cero"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-500" />
                <span className="hidden sm:inline">Vaciar</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Banner de Estado de Conexión / Reglas de Firebase si hay error */}
      {firestoreError && (
        <div className="bg-amber-950/30 border border-amber-500/40 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-start gap-2.5 text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">Modo Local Activo (Firebase requiere configurar Reglas)</p>
              <p className="text-zinc-400 text-[11px] mt-0.5">
                Tus productos se guardan de forma segura en este navegador. Para sincronizarlos con la nube, configura las Reglas de Firestore.
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
              Ver Solución
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
                setTimeout(() => setStatusToast(null), 4000);
              }}
              className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-bold"
            >
              {isSyncing ? 'Sincronizando...' : 'Reintentar Nube'}
            </Button>
          </div>
        </div>
      )}

      {/* Sub-Navegación por Pestañas */}
      <div className="bg-[var(--color-porkos-surface)] p-2 rounded-2xl border border-[var(--color-porkos-border)] flex items-center justify-between gap-2 shadow-sm overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: 'products', label: 'Productos', count: products.length, icon: UtensilsCrossed },
            { id: 'categories', label: 'Categorías', count: categories.length, icon: Tag },
            { id: 'creams', label: 'Cremas', count: creams.length, icon: Sparkles },
            { id: 'extras', label: 'Extras', count: extras.length, icon: Plus },
            { id: 'packagings', label: 'Empaques', count: packagings.length, icon: Package },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-md shadow-orange-500/15'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isSelected ? 'bg-black/20 text-black' : 'bg-black/40 text-zinc-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido según Pestaña Activa */}
      {isLoadingCatalog ? (
        <LoadingState message="Cargando catálogo en tiempo real..." />
      ) : (
        <>
          {/* TAB 1: PRODUCTOS */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              {/* Banner de Almacenamiento & Cuota WebP */}
              <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">Almacenamiento WebP:</span>
                      <span className="font-mono font-black text-emerald-400">
                        {catalogStorageStats.totalFormatted}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {catalogStorageStats.countWithImages} fotos optimizadas • ~{catalogStorageStats.averageFormatted} c/u
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center">
                  <span className="text-[11px] text-zinc-400">
                    Cuota: <strong className="text-white font-mono">{catalogStorageStats.capacityPercent}%</strong> de 5 GB
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsStorageModalOpen(true)}
                    className="text-xs border-zinc-700 text-zinc-300 hover:text-white"
                  >
                    ⚙️ Storage
                  </Button>
                </div>
              </div>

              {/* Barra de Búsqueda de Productos */}
              {products.length > 0 && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <SearchInput
                      value={productSearchQuery}
                      onChange={setProductSearchQuery}
                      placeholder="Buscar plato por nombre, descripción o categoría..."
                    />
                  </div>
                  <div className="text-xs text-zinc-400 font-semibold shrink-0 self-end sm:self-center">
                    Mostrando <strong className="text-white">{filteredProducts.length}</strong> de {products.length} platos
                  </div>
                </div>
              )}

              {/* Listado de Productos */}
              {products.length === 0 ? (
                <EmptyState
                  icon={UtensilsCrossed}
                  title="No tienes productos creados aún"
                  description="Crea tu primer plato o bebida con su fotografía real, precio y opciones gastronómicas."
                  actionLabel="Crear Primer Producto"
                  onAction={handleOpenNewProduct}
                />
              ) : filteredProducts.length === 0 ? (
                <EmptyState
                  title="Sin resultados de búsqueda"
                  description={`No se encontraron productos que coincidan con "${productSearchQuery}"`}
                  actionLabel="Limpiar búsqueda"
                  onAction={() => setProductSearchQuery('')}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredProducts.map((p) => {
                    const allowedPackagingsCount = p.availablePackagingIds?.length || 0;

                    return (
                      <div
                        key={p.id}
                        className={`
                          bg-[var(--color-porkos-surface)] border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all hover:border-zinc-700
                          ${p.active ? 'border-[var(--color-porkos-border)]' : 'border-zinc-800/40 opacity-60'}
                        `}
                      >
                        {/* Info de Producto */}
                        <div className="flex gap-3 items-start">
                          <ProductThumbnail
                            src={p.image}
                            thumbnailUrl={p.thumbnailUrl}
                            name={p.name}
                            isBeverage={isProductBeverage(p)}
                            isDessert={isProductDessert(p, categories)}
                            className="w-16 h-16 rounded-xl shrink-0"
                            iconSize="w-7 h-7"
                          />

                          <div className="flex-1 min-w-0">
                            <h4 className="font-extrabold text-sm text-white truncate">
                              {p.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-sm font-black text-[var(--color-porkos-orange)]">
                                {formatCurrency(p.price)}
                              </span>
                              {p.cost > 0 && (
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  Costo: {formatCurrency(p.cost)}
                                </span>
                              )}
                              {p.imageMetadata?.sizeBytes && (
                                <span className="text-[10px] text-zinc-400 font-mono bg-black/40 px-1.5 py-0.2 rounded border border-zinc-800">
                                  {formatBytes(p.imageMetadata.sizeBytes)}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1 mt-1 text-[10px]">
                              <span className="bg-zinc-800 text-zinc-300 px-1.5 py-0.2 rounded font-bold uppercase">
                                {p.type}
                              </span>
                              {p.type === 'MARKET' ? (
                                <>
                                  {isProductDessert(p, categories) && (
                                    <span className="bg-pink-500/10 text-pink-400 border border-pink-500/20 px-1.5 py-0.2 rounded font-bold">
                                      🍰 Postre
                                    </span>
                                  )}
                                  {isProductBeverage(p) && (
                                    <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.2 rounded font-bold">
                                      🥤 Bebida
                                    </span>
                                  )}
                                  {isProductSnack(p) && !isProductDessert(p, categories) && !isProductBeverage(p) && (
                                    <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.2 rounded font-bold">
                                      🍪 Snack
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  {isProductDessert(p, categories) && (
                                    <span className="bg-pink-500/10 text-pink-400 border border-pink-500/20 px-1.5 py-0.2 rounded font-bold">
                                      🍰 Postre
                                    </span>
                                  )}
                                  {isProductBeverage(p) && (
                                    <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.2 rounded font-bold">
                                      {p.isJuice ? '🍹 Jugo' : '🥤 Bebida'}
                                    </span>
                                  )}
                                </>
                              )}
                              {p.requiresKitchen && (
                                <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.2 rounded font-bold">
                                  Cocina
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Modificadores dinámicos */}
                        <div className="flex flex-wrap gap-1 text-[10px] text-zinc-400 pt-2 border-t border-zinc-800/80">
                          {p.modifiers?.some((m) => m.id === 'mod_papas') && (
                            <span className="bg-black/50 px-2 py-0.5 rounded border border-zinc-800">
                              🍟 Papas
                            </span>
                          )}
                          {p.saladConfig?.enabled && (
                            <span className="bg-black/50 px-2 py-0.5 rounded border border-zinc-800">
                              🥗 Ensalada
                            </span>
                          )}
                          {p.temperatureConfig?.enabled && (
                            <span className="bg-black/50 px-2 py-0.5 rounded border border-zinc-800">
                              ❄️ Helada
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

                        {/* Botones de acción */}
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditProduct(p)}
                              className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer active:scale-95 touch-manipulation"
                              title="Editar plato"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setItemToDelete({ type: 'product', data: p })}
                              className="p-2 rounded-xl bg-zinc-800/80 hover:bg-rose-950/40 text-rose-400 hover:border-rose-500/40 transition-colors cursor-pointer active:scale-95 touch-manipulation"
                              title="Eliminar plato"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => toggleProductActive(p.id)}
                            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                              p.active ? 'bg-emerald-500' : 'bg-zinc-700'
                            }`}
                            title={p.active ? 'Desactivar plato' : 'Activar plato'}
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
            </div>
          )}

          {/* TAB 2: CATEGORÍAS */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {categories.map((cat) => {
                  const assignedProductsCount = products.filter((p) => p.categoryId === cat.id).length;
                  return (
                    <div
                      key={cat.id}
                      className={`bg-[var(--color-porkos-surface)] border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all hover:border-zinc-700 ${
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
                              cat.type === 'MARKET'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                            }`}>
                              {cat.type}
                            </span>
                            <span className="text-zinc-400 font-semibold">
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
                            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer active:scale-95 touch-manipulation"
                            title="Editar categoría"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemToDelete({ type: 'category', data: cat })}
                            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-rose-950/40 text-rose-400 transition-colors cursor-pointer active:scale-95 touch-manipulation"
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

          {/* TAB 3: CREMAS */}
          {activeTab === 'creams' && (
            <div className="space-y-4">
              {creams.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title="No tienes cremas registradas"
                  description="Agrega salsas caseras como Mayonesa, Ají PORKOS, Tártara con su abreviatura táctil (MAYO, AJÍ) para comandas."
                  actionLabel="Agregar Nueva Crema"
                  onAction={handleOpenNewCream}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {creams.map((c) => (
                    <div
                      key={c.id}
                      className={`
                        bg-[var(--color-porkos-surface)] border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all hover:border-zinc-700
                        ${c.active ? 'border-[var(--color-porkos-border)]' : 'border-zinc-800/40 opacity-60'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-9 h-9 rounded-xl border border-white/20 shadow-md shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: c.color }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-sm text-[var(--color-porkos-orange)] tracking-wider">
                              {c.shortName || c.name.slice(0, 4).toUpperCase()}
                            </span>
                            <span className="text-xs font-semibold text-zinc-300 truncate">({c.name})</span>
                          </div>
                          <span className={`text-[10px] font-bold ${c.active ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            {c.active ? 'Activa' : 'Desactivada'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditCream(c)}
                            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer active:scale-95 touch-manipulation"
                            title="Editar crema"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemToDelete({ type: 'cream', data: c })}
                            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-rose-950/40 text-rose-400 transition-colors cursor-pointer active:scale-95 touch-manipulation"
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
            </div>
          )}

          {/* TAB 4: EXTRAS */}
          {activeTab === 'extras' && (
            <div className="space-y-4">
              {extras.length === 0 ? (
                <EmptyState
                  icon={Plus}
                  title="No tienes adicionales registrados"
                  description="Agrega adicionales como Extra Queso Cheddar, Extra Huevo o Porción de Papas."
                  actionLabel="Agregar Nuevo Extra"
                  onAction={handleOpenNewExtra}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {extras.map((ext) => (
                    <div
                      key={ext.id}
                      className={`
                        bg-[var(--color-porkos-surface)] border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all hover:border-zinc-700
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

                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditExtra(ext)}
                            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer active:scale-95 touch-manipulation"
                            title="Editar extra"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemToDelete({ type: 'extra', data: ext })}
                            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-rose-950/40 text-rose-400 transition-colors cursor-pointer active:scale-95 touch-manipulation"
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
            </div>
          )}

          {/* TAB 5: PACKAGINGS / EMPAQUES */}
          {activeTab === 'packagings' && (
            <div className="space-y-4">
              {packagings.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No tienes empaques registrados"
                  description="Crea empaques como Bolsa Kraft o Taper Térmico y asócialos a tus hamburguesas o salchipapas."
                  actionLabel="Agregar Nuevo Empaque"
                  onAction={handleOpenNewPackaging}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {packagings.map((pkg) => {
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
                          bg-[var(--color-porkos-surface)] border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all hover:border-zinc-700
                          ${pkg.active ? 'border-[var(--color-porkos-border)]' : 'border-zinc-800/40 opacity-60'}
                        `}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-blue-400 shrink-0" />
                              <h4 className="font-extrabold text-sm text-white">{pkg.name}</h4>
                            </div>
                            <span className="text-sm font-black text-white shrink-0">
                              {pkg.price > 0 ? `+${formatCurrency(pkg.price)}` : 'Gratis'}
                            </span>
                          </div>

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
                                    Sin productos asignados
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

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditPackaging(pkg)}
                              className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer active:scale-95 touch-manipulation"
                              title="Editar empaque"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!isDefaultOption && (
                              <button
                                type="button"
                                onClick={() => setItemToDelete({ type: 'packaging', data: pkg })}
                                className="p-2 rounded-xl bg-zinc-800/80 hover:bg-rose-950/40 text-rose-400 transition-colors cursor-pointer active:scale-95 touch-manipulation"
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
      {/* MODAL 1: CREAR / EDITAR PRODUCTO                               */}
      {/* ============================================================== */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? `Editar: ${editingProduct.name}` : 'Nuevo Plato o Bebida'}
        subtitle="Configura nombre, precio, categoría, fotografía y empaques"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4 text-xs sm:text-sm">
          {/* SECCIÓN 1: DATOS GENERALES */}
          <div className="space-y-3 bg-black/40 p-3.5 rounded-2xl border border-zinc-800/80">
            <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 block">
              1. Identificación del Plato
            </span>

            <div>
              <label className="block text-zinc-300 font-bold mb-1">Nombre del Plato *</label>
              <input
                type="text"
                required
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                placeholder="Ej. Hamburguesa Parrillera, Inka Cola 500ml..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)]"
              />
            </div>

            {/* Categoría Selector */}
            <div>
              <label className="block text-zinc-300 font-bold mb-1.5">Categoría Comercial *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'cat_comida', line: 'COMIDA', type: 'RESTAURANTE', label: 'COMIDA', desc: 'Hamburguesas, Papas' },
                  { id: 'cat_bebidas', line: 'BEBIDAS', type: 'RESTAURANTE', label: 'BEBIDAS', desc: 'Jugos, Refrescos' },
                  { id: 'cat_postres', line: 'POSTRES', type: 'RESTAURANTE', label: 'POSTRES', desc: 'Tortas, Helados' },
                  { id: 'cat_market', line: 'MARKET', type: 'MARKET', label: 'MARKET', desc: 'Snacks, Golosinas' },
                ].map((opt) => {
                  const isSelected = prodCategory === opt.id;
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
                        } else if (opt.id === 'cat_postres') {
                          setProdHasTemperature(false);
                          setProdMarketSubtype('POSTRE');
                          setProdKitchen(false);
                          setProdIsJuice(false);
                        } else if (opt.type === 'MARKET') {
                          setProdKitchen(false);
                          setProdAvailablePackagingIds([]);
                          if (prodMarketSubtype !== 'BEBIDA' && prodMarketSubtype !== 'POSTRE' && prodMarketSubtype !== 'SNACK') {
                            setProdMarketSubtype('SNACK');
                          }
                          setProdHasTemperature(prodMarketSubtype === 'BEBIDA');
                        } else {
                          setProdKitchen(true);
                          setProdHasTemperature(false);
                          setProdMarketSubtype('COMIDA');
                          setProdIsJuice(false);
                        }
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 text-center ${
                        isSelected
                          ? 'bg-[var(--color-porkos-orange)] text-black border-transparent shadow-md'
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

            {/* Subcategoría de Market */}
            {(prodCategory === 'cat_market' || prodType === 'MARKET') && (
              <div className="bg-blue-950/20 p-3 rounded-xl border border-blue-500/30 space-y-1.5">
                <label className="text-zinc-200 font-bold block text-xs">Subcategoría Market *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProdMarketSubtype('BEBIDA');
                      setProdHasTemperature(true);
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      prodMarketSubtype === 'BEBIDA' || prodMarketSubtype === 'JUGO'
                        ? 'bg-blue-600 text-white border-transparent font-black shadow-md'
                        : 'bg-black/50 text-zinc-400 hover:text-white border-zinc-800'
                    }`}
                  >
                    <span className="text-sm">🥤</span>
                    <span>Bebidas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProdMarketSubtype('SNACK');
                      setProdIsJuice(false);
                      setProdHasTemperature(false);
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      prodMarketSubtype === 'SNACK' || prodMarketSubtype === 'COMIDA'
                        ? 'bg-purple-600 text-white border-transparent font-black shadow-md'
                        : 'bg-black/50 text-zinc-400 hover:text-white border-zinc-800'
                    }`}
                  >
                    <span className="text-sm">🍪</span>
                    <span>Snacks</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProdMarketSubtype('POSTRE');
                      setProdIsJuice(false);
                      setProdHasTemperature(false);
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      prodMarketSubtype === 'POSTRE'
                        ? 'bg-pink-600 text-white border-transparent font-black shadow-md'
                        : 'bg-black/50 text-zinc-400 hover:text-white border-zinc-800'
                    }`}
                  >
                    <span className="text-sm">🍰</span>
                    <span>Postres</span>
                  </button>
                </div>
              </div>
            )}

            {/* Opción Tipo Jugo / Requiere Cocina */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {(prodCategory === 'cat_bebidas' || ((prodCategory === 'cat_market' || prodType === 'MARKET') && (prodMarketSubtype === 'BEBIDA' || prodMarketSubtype === 'JUGO'))) && (
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer">
                  <div>
                    <span className="font-bold text-zinc-200 block text-xs">🍹 ¿Es Tipo Jugo?</span>
                    <span className="text-[10px] text-zinc-500">Permite notas de azúcar en comanda</span>
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
                </label>
              )}

              {prodType === 'RESTAURANTE' && (
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer">
                  <div>
                    <span className="font-bold text-zinc-200 block text-xs">🍳 ¿Requiere Cocina?</span>
                    <span className="text-[10px] text-zinc-500">Aparecerá en pantalla KDS</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={prodKitchen}
                    onChange={(e) => setProdKitchen(e.target.checked)}
                    className="w-5 h-5 accent-[var(--color-porkos-orange)] cursor-pointer"
                  />
                </label>
              )}
            </div>
          </div>

          {/* SECCIÓN 2: PRECIOS & COSTOS */}
          <div className="space-y-3 bg-black/40 p-3.5 rounded-2xl border border-zinc-800/80">
            <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 block">
              2. Precios y Márgenes
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Precio de Venta (S/) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-amber-400">S/</span>
                  <input
                    type="number"
                    step="0.50"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2.5 text-base sm:text-sm text-white font-extrabold focus:outline-none focus:border-[var(--color-porkos-orange)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">Costo Insumo (S/)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-zinc-500">S/</span>
                  <input
                    type="number"
                    step="0.50"
                    value={prodCost}
                    onChange={(e) => setProdCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2.5 text-base sm:text-sm text-zinc-300 font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: FOTOGRAFÍA CON OPTIMIZACIÓN WEBP */}
          <div className="space-y-2 bg-black/40 p-3.5 rounded-2xl border border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 block">
                3. Fotografía del Plato
              </span>
              {(prodImage || imagePreview) && (
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
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            {imagePreview ? (
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden border border-zinc-700 bg-black/60 group">
                  <img
                    src={imagePreview}
                    alt="Vista previa plato"
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute top-2 right-2">
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

                  {isUploadingImage && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-7 h-7 text-[var(--color-porkos-orange)] animate-spin" />
                      <span className="text-xs font-bold text-white">Optimizando a WebP...</span>
                    </div>
                  )}
                </div>

                {imageStats && (
                  <div className="bg-emerald-950/30 border border-emerald-500/30 p-2.5 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-zinc-300">Compresión WebP:</span>
                      <span className="text-emerald-400 font-mono font-black text-sm">
                        -{imageStats.reductionPercent}% Reducción
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
                      <span>Original: {formatBytes(imageStats.originalSize)}</span>
                      <span className="text-white font-bold">
                        Optimizado: {formatBytes(imageStats.optimizedSize)}
                      </span>
                    </div>
                    {imageStorageSource === 'firebase' && (
                      <p className="text-[10px] text-emerald-400 font-bold pt-0.5">
                        ✓ Foto sincronizada en Firebase Cloud Storage
                      </p>
                    )}
                    {imageStorageSource === 'local_optimized' && (
                      <p className="text-[10px] text-amber-300 font-bold pt-0.5">
                        ✓ WebP optimizado (~35 KB) guardado para la app
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="w-full h-24 rounded-xl border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/60 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer p-3 group"
              >
                <Camera className="w-6 h-6 text-zinc-500 group-hover:text-[var(--color-porkos-orange)] transition-colors" />
                <span className="text-xs font-bold text-zinc-300 group-hover:text-white">
                  Subir fotografía desde tu dispositivo
                </span>
                <span className="text-[10px] text-zinc-500 text-center">
                  Compresión automática a WebP (640px, ~50-80 KB)
                </span>
              </button>
            )}

            {imageUploadError && (
              <p className="text-xs text-rose-400 font-semibold mt-1">{imageUploadError}</p>
            )}
          </div>

          {/* DESCRIPCIÓN */}
          <div>
            <label className="block text-zinc-300 font-bold mb-1">Descripción / Ingredientes</label>
            <textarea
              rows={2}
              value={prodDescription}
              onChange={(e) => setProdDescription(e.target.value)}
              placeholder="Carne 150g, pan artesanal, lechuga y tomate..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-base sm:text-sm text-white focus:outline-none focus:border-[var(--color-porkos-orange)]"
            />
          </div>

          {/* SECCIÓN 4: OPCIONES GASTRONÓMICAS (RESTAURANTE) */}
          {prodType === 'RESTAURANTE' && (
            <div className="space-y-3 bg-black/40 p-3.5 rounded-2xl border border-zinc-800/80">
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 block flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[var(--color-porkos-orange)]" />
                4. Opciones Gastronómicas & Modificadores
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="flex items-center gap-2 p-2 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodHasPapas}
                    onChange={(e) => setProdHasPapas(e.target.checked)}
                    className="accent-[var(--color-porkos-orange)]"
                  />
                  <span className="font-semibold text-zinc-200 text-xs">🍟 Papas Fritas/Hilo</span>
                </label>

                <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="font-semibold text-zinc-200 text-xs">🥗 Ensalada:</span>
                  <div className="flex bg-black/60 p-0.5 rounded-md border border-zinc-800 shrink-0">
                    <button
                      type="button"
                      onClick={() => setProdHasSalad(true)}
                      className={`px-2.5 py-0.5 text-xs font-bold rounded transition-all cursor-pointer ${
                        prodHasSalad ? 'bg-emerald-500 text-black font-black' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Sí
                    </button>
                    <button
                      type="button"
                      onClick={() => setProdHasSalad(false)}
                      className={`px-2.5 py-0.5 text-xs font-bold rounded transition-all cursor-pointer ${
                        !prodHasSalad ? 'bg-zinc-800 text-zinc-200 font-bold' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodHasTemperature}
                    onChange={(e) => setProdHasTemperature(e.target.checked)}
                    className="accent-[var(--color-porkos-orange)]"
                  />
                  <span className="font-semibold text-zinc-200 text-xs">❄️ Helada/Sin Helar</span>
                </label>
              </div>

              {/* Empaques Permitidos */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                <span className="text-zinc-300 font-bold block text-[11px] flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-400" />
                  Empaques / Tapers Permitidos:
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
                          className={`p-2 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-blue-950/40 border-blue-500/80 text-white'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-bold block truncate text-xs">{pkg.name}</span>
                            <span className="text-[10px] text-zinc-500">+{formatCurrency(pkg.price)}</span>
                          </div>
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] font-black shrink-0 ${
                              isChecked ? 'bg-blue-500 border-blue-400 text-white' : 'border-zinc-700 text-transparent'
                            }`}
                          >
                            ✓
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Cremas Permitidas */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                <span className="text-zinc-400 font-semibold block text-[11px]">
                  Cremas disponibles para este plato:
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
                        className={`text-xs px-2.5 py-1 rounded-xl border font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-zinc-800 text-white border-[var(--color-porkos-orange)]'
                            : 'bg-zinc-900 text-zinc-500 border-zinc-800'
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

          {/* Botones de acción en modal */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
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
              isLoading={isSavingProduct}
            >
              {isUploadingImage
                ? 'Subiendo foto...'
                : editingProduct
                ? 'Guardar Cambios'
                : 'Crear Plato'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: CREAR / EDITAR CATEGORÍA                              */}
      {/* ============================================================== */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={editingCategory ? `Editar: ${editingCategory.name}` : 'Nueva Categoría'}
        subtitle="Agrupa platos en ventas y cocina"
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
              placeholder="Ej. Alitas, Costillas, Combos..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)]"
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
                    ? 'bg-[var(--color-porkos-orange)] text-black border-transparent font-black shadow-sm'
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
                    ? 'bg-blue-600 text-white border-transparent font-black shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                Market / Bebidas
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-zinc-800">
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

      {/* ============================================================== */}
      {/* MODAL 3: CREAR / EDITAR CREMA                                  */}
      {/* ============================================================== */}
      <Modal
        isOpen={isCreamModalOpen}
        onClose={() => setIsCreamModalOpen(false)}
        title={editingCream ? `Editar Crema: ${editingCream.name}` : 'Nueva Crema'}
        subtitle="Configura el nombre y abreviatura para la comanda"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveCream} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-zinc-300 font-bold mb-1">Nombre de la Crema *</label>
            <input
              type="text"
              required
              value={creamName}
              onChange={(e) => setCreamName(e.target.value)}
              placeholder="Ej. Mayonesa Casera, Ají PORKOS..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)]"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-bold mb-1">Abreviatura en Comandas (Máx 6) *</label>
            <input
              type="text"
              maxLength={6}
              value={creamShortName}
              onChange={(e) => setCreamShortName(e.target.value.toUpperCase())}
              placeholder="Ej. MAYO, KET, AJÍ, BBQ"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white font-mono font-bold uppercase tracking-wider focus:outline-none focus:border-[var(--color-porkos-orange)]"
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

          <div className="pt-2 flex justify-end gap-2 border-t border-zinc-800">
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
      {/* MODAL 4: CREAR / EDITAR EXTRA                                  */}
      {/* ============================================================== */}
      <Modal
        isOpen={isExtraModalOpen}
        onClose={() => setIsExtraModalOpen(false)}
        title={editingExtra ? `Editar Extra: ${editingExtra.name}` : 'Nuevo Extra'}
        subtitle="Configura ingredientes adicionales y su precio"
        maxWidth="max-w-md"
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
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)]"
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
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white font-black focus:outline-none focus:border-[var(--color-porkos-orange)]"
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
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <span className="font-bold">{cat.name}</span>
                      <span className="text-xs font-black">{isChecked ? '✓' : ''}</span>
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-zinc-800">
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
      {/* MODAL 5: CREAR / EDITAR EMPAQUE                                */}
      {/* ============================================================== */}
      <Modal
        isOpen={isPackagingModalOpen}
        onClose={() => setIsPackagingModalOpen(false)}
        title={editingPackaging ? `Editar Empaque: ${editingPackaging.name}` : 'Nuevo Empaque'}
        subtitle="Configura el empaque y asócialo a los platos permitidos"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSavePackaging} className="space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-bold mb-1">Nombre del Empaque *</label>
              <input
                type="text"
                required
                value={pkgName}
                onChange={(e) => setPkgName(e.target.value)}
                placeholder="Ej. Taper Térmico Mediano..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)]"
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
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white font-black focus:outline-none focus:border-[var(--color-porkos-orange)]"
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
                    className={`w-full p-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500/70 text-white'
                        : 'bg-zinc-900/80 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
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

          <div className="pt-2 flex justify-end gap-2 border-t border-zinc-800">
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

      {/* CONFIRM DIALOG: VACIAR CATÁLOGO */}
      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        onClose={() => !isClearing && setIsClearConfirmOpen(false)}
        onConfirm={async () => {
          setIsClearing(true);
          try {
            await clearAllCatalog();
            setIsClearConfirmOpen(false);
            setStatusToast({ type: 'success', msg: 'Catálogo vaciado con éxito' });
          } catch (err) {
            console.error('Error vaciando catálogo:', err);
          } finally {
            setIsClearing(false);
          }
        }}
        title="¿Vaciar todo el catálogo?"
        message="Esta acción eliminará todos los platos, cremas, extras y empaques de Firebase Firestore para empezar 100% desde cero."
        confirmText={isClearing ? 'Vaciando...' : 'Sí, Vaciar Todo'}
        variant="danger"
        isLoading={isClearing}
      />

      {/* CONFIRM DIALOG: ELIMINAR ELEMENTO INDIVIDUAL */}
      <ConfirmDialog
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmItemDelete}
        title={
          itemToDelete?.type === 'product'
            ? `¿Eliminar "${itemToDelete?.data?.name}"?`
            : itemToDelete?.type === 'category'
            ? `¿Eliminar categoría "${itemToDelete?.data?.name}"?`
            : itemToDelete?.type === 'cream'
            ? `¿Eliminar crema "${itemToDelete?.data?.name}"?`
            : itemToDelete?.type === 'extra'
            ? `¿Eliminar extra "${itemToDelete?.data?.name}"?`
            : `¿Eliminar empaque "${itemToDelete?.data?.name}"?`
        }
        message="Esta acción no se puede deshacer. Se actualizará en la base de datos."
        confirmText="Sí, Eliminar"
        variant="danger"
      />

      {/* MODAL: REGLAS DE FIREBASE FIRESTORE */}
      <Modal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        title="Reglas de Firebase Firestore"
        subtitle="Configuración para sincronizar en la nube"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs text-zinc-300">
          <p>
            Al crear tu proyecto en Firebase, la base de datos viene bloqueada por defecto. Para habilitarla con autenticación segura:
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
                Firestore Database &gt; Reglas
              </a>
            </li>
            <li>
              Pega estas reglas protegidas por autenticación:
              <pre className="mt-1.5 p-2.5 bg-black rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto border border-zinc-800">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null && request.auth.token.email != null;
    }
    match /{document=**} {
      allow read, write: if isAuthenticated();
    }
  }
}`}
              </pre>
            </li>
            <li>
              Haz clic en el botón azul <strong>Publicar (Publish)</strong>.
            </li>
          </ol>

          <div className="flex justify-end pt-2 border-t border-zinc-800">
            <Button type="button" onClick={() => setIsRulesModalOpen(false)}>
              Entendido
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: CONFIGURACIÓN FIREBASE STORAGE */}
      <Modal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen(false)}
        title="Configuración de Firebase Storage"
        subtitle="Diagnóstico y reglas para almacenamiento de fotos WebP"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 text-xs">
          <p className="text-zinc-300 leading-relaxed">
            PORKOAPP optimiza automáticamente las fotos en tu navegador a formato <strong className="text-white">WebP (640px, ~50-80 KB)</strong>. Para que se guarden en la nube:
          </p>

          {/* Test Live */}
          <div className="bg-black/50 border border-zinc-800 p-3.5 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">Diagnóstico en Tiempo Real:</span>
              <Button
                type="button"
                size="sm"
                onClick={handleTestStorage}
                disabled={isTestingStorage}
                className="text-xs"
              >
                {isTestingStorage ? 'Probando...' : '🔍 Probar Conexión'}
              </Button>
            </div>

            {storageTestResult && (
              <div
                className={`p-3 rounded-xl border space-y-1 ${
                  storageTestResult.success
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  {storageTestResult.success ? '✓' : '⚠️'} {storageTestResult.message}
                </div>
                {storageTestResult.errorCode && (
                  <div className="text-[11px] text-zinc-400 font-mono">
                    Código: {storageTestResult.errorCode}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-amber-400">Reglas de Storage</span>
                <button
                  type="button"
                  onClick={() => {
                    const rulesText = `rules_version = '2';\nservice firebase.storage {\n  match /b/{bucket}/o {\n    function isAuthenticated() {\n      return request.auth != null && request.auth.token.email != null;\n    }\n    match /products/{allPaths=**} {\n      allow read: if isAuthenticated();\n      allow write: if isAuthenticated() && request.resource.size < 300 * 1024 && request.resource.contentType.matches('image/(webp|jpeg|png)');\n      allow delete: if isAuthenticated();\n    }\n    match /{allPaths=**} {\n      allow read, write: if false;\n    }\n  }\n}`;
                    navigator.clipboard.writeText(rulesText);
                    setHasCopiedStorageRules(true);
                    setTimeout(() => setHasCopiedStorageRules(false), 3000);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[var(--color-porkos-orange)] text-black font-extrabold text-[11px] cursor-pointer hover:bg-orange-500 transition-colors"
                >
                  {hasCopiedStorageRules ? '✓ ¡Reglas Copiadas!' : '📋 Copiar Reglas'}
                </button>
              </div>
              <pre className="bg-black/80 p-2.5 rounded-lg border border-zinc-800 text-[11px] font-mono text-zinc-300 overflow-x-auto">
{`rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isAuthenticated() {
      return request.auth != null && request.auth.token.email != null;
    }
    match /products/{allPaths=**} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated()
        && request.resource.size < 300 * 1024
        && request.resource.contentType.matches('image/(webp|jpeg|png)');
      allow delete: if isAuthenticated();
    }
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}`}
              </pre>
            </div>
          </div>

          <div className="pt-2 flex justify-end border-t border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsStorageModalOpen(false)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Flecha flotante para subir al inicio */}
      <ScrollToTopButton />
    </div>
  );
}
