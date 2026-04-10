/**
 * Error Boundary component (ui)
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.toString() || "Une erreur inconnue est survenue";

      return (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 text-center"
          style={{
            backgroundColor: 'var(--color-background, #0a0a0a)',
            color: 'var(--color-text, #ffffff)',
            fontFamily: 'var(--font-body, sans-serif)',
            overflow: 'hidden'
          }}
        >
          {/* Background Halftone Pattern - ensure it covers everything */}
          <div
            className="manga-halftone"
            style={{
              opacity: 0.05,
              pointerEvents: 'none',
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(var(--color-dots, #fff) 2px, transparent 2.5px)',
              backgroundSize: '20px 20px',
              zIndex: 0
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 20 }}
            className="manga-panel relative z-10 w-full"
            style={{
              background: 'var(--color-surface, #1a1a1a)',
              border: '4px solid var(--color-text, #ffffff)',
              boxShadow: '12px 12px 0 var(--color-shadow-solid, #000000)',
              padding: '3rem 2rem',
              maxWidth: '500px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <div 
              className="mb-8"
              style={{
                backgroundColor: 'var(--color-primary, #FF2E63)',
                border: '4px solid var(--color-text, #ffffff)',
                padding: '1.25rem',
                boxShadow: '4px 4px 0 var(--color-shadow-solid, #000000)'
              }}
            >
              <AlertCircle size={48} color="white" />
            </div>

            <h1 className="manga-title text-2xl sm:text-3xl mb-6" style={{ display: 'inline-block' }}>
              Aventure Interrompue
            </h1>

            <p className="mb-8 font-bold opacity-90 leading-relaxed max-w-sm">
              Une erreur inattendue a perturbé votre lecture. Ne vous inquiétez pas, votre progression est en sécurité.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
              <button
                onClick={this.handleReset}
                className="group flex items-center justify-center gap-2 px-8 py-4 font-black uppercase tracking-tighter transition-all"
                style={{
                  backgroundColor: 'var(--color-primary, #FF2E63)',
                  border: '4px solid var(--color-text, #ffffff)',
                  color: 'white',
                  boxShadow: '6px 6px 0 var(--color-shadow-solid, #000000)',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={20} className="transition-transform group-hover:rotate-180" />
                Réessayer
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-8 py-4 font-black uppercase tracking-tighter transition-all"
                style={{
                  backgroundColor: 'var(--color-surface, #1a1a1a)',
                  border: '4px solid var(--color-text, #ffffff)',
                  color: 'var(--color-text, #ffffff)',
                  boxShadow: '6px 6px 0 var(--color-shadow-solid, #000000)',
                  cursor: 'pointer'
                }}
              >
                <Home size={20} />
                Accueil
              </button>
            </div>

            {/* Technical Details for Developers */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-10 w-full text-left">
                <div style={{ height: '2px', backgroundColor: 'var(--color-text)', opacity: 0.1, marginBottom: '1rem' }} />
                <p style={{ fontFamily: 'monospace', fontSize: '10px', textTransform: 'uppercase', opacity: 0.5, marginBottom: '0.5rem', letterSpacing: '0.1em' }}>
                  Rapport technique
                </p>
                <div
                  style={{
                    backgroundColor: 'var(--color-background, #000)',
                    border: '2px solid var(--color-text, #ffffff)',
                    padding: '1rem',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: '#ff5555',
                    wordBreak: 'break-all',
                    maxHeight: '120px',
                    overflow: 'auto',
                    width: '100%'
                  }}
                >
                  {errorMsg}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
