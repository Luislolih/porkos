import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Flame,
  Wallet,
  Calendar,
  Layers,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  Brain,
  BarChart3,
  Clock,
  Receipt,
} from 'lucide-react';
import { formatCurrency, parseToDate } from '../../utils/formatters';
import { isProductBeverage, isProductDessert } from '../../utils/productCategories';
import {
  getShiftDate,
  getShiftDateString,
  getPreviousShiftDateString,
  getShiftBoundsForDate,
  getShiftBoundsForRange,
  isTimestampInShiftRange,
  formatShiftDisplayDate,
} from '../../utils/shiftDateUtils';
import { useCatalog } from '../../context/useCatalog';
import { subscribeToExpenses } from '../../services/firestoreService';
import ProductThumbnail from '../../components/ui/ProductThumbnail';
import {
  DonutChart,
  FinancialBarChart,
  FinancialWaterfall,
  ExpenseCategoryBars,
} from './components/DashboardCharts';
import PorkoIntelligenceTab from './components/PorkoIntelligenceTab';

// Rango de fechas
const DATE_RANGES = {
  TODAY: 'TODAY',
  YESTERDAY: 'YESTERDAY',
  THIS_WEEK: 'THIS_WEEK',
  THIS_MONTH: 'THIS_MONTH',
  ALL: 'ALL',
  CUSTOM: 'CUSTOM',
};

// Pestañas internas del Dashboard
const DASHBOARD_TABS = [
  { id: 'OVERVIEW', label: 'Resumen & Tops', icon: PieChart },
  { id: 'FINANCES', label: 'Finanzas & Balance', icon: Wallet },
  { id: 'SIMULATION', label: 'Simulador de Costos', icon: Sliders },
  { id: 'COMBINATIONS', label: 'Combinaciones (Combos)', icon: Layers },
  { id: 'INSIGHTS', label: 'Porko Intelligence', icon: Brain },
];

export default function DashboardView({ orders = [] }) {
  const { products = [] } = useCatalog();
  const [expenses, setExpenses] = useState([]);
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [dateRange, setDateRange] = useState(DATE_RANGES.ALL);
  const [enableComparison, setEnableComparison] = useState(true);

  // Fechas personalizadas (basadas en la fecha operativa del turno actual)
  const [customStart, setCustomStart] = useState(() => {
    const shift = getShiftDate();
    const d = new Date(shift.getFullYear(), shift.getMonth(), shift.getDate() - 7, 12, 0, 0);
    return getShiftDateString(d);
  });
  const [customEnd, setCustomEnd] = useState(() => {
    return getShiftDateString();
  });

  // 1. Sincronización en tiempo real con la colección de gastos
  useEffect(() => {
    const unsub = subscribeToExpenses(
      (remoteExpenses) => {
        setExpenses(remoteExpenses || []);
      },
      (err) => {
        console.warn('Error leyendo gastos en Dashboard:', err);
      }
    );
    return () => unsub();
  }, []);

  // Helper de rangos de fechas por turno (de 4:00 AM a 3:59:59 AM del día siguiente)
  const dateBounds = useMemo(() => {
    const currentShiftStr = getShiftDateString();
    const currentShift = getShiftDate(currentShiftStr);
    let start = null;
    let end = null;
    let prevStart = null;
    let prevEnd = null;

    if (dateRange === DATE_RANGES.TODAY) {
      const bounds = getShiftBoundsForDate(currentShiftStr);
      start = bounds.start;
      end = bounds.end;
      const prevShiftStr = getPreviousShiftDateString(currentShiftStr);
      const prevBounds = getShiftBoundsForDate(prevShiftStr);
      prevStart = prevBounds.start;
      prevEnd = prevBounds.end;
    } else if (dateRange === DATE_RANGES.YESTERDAY) {
      const targetShiftStr = getPreviousShiftDateString(currentShiftStr);
      const bounds = getShiftBoundsForDate(targetShiftStr);
      start = bounds.start;
      end = bounds.end;
      const prevShiftStr = getPreviousShiftDateString(targetShiftStr);
      const prevBounds = getShiftBoundsForDate(prevShiftStr);
      prevStart = prevBounds.start;
      prevEnd = prevBounds.end;
    } else if (dateRange === DATE_RANGES.THIS_WEEK) {
      const day = currentShift.getDay() || 7; // 1 = Lunes, 7 = Domingo
      const mondayShift = new Date(currentShift.getFullYear(), currentShift.getMonth(), currentShift.getDate() - day + 1, 12, 0, 0);
      const startBounds = getShiftBoundsForDate(mondayShift);
      const endBounds = getShiftBoundsForDate(currentShift);
      start = startBounds.start;
      end = endBounds.end;
      const duration = end.getTime() - start.getTime();
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - duration);
    } else if (dateRange === DATE_RANGES.THIS_MONTH) {
      const firstDayShift = new Date(currentShift.getFullYear(), currentShift.getMonth(), 1, 12, 0, 0);
      const startBounds = getShiftBoundsForDate(firstDayShift);
      const endBounds = getShiftBoundsForDate(currentShift);
      start = startBounds.start;
      end = endBounds.end;
      const prevMonthFirst = new Date(currentShift.getFullYear(), currentShift.getMonth() - 1, 1, 12, 0, 0);
      const prevMonthLast = new Date(currentShift.getFullYear(), currentShift.getMonth(), 0, 12, 0, 0);
      const prevStartBounds = getShiftBoundsForDate(prevMonthFirst);
      const prevEndBounds = getShiftBoundsForDate(prevMonthLast);
      prevStart = prevStartBounds.start;
      prevEnd = prevEndBounds.end;
    } else if (dateRange === DATE_RANGES.CUSTOM) {
      if (customStart && customEnd) {
        const bounds = getShiftBoundsForRange(customStart, customEnd);
        start = bounds.start;
        end = bounds.end;
        const duration = end.getTime() - start.getTime();
        prevEnd = new Date(start.getTime() - 1);
        prevStart = new Date(prevEnd.getTime() - duration);
      }
    }

    return { start, end, prevStart, prevEnd };
  }, [dateRange, customStart, customEnd]);

  // Filtrar pedidos y gastos según el periodo actual y periodo anterior
  const { currentOrders, previousOrders, currentExpenses, previousExpenses } = useMemo(() => {
    const cOrders = orders.filter((o) => {
      if (dateRange === DATE_RANGES.ALL) return true;
      return isTimestampInShiftRange(o.createdAt, dateBounds.start, dateBounds.end);
    });

    const pOrders = orders.filter((o) => {
      if (dateRange === DATE_RANGES.ALL || !dateBounds.prevStart) return false;
      return isTimestampInShiftRange(o.createdAt, dateBounds.prevStart, dateBounds.prevEnd);
    });

    const cExpenses = expenses.filter((e) => {
      if (dateRange === DATE_RANGES.ALL) return true;
      return isTimestampInShiftRange(e.date, dateBounds.start, dateBounds.end);
    });

    const pExpenses = expenses.filter((e) => {
      if (dateRange === DATE_RANGES.ALL || !dateBounds.prevStart) return false;
      return isTimestampInShiftRange(e.date, dateBounds.prevStart, dateBounds.prevEnd);
    });

    return {
      currentOrders: cOrders,
      previousOrders: pOrders,
      currentExpenses: cExpenses,
      previousExpenses: pExpenses,
    };
  }, [orders, expenses, dateRange, dateBounds]);

  // Mapa rápido de catálogo (costos e imágenes por ID y nombre)
  const { productCostMap, catalogById, catalogByName } = useMemo(() => {
    const costMap = {};
    const byId = {};
    const byName = {};
    products.forEach((p) => {
      const cost = Number(p.cost) || 0;
      if (p.id) {
        costMap[p.id] = cost;
        byId[p.id] = p;
      }
      if (p.name) {
        const norm = p.name.trim().toLowerCase();
        costMap[norm] = cost;
        byName[norm] = p;
      }
    });
    return { productCostMap: costMap, catalogById: byId, catalogByName: byName };
  }, [products]);

  const findCatalogProduct = useCallback(
    (id, name) => {
      if (id && catalogById[id]) return catalogById[id];
      if (name) {
        const norm = name.trim().toLowerCase();
        if (catalogByName[norm]) return catalogByName[norm];
      }
      return null;
    },
    [catalogById, catalogByName]
  );

  // Cálculo integral de métricas financieras y operativas
  const metrics = useMemo(() => {
    const calcOrderMetrics = (ordersList) => {
      let sales = 0;
      let paid = 0;
      let pending = 0;
      let cogs = 0;
      let itemCount = 0;
      let validOrdersCount = 0;
      let cancelledCount = 0;
      let cancelledTotal = 0;

      ordersList.forEach((o) => {
        const orderTotal = Math.round((Number(o.total) || 0) * 100) / 100;

        if (o.status === 'CANCELADO') {
          cancelledCount++;
          cancelledTotal = Math.round((cancelledTotal + orderTotal) * 100) / 100;
          return;
        }

        sales = Math.round((sales + orderTotal) * 100) / 100;
        validOrdersCount++;

        if (o.paymentStatus === 'PAID') {
          paid = Math.round((paid + orderTotal) * 100) / 100;
        } else {
          pending = Math.round((pending + orderTotal) * 100) / 100;
        }

        (o.items || []).forEach((item) => {
          const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
          itemCount += qty;

          const pId = item.productId || item.id;
          const unitCost = Number(
            item.cost ??
            (pId ? productCostMap[pId] : null) ??
            productCostMap[(item.name || '').trim().toLowerCase()] ??
            0
          ) || 0;

          cogs = Math.round((cogs + (unitCost * qty)) * 100) / 100;
        });
      });

      const count = validOrdersCount;
      const avgTicket = count > 0 ? Math.round((sales / count) * 100) / 100 : 0;
      const grossProfit = Math.round((sales - cogs) * 100) / 100;
      const grossMargin = sales > 0 ? Math.round(((grossProfit / sales) * 100) * 10) / 10 : 0;

      return {
        sales,
        paid,
        pending,
        count,
        validOrdersCount,
        cancelledCount,
        cancelledTotal,
        totalOrdersCount: ordersList.length,
        itemCount,
        avgTicket,
        cogs,
        grossProfit,
        grossMargin,
      };
    };

    const currentOrderM = calcOrderMetrics(currentOrders);
    const prevOrderM = calcOrderMetrics(previousOrders);

    const totalExp = Math.round(
      currentExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0) * 100
    ) / 100;
    const prevExp = Math.round(
      previousExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0) * 100
    ) / 100;

    const netProfit = Math.round((currentOrderM.grossProfit - totalExp) * 100) / 100;
    const netMargin = currentOrderM.sales > 0
      ? Math.round(((netProfit / currentOrderM.sales) * 100) * 10) / 10
      : 0;

    const prevNetProfit = Math.round((prevOrderM.grossProfit - prevExp) * 100) / 100;

    const validOrders = currentOrders.filter((o) => o.status !== 'CANCELADO');
    const modalities = {
      MESA: validOrders.filter((o) => o.modality === 'MESA').length,
      DELIVERY: validOrders.filter((o) => o.modality === 'DELIVERY').length,
      PARA_LLEVAR: validOrders.filter((o) => o.modality === 'PARA_LLEVAR' || o.modality === 'LLEVAR').length,
      CONSUMO_EXTERNO: validOrders.filter((o) => o.modality === 'CONSUMO_EXTERNO').length,
      MARKET: validOrders.filter((o) => o.modality === 'MARKET').length,
    };

    const paymentMethods = {
      EFECTIVO: 0,
      YAPE: 0,
      PLIN: 0,
      TARJETA: 0,
    };

    const addPaymentToMethod = (rawMethod, amount) => {
      const num = Math.round((Number(amount) || 0) * 100) / 100;
      if (num <= 0) return;
      const m = String(rawMethod || '').trim().toUpperCase();
      if (m.includes('YAPE')) {
        paymentMethods.YAPE = Math.round((paymentMethods.YAPE + num) * 100) / 100;
      } else if (m.includes('PLIN')) {
        paymentMethods.PLIN = Math.round((paymentMethods.PLIN + num) * 100) / 100;
      } else if (m.includes('TARJETA') || m.includes('POS') || m.includes('CARD') || m.includes('TRANSF')) {
        paymentMethods.TARJETA = Math.round((paymentMethods.TARJETA + num) * 100) / 100;
      } else {
        paymentMethods.EFECTIVO = Math.round((paymentMethods.EFECTIVO + num) * 100) / 100;
      }
    };

    validOrders.forEach((o) => {
      if (o.paymentStatus !== 'PAID' && (!o.payments || o.payments.length === 0) && !o.payment) {
        return;
      }

      if (Array.isArray(o.payments) && o.payments.length > 0) {
        o.payments.forEach((p) => {
          addPaymentToMethod(p.method, p.amount);
        });
      } else if (o.payment && typeof o.payment === 'object') {
        addPaymentToMethod(o.payment.method, o.payment.amount ?? o.total);
      } else if (o.paymentMethod) {
        if (o.paymentStatus === 'PAID') {
          addPaymentToMethod(o.paymentMethod, o.total);
        }
      } else if (o.paymentStatus === 'PAID') {
        addPaymentToMethod('EFECTIVO', o.total);
      }
    });

    return {
      current: {
        ...currentOrderM,
        totalExpenses: totalExp,
        netProfit,
        netMargin,
        modalities,
        paymentMethods,
      },
      previous: {
        ...prevOrderM,
        totalExpenses: prevExp,
        netProfit: prevNetProfit,
      },
    };
  }, [currentOrders, previousOrders, currentExpenses, previousExpenses, productCostMap]);

  // Ranking de Productos Más Vendidos (con miniatura real del catálogo)
  const topProducts = useMemo(() => {
    const productAgg = {};

    currentOrders.forEach((o) => {
      if (o.status === 'CANCELADO') return;

      (o.items || []).forEach((item) => {
        const pId = item.productId || item.id;
        const normalizedName = (item.name || '').trim();
        if (!normalizedName) return;

        const key = pId || normalizedName.toLowerCase();
        const catalogProd = findCatalogProduct(pId, normalizedName);

        if (!productAgg[key]) {
          productAgg[key] = {
            id: pId || key,
            name: normalizedName,
            image: catalogProd?.image || item.image || '',
            thumbnailUrl: catalogProd?.thumbnailUrl || item.thumbnailUrl || '',
            catalogProd,
            quantity: 0,
            revenue: 0,
            estimatedCost: 0,
          };
        }

        const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
        const unitPrice = Number(item.unitPrice ?? item.price ?? item.basePrice) || 0;
        const subtotal = Math.round((Number(item.subtotal) || (unitPrice * qty)) * 100) / 100;

        const unitCost = Number(
          item.cost ??
          (pId ? productCostMap[pId] : null) ??
          productCostMap[normalizedName.toLowerCase()] ??
          0
        ) || 0;

        productAgg[key].quantity += qty;
        productAgg[key].revenue = Math.round((productAgg[key].revenue + subtotal) * 100) / 100;
        productAgg[key].estimatedCost = Math.round((productAgg[key].estimatedCost + (unitCost * qty)) * 100) / 100;
      });
    });

    const list = Object.values(productAgg).map((p) => {
      const profit = Math.round((p.revenue - p.estimatedCost) * 100) / 100;
      const margin = p.revenue > 0 ? Math.round(((profit / p.revenue) * 100) * 10) / 10 : 0;
      return {
        ...p,
        profit,
        margin,
      };
    });

    return {
      byQuantity: [...list].sort((a, b) => b.quantity - a.quantity).slice(0, 7),
      byRevenue: [...list].sort((a, b) => b.revenue - a.revenue).slice(0, 7),
    };
  }, [currentOrders, productCostMap, findCatalogProduct]);

  // Series para Gráficos: Evolución por Turno/Día y Flujo por Hora
  const { dailyFinanceSeries, hourlySalesSeries } = useMemo(() => {
    const dailyMap = {};
    const hourlyMap = {};

    currentOrders.forEach((o) => {
      if (o.status === 'CANCELADO') return;
      const d = o.createdAt instanceof Date ? o.createdAt : parseToDate(o.createdAt);
      if (!d || isNaN(d.getTime())) return;

      const shiftKey = getShiftDateString(d);
      if (!dailyMap[shiftKey]) {
        dailyMap[shiftKey] = {
          key: shiftKey,
          label: formatShiftDisplayDate(shiftKey).slice(0, 5),
          fullLabel: formatShiftDisplayDate(shiftKey),
          sales: 0,
          cogs: 0,
          expenses: 0,
          ordersCount: 0,
        };
      }

      const orderTotal = Number(o.total) || 0;
      let orderCogs = 0;
      (o.items || []).forEach((item) => {
        const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
        const pId = item.productId || item.id;
        const unitCost = Number(
          item.cost ??
          (pId ? productCostMap[pId] : null) ??
          productCostMap[(item.name || '').trim().toLowerCase()] ??
          0
        ) || 0;
        orderCogs += unitCost * qty;
      });

      dailyMap[shiftKey].sales = Math.round((dailyMap[shiftKey].sales + orderTotal) * 100) / 100;
      dailyMap[shiftKey].cogs = Math.round((dailyMap[shiftKey].cogs + orderCogs) * 100) / 100;
      dailyMap[shiftKey].ordersCount += 1;

      const h = d.getHours();
      if (!hourlyMap[h]) {
        hourlyMap[h] = {
          hour: h,
          key: `h_${h}`,
          label: `${String(h).padStart(2, '0')}h`,
          fullLabel: `${String(h).padStart(2, '0')}:00 - ${String((h + 1) % 24).padStart(2, '0')}:00`,
          sales: 0,
          ordersCount: 0,
        };
      }
      hourlyMap[h].sales = Math.round((hourlyMap[h].sales + orderTotal) * 100) / 100;
      hourlyMap[h].ordersCount += 1;
    });

    currentExpenses.forEach((e) => {
      const shiftKey = getShiftDateString(e.date);
      if (!shiftKey) return;
      if (!dailyMap[shiftKey]) {
        dailyMap[shiftKey] = {
          key: shiftKey,
          label: formatShiftDisplayDate(shiftKey).slice(0, 5),
          fullLabel: formatShiftDisplayDate(shiftKey),
          sales: 0,
          cogs: 0,
          expenses: 0,
          ordersCount: 0,
        };
      }
      dailyMap[shiftKey].expenses = Math.round((dailyMap[shiftKey].expenses + (Number(e.amount) || 0)) * 100) / 100;
    });

    const dailyList = Object.values(dailyMap)
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-14)
      .map((d) => ({
        ...d,
        netProfit: Math.round((d.sales - d.cogs - d.expenses) * 100) / 100,
      }));

    // Ordenar horas según jornada operativa (04h -> 03h)
    const hourlyListRaw = Object.values(hourlyMap).sort((a, b) => {
      const shiftH = (h) => (h < 4 ? h + 24 : h);
      return shiftH(a.hour) - shiftH(b.hour);
    });
    const maxHourSales = Math.max(0, ...hourlyListRaw.map((h) => h.sales));
    const hourlyList = hourlyListRaw.map((h) => ({
      ...h,
      isPeak: maxHourSales > 0 && h.sales === maxHourSales,
    }));

    return { dailyFinanceSeries: dailyList, hourlySalesSeries: hourlyList };
  }, [currentOrders, currentExpenses, productCostMap]);

  // Análisis de Combinaciones (Cross-Selling)
  const productCombinations = useMemo(() => {
    const pairCount = {};

    currentOrders.forEach((o) => {
      if (o.status === 'CANCELADO') return;
      const items = (o.items || []).filter((i) => i.name);
      if (items.length < 2) return;

      const uniqueNames = Array.from(new Set(items.map((i) => i.name.trim())));

      for (let i = 0; i < uniqueNames.length; i++) {
        for (let j = i + 1; j < uniqueNames.length; j++) {
          const a = uniqueNames[i];
          const b = uniqueNames[j];
          const pairKey = [a, b].sort().join(' + ');

          if (!pairCount[pairKey]) {
            pairCount[pairKey] = {
              pair: pairKey,
              itemA: a,
              itemB: b,
              count: 0,
              totalRevenue: 0,
            };
          }
          pairCount[pairKey].count += 1;
          pairCount[pairKey].totalRevenue = Math.round((pairCount[pairKey].totalRevenue + (Number(o.total) || 0)) * 100) / 100;
        }
      }
    });

    return Object.values(pairCount)
      .map((p) => ({
        ...p,
        avgOrderTotal: p.count > 0 ? Math.round((p.totalRevenue / p.count) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [currentOrders]);

  // Helper para mostrar variación porcentual
  const renderDelta = (currentVal, prevVal) => {
    if (!enableComparison || !prevVal || prevVal === 0) return null;
    const delta = ((currentVal - prevVal) / prevVal) * 100;
    const isUp = delta >= 0;
    return (
      <span
        className={`inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.2 rounded-md ${
          isUp ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/30' : 'text-rose-400 bg-rose-950/60 border border-rose-500/30'
        }`}
      >
        {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        <span>{isUp ? '+' : ''}{delta.toFixed(1)}%</span>
      </span>
    );
  };

  // Segmentos para Donuts
  const paymentSegments = [
    { id: 'EFECTIVO', label: 'Efectivo', value: metrics.current.paymentMethods.EFECTIVO, hex: '#10B981' },
    { id: 'YAPE', label: 'Yape', value: metrics.current.paymentMethods.YAPE, hex: '#A855F7' },
    { id: 'PLIN', label: 'Plin', value: metrics.current.paymentMethods.PLIN, hex: '#06B6D4' },
    { id: 'TARJETA', label: 'Tarjeta / POS', value: metrics.current.paymentMethods.TARJETA, hex: '#3B82F6' },
  ];

  const modalitySegments = [
    { id: 'MESA', label: 'Salón (Mesas)', value: metrics.current.modalities.MESA, hex: '#FD8B00' },
    { id: 'DELIVERY', label: 'Delivery', value: metrics.current.modalities.DELIVERY, hex: '#10B981' },
    { id: 'PARA_LLEVAR', label: 'Para Llevar', value: metrics.current.modalities.PARA_LLEVAR, hex: '#F59E0B' },
    { id: 'MARKET', label: 'Market / Rápida', value: metrics.current.modalities.MARKET, hex: '#3B82F6' },
  ];

  const financeDistributionSegments = [
    { id: 'cogs', label: 'Insumos (COGS)', value: Math.max(0, metrics.current.cogs), hex: '#F97316' },
    { id: 'expenses', label: 'Gastos Operativos', value: Math.max(0, metrics.current.totalExpenses), hex: '#F43F5E' },
    { id: 'net', label: 'Ganancia Neta', value: Math.max(0, metrics.current.netProfit), hex: '#10B981' },
  ];

  const cogsPctOfSales = metrics.current.sales > 0
    ? (metrics.current.cogs / metrics.current.sales) * 100
    : 0;
  const expensesPctOfSales = metrics.current.sales > 0
    ? (metrics.current.totalExpenses / metrics.current.sales) * 100
    : 0;
  const paidPctOfSales = metrics.current.sales > 0
    ? Math.min(100, (metrics.current.paid / metrics.current.sales) * 100)
    : 0;

  return (
    <div className="space-y-4 pb-20 lg:pb-8">
      {/* Selector de Rango y Controles */}
      <div className="bg-[var(--color-porkos-surface)] p-3 sm:p-3.5 rounded-2xl border border-[var(--color-porkos-border)] space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 flex-wrap bg-black/50 p-1 rounded-xl border border-zinc-800 text-xs font-bold">
            {[
              { id: DATE_RANGES.TODAY, label: 'Hoy' },
              { id: DATE_RANGES.YESTERDAY, label: 'Ayer' },
              { id: DATE_RANGES.THIS_WEEK, label: 'Esta Semana' },
              { id: DATE_RANGES.THIS_MONTH, label: 'Este Mes' },
              { id: DATE_RANGES.ALL, label: 'Todo' },
              { id: DATE_RANGES.CUSTOM, label: 'Rango' },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setDateRange(btn.id)}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  dateRange === btn.id
                    ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs de Rango Personalizado & Switch de Comparar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800/80 text-xs">
          {dateRange === DATE_RANGES.CUSTOM ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-zinc-400 font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Desde:
              </span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                onClick={(e) => e.target.showPicker?.()}
                style={{ colorScheme: 'dark' }}
                className="bg-black/70 border border-zinc-700 rounded-lg px-2 py-1 text-white text-xs font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)] cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
              <span className="text-zinc-400 font-semibold">Hasta:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                onClick={(e) => e.target.showPicker?.()}
                style={{ colorScheme: 'dark' }}
                className="bg-black/70 border border-zinc-700 rounded-lg px-2 py-1 text-white text-xs font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)] cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
            </div>
          ) : (
            <div className="text-zinc-400 text-xs">
              <span className="font-semibold text-zinc-300">
                {dateRange === DATE_RANGES.TODAY
                  ? `Turno de hoy (${formatShiftDisplayDate(getShiftDateString())} • 4:00 am a 3:59 am)`
                  : dateRange === DATE_RANGES.YESTERDAY
                  ? `Turno de ayer (${formatShiftDisplayDate(getPreviousShiftDateString())} • 4:00 am a 3:59 am)`
                  : dateRange === DATE_RANGES.THIS_WEEK
                  ? 'Semana en curso (turnos 4:00 am a 3:59 am)'
                  : dateRange === DATE_RANGES.THIS_MONTH
                  ? 'Mes en curso (turnos 4:00 am a 3:59 am)'
                  : 'Historial completo acumulado'}
              </span>
            </div>
          )}

          {dateRange !== DATE_RANGES.ALL && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enableComparison}
                onChange={(e) => setEnableComparison(e.target.checked)}
                className="w-4 h-4 accent-[var(--color-porkos-orange)] rounded cursor-pointer"
              />
              <span className="text-zinc-300 font-semibold">
                Comparar con período anterior
              </span>
            </label>
          )}
        </div>
      </div>

      {/* Pestañas de Navegación del Dashboard */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {DASHBOARD_TABS.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer border active:scale-95 shadow-sm
                ${
                  isSelected
                    ? 'bg-[var(--color-porkos-orange)] text-black border-transparent font-black shadow-orange-500/20'
                    : 'bg-zinc-900/90 text-zinc-400 hover:text-white border-zinc-800'
                }
              `}
            >
              <Icon className={`w-4 h-4 ${isSelected ? 'text-black' : 'text-zinc-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* --- PESTAÑA 1: RESUMEN GENERAL & TOPS --- */}
      {/* ============================================================== */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-4">
          {/* KPI Cards Principales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase tracking-wider">
                <span>Ventas Brutas</span>
                <DollarSign className="w-4 h-4 text-[var(--color-porkos-orange)]" />
              </div>
              <div className="flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-xl sm:text-2xl font-black text-white tracking-tight tabular-nums">
                  {formatCurrency(metrics.current.sales)}
                </span>
                {renderDelta(metrics.current.sales, metrics.previous.sales)}
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold block">
                {formatCurrency(metrics.current.paid)} cobrado
              </span>
            </div>

            <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase tracking-wider">
                <span>N° Pedidos</span>
                <ShoppingCart className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-xl sm:text-2xl font-black text-white tracking-tight tabular-nums">
                  {metrics.current.count}
                </span>
                {renderDelta(metrics.current.count, metrics.previous.count)}
              </div>
              <span className="text-[11px] text-zinc-400 font-medium block">
                {metrics.current.itemCount} platos/ítems servidos
              </span>
            </div>

            <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase tracking-wider">
                <span>Ticket Promedio</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-xl sm:text-2xl font-black text-white tracking-tight tabular-nums">
                  {formatCurrency(metrics.current.avgTicket)}
                </span>
                {renderDelta(metrics.current.avgTicket, metrics.previous.avgTicket)}
              </div>
              <span className="text-[11px] text-zinc-400 font-medium block">
                Gasto promedio por comanda
              </span>
            </div>

            <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase tracking-wider">
                <span>Balance Operativo</span>
                <Wallet className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline justify-between gap-1 flex-wrap">
                <span
                  className={`text-xl sm:text-2xl font-black tracking-tight tabular-nums ${
                    metrics.current.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatCurrency(metrics.current.netProfit)}
                </span>
                {renderDelta(metrics.current.netProfit, metrics.previous.netProfit)}
              </div>
              <span className="text-[11px] text-zinc-400 font-medium block">
                Margen neto: {metrics.current.netMargin.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Grids de Tops de Ventas con Miniaturas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top por Cantidad */}
            <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 sm:p-5 rounded-2xl space-y-3.5">
              <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[var(--color-porkos-orange)]" />
                  <span>Productos Más Vendidos (Volumen)</span>
                </h3>
                <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Top 7</span>
              </div>

              {topProducts.byQuantity.length === 0 ? (
                <p className="text-xs text-zinc-500 py-8 text-center">No hay ventas registradas en este período</p>
              ) : (
                <div className="space-y-2.5">
                  {topProducts.byQuantity.map((prod, idx) => {
                    const maxQty = topProducts.byQuantity[0]?.quantity || 1;
                    const pct = (prod.quantity / maxQty) * 100;
                    const isTop3 = idx < 3;
                    return (
                      <div
                        key={prod.id || prod.name}
                        className={`p-2.5 rounded-xl border transition-all flex items-center gap-3 ${
                          idx === 0
                            ? 'bg-orange-500/8 border-orange-500/30'
                            : 'bg-black/35 border-zinc-800/70'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <ProductThumbnail
                            src={prod.image}
                            thumbnailUrl={prod.thumbnailUrl}
                            name={prod.name}
                            isBeverage={prod.catalogProd ? isProductBeverage(prod.catalogProd) : undefined}
                            isDessert={prod.catalogProd ? isProductDessert(prod.catalogProd) : undefined}
                            className="w-11 h-11 rounded-xl"
                            iconSize="w-5 h-5"
                          />
                          <span
                            className={`absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center border shadow-sm ${
                              idx === 0
                                ? 'bg-[var(--color-porkos-orange)] text-black border-orange-300'
                                : isTop3
                                ? 'bg-zinc-200 text-zinc-950 border-white'
                                : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex justify-between items-center gap-2 text-xs">
                            <span className="font-bold text-white truncate">{prod.name}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono font-black text-amber-400 tabular-nums">
                                {prod.quantity} und.
                              </span>
                              <span className="text-[11px] font-bold text-zinc-400 tabular-nums">
                                ({formatCurrency(prod.revenue)})
                              </span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[var(--color-porkos-orange)] to-amber-400 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top por Recaudación */}
            <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 sm:p-5 rounded-2xl space-y-3.5">
              <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Productos Líderes en Ingresos</span>
                </h3>
                <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Recaudación S/</span>
              </div>

              {topProducts.byRevenue.length === 0 ? (
                <p className="text-xs text-zinc-500 py-8 text-center">No hay ventas registradas en este período</p>
              ) : (
                <div className="space-y-2.5">
                  {topProducts.byRevenue.map((prod, idx) => {
                    const maxRev = topProducts.byRevenue[0]?.revenue || 1;
                    const pct = (prod.revenue / maxRev) * 100;
                    const isTop3 = idx < 3;
                    return (
                      <div
                        key={prod.id || prod.name}
                        className={`p-2.5 rounded-xl border transition-all flex items-center gap-3 ${
                          idx === 0
                            ? 'bg-emerald-500/8 border-emerald-500/30'
                            : 'bg-black/35 border-zinc-800/70'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <ProductThumbnail
                            src={prod.image}
                            thumbnailUrl={prod.thumbnailUrl}
                            name={prod.name}
                            className="w-11 h-11 rounded-xl"
                            iconSize="w-5 h-5"
                          />
                          <span
                            className={`absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center border shadow-sm ${
                              idx === 0
                                ? 'bg-emerald-400 text-black border-emerald-200'
                                : isTop3
                                ? 'bg-zinc-200 text-zinc-950 border-white'
                                : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex justify-between items-center gap-2 text-xs">
                            <span className="font-bold text-white truncate">{prod.name}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {prod.estimatedCost > 0 && (
                                <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/25">
                                  {prod.margin.toFixed(0)}% mg
                                </span>
                              )}
                              <span className="font-mono font-black text-emerald-400 tabular-nums">
                                {formatCurrency(prod.revenue)}
                              </span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Gráfico de Ritmo por Hora */}
          <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 sm:p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-zinc-800">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--color-porkos-orange)]" />
                <span>Ritmo de Ventas por Hora del Turno</span>
              </h3>
              <span className="text-[11px] text-zinc-400">
                La barra naranja marca la <strong className="text-[var(--color-porkos-orange)]">hora punta</strong> de facturación
              </span>
            </div>
            <FinancialBarChart
              data={hourlySalesSeries}
              showExpenses={false}
              emptyText="Registra pedidos para visualizar las horas de mayor demanda"
            />
          </div>

          {/* Gráficos Donut: Canales y Medios de Pago */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 sm:p-5 rounded-2xl space-y-3">
              <h3 className="font-bold text-sm text-white">Canales & Modalidades (Pedidos)</h3>
              <DonutChart
                segments={modalitySegments}
                centerLabel="Pedidos"
                centerValue={`${metrics.current.count}`}
                formatValue={(v) => `${v} ped.`}
              />
            </div>

            <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 sm:p-5 rounded-2xl space-y-3">
              <h3 className="font-bold text-sm text-white">Medios de Pago Cobrados</h3>
              <DonutChart
                segments={paymentSegments}
                centerLabel="Cobrado"
                formatValue={formatCurrency}
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* --- PESTAÑA 2: FINANZAS & BALANCE VISUAL --- */}
      {/* ============================================================== */}
      {activeTab === 'FINANCES' && (
        <div className="space-y-4">
          {/* 4 KPI Financieros */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                <span>Ingresos Totales</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white tabular-nums">
                {formatCurrency(metrics.current.sales)}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-semibold">
                  <span className="text-emerald-400">Cobrado: {paidPctOfSales.toFixed(0)}%</span>
                  {metrics.current.pending > 0 && (
                    <span className="text-amber-400">Pend: {formatCurrency(metrics.current.pending)}</span>
                  )}
                </div>
                <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${paidPctOfSales}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                <span>Costo Insumos (COGS)</span>
                <Flame className="w-4 h-4 text-orange-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-orange-400 tabular-nums">
                {formatCurrency(metrics.current.cogs)}
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400 font-medium">{cogsPctOfSales.toFixed(1)}% de las ventas</span>
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                    cogsPctOfSales <= 38
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-amber-500/15 text-amber-300'
                  }`}
                >
                  {cogsPctOfSales <= 38 ? 'Óptimo' : 'Alto'}
                </span>
              </div>
            </div>

            <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                <span>Gastos & Compras</span>
                <Receipt className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-rose-400 tabular-nums">
                {formatCurrency(metrics.current.totalExpenses)}
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400 font-medium">{expensesPctOfSales.toFixed(1)}% de ventas</span>
                <span className="text-[10px] font-bold text-zinc-400">
                  {currentExpenses.length} registros
                </span>
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border space-y-2 ${
                metrics.current.netProfit >= 0
                  ? 'bg-gradient-to-br from-emerald-950/35 to-[#121215] border-emerald-500/40'
                  : 'bg-gradient-to-br from-rose-950/35 to-[#121215] border-rose-500/40'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                <span>Utilidad Neta</span>
                <Wallet className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline justify-between gap-1 flex-wrap">
                <span
                  className={`text-xl sm:text-2xl font-black tabular-nums ${
                    metrics.current.netProfit >= 0 ? 'text-emerald-300' : 'text-rose-400'
                  }`}
                >
                  {formatCurrency(metrics.current.netProfit)}
                </span>
                {renderDelta(metrics.current.netProfit, metrics.previous.netProfit)}
              </div>
              <span className="text-[11px] text-zinc-300 font-semibold block">
                Margen Operativo: <strong className="text-white">{metrics.current.netMargin.toFixed(1)}%</strong>
              </span>
            </div>
          </div>

          {/* Fila 2: Cascada P&L Visual + Donut "¿A dónde va cada Sol?" */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 sm:p-5 rounded-2xl space-y-3.5">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[var(--color-porkos-orange)]" />
                  <span>Cascada de Resultados (P&amp;L Visual)</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Visualiza cómo las ventas brutas se transforman en utilidad neta tras insumos y egresos
                </p>
              </div>

              <FinancialWaterfall
                sales={metrics.current.sales}
                cogs={metrics.current.cogs}
                grossProfit={metrics.current.grossProfit}
                totalExpenses={metrics.current.totalExpenses}
                netProfit={metrics.current.netProfit}
              />
            </div>

            <div className="lg:col-span-5 bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 sm:p-5 rounded-2xl space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="font-black text-sm sm:text-base text-white">
                  ¿A dónde se va cada Sol ingresado?
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Proporción visual entre costo de carta, gastos operativos y ganancia real
                </p>
              </div>

              <DonutChart
                segments={financeDistributionSegments}
                centerLabel="Margen Neto"
                centerValue={`${metrics.current.netMargin.toFixed(1)}%`}
                formatValue={formatCurrency}
                size={156}
              />
            </div>
          </div>

          {/* Fila 3: Evolución Histórica Ventas vs Egresos + Gastos por Categoría */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 sm:p-5 rounded-2xl space-y-3">
              <div>
                <h4 className="font-black text-sm sm:text-base text-white">
                  Flujo Comparativo por Turno (Ventas vs Insumos + Gastos)
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Últimos 14 turnos con movimiento en el rango seleccionado
                </p>
              </div>

              <FinancialBarChart
                data={dailyFinanceSeries}
                showExpenses={true}
                emptyText="Registra ventas o gastos para ver el flujo comparativo por día"
              />
            </div>

            <div className="lg:col-span-5 bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 sm:p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-800">
                <div>
                  <h4 className="font-black text-sm sm:text-base text-white">
                    Egresos por Categoría
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Distribución del total gastado ({formatCurrency(metrics.current.totalExpenses)})
                  </p>
                </div>
              </div>

              <ExpenseCategoryBars expenses={currentExpenses} />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* --- PESTAÑA 3: SIMULADOR DE COSTOS & RENTABILIDAD --- */}
      {/* ============================================================== */}
      {activeTab === 'SIMULATION' && (
        <ProfitSimulatorTab products={products} />
      )}

      {/* ============================================================== */}
      {/* --- PESTAÑA 4: COMBINACIONES POPULARES (CROSS-SELLING) --- */}
      {/* ============================================================== */}
      {activeTab === 'COMBINATIONS' && (
        <div className="space-y-4">
          <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 sm:p-5 rounded-2xl space-y-3">
            <div>
              <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>¿Qué platos y bebidas se piden juntos con más frecuencia?</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Detecta qué combinaciones salen más para crear combos promocionales y aumentar la rentabilidad de tu carta
              </p>
            </div>

            {productCombinations.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-xs">
                Se requieren pedidos con 2 o más productos para identificar combinaciones frecuentes.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 pt-2">
                {productCombinations.map((combo, idx) => {
                  const prodA = findCatalogProduct(null, combo.itemA);
                  const prodB = findCatalogProduct(null, combo.itemB);
                  return (
                    <div
                      key={combo.pair}
                      className="p-4 rounded-2xl bg-black/40 border border-zinc-800 hover:border-purple-500/40 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-black text-purple-400 uppercase tracking-wider">
                          Combo Frecuente #{idx + 1}
                        </span>
                        <span className="text-xs font-black px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-500/30">
                          {combo.count} pedidos juntos
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1 shrink-0">
                          <ProductThumbnail
                            src={prodA?.image}
                            thumbnailUrl={prodA?.thumbnailUrl}
                            name={combo.itemA}
                            className="w-11 h-11 rounded-xl"
                            iconSize="w-5 h-5"
                          />
                          <span className="text-xs font-black text-[var(--color-porkos-orange)]">+</span>
                          <ProductThumbnail
                            src={prodB?.image}
                            thumbnailUrl={prodB?.thumbnailUrl}
                            name={combo.itemB}
                            className="w-11 h-11 rounded-xl"
                            iconSize="w-5 h-5"
                          />
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="font-extrabold text-xs sm:text-sm text-white truncate">
                            {combo.itemA}
                          </div>
                          <div className="font-bold text-xs text-zinc-300 truncate">
                            + {combo.itemB}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                        <span>Ticket Promedio:</span>
                        <span className="font-mono font-black text-emerald-400">
                          {formatCurrency(combo.avgOrderTotal)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* --- PESTAÑA 5: PORKO INTELLIGENCE (IA PARA TOMA DE DECISIONES) --- */}
      {/* ============================================================== */}
      {activeTab === 'INSIGHTS' && (
        <PorkoIntelligenceTab
          metrics={metrics}
          currentOrders={currentOrders}
          currentExpenses={currentExpenses}
          products={products}
          productCombinations={productCombinations}
          enableComparison={enableComparison}
          findCatalogProduct={findCatalogProduct}
        />
      )}
    </div>
  );
}

// Subcomponente aislado del Simulador de Precios & Costos
function ProfitSimulatorTab({ products = [] }) {
  const [selectedSimProductId, setSelectedSimProductId] = useState(() => products[0]?.id || '');
  const [simQuantity, setSimQuantity] = useState(50);
  const [simPrice, setSimPrice] = useState('');
  const [simCost, setSimCost] = useState('');

  const activeProduct = useMemo(() => {
    return products.find((p) => p.id === selectedSimProductId) || products[0] || null;
  }, [products, selectedSimProductId]);

  const effectivePrice = simPrice !== '' ? simPrice : (activeProduct?.price || 0).toString();
  const effectiveCost = simCost !== '' ? simCost : (activeProduct?.cost || 0).toString();

  const handleSelectSimProduct = (prodId) => {
    setSelectedSimProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setSimPrice((prod.price || 0).toString());
      setSimCost((prod.cost || 0).toString());
    }
  };

  const simulationResults = useMemo(() => {
    const qty = Math.max(1, parseInt(simQuantity, 10) || 1);
    const price = Math.max(0, parseFloat(effectivePrice) || 0);
    const cost = Math.max(0, parseFloat(effectiveCost) || 0);

    const projectedRevenue = qty * price;
    const projectedCost = qty * cost;
    const projectedProfit = projectedRevenue - projectedCost;
    const profitMargin = projectedRevenue > 0 ? (projectedProfit / projectedRevenue) * 100 : 0;
    const unitProfit = price - cost;

    let healthBadge = { text: 'Margen Equilibrado', color: 'text-amber-400 bg-amber-950/40 border-amber-500/30' };
    if (profitMargin >= 60) {
      healthBadge = { text: '🌟 Altamente Rentable (>60%)', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30' };
    } else if (profitMargin < 35) {
      healthBadge = { text: '⚠️ Margen Ajustado (<35%)', color: 'text-rose-400 bg-rose-950/40 border-rose-500/30' };
    }

    return {
      qty,
      price,
      cost,
      projectedRevenue,
      projectedCost,
      projectedProfit,
      profitMargin,
      unitProfit,
      healthBadge,
    };
  }, [simQuantity, effectivePrice, effectiveCost]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start max-w-5xl">
      {/* Controles del Simulador */}
      <div className="lg:col-span-7 bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 sm:p-5 rounded-2xl space-y-4">
        <div className="flex items-center gap-3">
          {activeProduct && (
            <ProductThumbnail
              src={activeProduct.image}
              thumbnailUrl={activeProduct.thumbnailUrl}
              name={activeProduct.name}
              className="w-12 h-12 rounded-xl shrink-0"
              iconSize="w-6 h-6"
            />
          )}
          <div>
            <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[var(--color-porkos-orange)]" />
              <span>Simulador de Precios, Costos y Volumen</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Modela escenarios: ¿Qué pasa si vendes más unidades o ajustas tus precios y costos?
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-zinc-300 font-bold mb-1">
              Producto de Referencia (Desde tu catálogo)
            </label>
            <select
              value={activeProduct?.id || ''}
              onChange={(e) => handleSelectSimProduct(e.target.value)}
              className="w-full bg-black/60 border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)] cursor-pointer"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Venta: S/ {p.price} • Costo: S/ {p.cost || 0})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 bg-black/40 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center font-bold">
              <span className="text-zinc-300">Unidades a Vender (Proyección):</span>
              <span className="font-mono text-base text-[var(--color-porkos-orange)] font-black">
                {simQuantity} und.
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="500"
              step="5"
              value={simQuantity}
              onChange={(e) => setSimQuantity(e.target.value)}
              className="w-full accent-[var(--color-porkos-orange)] cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-bold mb-1">
                Precio de Venta Unitario (S/)
              </label>
              <input
                type="number"
                step="0.50"
                value={effectivePrice}
                onChange={(e) => setSimPrice(e.target.value)}
                className="w-full bg-black/60 border border-zinc-700 rounded-xl px-3 py-2 text-white font-black text-sm focus:outline-none focus:border-[var(--color-porkos-orange)]"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-bold mb-1">
                Costo de Insumos Unitario (S/)
              </label>
              <input
                type="number"
                step="0.50"
                value={effectiveCost}
                onChange={(e) => setSimCost(e.target.value)}
                className="w-full bg-black/60 border border-zinc-700 rounded-xl px-3 py-2 text-white font-black text-sm focus:outline-none focus:border-[var(--color-porkos-orange)]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Resultados de la Simulación */}
      <div className="lg:col-span-5 bg-gradient-to-b from-[#161616] to-[#0f0f0f] border border-zinc-800 p-4 sm:p-5 rounded-2xl space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <h4 className="font-black text-sm text-white">Resultado de la Simulación</h4>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${simulationResults.healthBadge.color}`}>
            {simulationResults.healthBadge.text}
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between p-2.5 rounded-xl bg-black/40">
            <span className="text-zinc-400">Ingreso Bruto Proyectado:</span>
            <span className="font-mono font-black text-white text-sm">
              {formatCurrency(simulationResults.projectedRevenue)}
            </span>
          </div>

          <div className="flex justify-between p-2.5 rounded-xl bg-black/40">
            <span className="text-zinc-400">Costo Total de Insumos:</span>
            <span className="font-mono font-bold text-orange-400">
              -{formatCurrency(simulationResults.projectedCost)}
            </span>
          </div>

          <div className="flex justify-between p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
            <span className="text-emerald-300 font-bold">Ganancia Bruta Proyectada:</span>
            <span className="font-mono font-black text-emerald-400 text-base">
              {formatCurrency(simulationResults.projectedProfit)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-black/60 border border-zinc-800 space-y-1">
            <div className="flex justify-between text-zinc-300 font-bold">
              <span>Margen de Ganancia:</span>
              <span className="text-amber-400 font-mono font-black text-sm">
                {simulationResults.profitMargin.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-zinc-400 text-[11px]">
              <span>Ganancia Neta por Plato:</span>
              <span className="font-mono font-bold text-white">
                +{formatCurrency(simulationResults.unitProfit)} c/u
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
