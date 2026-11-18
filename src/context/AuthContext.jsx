import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { AuthContext } from './auth-context';
import {
  subscribeToUsers,
  saveUserToFirestore,
  deleteUserFromFirestore,
  subscribeToRolePermissions,
  saveRolePermissionsToFirestore,
} from '../services/firestoreService';
import { APP_ROLES, getAllowedModulesForRole } from '../types/roles';

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Lista de usuarios registrados en el sistema (con rol asignado)
  const [authorizedUsers, setAuthorizedUsers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('porkos_authorized_users') || '[]');
    } catch {
      return [];
    }
  });

  // Configuración personalizada de vistas por rol
  const [customRolePermissions, setCustomRolePermissions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('porkos_role_permissions') || 'null');
    } catch {
      return null;
    }
  });

  // 1. Suscripción a usuarios y permisos desde Firestore
  useEffect(() => {
    const unsubUsers = subscribeToUsers((remoteUsers) => {
      if (remoteUsers && remoteUsers.length > 0) {
        setAuthorizedUsers(remoteUsers);
        localStorage.setItem('porkos_authorized_users', JSON.stringify(remoteUsers));
      }
    });

    const unsubPerms = subscribeToRolePermissions((remotePerms) => {
      if (remotePerms) {
        setCustomRolePermissions(remotePerms);
        localStorage.setItem('porkos_role_permissions', JSON.stringify(remotePerms));
      }
    });

    return () => {
      unsubUsers();
      unsubPerms();
    };
  }, []);

  // 2. Escuchar el estado de autenticación en Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setFirebaseUser({
          uid: currentUser.uid,
          displayName: currentUser.displayName || 'Operador PORKOS',
          email: currentUser.email?.toLowerCase(),
          photoURL: currentUser.photoURL,
        });
      } else {
        // Verificar si hay sesión demo guardada
        const savedDemoUser = localStorage.getItem('porkos_demo_user');
        if (savedDemoUser) {
          try {
            setFirebaseUser(JSON.parse(savedDemoUser));
          } catch {
            setFirebaseUser(null);
          }
        } else {
          setFirebaseUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 3. Resolver usuario con su rol blindado y permisos
  const user = useMemo(() => {
    if (!firebaseUser) return null;

    const email = firebaseUser.email?.toLowerCase();
    const matching = authorizedUsers.find((u) => u.email?.toLowerCase() === email);

    // Si está registrado en Firestore, usar su rol
    let role = matching?.role;

    // Si no está registrado pero es usuario demo, usar el rol de la demo
    if (!role && firebaseUser.role) {
      role = firebaseUser.role;
    }

    // Si no hay usuarios en el sistema, el primer usuario es ADMIN
    if (!role) {
      role = authorizedUsers.length === 0 ? 'ADMIN' : 'CAJERO';
    }

    const roleInfo = APP_ROLES[role] || APP_ROLES.CAJERO;

    return {
      ...firebaseUser,
      role,
      roleName: roleInfo.name,
      roleBadgeClass: roleInfo.badgeClass,
    };
  }, [firebaseUser, authorizedUsers]);

  // Vistas permitidas para el usuario actual
  const allowedModules = useMemo(() => {
    if (!user) return [];
    return getAllowedModulesForRole(user.role, customRolePermissions);
  }, [user, customRolePermissions]);

  const canAccessModule = useCallback(
    (moduleId) => {
      if (!user) return false;
      return allowedModules.includes(moduleId);
    },
    [user, allowedModules]
  );

  // Iniciar sesión con Google
  const loginWithGoogle = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email?.toLowerCase();
      const loggedUser = {
        uid: result.user.uid,
        displayName: result.user.displayName || 'Operador PORKOS',
        email,
        photoURL: result.user.photoURL,
      };
      setFirebaseUser(loggedUser);
      localStorage.removeItem('porkos_demo_user');
      setLoading(false);
      return loggedUser;
    } catch (err) {
      console.error('Error al iniciar sesión con Google:', err);
      let userFriendlyMessage = err.message || 'Error al iniciar sesión con Google';

      if (err.code === 'auth/unauthorized-domain') {
        const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'este dominio';
        userFriendlyMessage = `Dominio no autorizado (${currentDomain}): Agrégalo en Firebase Console > Authentication > Dominios autorizados.`;
      } else if (err.code === 'auth/popup-blocked') {
        userFriendlyMessage = 'Permite las ventanas emergentes (pop-ups) para iniciar sesión.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        userFriendlyMessage = 'Se cerró la ventana de acceso.';
      }

      setAuthError(userFriendlyMessage);
      setLoading(false);
      throw new Error(userFriendlyMessage, { cause: err });
    }
  };

  // Iniciar sesión en modo Demo (offline o testing rápido)
  const loginDemo = (role = 'ADMIN') => {
    const demoUser = {
      uid: 'demo_user_123',
      displayName: role === 'COCINA' ? 'Monitor de Cocina' : role === 'COORDINADOR' ? 'Coordinador(a) Operativo' : 'Administrador PORKOS',
      email: role === 'COCINA' ? 'cocina@porkos.pe' : role === 'COORDINADOR' ? 'coordinador@porkos.pe' : 'admin@porkos.pe',
      photoURL: null,
      role,
    };
    setFirebaseUser(demoUser);
    localStorage.setItem('porkos_demo_user', JSON.stringify(demoUser));
  };

  // Cerrar sesión
  const logout = async () => {
    try {
      localStorage.removeItem('porkos_demo_user');
      await signOut(auth);
      setFirebaseUser(null);
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      setFirebaseUser(null);
    }
  };

  // Registrar o actualizar usuario autorizado por email
  const addAuthorizedUser = async (userRecord) => {
    const email = userRecord.email?.toLowerCase().trim();
    if (!email) return false;

    const updated = [
      ...authorizedUsers.filter((u) => u.email?.toLowerCase() !== email),
      { ...userRecord, email },
    ];
    setAuthorizedUsers(updated);
    localStorage.setItem('porkos_authorized_users', JSON.stringify(updated));

    await saveUserToFirestore({
      email,
      displayName: userRecord.displayName || email.split('@')[0],
      role: userRecord.role || 'CAJERO',
    });
    return true;
  };

  // Eliminar usuario autorizado
  const removeAuthorizedUser = async (email) => {
    const cleanEmail = email?.toLowerCase().trim();
    const updated = authorizedUsers.filter((u) => u.email?.toLowerCase() !== cleanEmail);
    setAuthorizedUsers(updated);
    localStorage.setItem('porkos_authorized_users', JSON.stringify(updated));

    await deleteUserFromFirestore(cleanEmail);
    return true;
  };

  // Actualizar configuración de vistas por rol
  const updateRolePermissions = async (newPermissions) => {
    setCustomRolePermissions(newPermissions);
    localStorage.setItem('porkos_role_permissions', JSON.stringify(newPermissions));
    await saveRolePermissionsToFirestore(newPermissions);
    return true;
  };

  const value = {
    user,
    loading,
    authError,
    loginWithGoogle,
    loginDemo,
    logout,
    isAuthenticated: Boolean(user),
    allowedModules,
    canAccessModule,
    authorizedUsers,
    customRolePermissions,
    addAuthorizedUser,
    removeAuthorizedUser,
    updateRolePermissions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
