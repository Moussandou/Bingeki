import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import type { OrgaSprint } from '@/types/orga';
import styles from './Orga.module.css';

interface SprintModalProps {
    isOpen: boolean;
    onClose: () => void;
    sprint: OrgaSprint | null;
    onCreate: (data: { name: string; objectif: string; startDate: Date; endDate: Date }) => Promise<void>;
    onUpdate: (sprintId: string, data: { name?: string; objectif?: string; startDate?: Date; endDate?: Date }) => Promise<void>;
    onCloseSprint: (sprintId: string) => Promise<void>;
    getLastSprint: () => Promise<OrgaSprint | null>;
}

export function SprintModal({
    isOpen, onClose, sprint,
    onCreate, onUpdate, onCloseSprint,
    getLastSprint,
}: SprintModalProps) {
    const [name, setName] = useState('');
    const [objectif, setObjectif] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [saving, setSaving] = useState(false);

    const isEdit = !!sprint;

    useEffect(() => {
        if (!isOpen) return;

        if (sprint) {
            setName(sprint.name);
            setObjectif(sprint.objectif);
            setStartDate(new Date(sprint.startDate.seconds * 1000).toISOString().split('T')[0]);
            setEndDate(new Date(sprint.endDate.seconds * 1000).toISOString().split('T')[0]);
        } else {
            setObjectif('');
            setStartDate(new Date().toISOString().split('T')[0]);
            const twoWeeks = new Date();
            twoWeeks.setDate(twoWeeks.getDate() + 14);
            setEndDate(twoWeeks.toISOString().split('T')[0]);

            getLastSprint().then(lastSprint => {
                if (lastSprint) {
                    const match = lastSprint.name.match(/sprint\s*(\d+)/i);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        const nextNum = num + 1;
                        const padding = match[1].length;
                        const nextNumStr = String(nextNum).padStart(padding, '0');
                        setName(`Sprint ${nextNumStr} - `);
                    } else {
                        setName('Sprint 01 - ');
                    }
                } else {
                    setName('Sprint 01 - ');
                }
            }).catch(() => {
                setName('Sprint 01 - ');
            });
        }
    }, [sprint, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !objectif.trim()) return;
        setSaving(true);
        try {
            if (isEdit) {
                await onUpdate(sprint.id, {
                    name: name.trim(),
                    objectif: objectif.trim(),
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                });
            } else {
                await onCreate({
                    name: name.trim(),
                    objectif: objectif.trim(),
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                });
            }
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const handleClose = async () => {
        if (!sprint) return;
        if (!confirm('Clôturer ce sprint ? Cette action est irréversible.')) return;
        setSaving(true);
        try {
            await onCloseSprint(sprint.id);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Modifier le sprint' : 'Nouveau sprint'}
            variant="manga"
            maxWidth="500px"
        >
            <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Nom *</label>
                    <input
                        className={styles.formInput}
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Sprint 01"
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Objectif *</label>
                    <textarea
                        className={styles.formTextarea}
                        value={objectif}
                        onChange={e => setObjectif(e.target.value)}
                        placeholder="Améliorer l'UX du dashboard"
                        required
                    />
                </div>

                {!isEdit && (
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Durée</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {[
                                { label: '1 SEM', days: 7 },
                                { label: '2 SEM', days: 14 },
                                { label: '3 SEM', days: 21 },
                                { label: '1 MOIS', days: 30 },
                            ].map(preset => {
                                const today = new Date().toISOString().split('T')[0];
                                const end = new Date();
                                end.setDate(end.getDate() + preset.days);
                                const endISO = end.toISOString().split('T')[0];
                                const isActive = startDate === today && endDate === endISO;

                                return (
                                    <button
                                        key={preset.days}
                                        type="button"
                                        className={`${styles.btnManga} ${isActive ? styles.btnPrimary : styles.btnSecondary} ${styles.btnSmall}`}
                                        onClick={() => {
                                            setStartDate(today);
                                            setEndDate(endISO);
                                        }}
                                    >
                                        {preset.label}
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                className={`${styles.btnManga} ${styles.btnSecondary} ${styles.btnSmall}`}
                                onClick={() => {
                                    const now = new Date();
                                    const dayOfWeek = now.getDay();
                                    const monday = new Date(now);
                                    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                                    const sunday = new Date(monday);
                                    sunday.setDate(monday.getDate() + 6);
                                    setStartDate(monday.toISOString().split('T')[0]);
                                    setEndDate(sunday.toISOString().split('T')[0]);
                                }}
                            >
                                CETTE SEM
                            </button>
                        </div>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Début</label>
                        <input
                            className={styles.formInput}
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Fin</label>
                        <input
                            className={styles.formInput}
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className={styles.formActions}>
                    {isEdit && (
                        <button
                            type="button"
                            className={`${styles.btnManga} ${styles.btnDanger} ${styles.btnSmall}`}
                            onClick={handleClose}
                            disabled={saving}
                        >
                            Clôturer
                        </button>
                    )}
                    <div style={{ flex: 1 }} />
                    <button
                        type="button"
                        className={`${styles.btnManga} ${styles.btnSecondary}`}
                        onClick={onClose}
                        disabled={saving}
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        className={`${styles.btnManga} ${styles.btnPrimary}`}
                        disabled={saving || !name.trim() || !objectif.trim()}
                    >
                        {saving ? '...' : isEdit ? 'Enregistrer' : 'Créer'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
