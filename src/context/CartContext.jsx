import { useState, useMemo, useEffect } from 'react';
import { ORDER_MODALITIES } from '../types/constants';
import { CartContext } from './cart-context';
import { useCatalog } from './useCatalog';
import {
  subscribeToDeliveryConfig,
  saveDeliveryConfigToFirestore,
} from '../services/firestoreService';
import {
  isProductMarket,
  isProductBeverage,
  isProductDessert,
} from '../utils/productCategories';

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

    // Permitir edición si es comanda de mesa aún no pagada (antes del cierre de mesa),
    // o si es una comanda pendiente de otra modalidad
    const isUnpaidTable = (order.modality === 'MESA' || Boolean(order.tableId)) && order.paymentStatus !== 'PAID';
    if (order.status === 'ENTREGADO' && !isUnpaidTable) {
      return false;
    }

    setEditingOrder(order);
    setItems(
      order.items
        ? order.items.map((i) => ({
            ...i,
            consumptionType:
              i.consumptionType ||
              i.customization?.consumptionType ||
              (order.modality === 'PARA_LLEVAR' || order.modality === 'LLEVAR'
                ? 'PARA_LLEVAR'
                : order.modality === 'CONSUMO_EXTERNO'
                ? 'CONSUMO_EXTERNO'
                : order.modality === 'DELIVERY'
                ? 'DELIVERY'
                : 'MESA'),
          }))
        : []
    );
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

    const defaultConsumptionType =
      newModality === ORDER_MODALITIES.PARA_LLEVAR.id || newModality === 'PARA_LLEVAR' || newModality === 'LLEVAR'
        ? 'PARA_LLEVAR'
        : newModality === ORDER_MODALITIES.CONSUMO_EXTERNO.id || newModality === 'CONSUMO_EXTERNO'
        ? 'CONSUMO_EXTERNO'
        : newModality === ORDER_MODALITIES.DELIVERY.id || newModality === 'DELIVERY'
        ? 'DELIVERY'
        : 'MESA';

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

    // Actualizar dinámicamente el packaging y tipo de consumo de los ítems existentes en la comanda
    setItems((prevItems) => {
      return prevItems.map((item) => {
        const prod = products.find((p) => p.id === item.productId);

        // Si es producto de market (gaseosa, galleta, snack, etc.) no usa packaging de hamburguesa
        if (prod?.type === 'MARKET' || prod?.line === 'MARKET' || item.productId?.startsWith('mkt_')) {
          return {
            ...item,
            consumptionType: defaultConsumptionType,
            customization: {
              ...item.customization,
              consumptionType: defaultConsumptionType,
            },
          };
        }

        const updatedPackaging = isNowTakeoutOrDelivery
          ? (catalogPackagings || []).find(
              (pkg) =>
                pkg.active &&
                pkg.id !== 'pkg_ninguno' &&
                (prod?.availablePackagingIds?.includes(pkg.id) ||
                  pkg.applicableProductIds?.includes(item.productId) ||
                  item.availablePackagingIds?.includes(pkg.id))
            ) ||
            (catalogPackagings || []).find((pkg) => pkg.active && pkg.id !== 'pkg_ninguno') ||
            null
          : null;

        const extrasTotal = (item.customization?.selectedExtras || []).reduce(
          (sum, ext) => sum + ext.unitPrice * (ext.quantity || 1),
          0
        );
        const pkgPrice = updatedPackaging?.price || 0;
        const newUnitPrice = Math.round((item.basePrice + extrasTotal + pkgPrice) * 100) / 100;

        return {
          ...item,
          consumptionType: defaultConsumptionType,
          unitPrice: newUnitPrice,
          subtotal: Math.round(newUnitPrice * item.quantity * 100) / 100,
          customization: {
            ...item.customization,
            consumptionType: defaultConsumptionType,
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

    const defaultConsumption = customization?.consumptionType ||
      (isNowTakeoutOrDelivery
        ? (modality === 'DELIVERY' || modality === ORDER_MODALITIES.DELIVERY.id ? 'DELIVERY' : 'PARA_LLEVAR')
        : modality === ORDER_MODALITIES.CONSUMO_EXTERNO.id || modality === 'CONSUMO_EXTERNO'
        ? 'CONSUMO_EXTERNO'
        : 'MESA');

    let defaultPackaging = null;
    if (
      (defaultConsumption === 'PARA_LLEVAR' || defaultConsumption === 'DELIVERY') &&
      product.type !== 'MARKET' &&
      product.line !== 'MARKET'
    ) {
      defaultPackaging =
        (catalogPackagings || []).find(
          (pkg) =>
            pkg.active &&
            pkg.id !== 'pkg_ninguno' &&
            (product.availablePackagingIds?.includes(pkg.id) ||
              pkg.applicableProductIds?.includes(product.id))
        ) ||
        (catalogPackagings || []).find((pkg) => pkg.active && pkg.id !== 'pkg_ninguno') ||
        null;
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
      consumptionType: defaultConsumption,
    };

    if (!custom.consumptionType) {
      custom.consumptionType = defaultConsumption;
    }
    if (custom.consumptionType === 'PARA_LLEVAR' && !custom.packaging && defaultPackaging) {
      custom.packaging = defaultPackaging;
    }

    // Dos ítems son idénticos si comparten el mismo producto Y las mismas opciones (incluyendo destino)
    const isIdentical = (item) => {
      if (item.productId !== product.id) return false;
      const iCust = item.customization || {};

      const itemType = item.consumptionType || iCust.consumptionType || 'MESA';
      const newType = custom.consumptionType || defaultConsumption || 'MESA';
      const sameConsumption = itemType === newType;

      const sameTemp = (iCust.temperature || null) === (custom.temperature || null);
      const sameNotes = (iCust.itemNotes || '').trim().toLowerCase() === (custom.itemNotes || '').trim().toLowerCase();
      const samePkg = (iCust.packaging?.id || null) === (custom.packaging?.id || null);
      const sameCreams = (iCust.creamsSummary || '') === (custom.creamsSummary || '');
      const sameSalad = (iCust.saladSummary || '') === (custom.saladSummary || '');
      const sameExtras = JSON.stringify(iCust.selectedExtras || []) === JSON.stringify(custom.selectedExtras || []);
      const sameMods = JSON.stringify(iCust.selectedModifiers || []) === JSON.stringify(custom.selectedModifiers || []);

      return sameConsumption && sameTemp && sameNotes && samePkg && sameCreams && sameSalad && sameExtras && sameMods;
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
              subtotal: Math.round(item.unitPrice * newQty * 100) / 100,
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
      const unitPrice = Math.round((product.price + extrasTotal + packagingPrice) * 100) / 100;
      const itemId = `${product.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

      const isMarket = isProductMarket(product);
      const isBeverage = isProductBeverage(product);
      const isDessert = isProductDessert(product);

      // Los productos de market o bebidas directas nunca requieren preparación de cocina
      let itemRequiresKitchen = product.requiresKitchen;
      if (isMarket) {
        itemRequiresKitchen = false;
      } else if (itemRequiresKitchen === undefined) {
        itemRequiresKitchen = !isBeverage && !isDessert;
      }

      const newItem = {
        itemId,
        productId: product.id,
        name: product.name,
        basePrice: product.price,
        availablePackagingIds: product.availablePackagingIds || [],
        consumptionType: custom.consumptionType || defaultConsumption,
        unitPrice,
        quantity: 1,
        requiresKitchen: Boolean(itemRequiresKitchen),
        isMarket: Boolean(isMarket),
        image: product.image,
        thumbnailUrl: product.thumbnailUrl || product.image,
        customization: custom,
        subtotal: unitPrice,
      };

      return [...prev, newItem];
    });
  };

  /**
   * Cambiar el tipo de consumo de un ítem individual (Mesa, Ir comiendo, Llevar)
   * Si la cantidad es > 1, desdobla 1 unidad para permitir pedidos mixtos fácilmente
   * Si es Llevar, asigna automáticamente el táper correspondiente y recalcula totales
   */
  const updateItemConsumptionType = (itemId, newConsumptionType) => {
    if (!['MESA', 'CONSUMO_EXTERNO', 'PARA_LLEVAR'].includes(newConsumptionType)) return;

    setItems((prevItems) => {
      const targetIndex = prevItems.findIndex((it) => it.itemId === itemId);
      if (targetIndex === -1) return prevItems;

      const item = prevItems[targetIndex];
      const currentType =
        item.consumptionType ||
        item.customization?.consumptionType ||
        (modality === 'PARA_LLEVAR' ? 'PARA_LLEVAR' : modality === 'CONSUMO_EXTERNO' ? 'CONSUMO_EXTERNO' : 'MESA');

      if (currentType === newConsumptionType) return prevItems;

      const prod = products.find((p) => p.id === item.productId);
      const isMarketOrDirect = prod?.type === 'MARKET' || prod?.line === 'MARKET' || item.productId?.startsWith('mkt_');

      // Buscar táper si pasa a PARA_LLEVAR
      let targetPackaging = null;
      if (newConsumptionType === 'PARA_LLEVAR' && !isMarketOrDirect) {
        targetPackaging =
          (catalogPackagings || []).find(
            (pkg) =>
              pkg.active &&
              pkg.id !== 'pkg_ninguno' &&
              (prod?.availablePackagingIds?.includes(pkg.id) ||
                pkg.applicableProductIds?.includes(item.productId) ||
                item.availablePackagingIds?.includes(pkg.id))
          ) ||
          (catalogPackagings || []).find((pkg) => pkg.active && pkg.id !== 'pkg_ninguno') ||
          null;
      }

      const extrasTotal = (item.customization?.selectedExtras || []).reduce(
        (sum, ext) => sum + ext.unitPrice * (ext.quantity || 1),
        0
      );
      const pkgPrice = targetPackaging?.price || 0;
      const newUnitPrice = Math.round((item.basePrice + extrasTotal + pkgPrice) * 100) / 100;

      // Si la cantidad es 1, actualizar directamente el ítem
      if (item.quantity === 1) {
        const updatedItem = {
          ...item,
          consumptionType: newConsumptionType,
          unitPrice: newUnitPrice,
          subtotal: newUnitPrice,
          customization: {
            ...item.customization,
            consumptionType: newConsumptionType,
            packaging: targetPackaging,
          },
        };

        // Buscar si ya existe un ítem idéntico con la nueva modalidad para combinarlos
        const otherIndex = prevItems.findIndex(
          (it, idx) =>
            idx !== targetIndex &&
            it.productId === item.productId &&
            (it.consumptionType || it.customization?.consumptionType) === newConsumptionType &&
            (it.customization?.packaging?.id || null) === (targetPackaging?.id || null) &&
            (it.customization?.temperature || null) === (item.customization?.temperature || null) &&
            (it.customization?.creamsSummary || '') === (item.customization?.creamsSummary || '') &&
            (it.customization?.saladSummary || '') === (item.customization?.saladSummary || '') &&
            (it.customization?.itemNotes || '').trim().toLowerCase() === (item.customization?.itemNotes || '').trim().toLowerCase() &&
            JSON.stringify(it.customization?.selectedExtras || []) === JSON.stringify(item.customization?.selectedExtras || []) &&
            JSON.stringify(it.customization?.selectedModifiers || []) === JSON.stringify(item.customization?.selectedModifiers || [])
        );

        if (otherIndex !== -1) {
          return prevItems
            .map((it, idx) => {
              if (idx === otherIndex) {
                const combinedQty = it.quantity + 1;
                return {
                  ...it,
                  quantity: combinedQty,
                  subtotal: Math.round(it.unitPrice * combinedQty * 100) / 100,
                };
              }
              return it;
            })
            .filter((_, idx) => idx !== targetIndex);
        }

        return prevItems.map((it, idx) => (idx === targetIndex ? updatedItem : it));
      }

      // Si la cantidad es > 1: desdoblar 1 unidad con el nuevo tipo de consumo
      const remainingQty = item.quantity - 1;
      const updatedOriginal = {
        ...item,
        quantity: remainingQty,
        subtotal: Math.round(item.unitPrice * remainingQty * 100) / 100,
      };

      const newItemId = `${item.productId}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const splitItem = {
        ...item,
        itemId: newItemId,
        quantity: 1,
        consumptionType: newConsumptionType,
        unitPrice: newUnitPrice,
        subtotal: newUnitPrice,
        customization: {
          ...item.customization,
          consumptionType: newConsumptionType,
          packaging: targetPackaging,
        },
      };

      // Si ya existe un ítem en la comanda con esta modalidad e idénticas opciones, incrementarlo
      const existingMatchIndex = prevItems.findIndex(
        (it) =>
          it.productId === item.productId &&
          (it.consumptionType || it.customization?.consumptionType) === newConsumptionType &&
          (it.customization?.packaging?.id || null) === (targetPackaging?.id || null) &&
          (it.customization?.temperature || null) === (item.customization?.temperature || null) &&
          (it.customization?.creamsSummary || '') === (item.customization?.creamsSummary || '') &&
          (it.customization?.saladSummary || '') === (item.customization?.saladSummary || '') &&
          (it.customization?.itemNotes || '').trim().toLowerCase() === (item.customization?.itemNotes || '').trim().toLowerCase() &&
          JSON.stringify(it.customization?.selectedExtras || []) === JSON.stringify(item.customization?.selectedExtras || []) &&
          JSON.stringify(it.customization?.selectedModifiers || []) === JSON.stringify(item.customization?.selectedModifiers || [])
      );

      if (existingMatchIndex !== -1) {
        return prevItems.map((it, idx) => {
          if (idx === targetIndex) return updatedOriginal;
          if (idx === existingMatchIndex) {
            const newQty = it.quantity + 1;
            return {
              ...it,
              quantity: newQty,
              subtotal: Math.round(it.unitPrice * newQty * 100) / 100,
            };
          }
          return it;
        });
      }

      // Si no existe, insertar splitItem tras el ítem original
      const result = [...prevItems];
      result[targetIndex] = updatedOriginal;
      result.splice(targetIndex + 1, 0, splitItem);
      return result;
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
    setSelectedTable(null);
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
    const sum = items.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);
    return Math.round(sum * 100) / 100;
  }, [items]);

  const packagingsTotal = useMemo(() => {
    const sum = packagings.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
    return Math.round(sum * 100) / 100;
  }, [packagings]);

  const deliveryFee = useMemo(() => {
    if (modality !== 'DELIVERY' && modality !== ORDER_MODALITIES.DELIVERY.id) return 0;
    const feeNum = parseFloat(customer.deliveryFee);
    return isNaN(feeNum) ? 0 : Math.round(Math.max(0, feeNum) * 100) / 100;
  }, [modality, customer.deliveryFee]);

  const total = useMemo(() => {
    const disc = Math.max(0, Number(discount) || 0);
    const rawTotal = itemsSubtotal + packagingsTotal + deliveryFee - disc;
    return Math.round(Math.max(0, rawTotal) * 100) / 100;
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
    updateItemConsumptionType,
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
