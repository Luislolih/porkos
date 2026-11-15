import { useState } from 'react';
import { CatalogContext } from './catalog-context';
import { DEFAULT_PRODUCTS, DEFAULT_CREAMS, DEFAULT_CATEGORIES } from '../types/defaultCatalog';

export function CatalogProvider({ children }) {
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [creams, setCreams] = useState(DEFAULT_CREAMS);
  const [categories] = useState(DEFAULT_CATEGORIES);

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
      modifiers: newProduct.modifiers || [],
      creamsConfig: newProduct.creamsConfig || {
        enabled: true,
        availableCreamIds: creams.map((c) => c.id),
        defaultCreamIds: [], // Sin cremas marcadas por defecto
        defaultMode: 'DEFAULT',
      },
      availableExtraIds: newProduct.availableExtraIds || [],
      temperatureConfig: newProduct.temperatureConfig || null,
      saladConfig: newProduct.saladConfig || null,
    };
    setProducts((prev) => [productWithDefaults, ...prev]);
    return productWithDefaults;
  };

  const updateProduct = (productId, updatedFields) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          return {
            ...p,
            ...updatedFields,
            price: typeof updatedFields.price !== 'undefined' ? parseFloat(updatedFields.price) : p.price,
            cost: typeof updatedFields.cost !== 'undefined' ? parseFloat(updatedFields.cost) : p.cost,
          };
        }
        return p;
      })
    );
  };

  const deleteProduct = (productId) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const toggleProductActive = (productId) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, active: !p.active } : p))
    );
  };

  // Registrar ventas para alimentar el ranking histórico de salida
  const recordProductSales = (soldItems = []) => {
    setProducts((prev) =>
      prev.map((p) => {
        const matchingItem = soldItems.find((item) => item.productId === p.id);
        if (matchingItem) {
          return {
            ...p,
            salesCount: (p.salesCount || 0) + (matchingItem.quantity || 1),
          };
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
    return creamWithDefaults;
  };

  const updateCream = (creamId, updatedFields) => {
    setCreams((prev) =>
      prev.map((c) => {
        if (c.id === creamId) {
          return {
            ...c,
            ...updatedFields,
            shortName: updatedFields.shortName ? updatedFields.shortName.toUpperCase() : c.shortName,
          };
        }
        return c;
      })
    );
  };

  const deleteCream = (creamId) => {
    setCreams((prev) => prev.filter((c) => c.id !== creamId));
  };

  const toggleCreamActive = (creamId) => {
    setCreams((prev) =>
      prev.map((c) => (c.id === creamId ? { ...c, active: !c.active } : c))
    );
  };

  const value = {
    products,
    creams,
    categories,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleProductActive,
    recordProductSales,
    addCream,
    updateCream,
    deleteCream,
    toggleCreamActive,
  };

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}
