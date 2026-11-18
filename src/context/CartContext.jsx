import { useState, useMemo, useEffect } from 'react';
import { ORDER_MODALITIES } from '../types/constants';
import { CartContext } from './cart-context';
import { useCatalog } from './useCatalog';
import {
  subscribeToDeliveryConfig,
  saveDeliveryConfigToFirestore,
} from '../services/firestoreService';

export function CartProvider({ children }) {
  const { products = [], packagings: catalogPackagings = [] } = useCatalog();

  const [items, setItems] = useState([]);
  const [modality, setModalityState] = useState(ORDER_MODALITIES.MESA.id);
  const [selectedTable, setSelectedTable] = useState(null);
  const [customerName, setCustomerName] = useState('');

  // Tarifa por defecto de delivery (almacenada en localStorage y Firestore)
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState(() => {
    try {
      const saved = localStorage.getItem('porkos_default_delivery_fee');
      return saved ? parseFloat(saved) : 5;
    } catch {
      return 5;
    }
  });

  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    reference: '',
    deliveryFee: defaultDeliveryFee,
  });

  const [packagings, setPackagings] = useState([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [discount, setDiscount] = useState(0);

  // Estado para edición de comanda activa existente
  const [editingOrder, setEditingOrder] = useState(null);

  const loadOrderForEditing = (order, availableTables = []) => {
    if (!order) return false;
    if (order.status === 'ENTREGADO') {
      return false;
    }

    setEditingOrder(order);
    setItems(order.items ? order.items.map((i) => ({ ...i })) : []);
    setModalityState(order.modality || ORDER_MODALITIES.MESA.id);

    if (order.tableId) {
      const match = availableTables.find((t) => t.id === order.tableId);
      setSelectedTable(match || { id: order.tableId, label: order.tableName || 'Mesa' });
    } else {
      setSelectedTable(null);
    }

    const clientName = order.customerName || order.customer?.name || '';
    setCustomerName(clientName);
    setCustomer(
      order.customer
        ? { ...order.customer, name: clientName }
        : {
            name: clientName,
            phone: '',
            address: '',
            reference: '',
            deliveryFee: order.deliveryFee || defaultDeliveryFee,
          }
    );
    setPackagings(order.packagings ? order.packagings.map((p) => ({ ...p })) : []);
    setGeneralNotes(order.generalNotes || '');
    setDiscount(order.discount || 0);

    return true;
  };

  const cancelEditingOrder = () => {
    setEditingOrder(null);
    clearCart();
  };

  // Sincronizar en tiempo real tarifa de delivery con Firestore
  useEffect(() => {
    const unsubscribe = subscribeToDeliveryConfig((data) => {
      if (data?.defaultFee !== undefined) {
        const fee = parseFloat(data.defaultFee) || 0;
        setDefaultDeliveryFee(fee);
        localStorage.setItem('porkos_default_delivery_fee', fee.toString());
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Función para guardar tarifa por defecto desde Configuración
  const updateDefaultDeliveryFee = async (newFee) => {
    const parsed = Math.max(0, parseFloat(newFee) || 0);
    setDefaultDeliveryFee(parsed);
    localStorage.setItem('porkos_default_delivery_fee', parsed.toString());
    await saveDeliveryConfigToFirestore({ defaultFee: parsed });
  };

  // Cambio de modalidad dinámico:
  // - Si cambia a LLEVAR o DELIVERY -> agrega por defecto el packaging asociado a los productos en la comanda
  // - Si cambia viceversa (MESA o IR COMIENDO) -> elimina el packaging de los productos en la comanda
  // - Si cambia a DELIVERY -> carga en automático la tarifa por defecto si no se ha ingresado una
  const setModality = (newModality) => {
    setModalityState(newModality);

    const isNowTakeoutOrDelivery =
      newModality === ORDER_MODALITIES.PARA_LLEVAR.id ||
      newModality === ORDER_MODALITIES.DELIVERY.id ||
      newModality === 'PARA_LLEVAR' ||
      newModality === 'DELIVERY' ||
      newModality === 'LLEVAR';

    // Carga de tarifa por defecto al seleccionar DELIVERY
    if (newModality === ORDER_MODALITIES.DELIVERY.id || newModality === 'DELIVERY') {
      setCustomer((prev) => {
        const currentFee = parseFloat(prev.deliveryFee);
        const feeToUse = !isNaN(currentFee) && currentFee > 0 ? currentFee : defaultDeliveryFee;
        return {
          ...prev,
          deliveryFee: feeToUse,
        };
      });
    }

    // Actualizar dinámicamente el packaging de los ítems existentes en la comanda
    setItems((prevItems) => {
      return prevItems.map((item) => {
        const prod = products.find((p) => p.id === item.productId);

        // Si es producto de market (gaseosa, galleta, snack, etc.) no usa packaging de hamburguesa
        if (prod?.type === 'MARKET' || prod?.line === 'MARKET' || item.productId?.startsWith('mkt_')) {
          return item;
        }

        const updatedPackaging = isNowTakeoutOrDelivery
          ? (catalogPackagings || []).find(
              (pkg) =>
                pkg.active &&
                pkg.id !== 'pkg_ninguno' &&
                (prod?.availablePackagingIds?.includes(pkg.id) ||
                  pkg.applicableProductIds?.includes(item.productId) ||
                  item.availablePackagingIds?.includes(pkg.id))
            ) || null
          : null;

        const extrasTotal = (item.customization?.selectedExtras || []).reduce(
          (sum, ext) => sum + ext.unitPrice * (ext.quantity || 1),
          0
        );
        const pkgPrice = updatedPackaging?.price || 0;
        const newUnitPrice = item.basePrice + extrasTotal + pkgPrice;

        return {
          ...item,
          unitPrice: newUnitPrice,
          subtotal: newUnitPrice * item.quantity,
          customization: {
            ...item.customization,
            packaging: updatedPackaging,
          },
        };
      });
    });
  };

  const addItem = (product, customization = null) => {
    const isNowTakeoutOrDelivery =
      modality === ORDER_MODALITIES.PARA_LLEVAR.id ||
      modality === ORDER_MODALITIES.DELIVERY.id ||
      modality === 'PARA_LLEVAR' ||
      modality === 'DELIVERY' ||
      modality === 'LLEVAR';

    let defaultPackaging = null;
    if (isNowTakeoutOrDelivery && product.type !== 'MARKET' && product.line !== 'MARKET') {
      defaultPackaging =
        (catalogPackagings || []).find(
          (pkg) =>
            pkg.active &&
            pkg.id !== 'pkg_ninguno' &&
            (product.availablePackagingIds?.includes(pkg.id) ||
              pkg.applicableProductIds?.includes(product.id))
        ) || null;
    }

    const custom = customization || {
      temperature: product.temperatureConfig?.enabled ? (product.temperatureConfig?.defaultOption || 'HELADA') : null,
      creamsSummary: '',
      creamsDetail: { selected: [], removed: [], lowQuantity: [] },
      selectedModifiers: [],
      selectedExtras: [],
      packaging: defaultPackaging,
      removedIngredients: [],
      itemNotes: '',
    };

    // Dos ítems son idénticos si comparten el mismo producto Y las mismas opciones
    const isIdentical = (item) => {
      if (item.productId !== product.id) return false;
      const iCust = item.customization || {};

      const sameTemp = (iCust.temperature || null) === (custom.temperature || null);
      const sameNotes = (iCust.itemNotes || '').trim().toLowerCase() === (custom.itemNotes || '').trim().toLowerCase();
      const samePkg = (iCust.packaging?.id || null) === (custom.packaging?.id || null);
      const sameCreams = (iCust.creamsSummary || '') === (custom.creamsSummary || '');
      const sameSalad = (iCust.saladSummary || '') === (custom.saladSummary || '');
      const sameExtras = JSON.stringify(iCust.selectedExtras || []) === JSON.stringify(custom.selectedExtras || []);
      const sameMods = JSON.stringify(iCust.selectedModifiers || []) === JSON.stringify(custom.selectedModifiers || []);

      return sameTemp && sameNotes && samePkg && sameCreams && sameSalad && sameExtras && sameMods;
    };

    setItems((prev) => {
      const idx = prev.findIndex(isIdentical);
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

      const extrasTotal =
        custom?.selectedExtras?.reduce(
          (sum, ext) => sum + ext.unitPrice * (ext.quantity || 1),
          0
        ) || 0;
      const packagingPrice = custom?.packaging?.price || 0;
      const unitPrice = product.price + extrasTotal + packagingPrice;
      const itemId = `${product.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

      const newItem = {
        itemId,
        productId: product.id,
        name: product.name,
        basePrice: product.price,
        availablePackagingIds: product.availablePackagingIds || [],
        unitPrice,
        quantity: 1,
        requiresKitchen: product.type === 'MARKET' ? false : (product.requiresKitchen ?? true),
        image: product.image,
        customization: custom,
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
    setCustomer({
      name: '',
      phone: '',
      address: '',
      reference: '',
      deliveryFee: defaultDeliveryFee,
    });
    setDiscount(0);
    setEditingOrder(null);
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
    if (modality !== 'DELIVERY' && modality !== ORDER_MODALITIES.DELIVERY.id) return 0;
    const feeNum = parseFloat(customer.deliveryFee);
    return isNaN(feeNum) ? 0 : Math.max(0, feeNum);
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
    defaultDeliveryFee,
    setDefaultDeliveryFee,
    updateDefaultDeliveryFee,
    total,
    itemCount,
    editingOrder,
    loadOrderForEditing,
    cancelEditingOrder,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
