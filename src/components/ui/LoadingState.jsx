import { Flame } from 'lucide-react';

export default function LoadingState({
  message = 'Cargando información...',
  type = 'spinner', // 'spinner' | 'flame'
  fullScreen = false,
  className = '',
}) {
  if (fullScreen) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-[var(--color-porkos-orange)] text-black flex items-center justify-center shadow-2xl shadow-orange-500/20 animate-bounce">
          <Flame className="w-10 h-10 fill-current" />
        </div>
        <p className="mt-4 text-xs font-black uppercase tracking-widest text-zinc-400">
          {message}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center p-12 space-y-3.5 text-center ${className}`}
    >
      {type === 'flame' ? (
        <div className="w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-[var(--color-porkos-orange)] flex items-center justify-center animate-pulse">
          <Flame className="w-6 h-6 fill-current" />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-full border-2 border-[var(--color-porkos-orange)] border-t-transparent animate-spin" />
      )}
      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
        {message}
      </p>
    </div>
  );
}
