import { useState, useEffect } from 'react';
import { CatalogContext } from './catalog-context';
import {
  DEFAULT_PRODUCTS,
  DEFAULT_CREAMS,
  DEFAULT_CATEGORIES,
  DEFAULT_EXTRAS,
  DEFAULT_PACKAGINGS,
} from '../types/defaultCatalog';
import {
  subscribeToProducts,
  saveProductToFirestore,
  deleteProductFromFirestore,
  seedProductsIfEmpty,
  subscribeToCreams,
  saveCreamToFirestore,
  deleteCreamFromFirestore,
  seedCreamsIfEmpty,
  subscribeToExtras,
  saveExtraToFirestore,
  deleteExtraFromFirestore,
  seedExtrasIfEmpty,
  subscribeToPackagings,
  savePackagingToFirestore,
  deletePackagingFromFirestore,
  seedPackagingsIfEmpty,
} from '../services/firestoreService';

export function CatalogProvider({ children }) {
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [creams, setCreams] = useState(DEFAULT_CREAMS);
  const [categories] = useState(DEFAULT_CATEGORIES);
  const [extras, setExtras] = useState(DEFAULT_EXTRAS);
  const [packagings, setPackagings] = useState(DEFAULT_PACKAGINGS);

  // Inicializar y sincronizar con Firestore en tiempo real
  useEffect(() => {
    // 1. Sembrar colecciones si están vacías
    seedProductsIfEmpty(DEFAULT_PRODUCTS);
    seedCreamsIfEmpty(DEFAULT_CREAMS);
    seedExtrasIfEmpty(DEFAULT_EXTRAS);
    seedPackagingsIfEmpty(DEFAULT_PACKAGINGS);

    // 2. Suscribirse a cambios en Firestore
    const unsubProducts = subscribeToProducts((remoteProducts) => {
      if (remoteProducts && remoteProducts.length > 0) {
        setProducts(remoteProducts);
      }
    });

    const unsubCreams = subscribeToCreams((remoteCreams) => {
      if (remoteCreams && remoteCreams.length > 0) {
        setCreams(remoteCreams);
      }
    });

    const unsubExtras = subscribeToExtras((remoteExtras) => {
      if (remoteExtras && remoteExtras.length > 0) {
        setExtras(remoteExtras);
      }
    });

    const unsubPackagings = subscribeToPackagings((remotePackagings) => {
      if (remotePackagings && remotePackagings.length > 0) {
        setPackagings(remotePackagings);
      }
    });

    return () => {
      unsubProducts();
      unsubCreams();
      unsubExtras();
      unsubPackagings();
    };
  }, []);

  // Funciones de Productos
  const addProduct = (newProduct) => {
    const id = `prod_${Date.now()}`;
    const productWithDefaults = {
      id,
      name: newProduct.name || 'Nuevo Producto',
      line: newProduct.line || 'CLASICO',
      subcategory: newProduct.subcategory || 'hamburguesas',
      salesCount: 0,
      description: newProduct.description || '',
      categoryId: newProduct.categoryId || 'cat_burgers',
      type: newProduct.type || 'RESTAURANTE',
      price: parseFloat(newProduct.price) || 0,
      cost: parseFloat(newProduct.cost) || 0,
      image: newProduct.image || '',
      requiresKitchen: newProduct.requiresKitchen ?? true,
      active: true,
      defaultPackagingId: newProduct.defaultPackagingId || 'pkg_taper_med',
      availablePackagingIds: newProduct.availablePackagingIds || [],
      modifiers: newProduct.modifiers || [],
      creamsConfig: newProduct.creamsConfig || {
        enabled: true,
        availableCreamIds: creams.map((c) => c.id),
        defaultCreamIds: [],
        defaultMode: 'DEFAULT',
      },
      availableExtraIds: newProduct.availableExtraIds || [],
      temperatureConfig: newProduct.temperatureConfig || null,
      saladConfig: newProduct.saladConfig || null,
    };

    setProducts((prev) => [productWithDefaults, ...prev]);
    saveProductToFirestore(productWithDefaults);

    // Si tiene empaques asociados, sincronizar en packagings
    if (productWithDefaults.availablePackagingIds.length > 0) {
      setPackagings((prev) =>
        prev.map((pkg) => {
          if (productWithDefaults.availablePackagingIds.includes(pkg.id)) {
            const currentProds = pkg.applicableProductIds || [];
            if (!currentProds.includes(id)) {
              const updatedPkg = { ...pkg, applicableProductIds: [...currentProds, id] };
              savePackagingToFirestore(updatedPkg);
              return updatedPkg;
            }
          }
          return pkg;
        })
      );
    }

    return productWithDefaults;
  };

  const updateProduct = (productId, updatedFields) => {
    let updatedProdObj = null;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          updatedProdObj = {
            ...p,
            ...updatedFields,
            price: typeof updatedFields.price !== 'undefined' ? parseFloat(updatedFields.price) : p.price,
            cost: typeof updatedFields.cost !== 'undefined' ? parseFloat(updatedFields.cost) : p.cost,
          };
          return updatedProdObj;
        }
        return p;
      })
    );

    if (updatedProdObj) {
      saveProductToFirestore(updatedProdObj);
    }

    // Sincronizar empaques si se actualizaron los availablePackagingIds
    if (updatedFields.availablePackagingIds) {
      setPackagings((prev) =>
        prev.map((pkg) => {
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
        })
      );
    }
  };

  const deleteProduct = (productId) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    deleteProductFromFirestore(productId);

    // Limpiar asociación en packagings
    setPackagings((prev) =>
      prev.map((pkg) => {
        const updated = {
          ...pkg,
          applicableProductIds: (pkg.applicableProductIds || []).filter((id) => id !== productId),
        };
        savePackagingToFirestore(updated);
        return updated;
      })
    );
  };

  const toggleProductActive = (productId) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const updated = { ...p, active: !p.active };
          saveProductToFirestore(updated);
          return updated;
        }
        return p;
      })
    );
  };

  // Registrar ventas para alimentar el ranking histórico de salida
  const recordProductSales = (soldItems = []) => {
    setProducts((prev) =>
      prev.map((p) => {
        const matchingItem = soldItems.find((item) => item.productId === p.id);
        if (matchingItem) {
          const updated = {
            ...p,
            salesCount: (p.salesCount || 0) + (matchingItem.quantity || 1),
          };
          saveProductToFirestore(updated);
          return updated;
        }
        return p;
      })
    );
  };

  // Funciones de Cremas con diminutivo
  const addCream = (newCream) => {
    const id = `cream_${Date.now()}`;
    const creamWithDefaults = {
      id,
      name: newCream.name || 'Nueva Crema',
      shortName: (newCream.shortName || newCream.name?.slice(0, 4) || 'CRM').toUpperCase(),
      color: newCream.color || '#FBBF24',
      order: creams.length + 1,
      active: true,
    };
    setCreams((prev) => [...prev, creamWithDefaults]);
    saveCreamToFirestore(creamWithDefaults);
    return creamWithDefaults;
  };

  const updateCream = (creamId, updatedFields) => {
    setCreams((prev) =>
      prev.map((c) => {
        if (c.id === creamId) {
          const updated = {
            ...c,
            ...updatedFields,
            shortName: updatedFields.shortName ? updatedFields.shortName.toUpperCase() : c.shortName,
          };
          saveCreamToFirestore(updated);
          return updated;
        }
        return c;
      })
    );
  };

  const deleteCream = (creamId) => {
    setCreams((prev) => prev.filter((c) => c.id !== creamId));
    deleteCreamFromFirestore(creamId);
  };

  const toggleCreamActive = (creamId) => {
    setCreams((prev) =>
      prev.map((c) => {
        if (c.id === creamId) {
          const updated = { ...c, active: !c.active };
          saveCreamToFirestore(updated);
          return updated;
        }
        return c;
      })
    );
  };

  // Funciones de Extras
  const addExtra = (newExtra) => {
    const id = `ext_${Date.now()}`;
    const extraWithDefaults = {
      id,
      name: newExtra.name || 'Nuevo Extra',
      price: parseFloat(newExtra.price) || 0,
      compatibleCategories: newExtra.compatibleCategories || ['cat_burgers', 'cat_salchipapas', 'cat_choripanes'],
      active: true,
    };
    setExtras((prev) => [...prev, extraWithDefaults]);
    saveExtraToFirestore(extraWithDefaults);
    return extraWithDefaults;
  };

  const updateExtra = (extraId, updatedFields) => {
    setExtras((prev) =>
      prev.map((e) => {
        if (e.id === extraId) {
          const updated = {
            ...e,
            ...updatedFields,
            price: typeof updatedFields.price !== 'undefined' ? parseFloat(updatedFields.price) : e.price,
          };
          saveExtraToFirestore(updated);
          return updated;
        }
        return e;
      })
    );
  };

  const deleteExtra = (extraId) => {
    setExtras((prev) => prev.filter((e) => e.id !== extraId));
    deleteExtraFromFirestore(extraId);
  };

  const toggleExtraActive = (extraId) => {
    setExtras((prev) =>
      prev.map((e) => {
        if (e.id === extraId) {
          const updated = { ...e, active: !e.active };
          saveExtraToFirestore(updated);
          return updated;
        }
        return e;
      })
    );
  };

  // Funciones de Empaques / Packaging
  const addPackaging = (newPkg) => {
    const id = `pkg_${Date.now()}`;
    const pkgWithDefaults = {
      id,
      name: newPkg.name || 'Nuevo Empaque',
      price: parseFloat(newPkg.price) || 0,
      applicableProductIds: newPkg.applicableProductIds || [],
      active: true,
    };
    setPackagings((prev) => [...prev, pkgWithDefaults]);
    savePackagingToFirestore(pkgWithDefaults);

    // Sincronizar en los productos seleccionados
    if (pkgWithDefaults.applicableProductIds.length > 0) {
      setProducts((prev) =>
        prev.map((p) => {
          if (pkgWithDefaults.applicableProductIds.includes(p.id)) {
            const currentPkgs = p.availablePackagingIds || [];
            if (!currentPkgs.includes(id)) {
              const updatedP = { ...p, availablePackagingIds: [...currentPkgs, id] };
              saveProductToFirestore(updatedP);
              return updatedP;
            }
          }
          return p;
        })
      );
    }

    return pkgWithDefaults;
  };

  const updatePackaging = (pkgId, updatedFields) => {
    setPackagings((prev) =>
      prev.map((p) => {
        if (p.id === pkgId) {
          const updated = {
            ...p,
            ...updatedFields,
            price: typeof updatedFields.price !== 'undefined' ? parseFloat(updatedFields.price) : p.price,
          };
          savePackagingToFirestore(updated);
          return updated;
        }
        return p;
      })
    );

    // Sincronizar en los productos si se cambiaron los applicableProductIds
    if (updatedFields.applicableProductIds) {
      setProducts((prev) =>
        prev.map((prod) => {
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
        })
      );
    }
  };

  const deletePackaging = (pkgId) => {
    if (pkgId === 'pkg_ninguno') return;
    setPackagings((prev) => prev.filter((p) => p.id !== pkgId));
    deletePackagingFromFirestore(pkgId);

    // Limpiar en productos
    setProducts((prev) =>
      prev.map((prod) => {
        const updatedP = {
          ...prod,
          availablePackagingIds: (prod.availablePackagingIds || []).filter((id) => id !== pkgId),
        };
        saveProductToFirestore(updatedP);
        return updatedP;
      })
    );
  };

  const togglePackagingActive = (pkgId) => {
    if (pkgId === 'pkg_ninguno') return;
    setPackagings((prev) =>
      prev.map((p) => {
        if (p.id === pkgId) {
          const updated = { ...p, active: !p.active };
          savePackagingToFirestore(updated);
          return updated;
        }
        return p;
      })
    );
  };

  const value = {
    products,
    creams,
    categories,
    extras,
    packagings,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleProductActive,
    recordProductSales,
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
