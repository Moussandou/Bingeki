/**
 * Modal component (ui)
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    variant?: 'glass' | 'manga';
    maxWidth?: string;
    hideCloseButton?: boolean;
}

import { createPortal } from 'react-dom';

export function Modal({ isOpen, onClose, title, children, variant = 'glass', maxWidth = '600px', hideCloseButton = false }: ModalProps) {
    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={hideCloseButton ? undefined : onClose}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: variant === 'manga' ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.7)',
                            backdropFilter: variant === 'manga' ? 'none' : 'blur(5px)',
                            zIndex: 9999
                        }}
                    />
                    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, pointerEvents: 'none' }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            style={{ pointerEvents: 'auto', width: '95%', maxWidth: maxWidth, maxHeight: '90vh', overflowY: 'auto' }}
                        >
                            <Card variant={variant} style={{ padding: '1.5rem', background: variant === 'manga' ? 'var(--color-surface)' : undefined, border: variant === 'manga' ? '3px solid var(--color-border-heavy)' : undefined, boxShadow: variant === 'manga' ? '8px 8px 0 var(--color-shadow-solid)' : undefined }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    {title && <h3 style={{ fontSize: '1.5rem', fontFamily: variant === 'manga' ? 'var(--font-heading)' : undefined }}>{title}</h3>}
                                    {!hideCloseButton && (
                                        <Button
                                            variant={variant === 'manga' ? 'manga' : 'ghost'}
                                            size="icon"
                                            onClick={onClose}
                                            style={variant === 'manga' ? { width: '40px', height: '40px', borderRadius: '0', border: '2px solid var(--color-border-heavy)' } : undefined}
                                        >
                                            <X size={variant === 'manga' ? 24 : 20} strokeWidth={variant === 'manga' ? 3 : 2} />
                                        </Button>
                                    )}
                                </div>
                                {children}
                            </Card>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
