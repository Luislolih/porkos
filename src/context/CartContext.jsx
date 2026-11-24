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
  doesProductSupportCreams,
} from '../utils/productCategories';

const CART_DRAFT_KEY = 'porkos_cart_draft';

const loadSavedCartDraft = () => {
  try {
    const raw = localStorage.getItem(CART_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (e) {
    console.warn('Error leyendo borrador de comanda desde localStorage:', e);
    return null;
  }
};

export function CartProvider({ children }) {
  const { products = [], packagings: catalogPackagings = [], categories = [] } = useCatalog();

  // Carga inicial del borrador persistido en LocalStorage (recuperación ante cierre accidental)
  const initialDraft = useMemo(() => loadSavedCartDraft(), []);

  // Tarifa por defecto de delivery (almacenada en localStorage y Firestore)
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState(() => {
    try {
      const saved = localStorage.getItem('porkos_default_delivery_fee');
      return saved ? parseFloat(saved) : 5;
    } catch {
      return 5;
    }
  });

  const [items, setItems] = useState(() => (Array.isArray(initialDraft?.items) ? initialDraft.items : []));
  const [modality, setModalityState] = useState(() => initialDraft?.modality || ORDER_MODALITIES.MESA.id);
  const [selectedTable, setSelectedTable] = useState(() => initialDraft?.selectedTable || null);
  const [customerName, setCustomerName] = useState(() => initialDraft?.customerName || '');

  const [customer, setCustomer] = useState(() => ({
    name: initialDraft?.customer?.name || initialDraft?.customerName || '',
    phone: initialDraft?.customer?.phone || '',
    address: initialDraft?.customer?.address || '',
    reference: initialDraft?.customer?.reference || '',
    deliveryFee: initialDraft?.customer?.deliveryFee !== undefined ? initialDraft.customer.deliveryFee : defaultDeliveryFee,
  }));

  const [packagings, setPackagings] = useState(() => (Array.isArray(initialDraft?.packagings) ? initialDraft.packagings : []));
  const [generalNotes, setGeneralNotes] = useState(() => initialDraft?.generalNotes || '');
  const [discount, setDiscount] = useState(() => (typeof initialDraft?.discount === 'number' ? initialDraft.discount : 0));

  // Estado para edición de comanda activa existente
  const [editingOrder, setEditingOrder] = useState(() => initialDraft?.editingOrder || null);

  // Autosave: sincronizar en tiempo real el borrador en LocalStorage ante cualquier cambio
  useEffect(() => {
    try {
      const hasContent =
        items.length > 0 ||
        Boolean(customerName?.trim()) ||
        Boolean(generalNotes?.trim()) ||
        Boolean(selectedTable) ||
        (packagings && packagings.length > 0) ||
        Boolean(editingOrder);

      if (hasContent) {
        const draft = {
          items,
          modality,
          selectedTable,
          customerName,
          customer,
          packagings,
          generalNotes,
          discount,
          editingOrder,
          updatedAt: Date.now(),
        };
        localStorage.setItem(CART_DRAFT_KEY, JSON.stringify(draft));
      } else {
        localStorage.removeItem(CART_DRAFT_KEY);
      }
    } catch (err) {
      console.warn('Error guardando borrador de comanda en localStorage:', err);
    }
  }, [items, modality, selectedTable, customerName, customer, packagings, generalNotes, discount, editingOrder]);

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

        // Si el precio fue modificado manualmente, respetamos el precio unitario ingresado por el usuario
        if (item.isManualPrice) {
          return {
            ...item,
            consumptionType: defaultConsumptionType,
            subtotal: Math.round(item.unitPrice * item.quantity * 100) / 100,
            customization: {
              ...item.customization,
              consumptionType: defaultConsumptionType,
              packaging: updatedPackaging,
            },
          };
        }

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

    // Si el producto no cuenta con cremas seleccionadas en su configuración, asegurar que no lleve cremasSummary
    const supportsCreams = doesProductSupportCreams(product, categories);
    if (!supportsCreams) {
      custom.creamsSummary = '';
      if (custom.creamsDetail) {
        custom.creamsDetail = { selected: [], mode: 'NONE' };
      }
    }

    const extrasTotal =
      custom?.selectedExtras?.reduce(
        (sum, ext) => sum + ext.unitPrice * (ext.quantity || 1),
        0
      ) || 0;
    const packagingPrice = custom?.packaging?.price || 0;
    let unitPrice = Math.round((product.price + extrasTotal + packagingPrice) * 100) / 100;
    let isManualPrice = false;

    if (custom?.isManualPrice && custom?.manualPrice !== null && !isNaN(custom?.manualPrice)) {
      unitPrice = Math.round(parseFloat(custom.manualPrice) * 100) / 100;
      isManualPrice = true;
    }

    const itemId = `${product.id}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

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
      isManualPrice,
      quantity: 1,
      requiresKitchen: Boolean(itemRequiresKitchen),
      isMarket: Boolean(isMarket),
      image: product.image,
      thumbnailUrl: product.thumbnailUrl || product.image,
      customization: custom,
      subtotal: unitPrice,
      creamsConfig: product.creamsConfig || null,
      categoryId: product.categoryId || null,
      line: product.line || null,
    };

    // Cada toque en el catálogo añade un ítem individual con cantidad 1 para permitir
    // personalización independiente por comensal (cremas, extras, notas, destino)
    setItems((prev) => [...prev, newItem]);
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
      const newUnitPrice = item.isManualPrice
        ? item.unitPrice
        : Math.round((item.basePrice + extrasTotal + pkgPrice) * 100) / 100;

      // Si la cantidad es 1, actualizar directamente el ítem sin auto-agrupar para preservar personalización individual
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

        return prevItems.map((it, idx) => (idx === targetIndex ? updatedItem : it));
      }

      // Si la cantidad es > 1: desdoblar 1 unidad con el nuevo tipo de consumo
      const remainingQty = item.quantity - 1;
      const updatedOriginal = {
        ...item,
        quantity: remainingQty,
        subtotal: Math.round(item.unitPrice * remainingQty * 100) / 100,
      };

      const newItemId = `${item.productId}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
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

      // Insertar splitItem tras el ítem original manteniendo ítems independientes
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
              subtotal: Math.round(item.unitPrice * newQty * 100) / 100,
            };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const setItemQuantity = (itemId, quantity) => {
    const parsed = parseInt(quantity, 10);
    if (isNaN(parsed) || parsed < 0) return;
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.itemId === itemId) {
            if (parsed === 0) return null;
            return {
              ...item,
              quantity: parsed,
              subtotal: Math.round(item.unitPrice * parsed * 100) / 100,
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
          const prod = products.find((p) => p.id === item.productId) || item;
          const supportsCreams = doesProductSupportCreams(prod, categories);
          const cleanCustomization = { ...newCustomization };
          if (!supportsCreams) {
            cleanCustomization.creamsSummary = '';
            if (cleanCustomization.creamsDetail) {
              cleanCustomization.creamsDetail = { selected: [], mode: 'NONE' };
            }
          }

          const extrasTotal = cleanCustomization?.selectedExtras?.reduce(
            (sum, ext) => sum + (ext.unitPrice * (ext.quantity || 1)),
            0
          ) || 0;
          const packagingPrice = cleanCustomization?.packaging?.price || 0;
          let newUnitPrice = item.basePrice + extrasTotal + packagingPrice;
          let isManual = false;

          if (
            cleanCustomization?.manualPrice !== undefined &&
            cleanCustomization?.manualPrice !== null &&
            !isNaN(parseFloat(cleanCustomization?.manualPrice))
          ) {
            newUnitPrice = parseFloat(cleanCustomization.manualPrice);
            isManual = true;
          } else if (item.isManualPrice && (cleanCustomization?.manualPrice === undefined || cleanCustomization?.manualPrice === null)) {
            newUnitPrice = item.unitPrice;
            isManual = true;
          }

          const roundedUnitPrice = Math.round(newUnitPrice * 100) / 100;
          return {
            ...item,
            unitPrice: roundedUnitPrice,
            isManualPrice: isManual,
            customization: cleanCustomization,
            subtotal: Math.round(roundedUnitPrice * item.quantity * 100) / 100,
          };
        }
        return item;
      })
    );
  };

  /**
   * Modificar manualmente el precio unitario de un ítem en la comanda
   */
  const updateItemUnitPrice = (itemId, newUnitPrice) => {
    const parsed = parseFloat(newUnitPrice);
    if (isNaN(parsed) || parsed < 0) return;
    const rounded = Math.round(parsed * 100) / 100;
    setItems((prev) =>
      prev.map((item) => {
        if (item.itemId === itemId) {
          return {
            ...item,
            unitPrice: rounded,
            isManualPrice: true,
            subtotal: Math.round(rounded * item.quantity * 100) / 100,
          };
        }
        return item;
      })
    );
  };

  /**
   * Restablecer el precio unitario al cálculo automático base + extras + táper
   */
  const resetItemUnitPrice = (itemId) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.itemId === itemId) {
          const extrasTotal = item.customization?.selectedExtras?.reduce(
            (sum, ext) => sum + (ext.unitPrice * (ext.quantity || 1)),
            0
          ) || 0;
          const packagingPrice = item.customization?.packaging?.price || 0;
          const calcUnitPrice = Math.round((item.basePrice + extrasTotal + packagingPrice) * 100) / 100;
          return {
            ...item,
            unitPrice: calcUnitPrice,
            isManualPrice: false,
            subtotal: Math.round(calcUnitPrice * item.quantity * 100) / 100,
          };
        }
        return item;
      })
    );
  };

  /**
   * Agregar un menú o plato fuera de carta (personalizado)
   */
  const addCustomItem = ({
    name,
    price = 0,
    quantity = 1,
    notes = '',
    requiresKitchen = true,
    consumptionType = null,
    packaging = null,
  }) => {
    const isNowTakeoutOrDelivery =
      modality === ORDER_MODALITIES.PARA_LLEVAR.id ||
      modality === ORDER_MODALITIES.DELIVERY.id ||
      modality === 'PARA_LLEVAR' ||
      modality === 'DELIVERY' ||
      modality === 'LLEVAR';

    const defaultConsumption =
      consumptionType ||
      (isNowTakeoutOrDelivery
        ? modality === 'DELIVERY' || modality === ORDER_MODALITIES.DELIVERY.id
          ? 'DELIVERY'
          : 'PARA_LLEVAR'
        : modality === ORDER_MODALITIES.CONSUMO_EXTERNO.id || modality === 'CONSUMO_EXTERNO'
        ? 'CONSUMO_EXTERNO'
        : 'MESA');

    const cleanName = (name || '').trim() || 'Menú fuera de carta';
    const parsedPrice = Math.max(0, parseFloat(price) || 0);
    const unitPrice = Math.round(parsedPrice * 100) / 100;
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const itemId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const newItem = {
      itemId,
      productId: `custom_${Date.now()}`,
      name: cleanName,
      basePrice: unitPrice,
      unitPrice,
      isManualPrice: true,
      quantity: qty,
      requiresKitchen: Boolean(requiresKitchen),
      isMarket: false,
      isCustomMenuItem: true,
      image: null,
      thumbnailUrl: null,
      consumptionType: defaultConsumption,
      availablePackagingIds: [],
      customization: {
        consumptionType: defaultConsumption,
        itemNotes: (notes || '').trim(),
        packaging: packaging || null,
        creamsSummary: '',
        creamsDetail: { selected: [], removed: [], lowQuantity: [] },
        selectedModifiers: [],
        selectedExtras: [],
        isManualPrice: true,
        manualPrice: unitPrice,
      },
      subtotal: Math.round(unitPrice * qty * 100) / 100,
    };

    setItems((prev) => [...prev, newItem]);
    return newItem;
  };

  /**
   * Actualizar un menú o plato fuera de carta existente
   */
  const updateCustomItem = (
    itemId,
    { name, price, quantity, notes, requiresKitchen, consumptionType, packaging }
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.itemId !== itemId) return item;
        const cleanName =
          name !== undefined ? (name || '').trim() || item.name : item.name;
        const parsedPrice =
          price !== undefined ? Math.max(0, parseFloat(price) || 0) : item.unitPrice;
        const unitPrice = Math.round(parsedPrice * 100) / 100;
        const qty =
          quantity !== undefined ? Math.max(1, parseInt(quantity, 10) || 1) : item.quantity;
        const reqKitchen =
          requiresKitchen !== undefined ? Boolean(requiresKitchen) : item.requiresKitchen;
        const cType =
          consumptionType !== undefined ? consumptionType : item.consumptionType;
        const itemNotes =
          notes !== undefined ? (notes || '').trim() : item.customization?.itemNotes || '';
        const pkg =
          packaging !== undefined ? packaging : item.customization?.packaging || null;

        return {
          ...item,
          name: cleanName,
          basePrice: unitPrice,
          unitPrice,
          isManualPrice: true,
          quantity: qty,
          requiresKitchen: reqKitchen,
          consumptionType: cType,
          customization: {
            ...item.customization,
            consumptionType: cType,
            itemNotes,
            packaging: pkg,
            manualPrice: unitPrice,
            isManualPrice: true,
          },
          subtotal: Math.round(unitPrice * qty * 100) / 100,
        };
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
    try {
      localStorage.removeItem(CART_DRAFT_KEY);
    } catch {
      // ignore
    }
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
    addCustomItem,
    updateCustomItem,
    updateItemQuantity,
    setItemQuantity,
    updateItemCustomization,
    updateItemConsumptionType,
    updateItemUnitPrice,
    resetItemUnitPrice,
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
