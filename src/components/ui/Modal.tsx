/**
 * Modal component (ui)
 */
import React, { createContext, useContext, useEffect, useId, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import { useTranslation } from 'react-i18next';

const openDialogs = new Set<HTMLElement>();
const ModalDepth = createContext(0);
let bodyOverflow = '';

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
    const { t } = useTranslation();
    const depth = useContext(ModalDepth);
    const dialogRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const closeRef = useRef(onClose);
    useEffect(() => { closeRef.current = onClose; }, [onClose]);

    useEffect(() => {
        if (!isOpen) return;
        const dialog = dialogRef.current;
        if (!dialog) return;
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        if (!openDialogs.size) bodyOverflow = document.body.style.overflow;
        openDialogs.add(dialog);
        document.body.style.overflow = 'hidden';
        const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter(element => element.tabIndex >= 0 && !element.closest('[hidden], [inert], [aria-hidden="true"]') && getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden');
        const isTopDialog = () => Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'))
            .sort((a, b) => Number(a.dataset.modalDepth) - Number(b.dataset.modalDepth)).at(-1) === dialog;
        if (isTopDialog()) (focusable()[0] || dialog).focus();
        const onKeyDown = (event: KeyboardEvent) => {
            if (!isTopDialog()) return;
            if (event.key === 'Escape' && !hideCloseButton) {
                event.preventDefault();
                event.stopPropagation();
                closeRef.current();
            }
            if (event.key !== 'Tab') return;
            const elements = focusable();
            const first = elements[0] || dialog;
            const last = elements.at(-1) || dialog;
            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
                event.preventDefault();
                first.focus();
            }
        };
        const onFocusIn = (event: FocusEvent) => {
            if (isTopDialog() && event.target instanceof Node && !dialog.contains(event.target)) {
                (focusable()[0] || dialog).focus();
            }
        };
        document.addEventListener('keydown', onKeyDown, true);
        document.addEventListener('focusin', onFocusIn);
        return () => {
            document.removeEventListener('keydown', onKeyDown, true);
            document.removeEventListener('focusin', onFocusIn);
            openDialogs.delete(dialog);
            if (!openDialogs.size) document.body.style.overflow = bodyOverflow;
            if (previousFocus?.isConnected) previousFocus.focus();
        };
    }, [isOpen, hideCloseButton]);

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
                            zIndex: 9999 + depth * 2
                        }}
                    />
                    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 + depth * 2, pointerEvents: 'none' }}>
                        <motion.div
                            ref={dialogRef}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby={title ? titleId : undefined}
                            aria-label={title ? undefined : t('common.dialog', 'Dialog')}
                            data-modal-depth={depth}
                            tabIndex={-1}
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            style={{ pointerEvents: 'auto', width: '95%', maxWidth: maxWidth, maxHeight: '90vh', overflowY: 'auto' }}
                        >
                            <Card variant={variant} style={{ padding: '1.5rem', background: variant === 'manga' ? 'var(--color-surface)' : undefined, border: variant === 'manga' ? '3px solid var(--color-border-heavy)' : undefined, boxShadow: variant === 'manga' ? '8px 8px 0 var(--color-shadow-solid)' : undefined }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    {title && <h3 id={titleId} style={{ fontSize: '1.5rem', fontFamily: variant === 'manga' ? 'var(--font-heading)' : undefined }}>{title}</h3>}
                                    {!hideCloseButton && (
                                        <Button
                                            variant={variant === 'manga' ? 'manga' : 'ghost'}
                                            size="icon"
                                            onClick={onClose}
                                            aria-label={t('common.close', 'Close')}
                                            style={variant === 'manga' ? { width: '40px', height: '40px', borderRadius: '0', border: '2px solid var(--color-border-heavy)' } : undefined}
                                        >
                                            <X size={variant === 'manga' ? 24 : 20} strokeWidth={variant === 'manga' ? 3 : 2} />
                                        </Button>
                                    )}
                                </div>
                                <ModalDepth.Provider value={depth + 1}>{children}</ModalDepth.Provider>
                            </Card>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
