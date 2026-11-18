import { useState, useEffect } from 'react';
import { CatalogContext } from './catalog-context';
import { DEFAULT_CATEGORIES } from '../types/defaultCatalog';
import { isProductBeverage, isProductMarket } from '../utils/productCategories';
import {
  subscribeToProducts,
  saveProductToFirestore,
  deleteProductFromFirestore,
  subscribeToCategories,
  saveCategoryToFirestore,
  deleteCategoryFromFirestore,
  subscribeToCreams,
  saveCreamToFirestore,
  deleteCreamFromFirestore,
  subscribeToExtras,
  saveExtraToFirestore,
  deleteExtraFromFirestore,
  subscribeToPackagings,
  savePackagingToFirestore,
  deletePackagingFromFirestore,
  clearAllDemoCatalogFromFirestore,
} from '../services/firestoreService';

const STORAGE_KEYS = {
  PRODUCTS: 'porkos_catalog_products',
  CATEGORIES: 'porkos_catalog_categories',
  CREAMS: 'porkos_catalog_creams',
  EXTRAS: 'porkos_catalog_extras',
  PACKAGINGS: 'porkos_catalog_packagings',
};

// Normalizar producto a las 3 categorías oficiales: COMIDA, BEBIDAS, MARKET (sin subcategorías)
function normalizeProductCategory(prod) {
  let line;
  let categoryId;
  let type;

  if (isProductMarket(prod)) {
    line = 'MARKET';
    categoryId = 'cat_market';
    type = 'MARKET';
  } else if (isProductBeverage(prod)) {
    line = 'BEBIDAS';
    categoryId = 'cat_bebidas';
    type = 'RESTAURANTE';
  } else {
    line = 'COMIDA';
    categoryId = 'cat_comida';
    type = 'RESTAURANTE';
  }

  return {
    ...prod,
    line,
    categoryId,
    type,
    subcategory: null,
  };
}

// Sanitizar producto: Solo admitir URLs http/https válidas, nunca blob ni Base64
function sanitizeProduct(prod) {
  if (!prod) return prod;
  let cleanImage = prod.image || '';
  if (typeof cleanImage === 'string') {
    cleanImage = cleanImage.trim();
    if (!cleanImage.startsWith('http://') && !cleanImage.startsWith('https://')) {
      cleanImage = '';
    }
  } else {
    cleanImage = '';
  }

  let cleanThumb = prod.thumbnailUrl || '';
  if (typeof cleanThumb === 'string') {
    cleanThumb = cleanThumb.trim();
    if (!cleanThumb.startsWith('http://') && !cleanThumb.startsWith('https://')) {
      cleanThumb = '';
    }
  } else {
    cleanThumb = '';
  }

  return normalizeProductCategory({
    ...prod,
    image: cleanImage,
    thumbnailUrl: cleanThumb || cleanImage,
    imageMetadata: prod.imageMetadata && typeof prod.imageMetadata === 'object' ? prod.imageMetadata : null,
  });
}

// Normalizar categorías de Extras (eliminar legacy IDs como cat_burgers, cat_clasico, cat_artesanal)
function normalizeExtraCategories(cats = []) {
  if (!cats || !Array.isArray(cats) || cats.length === 0) return ['cat_comida'];
  const mapped = cats.map((catId) => {
    if (
      catId === 'cat_burgers' ||
      catId === 'cat_salchipapas' ||
      catId === 'cat_choripanes' ||
      catId === 'cat_clasico' ||
      catId === 'cat_artesanal'
    ) {
      return 'cat_comida';
    }
    return catId;
  });
  return Array.from(new Set(mapped));
}

function loadLocal(key, fallback = []) {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    const parsed = JSON.parse(item);
    if (key === STORAGE_KEYS.PRODUCTS && Array.isArray(parsed)) {
      return parsed.map(sanitizeProduct);
    }
    if (key === STORAGE_KEYS.EXTRAS && Array.isArray(parsed)) {
      return parsed.map((e) => ({
        ...e,
        compatibleCategories: normalizeExtraCategories(e.compatibleCategories),
      }));
    }
    return parsed;
  } catch {
    return fallback;
  }
}

function saveLocal(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`Error guardando localmente (${key}):`, err);
    // Si la cuota de localStorage (5MB) fue excedida por imágenes Base64 pesadas:
    if (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014) {
      try {
        if (key === STORAGE_KEYS.PRODUCTS && Array.isArray(data)) {
          // Guardar una versión ligera en localStorage sin Base64 masivo para no saturar memoria
          const lightweight = data.map((p) => {
            if (p.image && p.image.startsWith('data:image/') && p.image.length > 35000) {
              return { ...p, image: '' };
            }
            return p;
          });
          localStorage.setItem(key, JSON.stringify(lightweight));
          console.warn('Se protegió la cuota de localStorage guardando el catálogo en modo ligero.');
        }
      } catch (innerErr) {
        console.error('Error crítico al intentar guardar en localStorage:', innerErr);
      }
    }
  }
}

export function CatalogProvider({ children }) {
  // Inicializar primero desde LocalStorage para que al actualizar NUNCA desaparezcan los datos
  const [products, setProducts] = useState(() => loadLocal(STORAGE_KEYS.PRODUCTS, []));
  const [categories, setCategories] = useState(() => loadLocal(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES));
  const [creams, setCreams] = useState(() => loadLocal(STORAGE_KEYS.CREAMS, []));
  const [extras, setExtras] = useState(() => loadLocal(STORAGE_KEYS.EXTRAS, []));
  const [packagings, setPackagings] = useState(() => loadLocal(STORAGE_KEYS.PACKAGINGS, []));

  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [firestoreError, setFirestoreError] = useState(null);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(false);

  // Inicializar y sincronizar con Firestore en tiempo real (con timeout de seguridad para evitar spinner infinito)
  useEffect(() => {
    let isMounted = true;

    // Timeout de seguridad: Si Firestore tarda más de 2 segundos o está bloqueado, apagar spinner
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setIsLoadingCatalog(false);
      }
    }, 2000);

    const handleError = (colName, err) => {
      console.warn(`[Firestore ${colName}] Error:`, err?.code, err?.message);
      if (isMounted) {
        setIsLoadingCatalog(false);
        setFirestoreError({
          code: err?.code || 'permission-denied',
          message: err?.message || 'Error de permisos o conexión en Firestore',
          colName,
        });
      }
    };

    const unsubProducts = subscribeToProducts(
      (remoteProducts) => {
        if (!isMounted) return;
        clearTimeout(safetyTimeout);
        setIsLoadingCatalog(false);
        setIsFirestoreConnected(true);
        setFirestoreError(null);

        if (remoteProducts && remoteProducts.length > 0) {
          const sanitized = remoteProducts.map(sanitizeProduct);
          setProducts(sanitized);
          saveLocal(STORAGE_KEYS.PRODUCTS, sanitized);
        } else {
          // Si Firestore está vacío pero el usuario tiene productos locales, sincronizarlos a la nube
          const localItems = loadLocal(STORAGE_KEYS.PRODUCTS, []);
          if (localItems.length > 0) {
            console.log('Sincronizando productos locales a Firestore...');
            localItems.forEach((p) => saveProductToFirestore(p));
          }
        }
      },
      (err) => handleError('products', err)
    );

    const unsubCategories = subscribeToCategories(
      (remoteCategories) => {
        if (!isMounted) return;
        const hasLegacyCategories = remoteCategories?.some(
          (c) =>
            c.id === 'cat_burgers' ||
            c.id === 'cat_choripanes' ||
            c.id === 'cat_salchipapas' ||
            c.id === 'cat_clasico' ||
            c.id === 'cat_artesanal'
        );

        if (remoteCategories && remoteCategories.length > 0 && !hasLegacyCategories) {
          setCategories(remoteCategories);
          saveLocal(STORAGE_KEYS.CATEGORIES, remoteCategories);
        } else {
          // Migración automática a las 3 categorías limpias oficiales: Comida, Bebidas, Market
          console.log('Sincronizando categorías simplificadas oficiales: Comida, Bebidas, Market...');
          setCategories(DEFAULT_CATEGORIES);
          saveLocal(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
          DEFAULT_CATEGORIES.forEach((c) => saveCategoryToFirestore(c));

          // Limpiar de Firestore las categorías obsoletas si existían
          if (hasLegacyCategories) {
            remoteCategories
              .filter((c) => c.id !== 'cat_comida' && c.id !== 'cat_bebidas' && c.id !== 'cat_market')
              .forEach((c) => deleteCategoryFromFirestore(c.id));
          }
        }
      },
      (err) => handleError('categories', err)
    );

    const unsubCreams = subscribeToCreams(
      (remoteCreams) => {
        if (!isMounted) return;
        if (remoteCreams && remoteCreams.length > 0) {
          setCreams(remoteCreams);
          saveLocal(STORAGE_KEYS.CREAMS, remoteCreams);
        } else {
          const localItems = loadLocal(STORAGE_KEYS.CREAMS, []);
          if (localItems.length > 0) {
            localItems.forEach((c) => saveCreamToFirestore(c));
          }
        }
      },
      (err) => handleError('creams', err)
    );

    const unsubExtras = subscribeToExtras(
      (remoteExtras) => {
        if (!isMounted) return;
        if (remoteExtras && remoteExtras.length > 0) {
          const sanitizedExtras = remoteExtras.map((e) => {
            const normalizedCats = normalizeExtraCategories(e.compatibleCategories);
            if (e.compatibleCategories?.some((c) => c === 'cat_burgers' || c === 'cat_salchipapas' || c === 'cat_choripanes')) {
              saveExtraToFirestore({ ...e, compatibleCategories: normalizedCats });
            }
            return {
              ...e,
              compatibleCategories: normalizedCats,
            };
          });
          setExtras(sanitizedExtras);
          saveLocal(STORAGE_KEYS.EXTRAS, sanitizedExtras);
        } else {
          const localItems = loadLocal(STORAGE_KEYS.EXTRAS, []);
          if (localItems.length > 0) {
            localItems.forEach((e) => saveExtraToFirestore({
              ...e,
              compatibleCategories: normalizeExtraCategories(e.compatibleCategories),
            }));
          }
        }
      },
      (err) => handleError('extras', err)
    );

    const unsubPackagings = subscribeToPackagings(
      (remotePackagings) => {
        if (!isMounted) return;
        if (remotePackagings && remotePackagings.length > 0) {
          setPackagings(remotePackagings);
          saveLocal(STORAGE_KEYS.PACKAGINGS, remotePackagings);
        } else {
          const localItems = loadLocal(STORAGE_KEYS.PACKAGINGS, []);
          if (localItems.length > 0) {
            localItems.forEach((pkg) => savePackagingToFirestore(pkg));
          }
        }
      },
      (err) => handleError('packagings', err)
    );

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      unsubProducts();
      unsubCategories();
      unsubCreams();
      unsubExtras();
      unsubPackagings();
    };
  }, []);

  // Función para forzar sincronización de todo lo local a Firestore
  const syncLocalToFirestore = async () => {
    setIsLoadingCatalog(true);
    let lastError = null;
    try {
      for (const p of products) {
        const res = await saveProductToFirestore(p);
        if (!res.success) lastError = res.error;
      }
      for (const cat of categories) {
        const res = await saveCategoryToFirestore(cat);
        if (!res.success) lastError = res.error;
      }
      for (const c of creams) {
        const res = await saveCreamToFirestore(c);
        if (!res.success) lastError = res.error;
      }
      for (const e of extras) {
        const res = await saveExtraToFirestore(e);
        if (!res.success) lastError = res.error;
      }
      for (const pkg of packagings) {
        const res = await savePackagingToFirestore(pkg);
        if (!res.success) lastError = res.error;
      }

      if (lastError) {
        setFirestoreError({
          code: lastError.code || 'write-denied',
          message: lastError.message,
        });
        return { success: false, error: lastError };
      } else {
        setFirestoreError(null);
        setIsFirestoreConnected(true);
        return { success: true };
      }
    } catch (err) {
      console.error('Error durante sincronización manual:', err);
      return { success: false, error: err };
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  // Funciones de Productos (con persistencia dual LocalStorage + Firestore)
  const addProduct = async (newProduct) => {
    const id = `prod_${Date.now()}`;
    let cleanImage = typeof newProduct.image === 'string' ? newProduct.image.trim() : '';
    if (!cleanImage.startsWith('http://') && !cleanImage.startsWith('https://')) {
      cleanImage = '';
    }

    const line = newProduct.line || (isProductMarket(newProduct) ? 'MARKET' : isProductBeverage(newProduct) ? 'BEBIDAS' : 'COMIDA');
    const categoryId = newProduct.categoryId || (line === 'MARKET' ? 'cat_market' : line === 'BEBIDAS' ? 'cat_bebidas' : 'cat_comida');
    const type = line === 'MARKET' ? 'MARKET' : (newProduct.type || 'RESTAURANTE');

    const productWithDefaults = {
      id,
      name: newProduct.name || 'Nuevo Producto',
      line,
      categoryId,
      type,
      salesCount: 0,
      description: newProduct.description || '',
      price: parseFloat(newProduct.price) || 0,
      cost: parseFloat(newProduct.cost) || 0,
      image: cleanImage,
      requiresKitchen: line === 'MARKET' ? false : (newProduct.requiresKitchen ?? true),
      active: true,
      defaultPackagingId: newProduct.defaultPackagingId || (packagings[0]?.id || ''),
      availablePackagingIds: newProduct.availablePackagingIds || [],
      modifiers: newProduct.modifiers || [],
      creamsConfig: newProduct.creamsConfig || {
        enabled: creams.length > 0,
        availableCreamIds: creams.map((c) => c.id),
        defaultCreamIds: [],
        defaultMode: 'DEFAULT',
      },
      availableExtraIds: newProduct.availableExtraIds || [],
      temperatureConfig: newProduct.temperatureConfig || null,
      saladConfig: newProduct.saladConfig || null,
    };

    // 1. Guardar de inmediato en estado y LocalStorage (nunca se pierde)
    setProducts((prev) => {
      const updated = [productWithDefaults, ...prev];
      saveLocal(STORAGE_KEYS.PRODUCTS, updated);
      return updated;
    });

    // 2. Guardar en Firestore y capturar resultado
    const firestoreResult = await saveProductToFirestore(productWithDefaults);
    if (!firestoreResult.success) {
      console.warn('Advertencia: No se pudo guardar en Firestore:', firestoreResult.error);
      setFirestoreError({
        code: firestoreResult.error?.code || 'write-error',
        message: firestoreResult.error?.message,
        colName: 'products',
      });
    }

    // 3. Sincronizar empaques si corresponde
    if (productWithDefaults.availablePackagingIds.length > 0) {
      setPackagings((prev) => {
        const updated = prev.map((pkg) => {
          if (productWithDefaults.availablePackagingIds.includes(pkg.id)) {
            const currentProds = pkg.applicableProductIds || [];
            if (!currentProds.includes(id)) {
              const updatedPkg = { ...pkg, applicableProductIds: [...currentProds, id] };
              savePackagingToFirestore(updatedPkg);
              return updatedPkg;
            }
          }
          return pkg;
        });
        saveLocal(STORAGE_KEYS.PACKAGINGS, updated);
        return updated;
      });
    }

    return { product: productWithDefaults, firestoreResult };
  };

  const updateProduct = async (productId, updatedFields) => {
    let updatedProdObj = null;
    const cleanFields = { ...updatedFields };
    if (typeof cleanFields.image === 'string' && cleanFields.image.trim().startsWith('blob:')) {
      cleanFields.image = '';
    }

    setProducts((prev) => {
      const updated = prev.map((p) => {
        if (p.id === productId) {
          updatedProdObj = {
            ...p,
            ...cleanFields,
            price: typeof cleanFields.price !== 'undefined' ? parseFloat(cleanFields.price) : p.price,
            cost: typeof cleanFields.cost !== 'undefined' ? parseFloat(cleanFields.cost) : p.cost,
          };
          return updatedProdObj;
        }
        return p;
      });
      saveLocal(STORAGE_KEYS.PRODUCTS, updated);
      return updated;
    });

    if (updatedProdObj) {
      const res = await saveProductToFirestore(updatedProdObj);
      if (!res.success) {
        setFirestoreError({
          code: res.error?.code || 'update-error',
          message: res.error?.message,
          colName: 'products',
        });
      }
    }

    // Sincronizar empaques
    if (updatedFields.availablePackagingIds) {
      setPackagings((prev) => {
        const updated = prev.map((pkg) => {
          const isAssociated = updatedFields.availablePackagingIds.includes(pkg.id);
          const currentList = pkg.applicableProductIds || [];
          if (isAssociated && !currentList.includes(productId)) {
            const updatedPkg = { ...pkg, applicableProductIds: [...currentList, productId] };
            savePackagingToFirestore(updatedPkg);
            return updatedPkg;
          } else if (!isAssociated && currentList.includes(productId)) {
            const updatedPkg = { ...pkg, applicableProductIds: currentList.filter((id) => id !== productId) };
            savePackagingToFirestore(updatedPkg);
            return updatedPkg;
          }
          return pkg;
        });
        saveLocal(STORAGE_KEYS.PACKAGINGS, updated);
        return updated;
      });
    }
  };

  const deleteProduct = async (productId) => {
    setProducts((prev) => {
      const updated = prev.filter((p) => p.id !== productId);
      saveLocal(STORAGE_KEYS.PRODUCTS, updated);
      return updated;
    });
    await deleteProductFromFirestore(productId);

    // Limpiar asociación en packagings
    setPackagings((prev) => {
      const updated = prev.map((pkg) => {
        const updatedPkg = {
          ...pkg,
          applicableProductIds: (pkg.applicableProductIds || []).filter((id) => id !== productId),
        };
        savePackagingToFirestore(updatedPkg);
        return updatedPkg;
      });
      saveLocal(STORAGE_KEYS.PACKAGINGS, updated);
      return updated;
    });
  };

  const toggleProductActive = (productId) => {
    setProducts((prev) => {
      const updated = prev.map((p) => {
        if (p.id === productId) {
          const updatedProd = { ...p, active: !p.active };
          saveProductToFirestore(updatedProd);
          return updatedProd;
        }
        return p;
      });
      saveLocal(STORAGE_KEYS.PRODUCTS, updated);
      return updated;
    });
  };

  // Registrar ventas para alimentar el ranking histórico de salida
  const recordProductSales = (soldItems = []) => {
    setProducts((prev) => {
      const updated = prev.map((p) => {
        const matchingItem = soldItems.find((item) => item.productId === p.id);
        if (matchingItem) {
          const updatedProd = {
            ...p,
            salesCount: (p.salesCount || 0) + (matchingItem.quantity || 1),
          };
          saveProductToFirestore(updatedProd);
          return updatedProd;
        }
        return p;
      });
      saveLocal(STORAGE_KEYS.PRODUCTS, updated);
      return updated;
    });
  };

  // Funciones de Categorías Dinámicas
  const addCategory = async (newCat) => {
    const id = `cat_${Date.now()}`;
    const categoryWithDefaults = {
      id,
      name: newCat.name || 'Nueva Categoría',
      type: newCat.type || 'RESTAURANTE',
      icon: newCat.icon || 'UtensilsCrossed',
      order: categories.length + 1,
      active: true,
    };
    setCategories((prev) => {
      const updated = [...prev, categoryWithDefaults];
      saveLocal(STORAGE_KEYS.CATEGORIES, updated);
      return updated;
    });
    await saveCategoryToFirestore(categoryWithDefaults);
    return categoryWithDefaults;
  };

  const updateCategory = async (catId, updatedFields) => {
    setCategories((prev) => {
      const updated = prev.map((c) => {
        if (c.id === catId) {
          const updatedCat = { ...c, ...updatedFields };
          saveCategoryToFirestore(updatedCat);
          return updatedCat;
        }
        return c;
      });
      saveLocal(STORAGE_KEYS.CATEGORIES, updated);
      return updated;
    });
  };

  const deleteCategory = async (catId) => {
    setCategories((prev) => {
      const updated = prev.filter((c) => c.id !== catId);
      saveLocal(STORAGE_KEYS.CATEGORIES, updated);
      return updated;
    });
    await deleteCategoryFromFirestore(catId);
  };

  const toggleCategoryActive = (catId) => {
    setCategories((prev) => {
      const updated = prev.map((c) => {
        if (c.id === catId) {
          const updatedCat = { ...c, active: !c.active };
          saveCategoryToFirestore(updatedCat);
          return updatedCat;
        }
        return c;
      });
      saveLocal(STORAGE_KEYS.CATEGORIES, updated);
      return updated;
    });
  };

  // Funciones de Cremas con diminutivo
  const addCream = async (newCream) => {
    const id = `cream_${Date.now()}`;
    const creamWithDefaults = {
      id,
      name: newCream.name || 'Nueva Crema',
      shortName: (newCream.shortName || newCream.name?.slice(0, 4) || 'CRM').toUpperCase(),
      color: newCream.color || '#FBBF24',
      order: creams.length + 1,
      active: true,
    };
    setCreams((prev) => {
      const updated = [...prev, creamWithDefaults];
      saveLocal(STORAGE_KEYS.CREAMS, updated);
      return updated;
    });
    await saveCreamToFirestore(creamWithDefaults);
    return creamWithDefaults;
  };

  const updateCream = async (creamId, updatedFields) => {
    setCreams((prev) => {
      const updated = prev.map((c) => {
        if (c.id === creamId) {
          const updatedCream = {
            ...c,
            ...updatedFields,
            shortName: updatedFields.shortName ? updatedFields.shortName.toUpperCase() : c.shortName,
          };
          saveCreamToFirestore(updatedCream);
          return updatedCream;
        }
        return c;
      });
      saveLocal(STORAGE_KEYS.CREAMS, updated);
      return updated;
    });
  };

  const deleteCream = async (creamId) => {
    setCreams((prev) => {
      const updated = prev.filter((c) => c.id !== creamId);
      saveLocal(STORAGE_KEYS.CREAMS, updated);
      return updated;
    });
    await deleteCreamFromFirestore(creamId);
  };

  const toggleCreamActive = (creamId) => {
    setCreams((prev) => {
      const updated = prev.map((c) => {
        if (c.id === creamId) {
          const updatedCream = { ...c, active: !c.active };
          saveCreamToFirestore(updatedCream);
          return updatedCream;
        }
        return c;
      });
      saveLocal(STORAGE_KEYS.CREAMS, updated);
      return updated;
    });
  };

  // Funciones de Extras
  const addExtra = async (newExtra) => {
    const id = `ext_${Date.now()}`;
    const extraWithDefaults = {
      id,
      name: newExtra.name || 'Nuevo Extra',
      price: parseFloat(newExtra.price) || 0,
      compatibleCategories: normalizeExtraCategories(newExtra.compatibleCategories),
      active: true,
    };
    setExtras((prev) => {
      const updated = [...prev, extraWithDefaults];
      saveLocal(STORAGE_KEYS.EXTRAS, updated);
      return updated;
    });
    await saveExtraToFirestore(extraWithDefaults);
    return extraWithDefaults;
  };

  const updateExtra = async (extraId, updatedFields) => {
    setExtras((prev) => {
      const updated = prev.map((e) => {
        if (e.id === extraId) {
          const cleanFields = { ...updatedFields };
          if (cleanFields.compatibleCategories) {
            cleanFields.compatibleCategories = normalizeExtraCategories(cleanFields.compatibleCategories);
          }
          const updatedExtra = {
            ...e,
            ...cleanFields,
            price: typeof cleanFields.price !== 'undefined' ? parseFloat(cleanFields.price) : e.price,
          };
          saveExtraToFirestore(updatedExtra);
          return updatedExtra;
        }
        return e;
      });
      saveLocal(STORAGE_KEYS.EXTRAS, updated);
      return updated;
    });
  };

  const deleteExtra = async (extraId) => {
    setExtras((prev) => {
      const updated = prev.filter((e) => e.id !== extraId);
      saveLocal(STORAGE_KEYS.EXTRAS, updated);
      return updated;
    });
    await deleteExtraFromFirestore(extraId);
  };

  const toggleExtraActive = (extraId) => {
    setExtras((prev) => {
      const updated = prev.map((e) => {
        if (e.id === extraId) {
          const updatedExtra = { ...e, active: !e.active };
          saveExtraToFirestore(updatedExtra);
          return updatedExtra;
        }
        return e;
      });
      saveLocal(STORAGE_KEYS.EXTRAS, updated);
      return updated;
    });
  };

  // Funciones de Empaques / Packaging
  const addPackaging = async (newPkg) => {
    const id = `pkg_${Date.now()}`;
    const pkgWithDefaults = {
      id,
      name: newPkg.name || 'Nuevo Empaque',
      price: parseFloat(newPkg.price) || 0,
      applicableProductIds: newPkg.applicableProductIds || [],
      active: true,
    };
    setPackagings((prev) => {
      const updated = [...prev, pkgWithDefaults];
      saveLocal(STORAGE_KEYS.PACKAGINGS, updated);
      return updated;
    });
    await savePackagingToFirestore(pkgWithDefaults);

    // Sincronizar en productos
    if (pkgWithDefaults.applicableProductIds.length > 0) {
      setProducts((prev) => {
        const updated = prev.map((p) => {
          if (pkgWithDefaults.applicableProductIds.includes(p.id)) {
            const currentPkgs = p.availablePackagingIds || [];
            if (!currentPkgs.includes(id)) {
              const updatedP = { ...p, availablePackagingIds: [...currentPkgs, id] };
              saveProductToFirestore(updatedP);
              return updatedP;
            }
          }
          return p;
        });
        saveLocal(STORAGE_KEYS.PRODUCTS, updated);
        return updated;
      });
    }

    return pkgWithDefaults;
  };

  const updatePackaging = async (pkgId, updatedFields) => {
    setPackagings((prev) => {
      const updated = prev.map((p) => {
        if (p.id === pkgId) {
          const updatedPkg = {
            ...p,
            ...updatedFields,
            price: typeof updatedFields.price !== 'undefined' ? parseFloat(updatedFields.price) : p.price,
          };
          savePackagingToFirestore(updatedPkg);
          return updatedPkg;
        }
        return p;
      });
      saveLocal(STORAGE_KEYS.PACKAGINGS, updated);
      return updated;
    });

    if (updatedFields.applicableProductIds) {
      setProducts((prev) => {
        const updated = prev.map((prod) => {
          const isAssociated = updatedFields.applicableProductIds.includes(prod.id);
          const currentPkgs = prod.availablePackagingIds || [];
          if (isAssociated && !currentPkgs.includes(pkgId)) {
            const updatedP = { ...prod, availablePackagingIds: [...currentPkgs, pkgId] };
            saveProductToFirestore(updatedP);
            return updatedP;
          } else if (!isAssociated && currentPkgs.includes(pkgId)) {
            const updatedP = {
              ...prod,
              availablePackagingIds: currentPkgs.filter((id) => id !== pkgId),
            };
            saveProductToFirestore(updatedP);
            return updatedP;
          }
          return prod;
        });
        saveLocal(STORAGE_KEYS.PRODUCTS, updated);
        return updated;
      });
    }
  };

  const deletePackaging = async (pkgId) => {
    if (pkgId === 'pkg_ninguno') return;
    setPackagings((prev) => {
      const updated = prev.filter((p) => p.id !== pkgId);
      saveLocal(STORAGE_KEYS.PACKAGINGS, updated);
      return updated;
    });
    await deletePackagingFromFirestore(pkgId);

    setProducts((prev) => {
      const updated = prev.map((prod) => {
        const updatedP = {
          ...prod,
          availablePackagingIds: (prod.availablePackagingIds || []).filter((id) => id !== pkgId),
        };
        saveProductToFirestore(updatedP);
        return updatedP;
      });
      saveLocal(STORAGE_KEYS.PRODUCTS, updated);
      return updated;
    });
  };

  const togglePackagingActive = (pkgId) => {
    if (pkgId === 'pkg_ninguno') return;
    setPackagings((prev) => {
      const updated = prev.map((p) => {
        if (p.id === pkgId) {
          const updatedPkg = { ...p, active: !p.active };
          savePackagingToFirestore(updatedPkg);
          return updatedPkg;
        }
        return p;
      });
      saveLocal(STORAGE_KEYS.PACKAGINGS, updated);
      return updated;
    });
  };

  // Limpiar catálogo completamente
  const clearAllCatalog = async () => {
    setIsLoadingCatalog(true);
    saveLocal(STORAGE_KEYS.PRODUCTS, []);
    saveLocal(STORAGE_KEYS.CREAMS, []);
    saveLocal(STORAGE_KEYS.EXTRAS, []);
    saveLocal(STORAGE_KEYS.PACKAGINGS, []);
    setProducts([]);
    setCreams([]);
    setExtras([]);
    setPackagings([]);
    await clearAllDemoCatalogFromFirestore();
    setIsLoadingCatalog(false);
  };

  const value = {
    products,
    creams,
    categories,
    extras,
    packagings,
    isLoadingCatalog,
    firestoreError,
    isFirestoreConnected,
    syncLocalToFirestore,
    clearAllCatalog,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleProductActive,
    recordProductSales,
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
  };

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}
