/**
 * Reload Prompt component (pwa)
 */
import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ReloadPrompt: React.FC = () => {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r: ServiceWorkerRegistration | undefined) {
            // eslint-disable-next-line no-console
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error: any) {
            // eslint-disable-next-line no-console
            console.error('SW registration error', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    return (
        <AnimatePresence>
            {(offlineReady || needRefresh) && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    style={{
                        position: 'fixed',
                        bottom: '1.5rem',
                        left: '0',
                        right: '0',
                        margin: '0 auto',
                        zIndex: 10000,
                        width: 'calc(100% - 2rem)',
                        maxWidth: '450px',
                    }}
                >
                    <div style={{
                        background: '#1a1a1a',
                        border: '3px solid #000',
                        boxShadow: '8px 8px 0 #000',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        borderRadius: '0',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                            <div style={{
                                background: '#FF2E63',
                                padding: '0.75rem',
                                border: '2px solid #000',
                                display: 'flex'
                            }}>
                                {needRefresh ? <RefreshCw className="animate-spin-slow" size={24} color="white" /> : <Download size={24} color="white" />}
                            </div>
                            
                            <div style={{ flex: 1 }}>
                                <h4 style={{ 
                                    margin: 0, 
                                    fontFamily: 'var(--font-heading)', 
                                    fontSize: '1.1rem', 
                                    color: '#fff',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>
                                    {needRefresh ? 'Mise à jour disponible !' : 'Prêt pour le hors-ligne'}
                                </h4>
                                <p style={{ 
                                    margin: '0.25rem 0 0', 
                                    fontSize: '0.9rem', 
                                    color: 'rgba(255,255,255,0.7)',
                                    lineHeight: 1.4
                                }}>
                                    {needRefresh 
                                        ? 'Une nouvelle version de Bingeki est arrivée. Rechargez pour en profiter.' 
                                        : 'L\'application est maintenant disponible hors connexion.'}
                                </p>
                            </div>

                            <button 
                                onClick={close}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0.25rem',
                                    color: 'rgba(255,255,255,0.5)',
                                    transition: 'color 0.2s',
                                    display: 'flex'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {needRefresh && (
                            <button
                                onClick={() => updateServiceWorker(true)}
                                style={{
                                    background: '#FF2E63',
                                    border: '3px solid #000',
                                    padding: '0.8rem',
                                    color: '#fff',
                                    fontFamily: 'var(--font-heading)',
                                    fontWeight: 900,
                                    fontSize: '1rem',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                    boxShadow: '4px 4px 0 #000',
                                    transition: 'transform 0.1s, box-shadow 0.1s',
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                                onMouseDown={(e) => {
                                    e.currentTarget.style.transform = 'translate(2px, 2px)';
                                    e.currentTarget.style.boxShadow = '2px 2px 0 #000';
                                }}
                                onMouseUp={(e) => {
                                    e.currentTarget.style.transform = 'translate(0, 0)';
                                    e.currentTarget.style.boxShadow = '4px 4px 0 #000';
                                }}
                            >
                                <RefreshCw size={18} />
                                Mettre à jour maintenant
                            </button>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
