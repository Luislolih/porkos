import { useState, useMemo } from 'react';
import { ORDER_MODALITIES } from '../types/constants';
import { CartContext } from './cart-context';

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [modality, setModality] = useState(ORDER_MODALITIES.MESA.id);
  const [selectedTable, setSelectedTable] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    reference: '',
    deliveryFee: 0,
  });
  const [packagings, setPackagings] = useState([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [discount, setDiscount] = useState(0);

  const addItem = (product, customization = null) => {
    // Si es un producto de MARKET o estándar sin extras/personalizaciones, incrementar cantidad directamente
    const isStandardItem =
      product.type === 'MARKET' ||
      (!customization?.selectedExtras?.length &&
        !customization?.packaging?.price &&
        !customization?.itemNotes);

    setItems((prev) => {
      if (isStandardItem) {
        const idx = prev.findIndex(
          (i) =>
            i.productId === product.id &&
            (!i.customization?.selectedExtras?.length &&
              !i.customization?.packaging?.price &&
              !i.customization?.itemNotes)
        );
        if (idx >= 0) {
          return prev.map((item, index) => {
            if (index === idx) {
              const newQty = item.quantity + 1;
              return {
                ...item,
                quantity: newQty,
                subtotal: item.unitPrice * newQty,
              };
            }
            return item;
          });
        }
      }

      const extrasTotal =
        customization?.selectedExtras?.reduce(
          (sum, ext) => sum + ext.unitPrice * (ext.quantity || 1),
          0
        ) || 0;
      const packagingPrice = customization?.packaging?.price || 0;
      const unitPrice = product.price + extrasTotal + packagingPrice;
      const itemId = `${product.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

      const newItem = {
        itemId,
        productId: product.id,
        name: product.name,
        basePrice: product.price,
        unitPrice,
        quantity: 1,
        requiresKitchen: product.type === 'MARKET' ? false : (product.requiresKitchen ?? true),
        image: product.image,
        customization: customization || {
          creamsSummary: 'SIN CREMAS',
          creamsDetail: { selected: [], removed: [], lowQuantity: [] },
          selectedModifiers: [],
          selectedExtras: [],
          packaging: null,
          removedIngredients: [],
          itemNotes: '',
        },
        subtotal: unitPrice,
      };

      return [...prev, newItem];
    });
  };

  const updateItemQuantity = (itemId, delta) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.itemId === itemId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              subtotal: item.unitPrice * newQty,
            };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const updateItemCustomization = (itemId, newCustomization) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.itemId === itemId) {
          const extrasTotal = newCustomization?.selectedExtras?.reduce(
            (sum, ext) => sum + (ext.unitPrice * (ext.quantity || 1)),
            0
          ) || 0;
          const packagingPrice = newCustomization?.packaging?.price || 0;
          const newUnitPrice = item.basePrice + extrasTotal + packagingPrice;
          return {
            ...item,
            unitPrice: newUnitPrice,
            customization: newCustomization,
            subtotal: newUnitPrice * item.quantity,
          };
        }
        return item;
      })
    );
  };

  const removeItem = (itemId) => {
    setItems((prev) => prev.filter((item) => item.itemId !== itemId));
  };

  const clearCart = () => {
    setItems([]);
    setPackagings([]);
    setGeneralNotes('');
    setCustomerName('');
    setDiscount(0);
  };

  const addPackaging = (pkg) => {
    setPackagings((prev) => {
      const existing = prev.find((p) => p.packagingId === pkg.id);
      if (existing) {
        return prev.map((p) =>
          p.packagingId === pkg.id
            ? { ...p, quantity: p.quantity + 1, total: (p.quantity + 1) * p.unitPrice }
            : p
        );
      }
      return [
        ...prev,
        {
          packagingId: pkg.id,
          name: pkg.name,
          quantity: 1,
          unitPrice: pkg.price,
          total: pkg.price,
        },
      ];
    });
  };

  const removePackaging = (packagingId) => {
    setPackagings((prev) => prev.filter((p) => p.packagingId !== packagingId));
  };

  const itemsSubtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  }, [items]);

  const packagingsTotal = useMemo(() => {
    return packagings.reduce((sum, p) => sum + p.total, 0);
  }, [packagings]);

  const deliveryFee = useMemo(() => {
    return modality === 'DELIVERY' ? Number(customer.deliveryFee) || 0 : 0;
  }, [modality, customer.deliveryFee]);

  const total = useMemo(() => {
    const rawTotal = itemsSubtotal + packagingsTotal + deliveryFee - discount;
    return Math.max(0, rawTotal);
  }, [itemsSubtotal, packagingsTotal, deliveryFee, discount]);

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const value = {
    items,
    setItems,
    modality,
    setModality,
    selectedTable,
    setSelectedTable,
    customerName,
    setCustomerName,
    customer,
    setCustomer,
    packagings,
    addPackaging,
    removePackaging,
    generalNotes,
    setGeneralNotes,
    discount,
    setDiscount,
    addItem,
    updateItemQuantity,
    updateItemCustomization,
    removeItem,
    clearCart,
    itemsSubtotal,
    packagingsTotal,
    deliveryFee,
    total,
    itemCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
