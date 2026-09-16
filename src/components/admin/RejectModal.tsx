/**
 * RejectModal — confirm rejection with a mandatory reason field.
 * Reason is passed to the callable, stored in social_admin_audit for
 * traceability (who rejected what and why).
 */
import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import s from '@/pages/admin/AdminSocial.module.css';

interface Props {
    postTitle: string;
    onCancel: () => void;
    onConfirm: (reason: string) => void | Promise<void>;
    busy?: boolean;
}

export function RejectModal({ postTitle, onCancel, onConfirm, busy }: Props) {
    const [reason, setReason] = useState('');
    const trimmed = reason.trim();
    const canSubmit = trimmed.length > 0 && !busy;

    return (
        <div
            className={s.modalBackdrop}
            onClick={busy ? undefined : onCancel}
            role="dialog"
            aria-modal="true"
        >
            <div className={s.modalCard} onClick={(e) => e.stopPropagation()}>
                <div className={s.modalHead}>
                    <div>
                        <h2 className={s.modalTitle}>Rejeter le post</h2>
                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
                            {postTitle}
                        </div>
                    </div>
                    <button onClick={onCancel} className={s.modalClose} disabled={busy}>
                        <X size={14} />
                    </button>
                </div>

                <div>
                    <label style={{
                        display: 'block', marginBottom: '6px',
                        fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                        fontSize: '0.7rem', letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: '#666',
                    }}>
                        Raison du rejet (obligatoire)
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={4}
                        autoFocus
                        placeholder="Ex: caption pas alignée avec la ligne éditoriale, cover cassée…"
                        className={s.modalTextarea}
                        disabled={busy}
                    />
                    <div style={{
                        marginTop: '6px', fontSize: '0.65rem', color: '#666',
                    }}>
                        Cette raison sera enregistrée dans <code>social_admin_audit</code> pour traçabilité.
                    </div>
                </div>

                <div className={s.modalActions}>
                    <button
                        onClick={onCancel}
                        disabled={busy}
                        style={{
                            background: '#fff', color: '#000', border: '2px solid #000',
                            boxShadow: '3px 3px 0 #000', padding: '8px 14px',
                            fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                            fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase',
                            cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
                        }}
                    >
                        Annuler
                    </button>
                    <button
                        onClick={() => canSubmit && onConfirm(trimmed)}
                        disabled={!canSubmit}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            background: canSubmit ? '#ef4444' : '#ccc',
                            color: '#fff', border: '2px solid #000',
                            boxShadow: '3px 3px 0 #000', padding: '8px 16px',
                            fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                            fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                            cursor: canSubmit ? 'pointer' : 'not-allowed',
                        }}
                    >
                        <Trash2 size={13} /> {busy ? '...' : 'Confirmer rejet'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default RejectModal;
