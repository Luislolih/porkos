import { Settings, ShieldCheck, Database } from 'lucide-react';

export default function SettingsView() {
  return (
    <div className="space-y-4 pb-20 lg:pb-6 max-w-4xl">
      <div className="bg-[var(--color-porkos-surface)] p-4 rounded-2xl border border-[var(--color-porkos-border)] flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Configuración del Sistema
          </h2>
          <p className="text-xs text-[var(--color-porkos-muted)]">
            Parámetros operativos y estado de servicios
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Firebase & Cloud Status */}
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

        {/* Roles & Permisos */}
        <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <ShieldCheck className="w-4 h-4 text-[var(--color-porkos-orange)]" />
            <span>Roles y Seguridad</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800/80 flex justify-between">
              <span className="text-zinc-300 font-bold">OWNER:</span>
              <span className="text-zinc-500">Acceso total y configuración</span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800/80 flex justify-between">
              <span className="text-zinc-300 font-bold">CAJERO:</span>
              <span className="text-zinc-500">Ventas, cobros y mesas</span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800/80 flex justify-between">
              <span className="text-zinc-300 font-bold">COCINA:</span>
              <span className="text-zinc-500">KDS y avance de preparación</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
