import { useState } from 'react';
import {
  Settings,
  UtensilsCrossed,
  Database,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Trash2,
  Copy,
  Check,
  Lock,
} from 'lucide-react';
import CatalogView from '../catalog/CatalogView';
import { useAuth } from '../../context/useAuth';
import { APP_ROLES, ALL_MODULE_DEFINITIONS } from '../../types/roles';
import Button from '../../components/ui/Button';

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'users' | 'system'

  const {
    user: currentUser,
    authorizedUsers = [],
    addAuthorizedUser,
    removeAuthorizedUser,
    customRolePermissions,
    updateRolePermissions,
  } = useAuth();

  // Formulario nuevo usuario
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('COORDINADOR');
  const [isAddingUser, setIsAddingUser] = useState(false);

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
    if (!newEmail.trim()) return;

    setIsAddingUser(true);
    await addAuthorizedUser({
      email: newEmail.trim().toLowerCase(),
      role: newRole,
      createdAt: new Date().toISOString(),
    });

    setNewEmail('');
    setIsAddingUser(false);
    showToast(`Acceso asignado con éxito a ${newEmail}`);
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

    function getUserDoc() {
      return get(/databases/$(database)/documents/users/$(request.auth.token.email)).data;
    }

    function getRole() {
      return isAuthenticated() && exists(/databases/$(database)/documents/users/$(request.auth.token.email))
        ? getUserDoc().role
        : 'GUEST';
    }

    function isAdmin() {
      return isAuthenticated() && (
        getRole() == 'ADMIN' ||
        getRole() == 'OWNER' ||
        request.auth.token.email == 'admin@porkos.pe'
      );
    }

    function isCoordinator() {
      return isAuthenticated() && (isAdmin() || getRole() == 'COORDINADOR');
    }

    function isKitchen() {
      return isAuthenticated() && (isAdmin() || isCoordinator() || getRole() == 'COCINA');
    }

    function isCashier() {
      return isAuthenticated() && (isAdmin() || isCoordinator() || getRole() == 'CAJERO');
    }

    match /users/{userEmail} {
      allow read: if isAuthenticated();
      allow write: if isAdmin() || !exists(/databases/$(database)/documents/users/$(userEmail));
    }

    match /app_config/{configId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    match /orders/{orderId} {
      allow read: if isAuthenticated();
      allow create: if isCashier();
      allow update: if isKitchen() || isCashier();
      allow delete: if isAdmin() || isCoordinator();
    }

    match /products/{productId} {
      allow read: if isAuthenticated();
      allow write: if isCoordinator();
    }

    match /categories/{categoryId} {
      allow read: if isAuthenticated();
      allow write: if isCoordinator();
    }

    match /creams/{creamId} {
      allow read: if isAuthenticated();
      allow write: if isCoordinator();
    }

    match /extras/{extraId} {
      allow read: if isAuthenticated();
      allow write: if isCoordinator();
    }

    match /packagings/{packagingId} {
      allow read: if isAuthenticated();
      allow write: if isCoordinator();
    }

    match /expenses/{expenseId} {
      allow read, write: if isCoordinator();
    }

    match /tables/{tableId} {
      allow read: if isAuthenticated();
      allow write: if isCashier();
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

      {/* 2. Vista de Usuarios & Roles Blindados */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Card: Registrar Nuevo Usuario por Email */}
          <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <UserPlus className="w-4 h-4 text-[var(--color-porkos-orange)]" />
              <span>Registrar Usuario y Asignar Rol por Email</span>
            </div>

            <form onSubmit={handleAddUserSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-6 space-y-1">
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
                  Rol Asignado *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[var(--color-porkos-orange)]"
                >
                  <option value="ADMIN">ADMIN (Acceso Total)</option>
                  <option value="COORDINADOR">COORDINADOR(A) (Todo menos Ajustes)</option>
                  <option value="COCINA">COCINA (Solo KDS Cocina)</option>
                  <option value="CAJERO">CAJERO (Ventas, Pedidos y Mesas)</option>
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

          {/* Card: Lista de Usuarios Registrados */}
          <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Usuarios con Acceso Autorizado ({authorizedUsers.length})</span>
              </div>
              <span className="text-xs text-zinc-500">
                Sesión actual: <strong className="text-white">{currentUser?.email}</strong> ({currentUser?.role})
              </span>
            </div>

            {authorizedUsers.length === 0 ? (
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
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 px-4">Rol Asignado</th>
                      <th className="py-2 px-4">Vistas Permitidas</th>
                      <th className="py-2 pl-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {authorizedUsers.map((u) => {
                      const roleConfig = APP_ROLES[u.role] || APP_ROLES.CAJERO;
                      const allowed = editingPermissions[u.role] || roleConfig.defaultModules;

                      return (
                        <tr key={u.email} className="hover:bg-black/30 transition-colors">
                          <td className="py-2.5 pr-4 font-mono font-bold text-white">
                            {u.email}
                            {currentUser?.email === u.email && (
                              <span className="ml-2 text-[10px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.2 rounded font-sans">
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
                          <td className="py-2.5 pl-4 text-right">
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
        </div>
      )}
    </div>
  );
}
