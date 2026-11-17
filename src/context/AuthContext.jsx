import { useState, useEffect } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Escuchar el estado de autenticación en Firebase
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          displayName: currentUser.displayName || 'Operador PORKOS',
          email: currentUser.email,
          photoURL: currentUser.photoURL,
          role: 'OWNER',
        });
      } else {
        // Verificar si hay sesión demo guardada
        const savedDemoUser = localStorage.getItem('porkos_demo_user');
        if (savedDemoUser) {
          try {
            setUser(JSON.parse(savedDemoUser));
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Iniciar sesión con Google
  const loginWithGoogle = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const loggedUser = {
        uid: result.user.uid,
        displayName: result.user.displayName || 'Operador PORKOS',
        email: result.user.email,
        photoURL: result.user.photoURL,
        role: 'OWNER',
      };
      setUser(loggedUser);
      localStorage.removeItem('porkos_demo_user');
      setLoading(false);
      return loggedUser;
    } catch (err) {
      console.error('Error al iniciar sesión con Google:', err);
      let userFriendlyMessage = err.message || 'Error al iniciar sesión con Google';

      if (err.code === 'auth/unauthorized-domain') {
        const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'este dominio';
        userFriendlyMessage = `Dominio no autorizado (${currentDomain}): Para solucionarlo, ve a Firebase Console > Authentication > Configuración > Dominios autorizados y agrega "${currentDomain}".`;
      } else if (err.code === 'auth/popup-blocked') {
        userFriendlyMessage = 'El navegador bloqueó la ventana emergente de inicio de sesión. Por favor permite los pop-ups en este sitio.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        userFriendlyMessage = 'Se cerró la ventana de inicio de sesión antes de completar el acceso.';
      }

      setAuthError(userFriendlyMessage);
      setLoading(false);
      throw new Error(userFriendlyMessage, { cause: err });
    }
  };

  // Iniciar sesión en modo Demo (offline o testing rápido)
  const loginDemo = (role = 'OWNER') => {
    const demoUser = {
      uid: 'demo_user_123',
      displayName: 'Administrador PORKOS',
      email: 'admin@porkos.pe',
      photoURL: null,
      role,
    };
    setUser(demoUser);
    localStorage.setItem('porkos_demo_user', JSON.stringify(demoUser));
  };

  // Cerrar sesión
  const logout = async () => {
    try {
      localStorage.removeItem('porkos_demo_user');
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    authError,
    loginWithGoogle,
    loginDemo,
    logout,
    isAuthenticated: Boolean(user),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
