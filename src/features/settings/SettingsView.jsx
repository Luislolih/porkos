import { useState, useMemo } from 'react';
import {
  UtensilsCrossed,
  Database,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Trash2,
  Pencil,
  Copy,
  Check,
  Lock,
  Bike,
  Grid2X2,
  Plus,
  Users,
  Settings,
  Bell,
  RefreshCw,
} from 'lucide-react';
import CatalogView from '../catalog/CatalogView';
import NotificationsSettingsTab from './NotificationsSettingsTab';
import { useAuth } from '../../context/useAuth';
import { useCart } from '../../context/useCart';
import { APP_ROLES, ALL_MODULE_DEFINITIONS } from '../../types/roles';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PageHeader from '../../components/ui/PageHeader';
import Toast from '../../components/ui/Toast';

function DeliverySettingsTab({ initialFee, onSave }) {
  const [deliveryFeeInput, setDeliveryFeeInput] = useState(initialFee);
  const [isSavingDelivery, setIsSavingDelivery] = useState(false);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsSavingDelivery(true);
    await onSave(deliveryFeeInput);
    setIsSavingDelivery(false);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 sm:p-6 space-y-5 shadow-sm">
        <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">
              Tarifa Base de Delivery
            </h3>
            <p className="text-xs text-zinc-400">
              Configura el monto por defecto que se cargará automáticamente al seleccionar Delivery en una comanda.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-2">
              Monto por Defecto para Delivery (S/)
            </label>
            <div className="relative max-w-xs">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-400">
                S/
              </span>
              <input
                type="number"
                step="0.50"
                min="0"
                required
                value={deliveryFeeInput}
                onChange={(e) => setDeliveryFeeInput(e.target.value)}
                placeholder="5.00"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-base text-white font-extrabold placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Accesos rápidos a tarifas comunes */}
          <div>
            <span className="block text-[11px] font-bold text-zinc-500 mb-2 uppercase tracking-wider">
              Valores Rápidos Frecuentes:
            </span>
            <div className="flex flex-wrap gap-2">
              {['3.00', '4.00', '5.00', '6.00', '7.00', '8.00', '10.00'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDeliveryFeeInput(val)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    Number(deliveryFeeInput) === Number(val)
                      ? 'bg-emerald-500 text-black border-emerald-400 font-black shadow-md shadow-emerald-500/20 scale-105'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  S/ {val}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isSavingDelivery}
              icon={Check}
              className="text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 py-2.5 px-5"
            >
              {isSavingDelivery ? 'Guardando...' : 'Guardar Tarifa Delivery'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TablesSettingsTab({ tablesList = [], onAddTable, onUpdateTable, onDeleteTable }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [numberInput, setNumberInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [capacityInput, setCapacityInput] = useState('4');
  const [isSaving, setIsSaving] = useState(false);

  // Confirm delete table dialog
  const [tableToDelete, setTableToDelete] = useState(null);

  const openAddModal = () => {
    const nextNum = tablesList.length > 0 ? Math.max(...tablesList.map((t) => Number(t.number) || 0)) + 1 : 1;
    setEditingTable(null);
    setNumberInput(nextNum.toString());
    setLabelInput(`Mesa ${nextNum}`);
    setCapacityInput('4');
    setIsAddModalOpen(true);
  };

  const openEditModal = (table) => {
    setEditingTable(table);
    setNumberInput((table.number || '').toString());
    setLabelInput(table.label || '');
    setCapacityInput((table.capacity || 4).toString());
    setIsAddModalOpen(true);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      if (editingTable) {
        if (onUpdateTable) {
          await onUpdateTable({
            ...editingTable,
            number: parseInt(numberInput, 10) || editingTable.number,
            label: labelInput.trim() || `Mesa ${numberInput}`,
            capacity: parseInt(capacityInput, 10) || 4,
          });
        }
      } else {
        if (onAddTable) {
          await onAddTable({
            number: parseInt(numberInput, 10),
            label: labelInput.trim(),
            capacity: parseInt(capacityInput, 10),
          });
        }
      }
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Error guardando mesa:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDeleteTable = async () => {
    if (!tableToDelete || !onDeleteTable) return;
    await onDeleteTable(tableToDelete.id);
    setTableToDelete(null);
  };

  const sortedTables = [...tablesList].sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Barra de acción compacta de mesas */}
      <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Grid2X2 className="w-4 h-4 text-[var(--color-porkos-orange)]" />
          <span className="font-extrabold text-sm text-white">
            Mesas del Salón ({tablesList.length})
          </span>
        </div>

        <Button
          type="button"
          onClick={openAddModal}
          icon={Plus}
          size="sm"
          className="text-xs font-black shadow-md shadow-orange-500/20"
        >
          Agregar Mesa
        </Button>
      </div>

      {/* Lista de Mesas en DB */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {sortedTables.map((table) => (
          <div
            key={table.id}
            className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-sm hover:border-zinc-700 transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-black text-white text-base">
                  {table.number}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">{table.label}</h4>
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-medium">
                    <Users className="w-3 h-3 text-zinc-500" />
                    Capacidad: {table.capacity || 4} personas
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEditModal(table)}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 cursor-pointer transition-colors active:scale-95 touch-manipulation"
                  title="Editar mesa"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTableToDelete(table)}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-zinc-700 hover:border-rose-500/40 cursor-pointer transition-colors active:scale-95 touch-manipulation"
                  title="Eliminar mesa de la base de datos"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">ID Base de Datos:</span>
              <span className="font-mono text-zinc-400 text-[10px]">{table.id}</span>
            </div>
          </div>
        ))}

        {sortedTables.length === 0 && (
          <div className="col-span-full py-12 text-center text-zinc-500 bg-zinc-900/40 rounded-2xl border border-zinc-800">
            <Grid2X2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-zinc-400" />
            <p className="font-bold text-sm text-zinc-300">No hay mesas configuradas</p>
            <p className="text-xs text-zinc-500 mt-0.5">Haz clic en &quot;Agregar Mesa&quot; para registrar la primera mesa del salón.</p>
          </div>
        )}
      </div>

      {/* Modal Agregar / Editar Mesa */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title={editingTable ? 'Editar Mesa de Salón' : 'Nueva Mesa de Salón'}
          subtitle="Configura el número, nombre visible y capacidad de la mesa"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Número de Mesa *
              </label>
              <input
                type="number"
                min="1"
                required
                value={numberInput}
                onChange={(e) => {
                  setNumberInput(e.target.value);
                  if (!editingTable) {
                    setLabelInput(`Mesa ${e.target.value}`);
                  }
                }}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-[var(--color-porkos-orange)] transition-colors"
                placeholder="Ej: 4"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Nombre / Identificador *
              </label>
              <input
                type="text"
                required
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-[var(--color-porkos-orange)] transition-colors"
                placeholder="Ej: Mesa 4 o Terraza 1"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Capacidad Máxima (personas)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                required
                value={capacityInput}
                onChange={(e) => setCapacityInput(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-[var(--color-porkos-orange)] transition-colors"
                placeholder="4"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                isLoading={isSaving}
              >
                {editingTable ? 'Guardar Cambios' : 'Crear Mesa'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Dialog Eliminar Mesa */}
      <ConfirmDialog
        isOpen={Boolean(tableToDelete)}
        onClose={() => setTableToDelete(null)}
        onConfirm={handleConfirmDeleteTable}
        title={`¿Eliminar ${tableToDelete?.label}?`}
        message="Esta acción afectará el mapa del salón y no se podrá asignar nuevas comandas a esta mesa."
        confirmText="Sí, Eliminar Mesa"
        variant="danger"
      />
    </div>
  );
}

export default function SettingsView({
  onClearAllOrders,
  tablesList = [],
  onAddTable,
  onUpdateTable,
  onDeleteTable,
}) {
  const [activeTab, setActiveTab] = useState('tables'); // 'tables' | 'delivery' | 'users' | 'system' | 'catalog'
  const [isConfirmOrdersClearOpen, setIsConfirmOrdersClearOpen] = useState(false);
  const [isClearingOrders, setIsClearingOrders] = useState(false);
  const [isRefreshingCache, setIsRefreshingCache] = useState(false);

  const handleForceUpdateAndClearCache = async () => {
    setIsRefreshingCache(true);
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      localStorage.removeItem('porkos_build_version');
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  const {
    user: currentUser,
    authorizedUsers = [],
    addAuthorizedUser,
    removeAuthorizedUser,
    customRolePermissions,
    updateRolePermissions,
  } = useAuth();

  const { defaultDeliveryFee = 5, updateDefaultDeliveryFee } = useCart();

  const handleSaveDeliveryFee = async (feeVal) => {
    const parsedFee = Math.max(0, parseFloat(feeVal) || 0);
    await updateDefaultDeliveryFee(parsedFee);
    showToast(`Tarifa base de delivery actualizada a S/ ${parsedFee.toFixed(2)}`);
  };

  // Formulario nuevo usuario y modal de edición
  const [newEmail, setNewEmail] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState('COORDINADOR');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isSavingEditUser, setIsSavingEditUser] = useState(false);

  // Dialog revocar usuario
  const [userToRevoke, setUserToRevoke] = useState(null);

  // Lista unificada garantizando que el usuario en sesión actual siempre aparezca
  const displayUsers = useMemo(() => {
    const list = [...authorizedUsers];
    if (currentUser?.email && !list.some((u) => u.email?.toLowerCase() === currentUser.email?.toLowerCase())) {
      list.unshift({
        email: currentUser.email,
        displayName: currentUser.displayName || currentUser.email.split('@')[0],
        role: currentUser.role || 'ADMIN',
      });
    }
    return list;
  }, [authorizedUsers, currentUser]);

  const [copiedRules, setCopiedRules] = useState(false);

  // Permisos de roles en edición
  const [editingPermissions, setEditingPermissions] = useState(() => {
    const initial = {};
    Object.keys(APP_ROLES).forEach((roleId) => {
      initial[roleId] = customRolePermissions?.[roleId] || APP_ROLES[roleId].defaultModules;
    });
    return initial;
  });

  const [isSavingPerms, setIsSavingPerms] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail) return;

    setIsAddingUser(true);
    const cleanName = newDisplayName.trim();

    await addAuthorizedUser({
      email: cleanEmail,
      displayName: cleanName || cleanEmail.split('@')[0],
      role: newRole,
      createdAt: new Date().toISOString(),
    });

    setNewEmail('');
    setNewDisplayName('');
    showToast(`Usuario ${cleanEmail} registrado con éxito`);
    setIsAddingUser(false);
  };

  const handleSaveEditUser = async (e) => {
    if (e) e.preventDefault();
    if (!editingUser || !editingUser.email) return;

    const cleanName = editingUser.displayName?.trim();
    if (!cleanName) {
      showToast('⚠️ Ingresa un Nombre y Apellido', 'warning');
      return;
    }

    setIsSavingEditUser(true);
    await addAuthorizedUser({
      email: editingUser.email.toLowerCase().trim(),
      displayName: cleanName,
      role: editingUser.role || 'CAJERO',
    });

    showToast(`Usuario ${editingUser.email} actualizado`);
    setEditingUser(null);
    setIsSavingEditUser(false);
  };

  const handleConfirmRevokeUser = async () => {
    if (!userToRevoke) return;
    await removeAuthorizedUser(userToRevoke);
    showToast(`Acceso revocado a ${userToRevoke}`);
    setUserToRevoke(null);
  };

  const toggleModuleForRole = (roleId, moduleId) => {
    setEditingPermissions((prev) => {
      const current = prev[roleId] || APP_ROLES[roleId].defaultModules;
      const exists = current.includes(moduleId);
      const updated = exists ? current.filter((m) => m !== moduleId) : [...current, moduleId];
      return {
        ...prev,
        [roleId]: updated,
      };
    });
  };

  const handleSavePermissions = async () => {
    setIsSavingPerms(true);
    await updateRolePermissions(editingPermissions);
    setIsSavingPerms(false);
    showToast('Configuración de vistas por rol guardada');
  };

  const firestoreRulesText = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null && request.auth.token.email != null;
    }
    match /users/{userEmail} {
      allow read, write: if isAuthenticated();
    }
    match /orders/{orderId} {
      allow read, write: if isAuthenticated();
    }
    match /tables/{tableId} {
      allow read, write: if isAuthenticated();
    }
    match /products/{productId} {
      allow read, write: if isAuthenticated();
    }
    match /categories/{categoryId} {
      allow read, write: if isAuthenticated();
    }
    match /creams/{creamId} {
      allow read, write: if isAuthenticated();
    }
    match /extras/{extraId} {
      allow read, write: if isAuthenticated();
    }
    match /packagings/{packagingId} {
      allow read, write: if isAuthenticated();
    }
    match /expenses/{expenseId} {
      allow read, write: if isAuthenticated();
    }
    match /app_config/{configId} {
      allow read, write: if isAuthenticated();
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`;

  const handleCopyRules = () => {
    navigator.clipboard.writeText(firestoreRulesText);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2500);
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-8">
      {toastMessage && (
        <Toast
          message={toastMessage.text}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <PageHeader
        title="Configuración del Sistema"
        subtitle="Administra mesas del salón, tarifas de delivery, roles de usuarios y base de datos"
        icon={Settings}
        badge="Administración"
      />

      {/* Sub-Navegación compacta de Configuración */}
      <div className="bg-[var(--color-porkos-surface)] p-2 rounded-2xl border border-[var(--color-porkos-border)] flex items-center gap-1.5 overflow-x-auto scrollbar-none shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab('tables')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'tables'
              ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-md shadow-orange-500/15'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Grid2X2 className="w-3.5 h-3.5" />
          <span>Mesas Salón ({tablesList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('delivery')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'delivery'
              ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-md shadow-orange-500/15'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Bike className="w-3.5 h-3.5" />
          <span>Tarifas Delivery</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-md shadow-orange-500/15'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Usuarios & Roles ({displayUsers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-md shadow-orange-500/15'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Notificaciones PWA</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'system'
              ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-md shadow-orange-500/15'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Cloud & Base de Datos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'catalog'
              ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-md shadow-orange-500/15'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <UtensilsCrossed className="w-3.5 h-3.5" />
          <span>Catálogo</span>
        </button>
      </div>

      {/* 1. Vista de Mesas de Salón */}
      {activeTab === 'tables' && (
        <TablesSettingsTab
          tablesList={tablesList}
          onAddTable={onAddTable}
          onUpdateTable={onUpdateTable}
          onDeleteTable={onDeleteTable}
        />
      )}

      {/* 2. Vista de Tarifas de Delivery */}
      {activeTab === 'delivery' && (
        <DeliverySettingsTab
          key={defaultDeliveryFee}
          initialFee={defaultDeliveryFee}
          onSave={handleSaveDeliveryFee}
        />
      )}

      {/* 3. Vista de Usuarios & Roles */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Card 1: Perfil de Sesión Actual */}
          <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-[var(--color-porkos-orange)] border border-orange-500/40 flex items-center justify-center font-black text-lg shrink-0">
                {(currentUser?.displayName || currentUser?.email || 'U')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-white truncate">
                    {currentUser?.displayName || <span className="text-zinc-500 italic">Sin nombre configurado</span>}
                  </h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded border uppercase bg-emerald-950/60 text-emerald-300 border-emerald-500/30">
                    Sesión Activa
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${currentUser?.roleBadgeClass || 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                    {currentUser?.roleName || currentUser?.role}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5 truncate">
                  {currentUser?.email} • <span className="text-zinc-500">Este nombre aparecerá en el historial de cada comanda</span>
                </p>
              </div>
            </div>

            <Button
              type="button"
              icon={Pencil}
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingUser({
                  email: currentUser?.email || '',
                  displayName: currentUser?.displayName || '',
                  role: currentUser?.role || 'ADMIN',
                });
              }}
              className="text-xs font-bold shrink-0 w-full sm:w-auto"
            >
              Editar Mi Nombre
            </Button>
          </div>

          {/* Card 2: Registrar Nuevo Usuario por Email */}
          <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <UserPlus className="w-4 h-4 text-[var(--color-porkos-orange)]" />
              <span>Registrar Nuevo Usuario y Asignar Rol</span>
            </div>

            <form onSubmit={handleAddUserSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-4 space-y-1">
                <label className="text-xs font-bold text-zinc-300 block">
                  Email de acceso (Google / Gmail) *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="ejemplo@porkos.pe"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--color-porkos-orange)]"
                />
              </div>

              <div className="sm:col-span-4 space-y-1">
                <label className="text-xs font-bold text-zinc-300 block">
                  Nombre y Apellido *
                </label>
                <input
                  type="text"
                  required
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--color-porkos-orange)]"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-zinc-300 block">
                  Rol Asignado *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[var(--color-porkos-orange)] cursor-pointer"
                >
                  <option value="ADMIN">ADMIN (Acceso Total)</option>
                  <option value="COORDINADOR">COORDINADOR(A)</option>
                  <option value="COCINA">COCINA</option>
                  <option value="CAJERO">CAJERO</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  disabled={isAddingUser}
                  isLoading={isAddingUser}
                  icon={UserPlus}
                  size="md"
                  fullWidth
                  className="text-xs font-black py-2.5"
                >
                  Asignar
                </Button>
              </div>
            </form>
          </div>

          {/* Card 3: Lista de Usuarios Registrados */}
          <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Usuarios con Acceso Autorizado ({displayUsers.length})</span>
              </div>
            </div>

            {displayUsers.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                <p className="text-xs">No hay usuarios registrados específicamente.</p>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  El primer usuario que inicie sesión con Google tendrá rol de Administrador Total.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/80 overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="text-zinc-500 text-[10px] uppercase font-black border-b border-zinc-800/80">
                      <th className="py-2.5 pr-4">Nombre y Apellido</th>
                      <th className="py-2.5 px-4">Email</th>
                      <th className="py-2.5 px-4">Rol Asignado</th>
                      <th className="py-2.5 px-4">Vistas Permitidas</th>
                      <th className="py-2.5 pl-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {displayUsers.map((u) => {
                      const roleConfig = APP_ROLES[u.role] || APP_ROLES.CAJERO;
                      const allowed = editingPermissions[u.role] || roleConfig.defaultModules;
                      const isMe = currentUser?.email?.toLowerCase() === u.email?.toLowerCase();

                      return (
                        <tr key={u.email} className="hover:bg-black/30 transition-colors">
                          <td className="py-3 pr-4 font-bold text-white">
                            {u.displayName || (
                              <span className="text-zinc-500 italic font-normal text-[11px]">Sin nombre configurado</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-zinc-300">
                            {u.email}
                            {isMe && (
                              <span className="ml-2 text-[10px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.2 rounded font-sans font-bold">
                                Tú
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${roleConfig.badgeClass}`}>
                              {roleConfig.name}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-zinc-400">
                            <div className="flex flex-wrap gap-1 max-w-md">
                              {allowed.map((modId) => (
                                <span key={modId} className="bg-zinc-800 text-zinc-300 px-1.5 py-0.2 rounded text-[10px] font-semibold">
                                  {modId}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 pl-4 text-right space-x-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUser({
                                  email: u.email,
                                  displayName: u.displayName || '',
                                  role: u.role || 'CAJERO',
                                });
                              }}
                              className="text-zinc-400 hover:text-[var(--color-porkos-orange)] p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer active:scale-95 touch-manipulation"
                              title="Editar usuario"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setUserToRevoke(u.email)}
                              className="text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer active:scale-95 touch-manipulation"
                              title="Revocar acceso"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Card: Configuración de Vistas por Rol */}
          <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Lock className="w-4 h-4 text-[var(--color-porkos-orange)]" />
                <span>Configurar Vistas Permitidas por Rol</span>
              </div>
              <Button
                type="button"
                onClick={handleSavePermissions}
                disabled={isSavingPerms}
                isLoading={isSavingPerms}
                size="sm"
                icon={Check}
                className="text-xs font-bold"
              >
                Guardar Vistas
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.keys(APP_ROLES).map((roleId) => {
                const role = APP_ROLES[roleId];
                const activeMods = editingPermissions[roleId] || role.defaultModules;

                return (
                  <div key={roleId} className="bg-zinc-900/80 p-3.5 rounded-xl border border-zinc-800 space-y-2.5">
                    <div className="pb-1.5 border-b border-zinc-800">
                      <h4 className="font-extrabold text-xs text-white">{role.name}</h4>
                      <p className="text-[10px] text-zinc-500">{role.description}</p>
                    </div>

                    <div className="space-y-1">
                      {ALL_MODULE_DEFINITIONS.map((mod) => {
                        const isChecked = activeMods.includes(mod.id);
                        return (
                          <label
                            key={mod.id}
                            className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                              isChecked ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            <span>{mod.label}</span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleModuleForRole(roleId, mod.id)}
                              className="accent-[var(--color-porkos-orange)] w-3.5 h-3.5 cursor-pointer"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. Vista de Infraestructura Cloud & BD */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
          <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Infraestructura Cloud</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/80">
                <span className="text-zinc-400">Firebase Auth:</span>
                <span className="text-emerald-400 font-bold">Conectado (Google OAuth)</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/80">
                <span className="text-zinc-400">Cloud Firestore:</span>
                <span className="text-emerald-400 font-bold">Sincronización en Tiempo Real</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/80">
                <span className="text-zinc-400">Proyecto Firebase:</span>
                <span className="text-white font-mono">porkos-ac37d</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/80">
                <span className="text-zinc-400">Tarifa Delivery Base:</span>
                <span className="text-emerald-400 font-bold">S/ {Number(defaultDeliveryFee).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <ShieldCheck className="w-4 h-4 text-[var(--color-porkos-orange)]" />
              <span>Roles Oficiales del Sistema</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/80 flex justify-between">
                <span className="text-rose-400 font-bold">ADMIN:</span>
                <span className="text-zinc-400">Acceso total y configuración</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/80 flex justify-between">
                <span className="text-amber-400 font-bold">COORDINADOR(A):</span>
                <span className="text-zinc-400">Operaciones completas sin ajustes</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/80 flex justify-between">
                <span className="text-orange-400 font-bold">COCINA:</span>
                <span className="text-zinc-400">Vista KDS de preparación</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/80 flex justify-between">
                <span className="text-blue-400 font-bold">CAJERO:</span>
                <span className="text-zinc-400">Ventas, salón y pedidos</span>
              </div>
            </div>
          </div>

          {/* Actualización de Aplicación y Memoria Caché */}
          <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 sm:p-5 space-y-3 md:col-span-2 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[var(--color-porkos-orange)]" />
                  <span>Versión de la Aplicación y Caché Móvil</span>
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Fuerza la descarga inmediata de la última versión desplegada y purga los archivos antiguos de este dispositivo.
                </p>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-500 font-mono">
                  <span>Versión local:</span>
                  <span className="text-zinc-300 font-bold bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                    {localStorage.getItem('porkos_build_version') || 'Última versión'}
                  </span>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                icon={RefreshCw}
                onClick={handleForceUpdateAndClearCache}
                disabled={isRefreshingCache}
                className="shrink-0 font-bold"
              >
                {isRefreshingCache ? 'Actualizando...' : 'Forzar Actualización y Limpiar Caché'}
              </Button>
            </div>
          </div>

          {/* Mantenimiento de Datos y Pedidos */}
          {onClearAllOrders && (
            <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 sm:p-5 space-y-3 md:col-span-2 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Mantenimiento de Comandas</span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Elimina todo el historial de pedidos de Firestore y de tu navegador para registrar datos limpios.
                  </p>
                </div>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setIsConfirmOrdersClearOpen(true)}
                  className="shrink-0"
                >
                  Vaciar Historial de Pedidos
                </Button>
              </div>
            </div>
          )}

          {/* Reglas de Seguridad Backend */}
          <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 sm:p-5 space-y-3 md:col-span-2 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Reglas de Seguridad Backend (Firestore Rules)</span>
              </div>
              <Button
                type="button"
                onClick={handleCopyRules}
                size="sm"
                icon={copiedRules ? Check : Copy}
                variant="outline"
                className="text-xs font-bold border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
              >
                {copiedRules ? '¡Copiado!' : 'Copiar firestore.rules'}
              </Button>
            </div>

            <pre className="bg-black/80 border border-zinc-800 p-3 rounded-xl text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-56 scrollbar-thin">
              {firestoreRulesText}
            </pre>
          </div>
        </div>
      )}

      {/* 5. Vista de Notificaciones PWA */}
      {activeTab === 'notifications' && <NotificationsSettingsTab />}

      {/* 6. Vista de Catálogo */}
      {activeTab === 'catalog' && <CatalogView />}

      {/* Modal Confirmación de Vaciar Pedidos */}
      <ConfirmDialog
        isOpen={isConfirmOrdersClearOpen}
        onClose={() => !isClearingOrders && setIsConfirmOrdersClearOpen(false)}
        onConfirm={async () => {
          setIsClearingOrders(true);
          try {
            await onClearAllOrders();
            setIsConfirmOrdersClearOpen(false);
            showToast('Historial de comandas vaciado con éxito');
          } finally {
            setIsClearingOrders(false);
          }
        }}
        title="¿Vaciar todo el historial de pedidos?"
        message="Esta acción eliminará todas las órdenes registradas en Firestore y en el almacenamiento local. Las mesas quedarán disponibles."
        confirmText={isClearingOrders ? 'Eliminando...' : 'Sí, Vaciar Pedidos'}
        variant="danger"
        isLoading={isClearingOrders}
      />

      {/* Confirm Dialog Revocar Usuario */}
      <ConfirmDialog
        isOpen={Boolean(userToRevoke)}
        onClose={() => setUserToRevoke(null)}
        onConfirm={handleConfirmRevokeUser}
        title={`¿Revocar acceso a ${userToRevoke}?`}
        message="El usuario ya no podrá iniciar sesión ni acceder a los módulos del sistema."
        confirmText="Sí, Revocar Acceso"
        variant="danger"
      />

      {/* Modal Dedicado para Editar Usuario y Nombre */}
      <Modal
        isOpen={Boolean(editingUser)}
        onClose={() => !isSavingEditUser && setEditingUser(null)}
        title="Editar Nombre y Rol de Usuario"
        subtitle="Configura el nombre visible en comandas y su nivel de permisos"
        maxWidth="max-w-md"
      >
        {editingUser && (
          <form onSubmit={handleSaveEditUser} className="space-y-4 text-xs sm:text-sm">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400 block">
                Email de acceso (Google / Gmail)
              </label>
              <input
                type="email"
                disabled
                value={editingUser.email}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-400 font-mono cursor-not-allowed select-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-white flex items-center justify-between">
                <span>Nombre y Apellido *</span>
                <span className="text-[10px] text-[var(--color-porkos-orange)] font-medium">Aparece en comandas</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={editingUser.displayName || ''}
                onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, displayName: e.target.value } : null))}
                placeholder="Ej. Luis Loli"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-[var(--color-porkos-orange)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300 block">
                Rol Asignado *
              </label>
              <select
                value={editingUser.role || 'CAJERO'}
                onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, role: e.target.value } : null))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[var(--color-porkos-orange)] cursor-pointer"
              >
                <option value="ADMIN">ADMIN (Acceso Total)</option>
                <option value="COORDINADOR">COORDINADOR(A) (Todo menos Ajustes)</option>
                <option value="COCINA">COCINA (Solo KDS Cocina)</option>
                <option value="CAJERO">CAJERO (Ventas, Pedidos y Mesas)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button
                type="button"
                variant="outline"
                disabled={isSavingEditUser}
                onClick={() => setEditingUser(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingEditUser}
                isLoading={isSavingEditUser}
                icon={Check}
              >
                Guardar Cambios
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
