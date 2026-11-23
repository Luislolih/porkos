import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { SALES_MODES, ORDER_MODALITIES } from '../../types/constants';
import { useCart } from '../../context/useCart';
import { useCatalog } from '../../context/useCatalog';
import SalesHeader from './components/SalesHeader';
import CategoryTabs from './components/CategoryTabs';
import ProductCard from './components/ProductCard';
import ProductThumbnail from '../../components/ui/ProductThumbnail';
import QuickCustomizerModal from './components/QuickCustomizerModal';
import CustomMenuItemModal from './components/CustomMenuItemModal';
import CartView from './components/CartView';
import MobileCartDrawer from './components/MobileCartDrawer';
import QuickPaymentModal from './components/QuickPaymentModal';
import ScrollToTopButton from '../../components/ui/ScrollToTopButton';
import { formatCurrency } from '../../utils/formatters';
import { getNextOrderNumber } from '../../utils/orderNumber';
import { isProductBeverage, isProductMarket, isProductFood, isProductDessert, isProductSnack } from '../../utils/productCategories';
import { sanitizeText, sanitizeNotes } from '../../utils/security';
import { forceUnlockScroll } from '../../utils/scrollLock';
import { useAuth } from '../../context/useAuth';
import Toast from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import { UtensilsCrossed, Edit3, Plus, ArrowUpDown, Check, Loader2 } from 'lucide-react';

export default function SalesView({
  onOrderCreated,
  tables = [],
  orders = [],
  onSettleTableOrder,
  onOrderUpdated,
  onReturnToOrders,
}) {
  const { user } = useAuth();
  const isAdminOrOwner = user?.role === 'ADMIN' || user?.role === 'OWNER';
  const {
    items,
    addItem,
    addCustomItem,
    updateCustomItem,
    updateItemCustomization,
    total,
    itemCount,
    modality,
    selectedTable,
    customerName,
    customer,
    packagings,
    generalNotes,
    itemsSubtotal,
    packagingsTotal,
    deliveryFee,
    discount,
    clearCart,
    editingOrder,
    cancelEditingOrder,
  } = useCart();

  const [salesMode, setSalesMode] = useState(SALES_MODES.RESTAURANT);
  const [selectedLine, setSelectedLine] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [editingCartItem, setEditingCartItem] = useState(null);
  const [isCustomMenuOpen, setIsCustomMenuOpen] = useState(false);
  const [editingCustomItem, setEditingCustomItem] = useState(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(() => Boolean(editingOrder));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para modo de reordenar carta (solo Admin y Owner, exclusivo de Toda la Carta)
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [reorderProducts, setReorderProducts] = useState([]);
  const [hasReorderChanges, setHasReorderChanges] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const previousCategoryBeforeReorderRef = useRef(null);
  const initialReorderProductsRef = useRef(null);

  // Estados y referencias para arrastrar y desplazar fluidamente en vivo
  const [activeDragItem, setActiveDragItem] = useState(null);
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });
  const [grabOffset, setGrabOffset] = useState({ x: 0, y: 0 });
  const [cardDimensions, setCardDimensions] = useState({ width: 0, height: 0 });

  const isDraggingActiveRef = useRef(false);
  const dragStartInfoRef = useRef(null);
  const currentSlotIndexRef = useRef(null);

  const lastEditingOrderIdRef = useRef(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      forceUnlockScroll();
    };
  }, []);

  // Failsafe: cuando no hay ningún modal ni drawer abierto en Ventas, asegurar que el body scroll esté libre
  useEffect(() => {
    if (!isMobileCartOpen && !customizingProduct && !isCustomMenuOpen && !isPaymentOpen) {
      forceUnlockScroll();
    }
  }, [isMobileCartOpen, customizingProduct, isCustomMenuOpen, isPaymentOpen]);

  // Al entrar a editar una comanda (desde Mesas o Pedidos), abrir automáticamente la comanda desplegada
  useEffect(() => {
    if (editingOrder) {
      const orderKey = editingOrder.orderNumber || editingOrder.id || 'editing';
      if (lastEditingOrderIdRef.current !== orderKey) {
        lastEditingOrderIdRef.current = orderKey;
        setIsMobileCartOpen(true);
      }
    } else {
      lastEditingOrderIdRef.current = null;
    }
  }, [editingOrder]);

  const [successToast, setSuccessToast] = useState(null);

  const showToast = useCallback((message, duration = 1200) => {
    setSuccessToast(message);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setSuccessToast(null);
    }, duration);
  }, []);

  // Modo reordenar solo activo efectivamente si el usuario es Admin u Owner
  const isReorderActive = Boolean(isReorderMode && isAdminOrOwner);

  const {
    products,
    categories = [],
    packagings: catalogPackagings,
    recordProductSales,
    categoryOrderMap = {},
    saveCategoryOrder,
    resetCategoryOrder,
  } = useCatalog();

  // Filtrar productos por Categorías principales: TODAS, CLÁSICO, ARTESANAL, MARKET y Búsqueda
  // Ordenados según la carta física configurada manualmente, o por mayor salida (salesCount)
  const filteredAndSortedProducts = useMemo(() => {
    const list = products.filter((prod) => {
      // 1. En modo MARKET (Caja Rápida): mostrar productos de Market filtrados por sus categorías
      if (salesMode === SALES_MODES.MARKET) {
        if (!isProductMarket(prod, categories)) return false;

        if (selectedLine === 'MARKET_BEBIDAS') {
          return isProductBeverage(prod);
        }
        if (selectedLine === 'MARKET_SNACKS') {
          return isProductSnack(prod);
        }
        if (selectedLine === 'MARKET_POSTRES') {
          return isProductDessert(prod, categories);
        }
        return true; // MARKET_ALL
      } else {
        // 2. En modo RESTAURANTE: filtrar por categoría (TODO, COMIDA, BEBIDAS, POSTRES, MARKET)
        if (selectedLine === 'COMIDA') {
          // Comida: Todo producto gastronómico que NO sea bebida, no sea postre y no sea de Market
          if (!isProductFood(prod, categories) || isProductMarket(prod, categories) || isProductDessert(prod, categories) || isProductBeverage(prod)) return false;
        } else if (selectedLine === 'BEBIDAS') {
          // Bebidas: TODAS las bebidas (tanto de restaurante como de market: gaseosas, cervezas, aguas, jugos)
          if (!isProductBeverage(prod)) return false;
        } else if (selectedLine === 'POSTRES') {
          // Postres: TODOS los postres (tanto de restaurante como postres de market: helados, chocotejas, tortas)
          if (!isProductDessert(prod, categories)) return false;
        } else if (selectedLine === 'MARKET') {
          // Market: Todo producto registrado en Market (bebidas, snacks, postres de market)
          if (!isProductMarket(prod, categories)) return false;
        }
      }

      // 2. Búsqueda por texto
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          prod.name.toLowerCase().includes(query) ||
          prod.description?.toLowerCase().includes(query)
        );
      }

      return true;
    });

    // Ordenamiento: solo se organiza en "Toda la Carta" ('ALL' o 'MARKET_ALL')
    // y dicho orden maestro se respeta automáticamente en todas las demás categorías
    const masterKey = salesMode === SALES_MODES.MARKET ? 'MARKET_ALL' : 'ALL';
    const masterOrder = categoryOrderMap?.[masterKey] || categoryOrderMap?.[selectedLine];

    // 1. Si existe un orden maestro explícito por IDs en categoryOrderMap
    if (Array.isArray(masterOrder) && masterOrder.length > 0) {
      return [...list].sort((a, b) => {
        const indexA = masterOrder.indexOf(a.id);
        const indexB = masterOrder.indexOf(b.id);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        if (typeof a.sortOrder === 'number' && typeof b.sortOrder === 'number') {
          return a.sortOrder - b.sortOrder;
        }
        if (typeof a.sortOrder === 'number') return -1;
        if (typeof b.sortOrder === 'number') return 1;
        return 0;
      });
    }

    // 2. Si los productos traen sortOrder (sincronizado directamente desde Firestore)
    const hasAnySortOrder = list.some((p) => typeof p.sortOrder === 'number');
    if (hasAnySortOrder) {
      return [...list].sort((a, b) => {
        const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : 999999;
        const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : 999999;
        return orderA - orderB;
      });
    }

    // 3. Fallback: Mantener el orden natural de la carta (sin forzar salesCount)
    return list;
  }, [products, categories, salesMode, selectedLine, searchQuery, categoryOrderMap]);

  // Etiqueta legible de la categoría actualmente seleccionada
  const selectedCategoryLabel = useMemo(() => {
    if (salesMode === SALES_MODES.MARKET) {
      if (selectedLine === 'MARKET_BEBIDAS') return 'Bebidas Market';
      if (selectedLine === 'MARKET_SNACKS') return 'Snacks Market';
      if (selectedLine === 'MARKET_POSTRES') return 'Postres Market';
      return 'Market (Todo)';
    }
    if (selectedLine === 'COMIDA') return 'Comida';
    if (selectedLine === 'BEBIDAS') return 'Bebidas';
    if (selectedLine === 'POSTRES') return 'Postres';
    if (selectedLine === 'MARKET') return 'Market';
    return 'Toda la Carta';
  }, [salesMode, selectedLine]);

  // Productos mostrados en la cuadrícula (en modo reordenar se muestra el orden local fluido de Toda la Carta)
  const displayedProducts = isReorderActive ? reorderProducts : filteredAndSortedProducts;
  const activeDragIndex = activeDragItem ? reorderProducts.findIndex((p) => p.id === activeDragItem.id) : -1;

  // Activar o desactivar el modo de reordenar carta (solo Admin y Owner, exclusivo de Toda la Carta)
  const handleToggleReorderMode = () => {
    if (!isAdminOrOwner) return;

    if (isReorderActive) {
      handleSaveAndClose();
    } else {
      const masterKey = salesMode === SALES_MODES.MARKET ? 'MARKET_ALL' : 'ALL';
      previousCategoryBeforeReorderRef.current = selectedLine;

      // Siempre organizar en Toda la Carta
      setSelectedLine(masterKey);
      setSearchQuery('');

      const masterOrder = categoryOrderMap?.[masterKey];
      let allProducts = products.filter((prod) => {
        if (salesMode === SALES_MODES.MARKET) {
          return isProductMarket(prod, categories);
        }
        return true;
      });

      if (Array.isArray(masterOrder) && masterOrder.length > 0) {
        allProducts = [...allProducts].sort((a, b) => {
          const indexA = masterOrder.indexOf(a.id);
          const indexB = masterOrder.indexOf(b.id);
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          if (typeof a.sortOrder === 'number' && typeof b.sortOrder === 'number') {
            return a.sortOrder - b.sortOrder;
          }
          if (typeof a.sortOrder === 'number') return -1;
          if (typeof b.sortOrder === 'number') return 1;
          return 0;
        });
      } else if (allProducts.some((p) => typeof p.sortOrder === 'number')) {
        allProducts = [...allProducts].sort((a, b) => {
          const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : 999999;
          const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : 999999;
          return orderA - orderB;
        });
      }

      // Guardar snapshot intacto para restaurar en caso de cancelar
      initialReorderProductsRef.current = [...allProducts];
      setReorderProducts([...allProducts]);
      setHasReorderChanges(false);
      setIsReorderMode(true);
    }
  };

  // Mover producto una posición arriba o abajo (nativa y fluida)
  const handleMoveProduct = useCallback((index, direction) => {
    const targetIndex = index + direction;
    setReorderProducts((prev) => {
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, item);
      return copy;
    });
    setHasReorderChanges(true);
  }, []);

  // Iniciar arrastre con puntero (mouse o touch)
  const handleCardPointerDown = (e, index, product) => {
    if (!isReorderActive) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('button')) return;

    const cardEl = e.currentTarget;
    const rect = cardEl.getBoundingClientRect();

    dragStartInfoRef.current = {
      index,
      product,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
    currentSlotIndexRef.current = index;
    isDraggingActiveRef.current = false;
  };

  // Efecto global de puntero (Mouse y Touch) para arrastrar y desplazar en vivo
  useEffect(() => {
    if (!isReorderActive) return;

    const handleWindowPointerMove = (e) => {
      const info = dragStartInfoRef.current;
      if (!info) return;

      // Umbral mínimo de movimiento para iniciar el arrastre (4px)
      if (!isDraggingActiveRef.current) {
        const dist = Math.hypot(e.clientX - info.startX, e.clientY - info.startY);
        if (dist > 4) {
          isDraggingActiveRef.current = true;
          setActiveDragItem(info.product);
          setCardDimensions({ width: info.width, height: info.height });
          setGrabOffset({ x: info.offsetX, y: info.offsetY });
          setPointerPos({ x: e.clientX, y: e.clientY });
          if (navigator.vibrate) navigator.vibrate(20);
        } else {
          return;
        }
      }

      if (e.cancelable) e.preventDefault();
      setPointerPos({ x: e.clientX, y: e.clientY });

      // Auto-scroll suave si el puntero se acerca a los bordes superior o inferior
      const edgeThreshold = 75;
      const scrollSpeed = 12;
      if (e.clientY < edgeThreshold) {
        window.scrollBy({ top: -scrollSpeed, behavior: 'instant' });
      } else if (window.innerHeight - e.clientY < edgeThreshold) {
        window.scrollBy({ top: scrollSpeed, behavior: 'instant' });
      }

      // Detectar la tarjeta de destino debajo de la posición del puntero
      const element = document.elementFromPoint(e.clientX, e.clientY);
      const card = element?.closest('[data-reorder-index]');
      if (card) {
        const targetIdx = Number(card.dataset.reorderIndex);
        if (!isNaN(targetIdx) && targetIdx !== currentSlotIndexRef.current) {
          const fromIdx = currentSlotIndexRef.current;
          setReorderProducts((prev) => {
            if (fromIdx < 0 || fromIdx >= prev.length || targetIdx < 0 || targetIdx >= prev.length) {
              return prev;
            }
            const copy = [...prev];
            const [item] = copy.splice(fromIdx, 1);
            copy.splice(targetIdx, 0, item);
            return copy;
          });
          currentSlotIndexRef.current = targetIdx;
          setHasReorderChanges(true);
          if (navigator.vibrate) navigator.vibrate(12);
        }
      }
    };

    const handleWindowPointerUp = () => {
      if (isDraggingActiveRef.current) {
        if (navigator.vibrate) navigator.vibrate(15);
      }
      isDraggingActiveRef.current = false;
      dragStartInfoRef.current = null;
      currentSlotIndexRef.current = null;
      setActiveDragItem(null);
    };

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: false });
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };
  }, [isReorderActive]);

  // Guardar y salir del modo reordenar (Guarda el orden maestro de Toda la Carta)
  const handleSaveAndClose = async () => {
    const masterKey = salesMode === SALES_MODES.MARKET ? 'MARKET_ALL' : 'ALL';
    if (hasReorderChanges) {
      setIsSavingOrder(true);
      try {
        const ids = reorderProducts.map((p) => p.id);
        await saveCategoryOrder(masterKey, ids);
        showToast('Orden de Toda la Carta guardado exitosamente');
        initialReorderProductsRef.current = null;
      } catch (err) {
        console.error('Error al guardar orden:', err);
        showToast('Error al guardar el nuevo orden');
      } finally {
        setIsSavingOrder(false);
        setIsReorderMode(false);
        setHasReorderChanges(false);
        if (previousCategoryBeforeReorderRef.current) {
          setSelectedLine(previousCategoryBeforeReorderRef.current);
          previousCategoryBeforeReorderRef.current = null;
        }
      }
    } else {
      initialReorderProductsRef.current = null;
      setIsReorderMode(false);
      if (previousCategoryBeforeReorderRef.current) {
        setSelectedLine(previousCategoryBeforeReorderRef.current);
        previousCategoryBeforeReorderRef.current = null;
      }
    }
  };

  // Restablecer al orden por más vendidos
  const handleResetOrder = async () => {
    if (!isAdminOrOwner) return;
    const masterKey = salesMode === SALES_MODES.MARKET ? 'MARKET_ALL' : 'ALL';
    const masterLabel = salesMode === SALES_MODES.MARKET ? 'Market (Todo)' : 'Toda la Carta';
    if (window.confirm(`¿Restablecer el orden de ${masterLabel} al orden automático por más vendidos?`)) {
      setIsSavingOrder(true);
      try {
        await resetCategoryOrder(masterKey);
        showToast(`Orden de ${masterLabel} restablecido a más vendidos`);
        initialReorderProductsRef.current = null;
        setIsReorderMode(false);
        setHasReorderChanges(false);
        if (previousCategoryBeforeReorderRef.current) {
          setSelectedLine(previousCategoryBeforeReorderRef.current);
          previousCategoryBeforeReorderRef.current = null;
        }
      } catch (err) {
        console.error('Error al restablecer orden:', err);
        showToast('Error al restablecer el orden');
      } finally {
        setIsSavingOrder(false);
      }
    }
  };

  // Cancelar reordenamiento sin guardar (revierte fielmente al orden previo)
  const handleCancelReorder = () => {
    if (initialReorderProductsRef.current) {
      setReorderProducts([...initialReorderProductsRef.current]);
      initialReorderProductsRef.current = null;
    }
    setIsReorderMode(false);
    setHasReorderChanges(false);
    setActiveDragItem(null);
    dragStartInfoRef.current = null;
    currentSlotIndexRef.current = null;
    isDraggingActiveRef.current = false;
    if (previousCategoryBeforeReorderRef.current) {
      setSelectedLine(previousCategoryBeforeReorderRef.current);
      previousCategoryBeforeReorderRef.current = null;
    }
  };

  // Añadir rápido (Por defecto SIN cremas marcadas, el usuario las personaliza o pide directo)
  const handleQuickAdd = (product) => {
    // Si la modalidad es para llevar o delivery, asociar el packaging predeterminado del producto
    const isTakeoutOrDelivery =
      salesMode !== SALES_MODES.MARKET &&
      (modality === 'PARA_LLEVAR' ||
        modality === 'DELIVERY' ||
        modality === 'LLEVAR');

    const defaultConsumptionType =
      salesMode === SALES_MODES.MARKET
        ? 'MESA'
        : isTakeoutOrDelivery
        ? (modality === 'DELIVERY' ? 'DELIVERY' : 'PARA_LLEVAR')
        : modality === 'CONSUMO_EXTERNO'
        ? 'CONSUMO_EXTERNO'
        : 'MESA';

    let defaultPackaging = null;
    if (isTakeoutOrDelivery) {
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

    if (product.type === 'MARKET' || product.line === 'MARKET' || product.type === SALES_MODES.MARKET) {
      // Productos de market en comandas: SIN cremas, SIN papas, SIN modificadores
      addItem(product, {
        temperature: product.temperatureConfig?.enabled ? (product.temperatureConfig?.defaultOption || 'HELADA') : null,
        creamsSummary: '',
        creamsDetail: { selected: [], mode: 'NONE' },
        saladSummary: '',
        selectedModifiers: [],
        selectedExtras: [],
        removedIngredients: [],
        packaging: null,
        itemNotes: '',
        consumptionType: defaultConsumptionType,
      });
    } else {
      const defaultMods = [];
      const hasPapas = Boolean(
        product.hasPapas === true ||
        product.papasConfig?.enabled === true ||
        (product.hasPapas !== false &&
          product.papasConfig?.enabled !== false &&
          product.modifiers?.some((m) => m.id === 'mod_papas' || m.id === 'mod_corte_papas' || m.name?.toLowerCase().includes('papa')))
      );

      product.modifiers?.forEach((mod) => {
        const isPapaMod = mod.id === 'mod_papas' || mod.id === 'mod_corte_papas' || mod.name?.toLowerCase().includes('papa');
        if (isPapaMod && !hasPapas) {
          return;
        }
        const defaultOpt = mod.options.find((o) => o.id === mod.defaultOptionId) || mod.options[0];
        if (defaultOpt) {
          defaultMods.push({
            groupId: mod.id,
            groupName: mod.name,
            optionId: defaultOpt.id,
            optionName: defaultOpt.name,
            priceDelta: defaultOpt.priceDelta || 0,
          });
        }
      });

      // SIN CREMAS marcadas por defecto
      addItem(product, {
        temperature: product.temperatureConfig?.enabled ? (product.temperatureConfig?.defaultOption || 'HELADA') : null,
        creamsSummary: '',
        creamsDetail: {
          selected: [],
          mode: 'NONE',
        },
        saladSummary: (product.saladConfig?.enabled === true || product.hasSalad === true) ? 'CON ENSALADA' : '',
        selectedModifiers: defaultMods,
        selectedExtras: [],
        packaging: defaultPackaging,
        removedIngredients: [],
        itemNotes: '',
        consumptionType: defaultConsumptionType,
      });
    }

    showToast(`"${product.name}" añadido`);
  };

  const handleEditCartItem = (cartItem) => {
    if (cartItem.isCustomMenuItem || cartItem.productId?.startsWith('custom_')) {
      setEditingCustomItem(cartItem);
      setIsCustomMenuOpen(true);
      return;
    }
    const baseProd = products.find((p) => p.id === cartItem.productId) || {
      id: cartItem.productId,
      name: cartItem.name,
      price: cartItem.basePrice || cartItem.unitPrice,
    };
    setEditingCartItem(cartItem);
    setCustomizingProduct(baseProd);
  };

  const handleOpenCustomMenu = () => {
    setEditingCustomItem(null);
    setIsCustomMenuOpen(true);
  };

  const handleConfirmCustomItem = (customData) => {
    if (editingCustomItem) {
      updateCustomItem(editingCustomItem.itemId, customData);
      showToast(`"${customData.name}" actualizado en comanda`);
      setEditingCustomItem(null);
    } else {
      addCustomItem(customData);
      showToast(`"${customData.name}" añadido a la comanda`);
    }
  };

  const handleConfirmCustomization = (product, customization) => {
    if (editingCartItem) {
      updateItemCustomization(editingCartItem.itemId, customization);
      showToast(`"${editingCartItem.name}" actualizado en comanda`);
      setEditingCartItem(null);
    } else {
      addItem(product, customization);
      showToast(`"${product.name}" personalizado añadido`);
    }
  };

  // Crear la orden y enviar a cocina (con protección de concurrencia y doble clic)
  const handleSendToKitchen = async () => {
    if (isSubmitting) return;
    if (items.length === 0) return;

    // Exigir número de mesa si la modalidad es MESA
    if (salesMode !== SALES_MODES.MARKET && (modality === 'MESA' || modality === ORDER_MODALITIES.MESA.id)) {
      if (!selectedTable?.id) {
        showToast('Debes seleccionar un número de mesa para continuar');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const hasKitchenItems = items.some((i) => Boolean(i.requiresKitchen) && !isProductMarket(i));
      const isTable = modality === 'MESA' || modality === ORDER_MODALITIES.MESA?.id;
      const isDelivery = modality === 'DELIVERY';
      const isMarketSale = salesMode === SALES_MODES.MARKET;

      // En modo Restaurante:
      // - Si tiene productos de cocina: PENDIENTE (Cocina)
      // - Si NO tiene cocina (ej. productos de market, bebidas, postres): PENDIENTE (va a Pendientes de Entrega)
      // En modo Market (caja rápida de mostrador): entregado
      const orderStatus = isMarketSale ? 'ENTREGADO' : 'PENDIENTE';

      const operatorName = user?.displayName || user?.fullName || (user?.email ? user.email.split('@')[0] : 'Cajero');
      const operatorEmail = user?.email || 'caja@porkos.pe';

      const rawName = (customerName?.trim() || customer.name?.trim()) || (isDelivery ? 'Cliente Delivery' : null);
      const clientName = rawName ? sanitizeText(rawName, 100) : null;
      const rawAddress = customer.address?.trim() || (isDelivery ? 'Dirección por coordinar' : null);
      const deliveryAddress = rawAddress ? sanitizeText(rawAddress, 180) : null;
      const cleanNotes = generalNotes ? sanitizeNotes(generalNotes, 300) : '';

      const orderData = {
        orderNumber: getNextOrderNumber(orders, isMarketSale ? 'M' : 'P'),
        modality: isMarketSale ? 'MARKET' : (isTable ? 'MESA' : modality),
        status: orderStatus,
        paymentStatus: isTable ? 'PENDING' : 'PAID',
        tableId: isTable ? (selectedTable?.id || null) : null,
        tableName: isTable ? (selectedTable?.label || null) : null,
        customerName: clientName,
        customer: isDelivery ? { ...customer, name: clientName || '', address: deliveryAddress } : null,
        items: [...items],
        packagings: [...packagings],
        generalNotes: cleanNotes,
        subtotal: itemsSubtotal,
        packagingsTotal,
        deliveryFee,
        discount: discount || 0,
        total,
        createdBy: {
          uid: user?.uid || null,
          email: operatorEmail,
          name: operatorName,
        },
        createdAt: new Date(),
      };

      // Actualizar conteo local de salidas
      recordProductSales(items);

      if (onOrderCreated) {
        await onOrderCreated(orderData);
      }

      const isAddingToOpenTable = selectedTable?.status === 'OCCUPIED';

      clearCart();
      setIsMobileCartOpen(false);
      showToast(
        isTable
          ? hasKitchenItems
            ? isAddingToOpenTable
              ? `Comanda ${orderData.orderNumber} enviada a Cocina (${selectedTable.label})`
              : `Comanda ${orderData.orderNumber} enviada a Cocina`
            : `Pedido ${orderData.orderNumber} en Pendientes de Entrega (${selectedTable.label})`
          : isDelivery
          ? hasKitchenItems
            ? `Pedido Delivery ${orderData.orderNumber} enviado a Cocina`
            : `Pedido Delivery ${orderData.orderNumber} en Pendientes de Entrega`
          : isMarketSale
          ? `Venta ${orderData.orderNumber} entregada`
          : hasKitchenItems
          ? `Comanda ${orderData.orderNumber} enviada a Cocina`
          : `Pedido ${orderData.orderNumber} en Pendientes de Entrega`
      );
    } catch (err) {
      console.error('Error registrando comanda:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCheckout = () => {
    // Exigir número de mesa si la modalidad es MESA
    if (salesMode !== SALES_MODES.MARKET && (modality === 'MESA' || modality === ORDER_MODALITIES.MESA.id)) {
      if (!selectedTable?.id) {
        showToast('Debes seleccionar un número de mesa para continuar');
        return;
      }
    }

    setIsPaymentOpen(true);
  };

  // Guardar edición de comanda activa existente (con protección de concurrencia)
  const handleSaveEditedOrder = async () => {
    if (isSubmitting) return;
    if (!editingOrder) return;

    // Verificar si la orden ya fue entregada y pagada (finalizada)
    const isUnpaidTable = (editingOrder.modality === 'MESA' || Boolean(editingOrder.tableId)) && editingOrder.paymentStatus !== 'PAID';
    if (editingOrder.status === 'ENTREGADO' && !isUnpaidTable) {
      showToast('⚠️ Esta comanda ya fue finalizada y no puede ser modificada');
      cancelEditingOrder();
      return;
    }

    // Exigir número de mesa si la modalidad es MESA
    if (salesMode !== SALES_MODES.MARKET && (modality === 'MESA' || modality === ORDER_MODALITIES.MESA.id)) {
      if (!selectedTable?.id) {
        showToast('Debes seleccionar un número de mesa para la comanda');
        return;
      }
    }

    if (items.length === 0) {
      showToast('⚠️ La comanda debe tener al menos 1 producto');
      return;
    }

    setIsSubmitting(true);
    try {
      const rawEditName = (customerName?.trim() || customer.name?.trim()) || (modality === 'DELIVERY' ? 'Cliente Delivery' : null);
      const clientName = rawEditName ? sanitizeText(rawEditName, 100) : null;
      const rawEditAddress = customer.address?.trim() || (modality === 'DELIVERY' ? 'Dirección por coordinar' : null);
      const deliveryAddress = rawEditAddress ? sanitizeText(rawEditAddress, 180) : null;
      const cleanNotes = generalNotes ? sanitizeNotes(generalNotes, 300) : '';

      const updatedOrder = {
        ...editingOrder,
        modality,
        tableId: modality === 'MESA' ? (selectedTable?.id || null) : null,
        tableName: modality === 'MESA' ? (selectedTable?.label || null) : null,
        customerName: clientName,
        customer: modality === 'DELIVERY' ? { ...customer, name: clientName || '', address: deliveryAddress } : null,
        items: [...items],
        packagings: [...packagings],
        generalNotes: cleanNotes,
        subtotal: itemsSubtotal,
        packagingsTotal,
        deliveryFee,
        discount: discount || 0,
        total,
        mergedOrderNumbers: editingOrder.mergedOrderNumbers || null,
        updatedAt: new Date(),
      };

      if (onOrderUpdated) {
        await onOrderUpdated(updatedOrder);
      }

      cancelEditingOrder();
      clearCart();
      setIsMobileCartOpen(false);
      showToast(`Comanda ${updatedOrder.orderNumber} actualizada`);
      if (onReturnToOrders) {
        onReturnToOrders();
      }
    } catch (err) {
      console.error('Error actualizando comanda:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEditing = () => {
    cancelEditingOrder();
    clearCart();
    setIsMobileCartOpen(false);
    if (onReturnToOrders) {
      onReturnToOrders();
    }
  };

  // Cobro directo (con protección de doble envío)
  const handleConfirmPayment = async (paymentDetail) => {
    if (isSubmitting) return;
    if (items.length === 0) return;

    setIsSubmitting(true);
    try {
      const isMarketSale = salesMode === SALES_MODES.MARKET;
      const operatorName = user?.displayName || user?.fullName || (user?.email ? user.email.split('@')[0] : 'Cajero');
      const operatorEmail = user?.email || 'caja@porkos.pe';

      const hasKitchenItems = items.some((i) => Boolean(i.requiresKitchen) && !isProductMarket(i));
      const isDelivery = !isMarketSale && modality === 'DELIVERY';
      const orderStatus = isMarketSale ? 'ENTREGADO' : 'PENDIENTE';

      const rawPaymentClient = isMarketSale
        ? 'Venta Mostrador'
        : ((customerName?.trim() || customer.name?.trim()) || (isDelivery ? 'Cliente Delivery' : null));
      const clientName = rawPaymentClient ? sanitizeText(rawPaymentClient, 100) : null;
      const rawPaymentAddress = customer.address?.trim() || (isDelivery ? 'Dirección por coordinar' : null);
      const deliveryAddress = rawPaymentAddress ? sanitizeText(rawPaymentAddress, 180) : null;
      const cleanNotes = isMarketSale ? 'Venta directa en caja' : (generalNotes ? sanitizeNotes(generalNotes, 300) : '');

      const orderData = {
        orderNumber: getNextOrderNumber(orders, isMarketSale ? 'M' : 'P'),
        modality: isMarketSale ? 'MARKET' : modality,
        status: orderStatus,
        paymentStatus: 'PAID',
        tableId: isMarketSale ? null : (selectedTable?.id || null),
        tableName: isMarketSale ? null : (selectedTable?.label || null),
        customerName: clientName,
        customer: isDelivery ? { ...customer, name: clientName || '', address: deliveryAddress } : null,
        items: [...items],
        packagings: isMarketSale ? [] : [...packagings],
        generalNotes: cleanNotes,
        subtotal: itemsSubtotal,
        packagingsTotal: isMarketSale ? 0 : packagingsTotal,
        deliveryFee: isMarketSale ? 0 : deliveryFee,
        discount: 0,
        total,
        createdBy: {
          uid: user?.uid || null,
          email: operatorEmail,
          name: operatorName,
        },
        payments: [
          {
            ...paymentDetail,
            paidAt: new Date(),
          },
        ],
        createdAt: new Date(),
      };

      // Actualizar conteo local de salidas
      recordProductSales(items);

      if (onOrderCreated) {
        await onOrderCreated(orderData, Boolean(orderData.tableId));
      }

      clearCart();
      setIsPaymentOpen(false);
      setIsMobileCartOpen(false);
      showToast(
        isMarketSale
          ? `Venta Market ${orderData.orderNumber} cobrada con éxito`
          : hasKitchenItems
          ? `Comanda ${orderData.orderNumber} cobrada y enviada a Cocina`
          : `Pedido ${orderData.orderNumber} cobrado y enviado a Pendientes de Entrega`
      );
    } catch (err) {
      console.error('Error procesando cobro:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative pb-24 lg:pb-8">
      {/* Toast Notification: Sutil, superior y ágil */}
      {successToast && (
        <Toast
          message={successToast}
          type="success"
          position="top"
          duration={1200}
          onClose={() => setSuccessToast(null)}
        />
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Products & Filters */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3.5">
          {/* Banner superior si está editando comanda desde Pedidos */}
          {editingOrder && (
            <div className="bg-amber-500/15 border border-amber-500/40 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs animate-in fade-in">
              <div className="flex items-center gap-2.5 text-amber-300 font-bold">
                <Edit3 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Editando comanda <strong>{editingOrder.tableName ? `${editingOrder.tableName} (${editingOrder.orderNumber})` : editingOrder.orderNumber}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEditing}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold border border-zinc-700 cursor-pointer active:scale-95"
                >
                  Cancelar y Volver
                </button>
                <button
                  type="button"
                  onClick={() => setIsMobileCartOpen(true)}
                  className="lg:hidden px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black cursor-pointer active:scale-95 shadow-md shadow-amber-500/20"
                >
                  Ver Comanda
                </button>
              </div>
            </div>
          )}

          <SalesHeader
            salesMode={salesMode}
            setSalesMode={(mode) => {
              if (isReorderActive) {
                showToast('Guarda o cancela el ordenamiento antes de cambiar de modo');
                return;
              }
              setSalesMode(mode);
              setSelectedLine(mode === SALES_MODES.MARKET ? 'MARKET_ALL' : 'ALL');
            }}
            searchQuery={searchQuery}
            setSearchQuery={(query) => {
              if (isReorderActive) return;
              setSearchQuery(query);
            }}
            tables={tables}
          />

          {/* Categorías contextuales (Restaurante o Market) */}
          <CategoryTabs
            salesMode={salesMode}
            selectedLine={selectedLine}
            onSelectLine={(line) => {
              if (isReorderActive) {
                showToast('El orden se define en Toda la Carta y se aplica a todas las categorías');
                return;
              }
              setSelectedLine(line);
            }}
            onOpenCustomMenu={salesMode !== SALES_MODES.MARKET ? handleOpenCustomMenu : undefined}
          />

          {/* Barra fija: número de productos + botón icono 'Ordenar Carta' */}
          <div className="flex items-center justify-between gap-2 px-1 pt-1 pb-0.5 select-none">
            <span className="text-[11px] font-bold text-zinc-400 bg-[#121216] border border-zinc-800 px-2.5 py-0.5 rounded-full shrink-0">
              {displayedProducts.length} {displayedProducts.length === 1 ? 'producto' : 'productos'}
            </span>

            {/* Botón Ordenar Carta: solo visible para ADMIN u OWNER */}
            {isAdminOrOwner && (
              <button
                type="button"
                onClick={handleToggleReorderMode}
                className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-xs active:scale-95 transition-all cursor-pointer shrink-0 ${
                  isReorderActive
                    ? 'bg-orange-500 hover:bg-orange-400 text-zinc-950 ring-2 ring-orange-300'
                    : 'bg-[var(--color-porkos-orange)] hover:bg-[var(--color-porkos-orange-hover)] text-zinc-950'
                }`}
                title={isReorderActive ? 'Finalizar ordenamiento de carta' : `Ordenar carta (${selectedCategoryLabel})`}
                aria-label="Ordenar carta"
              >
                {isReorderActive ? <Check className="w-4 h-4 stroke-[2.5]" /> : <ArrowUpDown className="w-4 h-4 stroke-[2.5]" />}
              </button>
            )}
          </div>

          {/* Banner de Modo Reordenar Carta (Solo Admin/Owner) */}
          {isReorderActive && (
            <div className="bg-gradient-to-r from-orange-500/15 via-[#18181f] to-[#18181f] border border-orange-500/40 rounded-2xl p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2.5 shadow-md select-none animate-fadeIn">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[var(--color-porkos-orange)] text-zinc-950 flex items-center justify-center shrink-0 shadow-sm">
                  <ArrowUpDown className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-xs sm:text-sm text-white">
                      Modo Ordenar Toda la Carta
                    </span>
                    <span className="text-[10px] font-black text-orange-400 bg-orange-500/20 border border-orange-500/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Orden Maestro
                    </span>
                    {hasReorderChanges && (
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded-md">
                        Cambios pendientes
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                    Arrastra los productos para desplazarlos en vivo o usa las flechas (↑ / ↓). El orden se reflejará en todas las categorías.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-auto shrink-0">
                {Boolean(categoryOrderMap?.[salesMode === SALES_MODES.MARKET ? 'MARKET_ALL' : 'ALL']) && (
                  <button
                    type="button"
                    onClick={handleResetOrder}
                    disabled={isSavingOrder}
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    title="Restablecer al orden automático por más vendidos"
                  >
                    Restablecer
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCancelReorder}
                  disabled={isSavingOrder}
                  className="px-2.5 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 active:scale-95 text-zinc-400 hover:text-zinc-200 border border-zinc-700/60 text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleSaveAndClose}
                  disabled={isSavingOrder}
                  className="px-3.5 py-1.5 rounded-xl bg-[var(--color-porkos-orange)] hover:bg-[var(--color-porkos-orange-hover)] active:scale-95 text-zinc-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-orange-500/20 disabled:opacity-50"
                >
                  {isSavingOrder ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  )}
                  <span>{hasReorderChanges ? 'Guardar Cambios' : 'Listo'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Grid de Productos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3.5">
            {displayedProducts.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={idx < 12}
                onQuickAdd={handleQuickAdd}
                isReorderMode={isReorderActive}
                orderIndex={idx}
                totalItems={displayedProducts.length}
                onMoveUp={() => handleMoveProduct(idx, -1)}
                onMoveDown={() => handleMoveProduct(idx, 1)}
                isPlaceholder={activeDragItem?.id === product.id}
                onPointerDown={(e) => handleCardPointerDown(e, idx, product)}
              />
            ))}
          </div>

          {displayedProducts.length === 0 && (
            <div className="space-y-3">
              <EmptyState
                icon={UtensilsCrossed}
                title={products.length === 0 ? 'El catálogo está vacío' : 'No se encontraron productos'}
                description={
                  products.length === 0
                    ? 'Agrega productos en el módulo de Catálogo para empezar a vender.'
                    : `No hay productos en la carta que coincidan con "${searchQuery}".`
                }
                action={
                  searchQuery
                    ? {
                        label: 'Limpiar búsqueda',
                        onClick: () => setSearchQuery(''),
                      }
                    : undefined
                }
              />
              {searchQuery && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleOpenCustomMenu()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <Plus className="w-4 h-4 text-amber-400 stroke-[2.5]" />
                    <span>Agregar &ldquo;{searchQuery}&rdquo; como menú fuera de carta</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Desktop Cart */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-20 h-[calc(100vh-6rem)]">
          <CartView
            isMarketMode={salesMode === SALES_MODES.MARKET}
            onSendToKitchen={handleSendToKitchen}
            onCheckout={handleOpenCheckout}
            onSettleTable={onSettleTableOrder}
            onEditItem={handleEditCartItem}
            onOpenCustomMenu={handleOpenCustomMenu}
            tables={tables}
            onSaveEditedOrder={handleSaveEditedOrder}
            onCancelEditing={handleCancelEditing}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>

      {/* Mobile Floating Cart Summary Button */}
      {items.length > 0 && (
        <div className="lg:hidden fixed bottom-16 left-3 right-3 z-30 animate-in slide-in-from-bottom-4">
          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className={`w-full ${
              editingOrder
                ? 'bg-amber-500 text-black shadow-amber-500/30'
                : 'bg-[var(--color-porkos-orange)] text-black shadow-orange-500/30'
            } p-3.5 rounded-2xl flex items-center justify-between font-black shadow-xl active:scale-[0.98] transition-all cursor-pointer`}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-black text-white text-xs flex items-center justify-center font-extrabold">
                {itemCount}
              </div>
              <span className="text-sm uppercase tracking-tight">
                {editingOrder
                  ? `Ver Comanda (${editingOrder.orderNumber})`
                  : salesMode === SALES_MODES.MARKET
                  ? 'Ver Venta Market'
                  : 'Ver Comanda'}
              </span>
            </div>
            <span className="text-base font-black">{formatCurrency(total)}</span>
          </button>
        </div>
      )}

      {/* Mobile Cart Drawer con Gestos Fluidos y Leyes UX */}
      <MobileCartDrawer
        isOpen={isMobileCartOpen}
        onClose={() => setIsMobileCartOpen(false)}
      >
        <CartView
          isMarketMode={salesMode === SALES_MODES.MARKET}
          onSendToKitchen={handleSendToKitchen}
          onCheckout={handleOpenCheckout}
          onSettleTable={onSettleTableOrder}
          onEditItem={handleEditCartItem}
          onOpenCustomMenu={handleOpenCustomMenu}
          onCloseMobileCart={() => setIsMobileCartOpen(false)}
          tables={tables}
          onSaveEditedOrder={handleSaveEditedOrder}
          onCancelEditing={handleCancelEditing}
          isSubmitting={isSubmitting}
        />
      </MobileCartDrawer>

      {/* Quick Customizer Modal */}
      <QuickCustomizerModal
        isOpen={Boolean(customizingProduct)}
        onClose={() => {
          setCustomizingProduct(null);
          setEditingCartItem(null);
        }}
        product={customizingProduct}
        cartItemId={editingCartItem?.itemId}
        initialCustomization={editingCartItem?.customization || null}
        modality={modality}
        onConfirm={handleConfirmCustomization}
      />

      {/* Custom Menu Item Modal (Fuera de carta) */}
      <CustomMenuItemModal
        isOpen={isCustomMenuOpen}
        onClose={() => {
          setIsCustomMenuOpen(false);
          setEditingCustomItem(null);
        }}
        editingItem={editingCustomItem}
        initialName={searchQuery}
        modality={modality}
        onConfirm={handleConfirmCustomItem}
      />

      {/* Quick Payment Modal */}
      <QuickPaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        total={total}
        onConfirmPayment={handleConfirmPayment}
        isSubmitting={isSubmitting}
      />

      {/* Flecha flotante a la derecha en mobile y al borde del catálogo en desktop */}
      <ScrollToTopButton
        className={
          items.length > 0
            ? "bottom-36 right-4 sm:bottom-36 sm:right-6 lg:bottom-6 lg:right-[43%] xl:right-[35%]"
            : "bottom-20 right-4 sm:bottom-20 sm:right-6 lg:bottom-6 lg:right-[43%] xl:right-[35%]"
        }
      />

      {/* Tarjeta flotante arrastrada (efecto fluido que sigue al cursor/dedo con desplazamiento en vivo) */}
      {activeDragItem && cardDimensions.width > 0 && (
        <div
          className="fixed top-0 left-0 pointer-events-none z-50 select-none shadow-2xl ring-2 ring-orange-500 rounded-2xl overflow-hidden bg-[#121216] border border-orange-400/80 opacity-95 transition-shadow duration-150"
          style={{
            width: `${cardDimensions.width}px`,
            transform: `translate3d(${pointerPos.x - grabOffset.x}px, ${pointerPos.y - grabOffset.y}px, 0) scale(1.04) rotate(1.5deg)`,
            transformOrigin: 'center center',
            willChange: 'transform',
          }}
        >
          <div className="relative h-28 sm:h-34 w-full overflow-hidden bg-zinc-950 flex items-center justify-center">
            <ProductThumbnail
              src={activeDragItem.image}
              thumbnailUrl={activeDragItem.thumbnailUrl}
              name={activeDragItem.name}
              isBeverage={isProductBeverage(activeDragItem)}
              isDessert={isProductDessert(activeDragItem)}
              className="w-full h-full object-cover rounded-none"
              iconSize="w-8 h-8 sm:w-10 sm:h-10"
            />
            <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-lg bg-zinc-950/95 border border-orange-500/50 text-[var(--color-porkos-orange)] font-black text-xs shadow-md">
              Moviendo #{activeDragIndex !== -1 ? activeDragIndex + 1 : 1}
            </div>
          </div>
          <div className="p-2.5 sm:p-3 bg-[#121216]">
            <h4 className="font-bold text-xs sm:text-sm text-zinc-100 line-clamp-2 leading-snug">
              {activeDragItem.name}
            </h4>
            <div className="pt-1 mt-1 border-t border-zinc-800/60 flex items-center justify-between">
              <span className="text-[var(--color-porkos-orange)] font-black text-xs sm:text-sm">
                {formatCurrency(activeDragItem.price)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
