import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { CatalogProvider } from './context/CatalogContext';
import { CartProvider } from './context/CartContext';
import { useCart } from './context/useCart';
import { MODULES } from './types/constants';
import { DEFAULT_TABLES } from './types/defaultCatalog';
import Navbar from './components/layout/Navbar';
import SalesView from './features/sales/SalesView';
import KitchenView from './features/kitchen/KitchenView';
import OrdersView from './features/orders/OrdersView';
import TablesView from './features/tables/TablesView';
import LoginView from './features/auth/LoginView';

// Code-splitting modular con lazy loading para módulos secundarios pesados
const CatalogView = lazy(() => import('./features/catalog/CatalogView'));
const ExpensesView = lazy(() => import('./features/expenses/ExpensesView'));
const DashboardView = lazy(() => import('./features/dashboard/DashboardView'));
const SettingsView = lazy(() => import('./features/settings/SettingsView'));
import {
  subscribeToOrders,
  saveOrderToFirestore,
  updateOrderStatusInFirestore,
  settleOrderInFirestore,
  deleteOrderFromFirestore,
  clearAllOrdersFromFirestore,
  subscribeToTables,
  saveTableToFirestore,
  deleteTableFromFirestore,
} from './services/firestoreService';
import { parseToDate } from './utils/formatters';
import { Flame } from 'lucide-react';

function saveOrdersLocal(ordersList) {
  try {
    // Guardar las 100 órdenes más recientes para prevenir desbordamiento de cuota (5MB) en localStorage
    const slice = Array.isArray(ordersList) ? ordersList.slice(0, 100) : [];
    localStorage.setItem('porkos_orders', JSON.stringify(slice));
  } catch (e) {
    console.warn('Error guardando órdenes en localStorage:', e);
  }
}

function MainApp() {
  const { canAccessModule, allowedModules } = useAuth();
  const [currentModule, setCurrentModule] = useState(MODULES.SALES);

  // Derivar módulo activo protegido por rol (evita setState síncrono en effect)
  const activeModule = allowedModules?.length > 0 && !canAccessModule(currentModule)
    ? allowedModules[0]
    : currentModule;
  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('porkos_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((o) => {
          const isTable = o.modality === 'MESA' || Boolean(o.tableId);
          return {
            ...o,
            status: o.status || 'PENDIENTE',
            paymentStatus: isTable ? (o.paymentStatus || 'PENDING') : (o.paymentStatus || 'PAID'),
            createdAt: parseToDate(o.createdAt) || new Date(),
          };
        });
      }
      return [];
    } catch {
      return [];
    }
  });
  const { setSelectedTable, setModality, setCustomerName, loadOrderForEditing } = useCart();

  // Estado dinámico de mesas del salón (sincronizado con Firestore y fallback a DEFAULT_TABLES)
  const [tablesList, setTablesList] = useState(() => {
    try {
      const saved = localStorage.getItem('porkos_tables');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error leyendo mesas en localStorage:', e);
    }
    return DEFAULT_TABLES;
  });

  // Sincronización en tiempo real de mesas con Firestore
  useEffect(() => {
    const unsub = subscribeToTables(
      (remoteTables) => {
        if (remoteTables && remoteTables.length > 0) {
          setTablesList(remoteTables);
          try {
            localStorage.setItem('porkos_tables', JSON.stringify(remoteTables));
          } catch (e) {
            console.warn(e);
          }
        } else {
          // Si no hay mesas en Firestore, sembrar las mesas por defecto
          DEFAULT_TABLES.forEach((t) => saveTableToFirestore(t));
        }
      },
      (err) => {
        console.warn('Suscripción a tables en Firestore (modo local):', err?.message);
      }
    );
    return () => unsub && unsub();
  }, []);

  // 1. Sincronización en tiempo real de órdenes con Firestore
  useEffect(() => {
    const unsubscribe = subscribeToOrders(
      (remoteOrders) => {
        if (Array.isArray(remoteOrders)) {
          const normalized = remoteOrders.map((o) => {
            const isTable = o.modality === 'MESA' || Boolean(o.tableId);
            return {
              ...o,
              status: o.status || 'PENDIENTE',
              paymentStatus: isTable ? (o.paymentStatus || 'PENDING') : (o.paymentStatus || 'PAID'),
              createdAt: parseToDate(o.createdAt) || (o.createdAt instanceof Date ? o.createdAt : new Date()),
            };
          });

          const sorted = [...normalized].sort((a, b) => {
            const timeA = a.createdAt?.getTime ? a.createdAt.getTime() : new Date(a.createdAt || 0).getTime();
            const timeB = b.createdAt?.getTime ? b.createdAt.getTime() : new Date(b.createdAt || 0).getTime();
            if (!isNaN(timeA) && !isNaN(timeB) && timeB !== timeA) return timeB - timeA;
            return (b.orderNumber || '').localeCompare(a.orderNumber || '', undefined, { numeric: true });
          });
          setOrders(sorted);
          try {
            localStorage.setItem('porkos_orders', JSON.stringify(sorted));
          } catch (e) {
            console.warn('Error guardando órdenes en localStorage:', e);
          }
        }
      },
      (err) => {
        console.error('Suscripción de órdenes Firestore (modo local activo):', err?.message);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Estado reactivo de las mesas según las comandas abiertas no pagadas
  const activeTableIds = useMemo(() => {
    return orders
      .filter((o) => o.tableId && o.paymentStatus !== 'PAID' && o.status !== 'CANCELADO')
      .map((o) => o.tableId);
  }, [orders]);

  const tables = useMemo(() => {
    return tablesList.map((t) => ({
      ...t,
      status: activeTableIds.includes(t.id) ? 'OCCUPIED' : 'AVAILABLE',
    }));
  }, [tablesList, activeTableIds]);

  // Manejo de creación, edición y eliminación dinámica de mesas en DB
  const handleAddTable = async (tableData) => {
    const tableId = `mesa_${Date.now()}`;
    const nextNum = tablesList.length > 0 ? Math.max(...tablesList.map((t) => Number(t.number) || 0)) + 1 : 1;
    const newTable = {
      id: tableId,
      number: parseInt(tableData.number, 10) || nextNum,
      label: tableData.label?.trim() || `Mesa ${tableData.number || nextNum}`,
      capacity: parseInt(tableData.capacity, 10) || 4,
      status: 'AVAILABLE',
      active: true,
      createdAt: new Date(),
    };
    const updated = [...tablesList, newTable].sort((a, b) => a.number - b.number);
    setTablesList(updated);
    try {
      localStorage.setItem('porkos_tables', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
    await saveTableToFirestore(newTable);
    return newTable;
  };

  const handleUpdateTable = async (tableData) => {
    const updated = tablesList.map((t) => (t.id === tableData.id ? { ...t, ...tableData } : t));
    setTablesList(updated);
    try {
      localStorage.setItem('porkos_tables', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
    await saveTableToFirestore(tableData);
  };

  const handleDeleteTable = async (tableId) => {
    const updated = tablesList.filter((t) => t.id !== tableId);
    setTablesList(updated);
    try {
      localStorage.setItem('porkos_tables', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
    await deleteTableFromFirestore(tableId);
  };

  // 3. Manejar creación de comanda: cada pedido es individual
  const handleOrderCreated = async (newOrder) => {
    // Exigir número de mesa si la modalidad es MESA
    if (newOrder.modality === 'MESA' && !newOrder.tableId) {
      console.error('Error: Comanda de tipo MESA sin mesa asignada');
      return;
    }

    const isTableModality = newOrder.modality === 'MESA' || Boolean(newOrder.tableId);
    const orderStatus = newOrder.status || 'PENDIENTE';

    const cleanOrder = {
      ...newOrder,
      status: orderStatus,
      paymentStatus: isTableModality ? (newOrder.paymentStatus || 'PENDING') : 'PAID',
      createdAt: newOrder.createdAt instanceof Date ? newOrder.createdAt : parseToDate(newOrder.createdAt) || new Date(),
    };

    // Actualización optimista local
    setOrders((prev) => {
      const filtered = prev.filter((o) => o.orderNumber !== cleanOrder.orderNumber);
      const updated = [cleanOrder, ...filtered];
      saveOrdersLocal(updated);
      return updated;
    });

    // Guardar nueva orden individual en Firestore con protección contra colisión concurrente
    const res = await saveOrderToFirestore(cleanOrder, true);
    if (!res?.success) {
      console.error('Error al guardar comanda en Firestore:', res?.error);
      alert('Aviso: Hubo un inconveniente al registrar la orden en la base de datos en tiempo real. Verifica tu conexión.');
    } else if (res.orderNumber && res.orderNumber !== cleanOrder.orderNumber) {
      // Si el correlativo fue reasignado automáticamente para no sobreescribir otra orden, actualizar localmente
      setOrders((prev) => {
        const updated = prev.map((o) => (o.orderNumber === cleanOrder.orderNumber ? { ...o, orderNumber: res.orderNumber } : o));
        saveOrdersLocal(updated);
        return updated;
      });
    }
  };

  // 4. Manejar el cierre y cobro de mesa (cierra todos los pedidos activos de la mesa con integridad contable)
  const handleCloseTable = async (tableId, orderNumberOrNumbers, paymentDetail) => {
    const inputNumbers = Array.isArray(orderNumberOrNumbers)
      ? orderNumberOrNumbers
      : [orderNumberOrNumbers];

    // Buscar todas las órdenes activas no pagadas de la mesa para liquidar el saldo total
    const activeTableNumbers = tableId
      ? orders
          .filter((o) => o.tableId === tableId && o.paymentStatus !== 'PAID' && o.status !== 'CANCELADO')
          .map((o) => o.orderNumber)
      : [];

    const targetNumbers = Array.from(new Set([...inputNumbers, ...activeTableNumbers]));

    // Optimista local: registrar en cada orden su importe individual exacto para no triplicar ingresos en auditoría
    setOrders((prev) => {
      const updated = prev.map((o) => {
        const matchesTable = tableId && o.tableId === tableId && o.paymentStatus !== 'PAID' && o.status !== 'CANCELADO';
        const matchesNumber = targetNumbers.includes(o.orderNumber);
        if (matchesTable || matchesNumber) {
          const itemAmount = Number(o.total) || 0;
          return {
            ...o,
            status: 'ENTREGADO',
            paymentStatus: 'PAID',
            payments: [
              {
                ...paymentDetail,
                amount: itemAmount > 0 ? itemAmount : paymentDetail.amount,
                consolidatedTableTotal: paymentDetail.amount,
                paidAt: new Date(),
              },
            ],
          };
        }
        return o;
      });
      saveOrdersLocal(updated);
      return updated;
    });

    // Persistir en Firestore para cada orden cerrada con su importe proporcional correspondiente
    for (const num of targetNumbers) {
      if (num) {
        const targetOrder = orders.find((o) => o.orderNumber === num);
        const itemAmount = Number(targetOrder?.total) || 0;
        const orderPayment = {
          ...paymentDetail,
          amount: itemAmount > 0 ? itemAmount : paymentDetail.amount,
          consolidatedTableTotal: paymentDetail.amount,
        };
        const res = await settleOrderInFirestore(num, orderPayment);
        if (!res?.success) {
          console.error(`Error al liquidar orden ${num} en Firestore:`, res?.error);
        }
      }
    }
  };

  // 5. Manejar avance de comanda en cocina o entregas
  const handleUpdateOrderStatus = async (orderNumber, newStatus) => {
    // Optimista local
    setOrders((prev) => {
      const updated = prev.map((o) => (o.orderNumber === orderNumber ? { ...o, status: newStatus } : o));
      saveOrdersLocal(updated);
      return updated;
    });

    // Persistir en Firestore para que todos los dispositivos lo vean inmediatamente
    const res = await updateOrderStatusInFirestore(orderNumber, newStatus);
    if (!res?.success) {
      console.error('Error al actualizar estado en Firestore:', res?.error);
    }
  };

  // 6. Manejar edición de comanda (antes del cierre o pago final)
  const handleUpdateOrder = async (updatedOrder) => {
    // Bloquear solo si la comanda ya fue entregada Y pagada (orden finalizada)
    const existing = orders.find((o) => o.orderNumber === updatedOrder.orderNumber);
    const isUnpaidTable = (updatedOrder.modality === 'MESA' || Boolean(updatedOrder.tableId)) && existing?.paymentStatus !== 'PAID';
    if (existing?.status === 'ENTREGADO' && !isUnpaidTable) {
      alert('Esta comanda ya ha sido finalizada y no puede ser modificada.');
      return false;
    }

    // Exigir número de mesa si la comanda es MESA
    if (updatedOrder.modality === 'MESA' && !updatedOrder.tableId) {
      alert('No se puede guardar una comanda de salón sin asignar un número de mesa.');
      return false;
    }

    const cleanOrder = {
      ...updatedOrder,
      updatedAt: new Date(),
    };

    // Si la orden consolidó múltiples pedidos de la mesa, eliminar las órdenes secundarias fusionadas
    const mergedNumbers = Array.isArray(updatedOrder.mergedOrderNumbers) ? updatedOrder.mergedOrderNumbers : [];
    const secondaryNumbers = mergedNumbers.filter((num) => num !== updatedOrder.orderNumber);

    // Actualización optimista local
    setOrders((prev) => {
      const filtered = prev.filter((o) => !secondaryNumbers.includes(o.orderNumber));
      const updated = filtered.map((o) => (o.orderNumber === updatedOrder.orderNumber ? cleanOrder : o));
      saveOrdersLocal(updated);
      return updated;
    });

    // Persistir comanda unificada en Firestore
    const res = await saveOrderToFirestore(cleanOrder);
    if (!res?.success) {
      console.error('Error al actualizar orden en Firestore:', res?.error);
    }

    // Limpiar órdenes secundarias fusionadas en Firestore
    for (const num of secondaryNumbers) {
      await deleteOrderFromFirestore(num);
    }

    return true;
  };

  // 7. Cargar comanda en Caja/Ventas para añadir o editar productos del menú
  const handleLoadOrderForEditing = (order) => {
    const isUnpaidTable = (order.modality === 'MESA' || Boolean(order.tableId)) && order.paymentStatus !== 'PAID';
    if (order.status === 'ENTREGADO' && !isUnpaidTable) {
      alert('Esta comanda ya ha sido finalizada y no puede ser modificada.');
      return;
    }
    loadOrderForEditing(order, tables);
    setCurrentModule(MODULES.SALES);
  };

  // 8. Seleccionar mesa para abrir comanda o seguir pidiendo
  const handleSelectTableForOrder = (table) => {
    setSelectedTable(table);
    setModality('MESA');

    // Si la mesa ya tiene comanda abierta, cargar el nombre del cliente si existe
    const existingOrder = orders.find(
      (o) => o.tableId === table.id && o.paymentStatus !== 'PAID' && o.status !== 'CANCELADO'
    );
    if (existingOrder?.customerName) {
      setCustomerName(existingOrder.customerName);
    }

    setCurrentModule(MODULES.SALES);
  };

  // 9. Vaciar todo el historial de pedidos (Firestore + localStorage)
  const handleClearAllOrders = async () => {
    setOrders([]);
    try {
      localStorage.removeItem('porkos_orders');
    } catch (e) {
      console.warn('Error limpiando órdenes en localStorage:', e);
    }
    await clearAllOrdersFromFirestore();
  };

  const activeOrdersCount = orders.filter(
    (o) => o.status !== 'ENTREGADO' && o.status !== 'CANCELADO'
  ).length;

  return (
    <div className="min-h-screen bg-[var(--color-porkos-bg)] text-white flex flex-col font-sans selection:bg-orange-500 selection:text-black">
      <Navbar
        currentModule={activeModule}
        onSelectModule={setCurrentModule}
        activeOrdersCount={activeOrdersCount}
      />

      <main className="flex-1 max-w-[1720px] w-full mx-auto p-3 sm:p-4 lg:p-6">
        {activeModule === MODULES.SALES && (
          <SalesView
            onOrderCreated={handleOrderCreated}
            tables={tables}
            orders={orders}
            onSettleTableOrder={(table) => {
              const activeOrder = orders.find(
                (o) => o.tableId === table.id && o.status !== 'ENTREGADO' && o.status !== 'CANCELADO'
              );
              if (activeOrder) {
                handleCloseTable(table.id, activeOrder.orderNumber, {
                  method: 'EFECTIVO',
                  amount: activeOrder.total,
                });
              }
            }}
            onOrderUpdated={handleUpdateOrder}
            onReturnToOrders={() => setCurrentModule(MODULES.ORDERS)}
          />
        )}

        {activeModule === MODULES.KITCHEN && (
          <KitchenView
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
          />
        )}

        {activeModule === MODULES.ORDERS && (
          <OrdersView
            orders={orders}
            onEditOrderInSales={handleLoadOrderForEditing}
            onUpdateOrder={handleUpdateOrder}
            onClearAllOrders={handleClearAllOrders}
          />
        )}

        {(activeModule === MODULES.TABLES || activeModule === 'mesas') && (
          <TablesView
            tables={tables}
            orders={orders}
            onSelectTableForOrder={handleSelectTableForOrder}
            onCloseTable={handleCloseTable}
            onEditTableOrder={handleLoadOrderForEditing}
          />
        )}

        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center p-16 space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-[var(--color-porkos-orange)] border-t-transparent animate-spin" />
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Cargando módulo...</p>
            </div>
          }
        >
          {activeModule === MODULES.CATALOG && <CatalogView />}

          {activeModule === MODULES.EXPENSES && <ExpensesView />}

          {activeModule === MODULES.DASHBOARD && <DashboardView orders={orders} />}

          {activeModule === MODULES.SETTINGS && (
            <SettingsView
              onClearAllOrders={handleClearAllOrders}
              tablesList={tablesList}
              onAddTable={handleAddTable}
              onUpdateTable={handleUpdateTable}
              onDeleteTable={handleDeleteTable}
            />
          )}
        </Suspense>
      </main>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-[var(--color-porkos-orange)] text-black flex items-center justify-center shadow-2xl shadow-orange-500/20 animate-bounce">
          <Flame className="w-10 h-10 fill-current" />
        </div>
        <p className="mt-4 text-xs font-black uppercase tracking-widest text-zinc-400">
          Cargando PORKOAPP...
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <CatalogProvider>
      <CartProvider>
        <MainApp />
      </CartProvider>
    </CatalogProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
