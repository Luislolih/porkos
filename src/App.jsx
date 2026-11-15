import { useState } from 'react';
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

const INITIAL_TIMESTAMP = Date.now();

const INITIAL_ORDERS = [
  {
    orderNumber: 'P-101',
    modality: 'MESA',
    status: 'PREPARANDO',
    paymentStatus: 'PENDING',
    tableId: 'mesa_02',
    tableName: 'Mesa 2',
    customerName: 'Cliente Mesa 2',
    items: [
      {
        itemId: 'item_1',
        productId: 'prod_porkoburger_clasica',
        name: 'PorkoBurger Clásica',
        basePrice: 16.00,
        quantity: 2,
        unitPrice: 16.00,
        requiresKitchen: true,
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60',
        subtotal: 32.00,
        customization: {
          creamsSummary: 'MAYO + KETCHUP',
          saladSummary: 'CON ENSALADA COMPLETA',
          selectedModifiers: [{ groupId: 'mod_papas', optionName: 'Papas Fritas' }],
          itemNotes: 'Papas bien doradas',
        },
      },
      {
        itemId: 'item_2',
        productId: 'prod_inca_kola_500',
        name: 'Inca Kola 500ml',
        basePrice: 4.00,
        quantity: 2,
        unitPrice: 4.00,
        requiresKitchen: true,
        image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60',
        subtotal: 8.00,
        customization: {
          temperature: 'HELADA',
        },
      },
    ],
    packagings: [],
    subtotal: 40.00,
    total: 40.00,
    createdAt: new Date(INITIAL_TIMESTAMP - 1000 * 60 * 7),
  },
  {
    orderNumber: 'P-102',
    modality: 'DELIVERY',
    status: 'PENDIENTE',
    paymentStatus: 'PAID',
    customerName: 'Carlos Mendoza',
    customer: {
      name: 'Carlos Mendoza',
      phone: '987654321',
      address: 'Av. Primavera 420',
      reference: 'Frente al parque',
      deliveryFee: 5.00,
    },
    items: [
      {
        itemId: 'item_3',
        productId: 'prod_choriporko_artesanal',
        name: 'ChoriPorko Artesanal',
        basePrice: 13.00,
        quantity: 1,
        unitPrice: 15.50,
        requiresKitchen: true,
        image: 'https://images.unsplash.com/photo-1627054234594-550302b1f07e?w=500&auto=format&fit=crop&q=60',
        subtotal: 15.50,
        customization: {
          creamsSummary: 'MAYO + MOSTAZA + AJÍ',
          selectedModifiers: [{ groupId: 'mod_chimichurri', optionName: 'Con Chimichurri' }],
          selectedExtras: [{ id: 'ext_queso', name: 'Extra Queso', unitPrice: 2.50 }],
        },
      },
    ],
    packagings: [{ packagingId: 'pkg_taper_med', name: 'Taper Térmico Mediano', quantity: 1, unitPrice: 1.00, total: 1.00 }],
    subtotal: 15.50,
    packagingsTotal: 1.00,
    deliveryFee: 5.00,
    total: 21.50,
    createdAt: new Date(INITIAL_TIMESTAMP - 1000 * 60 * 3),
  },
];

function MainApp() {
  const [currentModule, setCurrentModule] = useState(MODULES.SALES);
  // Inicialmente Mesa 2 está ocupada por el pedido demo P-101
  const [tables, setTables] = useState(() =>
    DEFAULT_TABLES.map((t) => (t.id === 'mesa_02' ? { ...t, status: 'OCCUPIED' } : t))
  );
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const { setSelectedTable, setModality, setCustomerName } = useCart();

  // Manejar creación o adición de comanda
  const handleOrderCreated = (newOrder, shouldCloseTable = false) => {
    if (newOrder.tableId) {
      // Verificar si la mesa ya tiene una orden abierta
      const existingOrderIndex = orders.findIndex(
        (o) => o.tableId === newOrder.tableId && o.status !== 'ENTREGADO' && o.status !== 'CANCELADO'
      );

      if (existingOrderIndex >= 0 && !shouldCloseTable) {
        // La mesa sigue abierta: Acumular los nuevos productos a la comanda existente
        setOrders((prev) => {
          const updated = [...prev];
          const existing = updated[existingOrderIndex];
          const combinedItems = [...existing.items, ...newOrder.items];
          const addedSubtotal = newOrder.items.reduce((s, i) => s + i.subtotal, 0);
          const newTotal = existing.total + addedSubtotal;

          updated[existingOrderIndex] = {
            ...existing,
            items: combinedItems,
            subtotal: existing.subtotal + addedSubtotal,
            total: newTotal,
            // Si la nueva orden trajo nota o cliente, actualizar
            customerName: newOrder.customerName || existing.customerName,
            status: 'PREPARANDO', // Reactivar para cocina si añadió más platos
          };
          return updated;
        });

        // Asegurar que la mesa permanezca abierta
        setTables((prev) =>
          prev.map((t) => (t.id === newOrder.tableId ? { ...t, status: 'OCCUPIED' } : t))
        );
        return;
      }
    }

    // Si es un pedido nuevo regular o cobro inmediato
    setOrders((prev) => [newOrder, ...prev]);

    if (newOrder.tableId) {
      if (shouldCloseTable) {
        // Se cobró y cerró la mesa
        setTables((prev) =>
          prev.map((t) => (t.id === newOrder.tableId ? { ...t, status: 'AVAILABLE' } : t))
        );
      } else {
        // La mesa queda abierta para pedir más
        setTables((prev) =>
          prev.map((t) => (t.id === newOrder.tableId ? { ...t, status: 'OCCUPIED' } : t))
        );
      }
    }
  };

  // Manejar el cierre y cobro de mesa
  const handleCloseTable = (tableId, orderNumber, paymentDetail) => {
    // 1. Marcar la orden como pagada y entregada
    setOrders((prev) =>
      prev.map((o) => {
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
      })
    );

    // 2. Liberar la mesa para nuevos clientes
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, status: 'AVAILABLE' } : t))
    );
  };

  // Manejar avance de comanda en cocina
  const handleUpdateOrderStatus = (orderNumber, newStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.orderNumber === orderNumber ? { ...o, status: newStatus } : o))
    );
  };

  // Seleccionar mesa para abrir comanda o seguir pidiendo
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

  const activeKitchenCount = orders.filter(
    (o) =>
      (o.status === 'PENDIENTE' || o.status === 'PREPARANDO') &&
      o.items?.some((i) => i.requiresKitchen)
  ).length;

  return (
    <div className="min-h-screen bg-[var(--color-porkos-bg)] text-white flex flex-col font-sans selection:bg-orange-500 selection:text-black">
      <Navbar
        currentModule={currentModule}
        onSelectModule={setCurrentModule}
        activeOrdersCount={activeKitchenCount}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5">
        {currentModule === MODULES.SALES && (
          <SalesView
            onOrderCreated={handleOrderCreated}
            tables={tables}
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
          />
        )}

        {currentModule === MODULES.KITCHEN && (
          <KitchenView
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
          />
        )}

        {currentModule === MODULES.ORDERS && <OrdersView orders={orders} />}

        {currentModule === 'mesas' && (
          <TablesView
            tables={tables}
            orders={orders}
            onSelectTableForOrder={handleSelectTableForOrder}
            onCloseTable={handleCloseTable}
          />
        )}

        {currentModule === MODULES.CATALOG && <CatalogView />}

        {currentModule === MODULES.EXPENSES && <ExpensesView />}

        {currentModule === MODULES.DASHBOARD && <DashboardView orders={orders} />}

        {currentModule === MODULES.SETTINGS && <SettingsView />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <CatalogProvider>
      <CartProvider>
        <MainApp />
      </CartProvider>
    </CatalogProvider>
  );
}
