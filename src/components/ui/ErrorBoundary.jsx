import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Porkos ErrorBoundary capturó un error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.removeItem('porkos_cart_draft');
    } catch (e) {
      console.warn(e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-3xl">
              ⚠️
            </div>
            <h2 className="text-xl font-black text-zinc-100 tracking-tight">
              Algo inesperado ocurrió
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              La aplicación se recuperó de forma segura. Tus comandas guardadas y datos en el sistema no se han perdido.
            </p>

            {this.state.error?.message && (
              <div className="text-left bg-black/50 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-400 overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-xl font-bold bg-orange-500 hover:bg-orange-400 text-black shadow-lg shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
              >
                Recargar Aplicación
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
              >
                Limpiar borrador y recargar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
