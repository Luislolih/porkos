import { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { Flame, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginView() {
  const { loginWithGoogle, authError } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [localError, setLocalError] = useState(null);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setLocalError(null);
    try {
      await loginWithGoogle();
    } catch (err) {
      setLocalError(err.message || 'No se pudo completar el inicio de sesión con Google');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 selection:bg-[var(--color-porkos-orange)] selection:text-black relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-porkos-orange)] text-black shadow-xl shadow-orange-500/25 active:scale-95 transition-transform">
            <Flame className="w-10 h-10 fill-current" />
          </div>

          <div>
            <h1 className="text-3xl font-black text-white tracking-wider">
              PORKO<span className="text-[var(--color-porkos-orange)]">APP</span>
            </h1>
            <p className="text-xs text-zinc-400 font-semibold tracking-tight mt-1">
              Sistema Operativo Gastronómico & POS
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-bold text-zinc-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Acceso Seguro con Google Auth</span>
          </div>
        </div>

        {/* Error Alert */}
        {(authError || localError) && (
          <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2.5 shadow-md">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="leading-tight font-medium">{localError || authError}</span>
          </div>
        )}

        {/* Login Actions */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="w-full min-h-[50px] bg-white hover:bg-zinc-100 active:scale-[0.98] text-zinc-900 font-extrabold text-sm py-3.5 px-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-black/40 transition-all cursor-pointer disabled:opacity-60 touch-manipulation"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-5 h-5 text-zinc-800 animate-spin" />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <>
                {/* Google SVG Icon */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continuar con Google</span>
              </>
            )}
          </button>
        </div>

        {/* Footer info */}
        <div className="pt-2 text-center text-[11px] text-zinc-500 space-y-1">
          <p className="font-semibold text-zinc-400">PORKOS Hamburguesería & Choripanería Artesanal</p>
          <p className="text-[10px] text-zinc-600">Terminal POS y Cocina en Tiempo Real</p>
        </div>
      </div>
    </div>
  );
}
