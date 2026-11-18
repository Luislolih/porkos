import { useState, useEffect, useMemo } from 'react';
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
import CatalogView from './features/catalog/CatalogView';
import ExpensesView from './features/expenses/ExpensesView';
import DashboardView from './features/dashboard/DashboardView';
import SettingsView from './features/settings/SettingsView';
import LoginView from './features/auth/LoginView';
import {
  subscribeToOrders,
  saveOrderToFirestore,
  updateOrderStatusInFirestore,
  settleOrderInFirestore,
  clearAllOrdersFromFirestore,
} from './services/firestoreService';
import { Flame } from 'lucide-react';

function saveOrdersLocal(ordersList) {
  try {
    localStorage.setItem('porkos_orders', JSON.stringify(ordersList));
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
        return parsed.map((o) => ({
          ...o,
          createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
        }));
      }
      return [];
    } catch {
      return [];
    }
  });
  const { setSelectedTable, setModality, setCustomerName, loadOrderForEditing } = useCart();

  // 1. Sincronización en tiempo real de órdenes con Firestore
  useEffect(() => {
    const unsubscribe = subscribeToOrders(
      (remoteOrders) => {
        if (remoteOrders && remoteOrders.length > 0) {
          const sorted = [...remoteOrders].sort((a, b) => {
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
        console.warn('Suscripción de órdenes Firestore (modo local activo):', err?.message);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Estado reactivo de las 3 mesas según las comandas abiertas
  const activeTableIds = useMemo(() => {
    return orders
      .filter((o) => o.tableId && o.status !== 'ENTREGADO' && o.status !== 'CANCELADO')
      .map((o) => o.tableId);
  }, [orders]);

  const tables = useMemo(() => {
    return DEFAULT_TABLES.map((t) => ({
      ...t,
      status: activeTableIds.includes(t.id) ? 'OCCUPIED' : 'AVAILABLE',
    }));
  }, [activeTableIds]);

  // 3. Manejar creación o acumulación de comanda
  const handleOrderCreated = async (newOrder, shouldCloseTable = false) => {
    // Exigir número de mesa si la modalidad es MESA
    if (newOrder.modality === 'MESA' && !newOrder.tableId) {
      console.error('Error: Comanda de tipo MESA sin mesa asignada');
      return;
    }

    if (newOrder.tableId) {
      // Verificar si la mesa ya tiene una orden abierta
      const existingOrder = orders.find(
        (o) => o.tableId === newOrder.tableId && o.status !== 'ENTREGADO' && o.status !== 'CANCELADO'
      );

      if (existingOrder && !shouldCloseTable) {
        // La mesa sigue abierta: Acumular los nuevos productos a la comanda existente
        const combinedItems = [...existingOrder.items, ...newOrder.items];
        const combinedPackagings = [...(existingOrder.packagings || []), ...(newOrder.packagings || [])];
        const addedSubtotal = newOrder.items.reduce((s, i) => s + i.subtotal, 0);
        const addedPackagingsTotal = newOrder.packagingsTotal || 0;
        const newTotal = existingOrder.total + addedSubtotal + addedPackagingsTotal;

        const updatedOrder = {
          ...existingOrder,
          items: combinedItems,
          packagings: combinedPackagings,
          subtotal: existingOrder.subtotal + addedSubtotal,
          packagingsTotal: (existingOrder.packagingsTotal || 0) + addedPackagingsTotal,
          total: newTotal,
          customerName: newOrder.customerName || existingOrder.customerName,
          status: 'PREPARANDO', // Reactivar para cocina si añadió más platos
        };

        // Actualización optimista local
        setOrders((prev) => {
          const updated = prev.map((o) => (o.orderNumber === existingOrder.orderNumber ? updatedOrder : o));
          saveOrdersLocal(updated);
          return updated;
        });

        // Guardar en Firestore
        await saveOrderToFirestore(updatedOrder);
        return;
      }
    }

    // Actualización optimista local
    setOrders((prev) => {
      const updated = [newOrder, ...prev];
      saveOrdersLocal(updated);
      return updated;
    });

    // Guardar nueva orden en Firestore
    await saveOrderToFirestore(newOrder);
  };

  // 4. Manejar el cierre y cobro de mesa
  const handleCloseTable = async (tableId, orderNumber, paymentDetail) => {
    // Optimista local
    setOrders((prev) => {
      const updated = prev.map((o) => {
        if (o.orderNumber === orderNumber) {
          return {
            ...o,
            status: 'ENTREGADO',
            paymentStatus: 'PAID',
            payments: [
              {
                ...paymentDetail,
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

    // Persistir en Firestore
    await settleOrderInFirestore(orderNumber, paymentDetail);
  };

  // 5. Manejar avance de comanda en cocina
  const handleUpdateOrderStatus = async (orderNumber, newStatus) => {
    // Optimista local
    setOrders((prev) => {
      const updated = prev.map((o) => (o.orderNumber === orderNumber ? { ...o, status: newStatus } : o));
      saveOrdersLocal(updated);
      return updated;
    });

    // Persistir en Firestore
    await updateOrderStatusInFirestore(orderNumber, newStatus);
  };

  // 6. Manejar edición de comanda antes de ser entregada
  const handleUpdateOrder = async (updatedOrder) => {
    // Bloquear si la comanda ya fue entregada
    const existing = orders.find((o) => o.orderNumber === updatedOrder.orderNumber);
    if (existing?.status === 'ENTREGADO') {
      alert('Esta comanda ya ha sido entregada y no puede ser modificada.');
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

    // Actualización optimista local
    setOrders((prev) => {
      const updated = prev.map((o) => (o.orderNumber === updatedOrder.orderNumber ? cleanOrder : o));
      saveOrdersLocal(updated);
      return updated;
    });

    // Persistir en Firestore
    await saveOrderToFirestore(cleanOrder);
    return true;
  };

  // 7. Cargar comanda en Caja/Ventas para añadir más platos del menú
  const handleLoadOrderForEditing = (order) => {
    if (order.status === 'ENTREGADO') {
      alert('Esta comanda ya ha sido entregada y no puede ser modificada.');
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
      (o) => o.tableId === table.id && o.status !== 'ENTREGADO' && o.status !== 'CANCELADO'
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

  const activeKitchenCount = orders.filter(
    (o) =>
      (o.status === 'PENDIENTE' || o.status === 'PREPARANDO') &&
      o.items?.some((i) => i.requiresKitchen)
  ).length;

  return (
    <div className="min-h-screen bg-[var(--color-porkos-bg)] text-white flex flex-col font-sans selection:bg-orange-500 selection:text-black">
      <Navbar
        currentModule={activeModule}
        onSelectModule={setCurrentModule}
        activeOrdersCount={activeKitchenCount}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5">
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
            onUpdateOrder={handleUpdateOrder}
            onEditOrderInSales={handleLoadOrderForEditing}
            onClearAllOrders={handleClearAllOrders}
            tables={tables}
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

        {activeModule === MODULES.CATALOG && <CatalogView />}

        {activeModule === MODULES.EXPENSES && <ExpensesView />}

        {activeModule === MODULES.DASHBOARD && <DashboardView orders={orders} />}

        {activeModule === MODULES.SETTINGS && (
          <SettingsView onClearAllOrders={handleClearAllOrders} />
        )}
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
