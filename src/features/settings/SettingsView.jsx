import { useState, useMemo } from 'react';
import {
  Settings,
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
} from 'lucide-react';
import CatalogView from '../catalog/CatalogView';
import { useAuth } from '../../context/useAuth';
import { useCart } from '../../context/useCart';
import { APP_ROLES, ALL_MODULE_DEFINITIONS } from '../../types/roles';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

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
      <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 sm:p-6 space-y-5">
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
                className="w-full bg-black/60 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-base text-white font-extrabold placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Accesos rápidos a tarifas comunes */}
          <div>
            <span className="block text-[11px] font-bold text-zinc-500 mb-2 uppercase tracking-wider">
              Valores Rápidos:
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
                      : 'bg-black/40 text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700'
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

      {/* Tarjeta explicativa de funcionamiento */}
      <div className="bg-black/40 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">
          ¿Cómo opera el flujo de Delivery y Empaques?
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/60 space-y-1">
            <span className="font-bold text-white block">1. Carga Automática</span>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Al cambiar una comanda a modalidad Delivery, este costo se pre-carga en automático para agilizar el despacho.
            </p>
          </div>

          <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/60 space-y-1">
            <span className="font-bold text-white block">2. 100% Editable</span>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              El cajero puede modificar el costo de envío en cada comanda según la dirección, distancia o zona del cliente.
            </p>
          </div>

          <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/60 space-y-1">
            <span className="font-bold text-white block">3. Empaque Inteligente</span>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Al pasar de Mesa a Llevar o Delivery, se agregan los empaques por defecto; si vuelve a Mesa, se retiran automáticamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsView({ onClearAllOrders }) {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'delivery' | 'users' | 'system'
  const [isConfirmOrdersClearOpen, setIsConfirmOrdersClearOpen] = useState(false);
  const [isClearingOrders, setIsClearingOrders] = useState(false);

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
  const [editingUser, setEditingUser] = useState(null); // { email, displayName, role }
  const [isSavingEditUser, setIsSavingEditUser] = useState(false);

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

  // Copiado de reglas
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
  const [permToast, setPermToast] = useState(null);

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
      showToast('⚠️ Ingresa un Nombre y Apellido');
      return;
    }

    setIsSavingEditUser(true);
    await addAuthorizedUser({
      email: editingUser.email.toLowerCase().trim(),
      displayName: cleanName,
      role: editingUser.role || 'CAJERO',
    });

    showToast(`Usuario ${editingUser.email} actualizado a "${cleanName}"`);
    setEditingUser(null);
    setIsSavingEditUser(false);
  };

  const handleRemoveUser = async (email) => {
    if (confirm(`¿Revocar acceso al usuario ${email}?`)) {
      await removeAuthorizedUser(email);
      showToast(`Acceso revocado a ${email}`);
    }
  };

  const toggleModuleForRole = (roleId, moduleId) => {
    // Si es ADMIN y módulo es settings, siempre mantener
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
    showToast('Configuración de vistas por rol guardada con éxito');
  };

  const showToast = (msg) => {
    setPermToast(msg);
    setTimeout(() => setPermToast(null), 3000);
  };

  const firestoreRulesText = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null && request.auth.token.email != null;
    }

    function isSuperAdminEmail() {
      return isAuthenticated() && (
        request.auth.token.email.lower() in [
          'admin@porkos.pe'
          // Agrega aquí tu correo personal de Google/Gmail:
          // 'tu-correo@gmail.com'
        ] ||
        request.auth.token.email.matches('.*@porkos[.]pe')
      );
    }

    function isRegisteredEmail() {
      return isAuthenticated() && exists(/databases/$(database)/documents/users/$(request.auth.token.email.lower()));
    }

    function getUserDoc() {
      return get(/databases/$(database)/documents/users/$(request.auth.token.email.lower())).data;
    }

    function getRole() {
      return isSuperAdminEmail()
        ? 'ADMIN'
        : (isRegisteredEmail() ? getUserDoc().role : 'GUEST');
    }

    function isAuthorizedUser() {
      return isSuperAdminEmail() || (isRegisteredEmail() && getRole() != 'GUEST');
    }

    function isAdmin() {
      return isSuperAdminEmail() || getRole() == 'ADMIN' || getRole() == 'OWNER';
    }

    function isCoordinator() {
      return isAdmin() || getRole() == 'COORDINADOR';
    }

    function isKitchen() {
      return isCoordinator() || getRole() == 'COCINA';
    }

    function isCashier() {
      return isCoordinator() || getRole() == 'CAJERO';
    }

    match /users/{userEmail} {
      allow read: if isAuthorizedUser();
      allow write: if isAdmin() || (
        isAuthenticated() &&
        request.auth.token.email.lower() == userEmail.lower()
      );
    }

    match /app_config/{configId} {
      allow read: if isAuthorizedUser();
      allow write: if isCoordinator();
    }

    match /orders/{orderId} {
      allow read: if isAuthorizedUser();
      allow create: if isCashier();
      allow update: if isKitchen() || isCashier();
      allow delete: if isCoordinator();
    }

    match /products/{productId} {
      allow read: if isAuthorizedUser();
      allow write: if isCoordinator();
    }

    match /categories/{categoryId} {
      allow read: if isAuthorizedUser();
      allow write: if isCoordinator();
    }

    match /creams/{creamId} {
      allow read: if isAuthorizedUser();
      allow write: if isCoordinator();
    }

    match /extras/{extraId} {
      allow read: if isAuthorizedUser();
      allow write: if isCoordinator();
    }

    match /packagings/{packagingId} {
      allow read: if isAuthorizedUser();
      allow write: if isCoordinator();
    }

    match /expenses/{expenseId} {
      allow read, write: if isCoordinator();
    }

    match /tables/{tableId} {
      allow read: if isAuthorizedUser();
      allow write: if isCashier();
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
    <div className="space-y-4 pb-20 lg:pb-6">
      {permToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-black font-bold text-xs px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{permToast}</span>
        </div>
      )}

      {/* Top Header & Sub-Navigation */}
      <div className="bg-[var(--color-porkos-surface)] p-4 rounded-2xl border border-[var(--color-porkos-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/20 text-[var(--color-porkos-orange)] border border-orange-500/30">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Ajustes & Accesos
            </h2>
          </div>
        </div>

        {/* Pestañas de Configuración */}
        <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-zinc-800 text-xs font-bold w-full sm:w-auto overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'catalog'
                ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Catálogo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('delivery')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'delivery'
                ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Tarifas & Delivery</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Usuarios & Roles Blindados</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'system'
                ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Cloud & Base de Datos</span>
          </button>
        </div>
      </div>

      {/* 1. Vista de Catálogo */}
      {activeTab === 'catalog' && <CatalogView />}

      {/* 2. Vista de Tarifas & Configuración de Delivery */}
      {activeTab === 'delivery' && (
        <DeliverySettingsTab
          key={defaultDeliveryFee}
          initialFee={defaultDeliveryFee}
          onSave={handleSaveDeliveryFee}
        />
      )}

      {/* 3. Vista de Usuarios & Roles Blindados */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Card 1: Perfil del Operador en Turno (Sesión Actual) */}
          <div className="bg-gradient-to-r from-zinc-900 via-[#18181b] to-black border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
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
          <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 sm:p-5 space-y-4">
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
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--color-porkos-orange)]"
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
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--color-porkos-orange)]"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-zinc-300 block">
                  Rol Asignado *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[var(--color-porkos-orange)]"
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
                  icon={UserPlus}
                  size="md"
                  fullWidth
                  className="text-xs font-black py-2.5"
                >
                  {isAddingUser ? 'Guardando...' : 'Asignar'}
                </Button>
              </div>
            </form>
          </div>

          {/* Card 3: Lista de Usuarios Registrados */}
          <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 sm:p-5 space-y-3">
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
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-zinc-500 text-[10px] uppercase font-black">
                      <th className="py-2 pr-4">Nombre y Apellido</th>
                      <th className="py-2 px-4">Email</th>
                      <th className="py-2 px-4">Rol Asignado</th>
                      <th className="py-2 px-4">Vistas Permitidas</th>
                      <th className="py-2 pl-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {displayUsers.map((u) => {
                      const roleConfig = APP_ROLES[u.role] || APP_ROLES.CAJERO;
                      const allowed = editingPermissions[u.role] || roleConfig.defaultModules;
                      const isMe = currentUser?.email?.toLowerCase() === u.email?.toLowerCase();

                      return (
                        <tr key={u.email} className="hover:bg-black/30 transition-colors">
                          <td className="py-2.5 pr-4 font-bold text-white whitespace-nowrap">
                            {u.displayName ? (
                              <span>{u.displayName}</span>
                            ) : (
                              <span className="text-zinc-500 italic font-normal text-[11px]">Sin nombre configurado</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-zinc-300">
                            {u.email}
                            {isMe && (
                              <span className="ml-2 text-[10px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.2 rounded font-sans font-bold">
                                Tú
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${roleConfig.badgeClass}`}>
                              {roleConfig.name}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-zinc-400">
                            <div className="flex flex-wrap gap-1 max-w-md">
                              {allowed.map((modId) => (
                                <span key={modId} className="bg-zinc-800/80 text-zinc-300 px-1.5 py-0.2 rounded text-[10px]">
                                  {modId}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 pl-4 text-right whitespace-nowrap space-x-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUser({
                                  email: u.email,
                                  displayName: u.displayName || '',
                                  role: u.role || 'CAJERO',
                                });
                              }}
                              className="text-zinc-400 hover:text-[var(--color-porkos-orange)] p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                              title="Editar nombre y rol de este usuario"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveUser(u.email)}
                              className="text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
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
          <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Lock className="w-4 h-4 text-[var(--color-porkos-orange)]" />
                <span>Configurar Vistas Permitidas por Rol</span>
              </div>
              <Button
                type="button"
                onClick={handleSavePermissions}
                disabled={isSavingPerms}
                size="sm"
                icon={Check}
                className="text-xs font-bold"
              >
                {isSavingPerms ? 'Guardando...' : 'Guardar Vistas por Rol'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.keys(APP_ROLES).map((roleId) => {
                const role = APP_ROLES[roleId];
                const activeMods = editingPermissions[roleId] || role.defaultModules;

                return (
                  <div key={roleId} className="bg-black/50 p-3.5 rounded-xl border border-zinc-800 space-y-2.5">
                    <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
                      <div>
                        <h4 className="font-extrabold text-xs text-white">{role.name}</h4>
                        <p className="text-[10px] text-zinc-500">{role.description}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {ALL_MODULE_DEFINITIONS.map((mod) => {
                        const isChecked = activeMods.includes(mod.id);
                        return (
                          <label
                            key={mod.id}
                            className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                              isChecked ? 'bg-zinc-800/80 text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'
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

          {/* Card: Blindaje Backend en Base de Datos (Firestore Rules) */}
          <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 sm:p-5 space-y-3">
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
                {copiedRules ? '¡Copiado!' : 'Copiar firestore.rules para Firebase Console'}
              </Button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Tu aplicación está protegida en dos niveles: en la interfaz (bloqueando menús y vistas) y en el backend (impidiendo lecturas o escrituras a nivel de red y base de datos con reglas que validan el email del usuario).
            </p>

            <pre className="bg-black/80 border border-zinc-800 p-3 rounded-xl text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-56 scrollbar-thin">
              {firestoreRulesText}
            </pre>
          </div>
        </div>
      )}

      {/* 3. Vista de Infraestructura Cloud */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
          <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Infraestructura Cloud</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 rounded-xl bg-black/40 border border-zinc-800/80">
                <span className="text-zinc-400">Firebase Auth:</span>
                <span className="text-emerald-400 font-bold">Conectado</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-black/40 border border-zinc-800/80">
                <span className="text-zinc-400">Cloud Firestore:</span>
                <span className="text-emerald-400 font-bold">Activo</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-black/40 border border-zinc-800/80">
                <span className="text-zinc-400">Proyecto Firebase:</span>
                <span className="text-white font-mono">porkos-ac37d</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-black/40 border border-zinc-800/80">
                <span className="text-zinc-400">Tarifa Delivery Base:</span>
                <span className="text-emerald-400 font-bold">S/ {Number(defaultDeliveryFee).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <ShieldCheck className="w-4 h-4 text-[var(--color-porkos-orange)]" />
              <span>Roles Oficiales</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800/80 flex justify-between">
                <span className="text-rose-400 font-bold">ADMIN:</span>
                <span className="text-zinc-400">Acceso total y configuración</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800/80 flex justify-between">
                <span className="text-amber-400 font-bold">COORDINADOR(A):</span>
                <span className="text-zinc-400">Todo excepto Ajustes</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800/80 flex justify-between">
                <span className="text-orange-400 font-bold">COCINA:</span>
                <span className="text-zinc-400">Vista exclusiva de KDS</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800/80 flex justify-between">
                <span className="text-blue-400 font-bold">CAJERO:</span>
                <span className="text-zinc-400">Ventas, mesas y pedidos</span>
              </div>
            </div>
          </div>

          {/* Mantenimiento de Datos y Pedidos */}
          {onClearAllOrders && (
            <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 space-y-3 md:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Reinicio & Mantenimiento de Comandas</span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Elimina todo el historial de pedidos de la base de datos y de tu navegador para registrar datos limpios desde cero.
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
        </div>
      )}

      {/* Modal Confirmación de Vaciar Pedidos */}
      {isConfirmOrdersClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs"
            onClick={() => !isClearingOrders && setIsConfirmOrdersClearOpen(false)}
          />
          <div className="relative bg-[#141414] border border-zinc-800 rounded-2xl p-5 max-w-md w-full space-y-4 z-10 shadow-2xl">
            <h3 className="text-base font-black text-white">¿Vaciar todo el historial de pedidos?</h3>
            <p className="text-xs text-zinc-300">
              Esta acción eliminará todas las órdenes registradas en Firestore y en el almacenamiento local. Las mesas quedarán disponibles y podrás empezar desde cero.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                disabled={isClearingOrders}
                onClick={() => setIsConfirmOrdersClearOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isClearingOrders}
                onClick={async () => {
                  setIsClearingOrders(true);
                  try {
                    await onClearAllOrders();
                    setIsConfirmOrdersClearOpen(false);
                  } finally {
                    setIsClearingOrders(false);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                {isClearingOrders ? 'Eliminando...' : 'Sí, Vaciar Pedidos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dedicado para Editar Usuario y Nombre */}
      <Modal
        isOpen={Boolean(editingUser)}
        onClose={() => !isSavingEditUser && setEditingUser(null)}
        title="Editar Nombre y Rol de Usuario"
        subtitle="Configura el nombre visible en comandas y su nivel de permisos"
        maxWidth="max-w-md"
      >
        {editingUser && (
          <form onSubmit={handleSaveEditUser} className="space-y-4">
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
                <span className="text-[10px] text-[var(--color-porkos-orange)] font-medium">Aparecerá en comandas</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={editingUser.displayName || ''}
                onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, displayName: e.target.value } : null))}
                placeholder="Ej. Luis Loli"
                className="w-full bg-black/80 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-[var(--color-porkos-orange)] shadow-inner"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300 block">
                Rol Asignado *
              </label>
              <select
                value={editingUser.role || 'CAJERO'}
                onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, role: e.target.value } : null))}
                className="w-full bg-black/80 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[var(--color-porkos-orange)]"
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
                size="sm"
                disabled={isSavingEditUser}
                onClick={() => setEditingUser(null)}
                className="text-xs border-zinc-700 text-zinc-300 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingEditUser}
                icon={Check}
                size="sm"
                className="text-xs font-black"
              >
                {isSavingEditUser ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
