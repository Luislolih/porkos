import { useState } from 'react';
import { Settings, UtensilsCrossed, Database, ShieldCheck } from 'lucide-react';
import CatalogView from '../catalog/CatalogView';

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'system'

  return (
    <div className="space-y-4 pb-20 lg:pb-6">
      {/* Top Header & Sub-Navigation */}
      <div className="bg-[var(--color-porkos-surface)] p-4 rounded-2xl border border-[var(--color-porkos-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/20 text-[var(--color-porkos-orange)] border border-orange-500/30">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Configuración
            </h2>
          </div>
        </div>

        {/* Pestañas de Configuración */}
        <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-zinc-800 text-xs font-bold w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'catalog'
                ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Productos & Cremas</span>
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'system'
                ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Infraestructura Cloud</span>
          </button>
        </div>
      </div>

      {/* Vista de Catálogo (Productos y Cremas) */}
      {activeTab === 'catalog' && (
        <CatalogView />
      )}

      {/* Vista de Infraestructura y Roles */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
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
      )}
    </div>
  );
}
