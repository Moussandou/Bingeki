/**
 * Global toast notification system (success, error, info, warning)
 */
import { createContext, useContext, useState, type ReactNode, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    addToast: (message: string, type: ToastType) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

const TOAST_ICONS = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    info: <Info size={20} />,
    warning: <AlertTriangle size={20} />,
};

const TOAST_STYLES = {
    success: { background: '#22c55e', color: '#fff' },
    error: { background: '#ef4444', color: '#fff' },
    info: { background: '#3b82f6', color: '#fff' },
    warning: { background: '#f59e0b', color: '#fff' },
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: ToastType = 'info') => {
        // Deduplicate identical messages
        setToasts((prev) => {
            if (prev.some(t => t.message === message)) return prev;

            const id = Math.random().toString(36).substr(2, 9);
            const newToast = { id, message, type };


            setTimeout(() => {
                setToasts((current) => current.filter((t) => t.id !== id));
            }, 3000);

            // Cap at 3 visible toasts
            const updatedToasts = [...prev, newToast];
            if (updatedToasts.length > 3) {
                return updatedToasts.slice(-3);
            }
            return updatedToasts;
        });
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            <div
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                }}
            >
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: 20, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.9 }}
                            layout
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '1rem 1.5rem',
                                borderRadius: '4px',
                                boxShadow: '4px 4px 0 rgba(0,0,0,0.2)',
                                border: '2px solid #000',
                                minWidth: '300px',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                fontFamily: 'var(--font-heading)',
                                ...TOAST_STYLES[toast.type],
                            }}
                        >
                            <div style={{ padding: '4px', background: 'rgba(0,0,0,0.2)', borderRadius: '50%', display: 'flex' }}>
                                {TOAST_ICONS[toast.type]}
                            </div>
                            <span style={{ flex: 1 }}>{toast.message}</span>
                            <button
                                onClick={() => removeToast(toast.id)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'inherit',
                                    cursor: 'pointer',
                                    opacity: 0.8,
                                    padding: '4px'
                                }}
                            >
                                <X size={16} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};
