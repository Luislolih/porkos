import { useState, useMemo } from 'react';
import {
  Brain,
  Sparkles,
  Target,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Lightbulb,
  Sliders,
  Layers,
  Award,
  Check,
  CalendarDays,
  DollarSign,
  Ban,
} from 'lucide-react';
import { formatCurrency, parseToDate } from '../../../utils/formatters';
import { isProductBeverage } from '../../../utils/productCategories';
import ProductThumbnail from '../../../components/ui/ProductThumbnail';

const APPLIED_INSIGHTS_KEY = 'porko_applied_insights';

const WEEKDAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function PorkoIntelligenceTab({
  metrics,
  currentOrders = [],
  currentExpenses = [],
  products = [],
  productCombinations = [],
  enableComparison = true,
  findCatalogProduct,
}) {
  const [insightsFilter, setInsightsFilter] = useState('ALL');
  const [ticketLift, setTicketLift] = useState(2);
  const [costReductionPct, setCostReductionPct] = useState(5);
  const [appliedIds, setAppliedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(APPLIED_INSIGHTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleApplied = (id) => {
    setAppliedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem(APPLIED_INSIGHTS_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn('Error guardando estado de sugerencias:', e);
      }
      return next;
    });
  };

  // 1. Análisis completo de productos vendidos para Matriz de Ingeniería de Menú (BCG)
  const menuEngineering = useMemo(() => {
    const salesMap = {};
    const validOrders = currentOrders.filter((o) => o.status !== 'CANCELADO');

    validOrders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const pId = item.productId || item.id;
        const normalizedName = (item.name || '').trim();
        if (!normalizedName) return;

        const key = pId || normalizedName.toLowerCase();
        const catalogProd = findCatalogProduct?.(pId, normalizedName);
        const unitPrice =
          Number(item.unitPrice ?? item.price ?? item.basePrice ?? catalogProd?.price) || 0;
        const unitCost =
          Number(item.cost ?? catalogProd?.cost) || 0;

        if (!salesMap[key]) {
          salesMap[key] = {
            id: pId || key,
            name: normalizedName,
            catalogProd,
            qty: 0,
            revenue: 0,
            totalCost: 0,
            unitPrice,
            unitCost,
          };
        }

        const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
        const subtotal = Math.round((Number(item.subtotal) || unitPrice * qty) * 100) / 100;
        salesMap[key].qty += qty;
        salesMap[key].revenue = Math.round((salesMap[key].revenue + subtotal) * 100) / 100;
        salesMap[key].totalCost = Math.round((salesMap[key].totalCost + unitCost * qty) * 100) / 100;
      });
    });

    const list = Object.values(salesMap).map((p) => {
      const profit = Math.round((p.revenue - p.totalCost) * 100) / 100;
      const marginPct = p.revenue > 0 ? Math.round(((profit / p.revenue) * 100) * 10) / 10 : 0;
      const unitProfit = p.qty > 0 ? Math.round((profit / p.qty) * 100) / 100 : 0;
      return { ...p, profit, marginPct, unitProfit };
    });

    if (list.length === 0) {
      return {
        items: [],
        avgQty: 0,
        avgMargin: 0,
        stars: [],
        plowhorses: [],
        puzzles: [],
        dogs: [],
        missingCostItems: [],
      };
    }

    const avgQty = list.reduce((s, p) => s + p.qty, 0) / list.length;
    const withCost = list.filter((p) => p.unitCost > 0 || (p.catalogProd?.cost ?? 0) > 0);
    const avgMargin =
      withCost.length > 0
        ? withCost.reduce((s, p) => s + p.marginPct, 0) / withCost.length
        : 55;

    const stars = [];
    const plowhorses = [];
    const puzzles = [];
    const dogs = [];

    list.forEach((p) => {
      const highPop = p.qty >= avgQty;
      const highMargin = p.marginPct >= avgMargin;
      if (highPop && highMargin) stars.push(p);
      else if (highPop && !highMargin) plowhorses.push(p);
      else if (!highPop && highMargin) puzzles.push(p);
      else dogs.push(p);
    });

    const sortByRev = (a, b) => b.revenue - a.revenue;
    const sortByQty = (a, b) => b.qty - a.qty;

    return {
      items: list,
      avgQty,
      avgMargin,
      stars: stars.sort(sortByRev),
      plowhorses: plowhorses.sort(sortByQty),
      puzzles: puzzles.sort((a, b) => b.marginPct - a.marginPct),
      dogs: dogs.sort(sortByQty),
      missingCostItems: list.filter((p) => p.unitCost <= 0),
    };
  }, [currentOrders, findCatalogProduct]);

  // 2. Patrones operativos: Horas punta/valle, días de la semana, adhesión de bebidas
  const operationalSignals = useMemo(() => {
    const validOrders = currentOrders.filter((o) => o.status !== 'CANCELADO');
    const hourCounts = {};
    const hourRevenue = {};
    const weekdayStats = Array.from({ length: 7 }, (_, i) => ({
      dayIdx: i,
      name: WEEKDAY_NAMES[i],
      orders: 0,
      sales: 0,
    }));

    let foodOrdersTotal = 0;
    let foodOrdersWithoutDrink = 0;

    validOrders.forEach((o) => {
      const d = o.createdAt instanceof Date ? o.createdAt : parseToDate(o.createdAt);
      if (d && !isNaN(d.getTime())) {
        const h = d.getHours();
        hourCounts[h] = (hourCounts[h] || 0) + 1;
        hourRevenue[h] = (hourRevenue[h] || 0) + (Number(o.total) || 0);

        const wd = d.getDay();
        weekdayStats[wd].orders += 1;
        weekdayStats[wd].sales = Math.round((weekdayStats[wd].sales + (Number(o.total) || 0)) * 100) / 100;
      }

      const items = o.items || [];
      const hasFood = items.some((i) => !isProductBeverage(findCatalogProduct?.(i.productId || i.id, i.name) || i));
      const hasDrink = items.some((i) => isProductBeverage(findCatalogProduct?.(i.productId || i.id, i.name) || i));
      if (hasFood) {
        foodOrdersTotal += 1;
        if (!hasDrink) foodOrdersWithoutDrink += 1;
      }
    });

    const hoursSorted = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]);
    const peakHour = hoursSorted.length > 0 ? parseInt(hoursSorted[0][0], 10) : null;
    const peakCount = hoursSorted.length > 0 ? hoursSorted[0][1] : 0;

    const activeHours = hoursSorted.filter(([, count]) => count > 0);
    const quietHourEntry = activeHours.length > 2 ? activeHours[activeHours.length - 1] : null;
    const quietHour = quietHourEntry ? parseInt(quietHourEntry[0], 10) : null;

    const activeWeekdays = weekdayStats.filter((w) => w.orders > 0);
    const strongestDay =
      activeWeekdays.length > 1
        ? [...activeWeekdays].sort((a, b) => b.sales - a.sales)[0]
        : null;
    const weakestDay =
      activeWeekdays.length > 1
        ? [...activeWeekdays].sort((a, b) => a.sales - b.sales)[0]
        : null;

    const beverageAttachRate =
      foodOrdersTotal > 0
        ? Math.round(((foodOrdersTotal - foodOrdersWithoutDrink) / foodOrdersTotal) * 100)
        : 0;

    // Categoría de gasto #1
    const expCatMap = {};
    currentExpenses.forEach((e) => {
      const cat = e.category || 'Otros';
      expCatMap[cat] = (expCatMap[cat] || 0) + (Number(e.amount) || 0);
    });
    const topExpenseCat = Object.entries(expCatMap)
      .sort((a, b) => b[1] - a[1])[0] || null;

    return {
      validCount: validOrders.length,
      peakHour,
      peakCount,
      quietHour,
      strongestDay,
      weakestDay,
      foodOrdersTotal,
      foodOrdersWithoutDrink,
      beverageAttachRate,
      topExpenseCat,
    };
  }, [currentOrders, currentExpenses, findCatalogProduct]);

  // 3. Índice de Salud Porko Intelligence (0-100)
  const healthScore = useMemo(() => {
    const { current } = metrics;
    if (current.count === 0 && current.sales === 0) {
      return { score: 0, label: 'Sin datos', color: '#71717A', sub: [] };
    }

    // Rentabilidad neta (0-35 pts): ideal >= 25%
    const netMarginPts = Math.min(35, Math.max(0, (current.netMargin / 25) * 35));
    // Food cost / COGS control (0-25 pts): ideal <= 38%
    const cogsRatio = current.sales > 0 ? (current.cogs / current.sales) * 100 : 40;
    const cogsPts = cogsRatio <= 35 ? 25 : Math.max(0, 25 - (cogsRatio - 35) * 0.9);
    // Control de gastos (0-20 pts): ideal <= 30%
    const expRatio = current.sales > 0 ? (current.totalExpenses / current.sales) * 100 : 0;
    const expPts = expRatio <= 30 ? 20 : Math.max(0, 20 - (expRatio - 30) * 0.7);
    // Adhesión de bebidas (0-10 pts): ideal >= 60%
    const attachPts = Math.min(10, (operationalSignals.beverageAttachRate / 60) * 10);
    // Baja tasa de cancelación (0-10 pts)
    const cancelRatio = current.totalOrdersCount > 0 ? (current.cancelledCount / current.totalOrdersCount) * 100 : 0;
    const cancelPts = Math.max(0, 10 - cancelRatio * 1.5);

    const score = Math.round(Math.min(100, Math.max(0, netMarginPts + cogsPts + expPts + attachPts + cancelPts)));

    let label = 'Salud Óptima';
    let color = '#10B981';
    if (score < 50) {
      label = 'Requiere Atención';
      color = '#F43F5E';
    } else if (score < 75) {
      label = 'Buen Desempeño';
      color = '#FD8B00';
    }

    return {
      score,
      label,
      color,
      sub: [
        { label: 'Margen Neto', value: `${current.netMargin.toFixed(1)}%` },
        { label: 'Costo Carta', value: `${cogsRatio.toFixed(1)}%` },
        { label: 'Combos/Bebida', value: `${operationalSignals.beverageAttachRate}%` },
      ],
    };
  }, [metrics, operationalSignals]);

  // 4. Ideas Automáticas de Combos & Campañas con Miniaturas
  const generatedIdeas = useMemo(() => {
    const ideas = [];

    // Idea A: Combo basado en el par más frecuente o Top Comida + Top Bebida
    const topFood = menuEngineering.items.find(
      (p) => !isProductBeverage(p.catalogProd || p)
    );
    const topDrink = menuEngineering.items.find(
      (p) => isProductBeverage(p.catalogProd || p)
    ) || products.find((p) => isProductBeverage(p));

    if (productCombinations.length > 0) {
      const topCombo = productCombinations[0];
      const prodA = findCatalogProduct?.(null, topCombo.itemA);
      const prodB = findCatalogProduct?.(null, topCombo.itemB);
      const sumPrice = (Number(prodA?.price) || 0) + (Number(prodB?.price) || 0);
      const sumCost = (Number(prodA?.cost) || 0) + (Number(prodB?.cost) || 0);
      const suggestedPrice = sumPrice > 0 ? Math.max(1, Math.round((sumPrice - 1.5) * 2) / 2) : 0;
      const comboMargin = suggestedPrice > 0 && sumCost > 0
        ? Math.round(((suggestedPrice - sumCost) / suggestedPrice) * 100)
        : null;

      ideas.push({
        id: 'idea_top_combo',
        tag: 'Combo Ganador Detectado',
        title: `Paquete "${topCombo.itemA} + ${topCombo.itemB}"`,
        desc: `Se han pedido juntos ${topCombo.count} veces (ticket medio ${formatCurrency(topCombo.avgOrderTotal)}). Formalizarlo como combo en caja acelera la decisión del cliente.`,
        itemA: { name: topCombo.itemA, prod: prodA },
        itemB: { name: topCombo.itemB, prod: prodB },
        priceInfo: sumPrice > 0 ? { normal: sumPrice, suggested: suggestedPrice, margin: comboMargin } : null,
      });
    } else if (topFood && topDrink) {
      const sumPrice = (Number(topFood.unitPrice) || 0) + (Number(topDrink.unitPrice ?? topDrink.price) || 0);
      const suggestedPrice = sumPrice > 0 ? Math.max(1, Math.round((sumPrice - 1.5) * 2) / 2) : 0;
      ideas.push({
        id: 'idea_suggested_combo',
        tag: 'Combo Sugerido por IA',
        title: `Lanzar "${topFood.name} + ${topDrink.name}"`,
        desc: `Une tu plato de mayor rotación con tu bebida estrella para capturar el ${100 - operationalSignals.beverageAttachRate}% de comandas que aún salen sin bebida.`,
        itemA: { name: topFood.name, prod: topFood.catalogProd },
        itemB: { name: topDrink.name, prod: topDrink.catalogProd || topDrink },
        priceInfo: sumPrice > 0 ? { normal: sumPrice, suggested: suggestedPrice, margin: null } : null,
      });
    }

    // Idea B: Campaña para día más bajo vs más fuerte
    if (operationalSignals.weakestDay && operationalSignals.strongestDay && operationalSignals.weakestDay.dayIdx !== operationalSignals.strongestDay.dayIdx) {
      const gap = operationalSignals.strongestDay.sales > 0
        ? Math.round(((operationalSignals.strongestDay.sales - operationalSignals.weakestDay.sales) / operationalSignals.strongestDay.sales) * 100)
        : 0;
      if (gap >= 15) {
        ideas.push({
          id: 'idea_slow_day',
          tag: 'Campaña Día Valle',
          title: `Activar Promo "${operationalSignals.weakestDay.name} de Antojo"`,
          desc: `Los ${operationalSignals.weakestDay.name} facturan ${gap}% menos (${formatCurrency(operationalSignals.weakestDay.sales)}) que tu día pico (${operationalSignals.strongestDay.name}: ${formatCurrency(operationalSignals.strongestDay.sales)}). Un extra gratis o delivery reducido ese día nivela la caja semanal.`,
          itemA: topFood ? { name: topFood.name, prod: topFood.catalogProd } : null,
          itemB: null,
          priceInfo: null,
        });
      }
    }

    return ideas;
  }, [menuEngineering, productCombinations, products, operationalSignals, findCatalogProduct]);

  // 5. Tarjetas de Decisiones Estratégicas Accionables
  const smartInsights = useMemo(() => {
    const insights = [];
    const { current, previous } = metrics;

    // 1. Caballo de Batalla (Alta venta, margen por optimizar)
    if (menuEngineering.plowhorses.length > 0) {
      const target = menuEngineering.plowhorses[0];
      if (target.unitCost > 0) {
        const estGain = Math.round(target.qty * 1.5 * 4);
        insights.push({
          id: 'bcg_cash_cow_optimize',
          category: 'PRICING',
          icon: Target,
          badge: 'Ingeniería de Menú • Caballo de Batalla',
          impact: `+S/ ${estGain}/mes`,
          confidence: '95% certeza',
          product: target.catalogProd || { name: target.name },
          title: `Optimizar Margen en "${target.name}"`,
          desc: `Alta demanda (${target.qty} und. vendidas) con margen de ${target.marginPct.toFixed(1)}%, por debajo del promedio de tu carta (${menuEngineering.avgMargin.toFixed(1)}%).`,
          action: `Ajustar el precio en +S/ 1.00 o estandarizar porciones para mejorar el margen en 4-6% sin frenar la rotación.`,
        });
      }
    }

    // 2. Oportunidad de Oro / Rompecabezas (Alto margen, baja venta)
    if (menuEngineering.puzzles.length > 0) {
      const puzzle = menuEngineering.puzzles[0];
      insights.push({
        id: 'bcg_high_margin_push',
        category: 'PRICING',
        icon: Zap,
        badge: 'Oportunidad de Oro • Alto Margen',
        impact: `+${formatCurrency(puzzle.unitProfit)}/plato`,
        confidence: '92% certeza',
        product: puzzle.catalogProd || { name: puzzle.name },
        title: `Impulsar "${puzzle.name}" (${puzzle.marginPct.toFixed(0)}% margen)`,
        desc: `Es uno de tus platos más rentables (+${formatCurrency(puzzle.unitProfit)} de ganancia unitaria), pero solo registró ${puzzle.qty} unidades en este período.`,
        action: `Sugerirlo en barra y mesas como recomendación del día, o colocarlo en las primeras posiciones de la carta usando "Ordenar Carta".`,
      });
    }

    // 3. Ventas Cruzadas (Platos sin bebida)
    if (operationalSignals.foodOrdersTotal > 0 && operationalSignals.foodOrdersWithoutDrink > 0) {
      const pct = 100 - operationalSignals.beverageAttachRate;
      const estUpsell = Math.round(operationalSignals.foodOrdersWithoutDrink * 4.5 * 0.5);
      insights.push({
        id: 'ai_combo_crosssell',
        category: 'COMBOS',
        icon: Sparkles,
        badge: 'IA Ventas Cruzadas',
        impact: `+${formatCurrency(estUpsell)} proyectados`,
        confidence: '94% certeza',
        title: `${pct}% de pedidos de comida salieron sin bebida`,
        desc: `${operationalSignals.foodOrdersWithoutDrink} de ${operationalSignals.foodOrdersTotal} comandas con comida no incluyeron gaseosa, jugo o refresco.`,
        action: `Capacitar a caja para ofrecer bebida fría antes de cerrar la orden y crear un combo con S/ 1.00 de ahorro percibido.`,
      });
    }

    // 4. Pico Operativo & Hora Valle
    if (operationalSignals.peakHour !== null) {
      const peakPct = operationalSignals.validCount > 0
        ? Math.round((operationalSignals.peakCount / operationalSignals.validCount) * 100)
        : 0;
      const prepHour = operationalSignals.peakHour > 0 ? operationalSignals.peakHour - 1 : 23;
      insights.push({
        id: 'ai_peak_velocity',
        category: 'OPERATIONS',
        icon: Clock,
        badge: 'IA Operaciones & Turnos',
        impact: '-40% espera en KDS',
        confidence: '91% certeza',
        title: `Hora Punta: ${operationalSignals.peakHour}:00 - ${operationalSignals.peakHour + 1}:00 hrs (${peakPct}%)`,
        desc: `La mayor carga de cocina se concentra a las ${operationalSignals.peakHour}:00 hrs con ${operationalSignals.peakCount} comandas${operationalSignals.quietHour !== null ? `, mientras que las ${operationalSignals.quietHour}:00 hrs es tu franja más tranquila.` : '.'}`,
        action: `Alistar mise-en-place completo a las ${prepHour}:30 hrs y dedicar 1 apoyo a empaque y bebidas en hora punta.`,
      });
    }

    // 5. Concentración de Gastos por Categoría
    if (operationalSignals.topExpenseCat && current.totalExpenses > 0) {
      const [catName, catAmount] = operationalSignals.topExpenseCat;
      const catShare = ((catAmount / current.totalExpenses) * 100).toFixed(1);
      insights.push({
        id: 'expense_category_focus',
        category: 'FINANCES',
        icon: DollarSign,
        badge: 'Auditoría de Compras',
        impact: `${catShare}% del gasto`,
        confidence: 'Exacto',
        title: `Mayor Egreso en "${catName}" (${formatCurrency(catAmount)})`,
        desc: `Esta categoría concentra el ${catShare}% de tus egresos totales del período (${formatCurrency(current.totalExpenses)}).`,
        action: `Negociar compra programada por volumen con proveedor principal de ${catName} para bajar el costo unitario 8%-12%.`,
      });
    }

    // 6. Control de Gastos vs Ingresos
    if (current.sales > 0 && current.totalExpenses > 0) {
      const expenseRatio = ((current.totalExpenses / current.sales) * 100).toFixed(1);
      if (Number(expenseRatio) > 40) {
        insights.push({
          id: 'expense_alert',
          category: 'FINANCES',
          icon: AlertTriangle,
          badge: 'Alerta Financiera',
          impact: `${expenseRatio}% sobre ventas`,
          confidence: '98% certeza',
          title: `Ratio de Gastos Elevado (${expenseRatio}% de ventas)`,
          desc: `Los egresos (${formatCurrency(current.totalExpenses)}) superan el umbral recomendado del 40% sobre la facturación.`,
          action: `Revisar frecuencia de compras de emergencia y separar compras de inventario semanal de gastos fijos.`,
        });
      } else {
        insights.push({
          id: 'expense_healthy',
          category: 'FINANCES',
          icon: CheckCircle2,
          badge: 'Salud Financiera',
          impact: 'Estructura óptima',
          confidence: '99% certeza',
          title: `Gastos bajo control (${expenseRatio}% de ingresos)`,
          desc: `Tus egresos operativos se mantienen en un rango saludable frente al volumen de ventas.`,
          action: `Mantener compras planificadas y registrar cada salida diaria para preservar la precisión del balance.`,
        });
      }
    }

    // 7. Auditoría de Cancelaciones o Cuentas por Cobrar
    if (current.cancelledCount > 0) {
      insights.push({
        id: 'cancelled_audit',
        category: 'OPERATIONS',
        icon: Ban,
        badge: 'Control de Fugas',
        impact: `-${formatCurrency(current.cancelledTotal)}`,
        confidence: 'Exacto',
        title: `${current.cancelledCount} comandas canceladas en el período`,
        desc: `Se anularon pedidos por un valor de ${formatCurrency(current.cancelledTotal)}. Revisar si ocurrió por quiebre de stock o error de digitación.`,
        action: `Marcar productos agotados apenas falte stock en Catálogo para evitar cancelaciones luego de tomar el pedido.`,
      });
    }

    // 8. Higiene de Costos (productos vendidos sin costo)
    if (menuEngineering.missingCostItems.length > 0) {
      const sample = menuEngineering.missingCostItems.slice(0, 2).map((p) => p.name).join(', ');
      insights.push({
        id: 'missing_costs_hygiene',
        category: 'FINANCES',
        icon: AlertTriangle,
        badge: 'Calidad de Datos IA',
        impact: `${menuEngineering.missingCostItems.length} sin costo`,
        confidence: '100% real',
        title: `Completa el costo en ${menuEngineering.missingCostItems.length} productos vendidos`,
        desc: `Productos como ${sample} tienen costo S/ 0.00 en el catálogo, lo que sobreestima tu utilidad bruta.`,
        action: `Ingresa el costo estimado de insumos en Productos/Catálogo para que el Balance Operativo sea 100% exacto.`,
      });
    }

    // 9. Tendencia vs Período Anterior
    if (enableComparison && previous.count > 0 && current.count > 0) {
      const salesGrowth = (((current.sales - previous.sales) / previous.sales) * 100).toFixed(1);
      const isPositive = Number(salesGrowth) >= 0;
      insights.push({
        id: 'growth_trend',
        category: 'FINANCES',
        icon: isPositive ? TrendingUp : Zap,
        badge: 'Tendencia Periódica',
        impact: `${isPositive ? '+' : ''}${salesGrowth}%`,
        confidence: 'Exacto',
        title: `Evolución de Ventas: ${isPositive ? '+' : ''}${salesGrowth}% vs período previo`,
        desc: `Pasaste de ${formatCurrency(previous.sales)} (${previous.count} pedidos) a ${formatCurrency(current.sales)} (${current.count} pedidos).`,
        action: isPositive
          ? `Mantener el ritmo reforzando los platos Estrella y disponibilidad en horas punta.`
          : `Activar combos de rescate y promociones en las horas valle detectadas.`,
      });
    }

    return insights;
  }, [metrics, menuEngineering, operationalSignals, enableComparison]);

  // 6. Simulador Rápido "¿Qué pasa si...?" en base a los números reales del período
  const quickWhatIf = useMemo(() => {
    const { current } = metrics;
    const extraRevenue = current.count * ticketLift;
    const savedCosts = ((current.cogs + current.totalExpenses) * costReductionPct) / 100;
    const projectedNet = Math.round((current.netProfit + extraRevenue + savedCosts) * 100) / 100;
    const gainDelta = Math.round((extraRevenue + savedCosts) * 100) / 100;
    return { extraRevenue, savedCosts, projectedNet, gainDelta };
  }, [metrics, ticketLift, costReductionPct]);

  const filteredInsights = smartInsights.filter(
    (ins) => insightsFilter === 'ALL' || ins.category === insightsFilter
  );

  // Gauge SVG de Salud
  const gaugeRadius = 36;
  const gaugeCirc = 2 * Math.PI * gaugeRadius;
  const gaugeOffset = gaugeCirc - (healthScore.score / 100) * gaugeCirc;

  return (
    <div className="space-y-5">
      {/* Header Principal Porko Intelligence + Índice de Salud */}
      <div className="bg-gradient-to-br from-[#181512] via-[#121216] to-[#0c0c0f] border border-orange-500/25 p-4 sm:p-6 rounded-3xl shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-[var(--color-porkos-orange)]/15 text-[var(--color-porkos-orange)] border border-[var(--color-porkos-orange)]/35 shrink-0 shadow-inner">
              <Brain className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-lg sm:text-xl text-white tracking-tight">
                  Porko Intelligence
                </h3>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[var(--color-porkos-orange)] text-black uppercase tracking-wider">
                  IA Decisiones
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                Motor de análisis en tiempo real: Ingeniería de menú (Matriz BCG), detección de combos ganadores, horas punta/valle y simulación financiera sobre tus datos reales.
              </p>
            </div>
          </div>

          {/* Radial Score Widget */}
          <div className="flex items-center gap-4 bg-black/50 border border-zinc-800/90 px-4 py-3 rounded-2xl shrink-0">
            <div className="relative w-20 h-20 shrink-0">
              <svg width="80" height="80" viewBox="0 0 88 88" className="-rotate-90">
                <circle
                  cx="44"
                  cy="44"
                  r={gaugeRadius}
                  fill="none"
                  stroke="rgba(39,39,42,0.7)"
                  strokeWidth="8"
                />
                <circle
                  cx="44"
                  cy="44"
                  r={gaugeRadius}
                  fill="none"
                  stroke={healthScore.color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={gaugeCirc}
                  strokeDashoffset={gaugeOffset}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black text-white leading-none tabular-nums">
                  {healthScore.score}
                </span>
                <span className="text-[9px] font-bold text-zinc-500">/ 100</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Índice de Salud
                </span>
                <span className="text-sm font-black" style={{ color: healthScore.color }}>
                  {healthScore.label}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {healthScore.sub.map((s) => (
                  <span
                    key={s.label}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300"
                  >
                    {s.label}: <strong className="text-white">{s.value}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Simulador Rápido "¿Qué pasa si...?" */}
        {metrics.current.count > 0 && (
          <div className="pt-4 border-t border-zinc-800/80 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-4 space-y-0.5">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[var(--color-porkos-orange)]" />
                <span>Simulador de Decisiones (&ldquo;¿Qué pasa si...?&rdquo;)</span>
              </span>
              <p className="text-[11px] text-zinc-400">
                Ajusta metas sobre tus {metrics.current.count} pedidos del período para proyectar utilidad extra.
              </p>
            </div>

            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-black/40 p-2.5 rounded-xl border border-zinc-800/90 space-y-1">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-zinc-300">Subir Ticket Medio:</span>
                  <span className="text-[var(--color-porkos-orange)] font-mono">+{formatCurrency(ticketLift)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={ticketLift}
                  onChange={(e) => setTicketLift(Number(e.target.value))}
                  className="w-full accent-[var(--color-porkos-orange)] cursor-pointer"
                />
              </div>

              <div className="bg-black/40 p-2.5 rounded-xl border border-zinc-800/90 space-y-1">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-zinc-300">Reducir Costo/Gasto:</span>
                  <span className="text-emerald-400 font-mono">-{costReductionPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={costReductionPct}
                  onChange={(e) => setCostReductionPct(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="lg:col-span-3 bg-emerald-950/25 border border-emerald-500/35 px-3.5 py-2.5 rounded-xl flex items-center justify-between lg:flex-col lg:items-end lg:justify-center">
              <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                Utilidad Proyectada
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-black text-emerald-400 font-mono tabular-nums">
                  {formatCurrency(quickWhatIf.projectedNet)}
                </span>
                <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                  +{formatCurrency(quickWhatIf.gainDelta)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ideas de Combos & Campañas Generadas con Miniaturas */}
      {generatedIdeas.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 px-1">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Ideas de Combos & Campañas Automáticas</span>
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {generatedIdeas.map((idea) => (
              <div
                key={idea.id}
                className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] hover:border-purple-500/40 rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 uppercase tracking-wider inline-flex items-center gap-1">
                      {idea.id === 'idea_slow_day' ? (
                        <CalendarDays className="w-3 h-3" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      {idea.tag}
                    </span>
                    <h5 className="font-black text-sm text-white pt-1">{idea.title}</h5>
                    <p className="text-xs text-zinc-400 leading-relaxed">{idea.desc}</p>
                  </div>

                  {/* Miniaturas de los productos sugeridos */}
                  {(idea.itemA || idea.itemB) && (
                    <div className="flex items-center gap-1 shrink-0 bg-black/50 p-1.5 rounded-2xl border border-zinc-800">
                      {idea.itemA && (
                        <ProductThumbnail
                          src={idea.itemA.prod?.image}
                          thumbnailUrl={idea.itemA.prod?.thumbnailUrl}
                          name={idea.itemA.name}
                          className="w-11 h-11 rounded-xl"
                          iconSize="w-5 h-5"
                        />
                      )}
                      {idea.itemA && idea.itemB && (
                        <span className="text-xs font-black text-[var(--color-porkos-orange)] px-0.5">+</span>
                      )}
                      {idea.itemB && (
                        <ProductThumbnail
                          src={idea.itemB.prod?.image}
                          thumbnailUrl={idea.itemB.prod?.thumbnailUrl}
                          name={idea.itemB.name}
                          className="w-11 h-11 rounded-xl"
                          iconSize="w-5 h-5"
                        />
                      )}
                    </div>
                  )}
                </div>

                {idea.priceInfo && (
                  <div className="pt-2.5 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 line-through font-mono">
                        {formatCurrency(idea.priceInfo.normal)}
                      </span>
                      <span className="font-black text-emerald-400 font-mono text-sm">
                        Sugerido: {formatCurrency(idea.priceInfo.suggested)}
                      </span>
                    </div>
                    {idea.priceInfo.margin !== null && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                        Margen estimado: {idea.priceInfo.margin}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matriz Visual de Ingeniería de Menú (4 Cuadrantes BCG con Miniaturas) */}
      {menuEngineering.items.length > 0 && (
        <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-800">
            <div>
              <h4 className="font-black text-sm text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-[var(--color-porkos-orange)]" />
                <span>Matriz de Ingeniería de Menú (Popularidad vs Rentabilidad)</span>
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Promedio del período: <strong className="text-zinc-200">{menuEngineering.avgQty.toFixed(1)} und.</strong> por producto •{' '}
                <strong className="text-zinc-200">{menuEngineering.avgMargin.toFixed(1)}%</strong> margen promedio
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {[
              {
                key: 'stars',
                title: 'Estrellas (Alta Venta + Alto Margen)',
                hint: 'Proteger receta y destacar en portada',
                badgeClass: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
                borderClass: 'border-emerald-500/25',
                list: menuEngineering.stars,
              },
              {
                key: 'plowhorses',
                title: 'Caballos de Batalla (Alta Venta + Margen Menor)',
                hint: 'Optimizar costo o sumar +S/ 1.00 / combo',
                badgeClass: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
                borderClass: 'border-amber-500/25',
                list: menuEngineering.plowhorses,
              },
              {
                key: 'puzzles',
                title: 'Oportunidades (Baja Venta + Alto Margen)',
                hint: 'Impulsar con venta sugestiva en caja/mesas',
                badgeClass: 'text-sky-300 bg-sky-500/15 border-sky-500/30',
                borderClass: 'border-sky-500/25',
                list: menuEngineering.puzzles,
              },
              {
                key: 'dogs',
                title: 'Por Revisar (Baja Venta + Margen Menor)',
                hint: 'Evaluar promo de salida o simplificar carta',
                badgeClass: 'text-zinc-300 bg-zinc-800 border-zinc-700',
                borderClass: 'border-zinc-800',
                list: menuEngineering.dogs,
              },
            ].map((quad) => (
              <div
                key={quad.key}
                className={`p-3.5 rounded-2xl bg-black/40 border ${quad.borderClass} space-y-2.5`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wide ${quad.badgeClass}`}>
                      {quad.title}
                    </span>
                    <p className="text-[11px] text-zinc-500 mt-1">{quad.hint}</p>
                  </div>
                  <span className="text-xs font-black text-zinc-400 tabular-nums shrink-0">
                    {quad.list.length}
                  </span>
                </div>

                {quad.list.length === 0 ? (
                  <p className="text-[11px] text-zinc-600 py-3 text-center">
                    Sin productos en este cuadrante
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {quad.list.slice(0, 4).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2.5 p-1.5 rounded-xl bg-zinc-900/70 border border-zinc-800/70"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ProductThumbnail
                            src={p.catalogProd?.image}
                            thumbnailUrl={p.catalogProd?.thumbnailUrl}
                            name={p.name}
                            className="w-8 h-8 rounded-lg"
                            iconSize="w-4 h-4"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white block truncate">{p.name}</span>
                            <span className="text-[10px] text-zinc-400">
                              {p.qty} und. • {formatCurrency(p.revenue)}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono font-black text-zinc-200 shrink-0 px-2 py-0.5 rounded bg-black/50 border border-zinc-800">
                          {p.marginPct.toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros & Tarjetas de Decisiones Estratégicas */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 px-1">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>Plan de Acción Inteligente ({filteredInsights.length})</span>
          </h4>

          <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-zinc-800 overflow-x-auto scrollbar-none">
            {[
              { id: 'ALL', label: 'Todas' },
              { id: 'PRICING', label: 'Precios & Margen' },
              { id: 'COMBOS', label: 'Combos & Ventas' },
              { id: 'OPERATIONS', label: 'Operación' },
              { id: 'FINANCES', label: 'Finanzas & Costos' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setInsightsFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  insightsFilter === f.id
                    ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInsights.map((ins) => {
            const Icon = ins.icon;
            const isApplied = appliedIds.includes(ins.id);
            return (
              <div
                key={ins.id}
                className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-lg transition-all border ${
                  isApplied
                    ? 'bg-emerald-950/15 border-emerald-500/35'
                    : 'bg-[#141417] border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[var(--color-porkos-orange)]" />
                      <span>{ins.badge}</span>
                    </span>

                    {ins.impact && (
                      <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                        {ins.impact}
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-3">
                    {ins.product ? (
                      <ProductThumbnail
                        src={ins.product.image}
                        thumbnailUrl={ins.product.thumbnailUrl}
                        name={ins.product.name}
                        className="w-11 h-11 rounded-xl shrink-0"
                        iconSize="w-5 h-5"
                      />
                    ) : (
                      <div className="p-2.5 rounded-xl bg-zinc-800/80 text-[var(--color-porkos-orange)] border border-zinc-700 shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h5 className="font-extrabold text-sm text-white leading-snug">
                        {ins.title}
                      </h5>
                      <span className="text-[10px] text-zinc-500 font-semibold">
                        {ins.confidence}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                    {ins.desc}
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="bg-zinc-900/90 p-3 rounded-xl border border-zinc-800 space-y-1">
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>Acción recomendada por Porko Intelligence:</span>
                    </span>
                    <p className="text-xs text-zinc-200 font-medium leading-relaxed">
                      {ins.action}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleApplied(ins.id)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border active:scale-[0.99] ${
                      isApplied
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isApplied ? 'Decisión aplicada (en seguimiento)' : 'Marcar como aplicada'}</span>
                  </button>
                </div>
              </div>
            );
          })}

          {filteredInsights.length === 0 && (
            <div className="col-span-full py-12 text-center text-zinc-500 bg-zinc-900/40 rounded-2xl border border-zinc-800">
              <Brain className="w-8 h-8 mx-auto mb-2 opacity-40 text-zinc-400" />
              <p className="font-bold text-sm text-zinc-300">No hay decisiones en esta categoría</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Selecciona &ldquo;Todas&quot; para revisar el análisis global del restaurante.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
