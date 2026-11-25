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
  getUserFromFirestore,
  createUserIfNotExistsInFirestore,
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

  const upsertLocalAuthorizedUser = useCallback((userDoc) => {
    if (!userDoc?.email) return;
    const email = userDoc.email.toLowerCase().trim();
    setAuthorizedUsers((prev) => {
      const next = [...prev.filter((u) => u.email?.toLowerCase() !== email), { ...userDoc, email }];
      try {
        localStorage.setItem('porkos_authorized_users', JSON.stringify(next));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });
  }, []);

  // 1. Suscripción a usuarios y permisos desde Firestore SOLO cuando hay sesión autenticada
  // (evita que onSnapshot muera por permission-denied antes de hacer login)
  useEffect(() => {
    if (!firebaseUser?.uid) return undefined;

    const unsubUsers = subscribeToUsers((remoteUsers) => {
      if (Array.isArray(remoteUsers)) {
        setAuthorizedUsers(remoteUsers);
        try {
          localStorage.setItem('porkos_authorized_users', JSON.stringify(remoteUsers));
        } catch (e) {
          console.warn(e);
        }
      }
    });

    const unsubPerms = subscribeToRolePermissions((remotePerms) => {
      if (remotePerms) {
        setCustomRolePermissions(remotePerms);
        try {
          localStorage.setItem('porkos_role_permissions', JSON.stringify(remotePerms));
        } catch (e) {
          console.warn(e);
        }
      }
    });

    return () => {
      unsubUsers();
      unsubPerms();
    };
  }, [firebaseUser?.uid]);

  // 2. Escuchar el estado de autenticación en Firebase y cargar rol real antes de liberar loading
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const email = currentUser.email?.toLowerCase();
        const profile = {
          uid: currentUser.uid,
          displayName: currentUser.displayName || (email ? email.split('@')[0] : 'Operador PORKOS'),
          email,
          photoURL: currentUser.photoURL,
          emailVerified: currentUser.emailVerified,
        };

        // Consultar rol actualizado en Firestore antes de mostrar la UI para evitar degradar a GUEST
        if (email) {
          const remoteUser = await getUserFromFirestore(email);
          if (remoteUser && isMounted) {
            upsertLocalAuthorizedUser(remoteUser);
          }
        }

        if (isMounted) {
          setFirebaseUser(profile);
          setLoading(false);
        }
      } else if (isMounted) {
        setFirebaseUser(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [upsertLocalAuthorizedUser]);

  // 3. Resolver usuario con su rol blindado y permisos
  const user = useMemo(() => {
    if (!firebaseUser) return null;

    const email = firebaseUser.email?.toLowerCase();
    const matching = authorizedUsers.find((u) => u.email?.toLowerCase() === email);

    // Si está registrado en Firestore, usar su rol asignado
    let role = matching?.role;

    // Si no está registrado en la lista:
    // Solo 'admin@porkos.pe' o correo institucional verificado '@porkos.pe' inicia como ADMIN;
    // cualquier otro usuario externo inicia como GUEST (requiere aprobación explícita de un Administrador)
    if (!role) {
      if (email === 'admin@porkos.pe' || (email?.endsWith('@porkos.pe') && firebaseUser.emailVerified)) {
        role = 'ADMIN';
      } else {
        role = 'GUEST';
      }
    }

    const roleInfo = APP_ROLES[role] || APP_ROLES.GUEST;
    const resolvedDisplayName = matching?.displayName || firebaseUser.displayName || (email ? email.split('@')[0] : 'Usuario');

    return {
      ...firebaseUser,
      displayName: resolvedDisplayName,
      fullName: resolvedDisplayName,
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

  // Iniciar sesión exclusivamente con Google
  const loginWithGoogle = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email?.toLowerCase();
      const displayName = result.user.displayName || (email ? email.split('@')[0] : 'Operador PORKOS');
      const loggedUser = {
        uid: result.user.uid,
        displayName,
        email,
        photoURL: result.user.photoURL,
        emailVerified: result.user.emailVerified,
      };

      // Verificar rol existente en Firestore primero (nunca sobrescribir un OWNER/ADMIN existente)
      if (email) {
        const existingRemote = await getUserFromFirestore(email);
        if (existingRemote) {
          upsertLocalAuthorizedUser(existingRemote);
        } else {
          const autoRole = (email === 'admin@porkos.pe' || (email.endsWith('@porkos.pe') && result.user.emailVerified)) ? 'ADMIN' : 'GUEST';
          const res = await createUserIfNotExistsInFirestore({
            email,
            displayName,
            role: autoRole,
            photoURL: loggedUser.photoURL || null,
          });
          if (res?.data) {
            upsertLocalAuthorizedUser(res.data);
          }
        }
      }

      setFirebaseUser(loggedUser);
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

  // Cerrar sesión
  const logout = async () => {
    try {
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
    const displayName = userRecord.displayName?.trim() || email.split('@')[0];
    const role = userRecord.role || 'CAJERO';

    const updated = [
      ...authorizedUsers.filter((u) => u.email?.toLowerCase() !== email),
      { ...userRecord, email, displayName, role },
    ];
    setAuthorizedUsers(updated);
    try {
      localStorage.setItem('porkos_authorized_users', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }

    // Si el usuario editado es el mismo usuario en sesión, actualizar de inmediato firebaseUser
    if (firebaseUser?.email?.toLowerCase() === email) {
      setFirebaseUser((prev) => (prev ? { ...prev, displayName } : prev));
    }

    await saveUserToFirestore({
      email,
      displayName,
      role,
    });
    return true;
  };

  // Actualizar directamente el nombre del usuario actual en sesión
  const updateCurrentUserProfile = async ({ displayName }) => {
    const cleanName = displayName?.trim();
    if (!cleanName || !user?.email) return false;

    return addAuthorizedUser({
      email: user.email,
      displayName: cleanName,
      role: user.role || 'ADMIN',
    });
  };

  // Eliminar usuario autorizado
  const removeAuthorizedUser = async (email) => {
    const cleanEmail = email?.toLowerCase().trim();
    const updated = authorizedUsers.filter((u) => u.email?.toLowerCase() !== cleanEmail);
    setAuthorizedUsers(updated);
    try {
      localStorage.setItem('porkos_authorized_users', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }

    await deleteUserFromFirestore(cleanEmail);
    return true;
  };

  // Actualizar configuración de vistas por rol
  const updateRolePermissions = async (newPermissions) => {
    setCustomRolePermissions(newPermissions);
    try {
      localStorage.setItem('porkos_role_permissions', JSON.stringify(newPermissions));
    } catch (e) {
      console.warn(e);
    }
    await saveRolePermissionsToFirestore(newPermissions);
    return true;
  };

  const value = {
    user,
    loading,
    authError,
    loginWithGoogle,
    logout,
    isAuthenticated: Boolean(user),
    allowedModules,
    canAccessModule,
    authorizedUsers,
    customRolePermissions,
    addAuthorizedUser,
    updateCurrentUserProfile,
    removeAuthorizedUser,
    updateRolePermissions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
