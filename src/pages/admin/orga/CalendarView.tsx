import { useState } from 'react';
import { Calendar, Plus, Trash2, Clock, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { MangaSelect } from '@/components/ui/MangaSelect';
import type { OrgaEvent } from '@/types/orga';
import { EVENT_TYPES } from '@/types/orga';
import styles from './Orga.module.css';

interface CalendarViewProps {
    events: OrgaEvent[];
    isSuperAdmin: boolean;
    onCreateEvent: (data: {
        title: string;
        description?: string;
        date: Date;
        startTime: string;
        endTime: string;
        type: OrgaEvent['type'];
    }) => Promise<void>;
    onDeleteEvent: (eventId: string) => Promise<void>;
}

export function CalendarView({ events, isSuperAdmin, onCreateEvent, onDeleteEvent }: CalendarViewProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('14:00');
    const [endTime, setEndTime] = useState('15:00');
    const [type, setType] = useState<OrgaEvent['type']>('peda');
    const [saving, setSaving] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !date) return;
        setSaving(true);
        try {
            await onCreateEvent({
                title: title.trim(),
                description: description.trim() || undefined,
                date: new Date(date),
                startTime,
                endTime,
                type,
            });
            // Reset states
            setTitle('');
            setDescription('');
            setDate('');
            setStartTime('14:00');
            setEndTime('15:00');
            setType('peda');
            setModalOpen(false);
        } finally {
            setSaving(false);
        }
    };

    const getGoogleCalendarUrl = (ev: OrgaEvent) => {
        const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
        const titleText = encodeURIComponent(ev.title);
        const descText = encodeURIComponent(ev.description || "");

        const dateObj = new Date(ev.date.seconds * 1000);
        
        const formatTime = (timeStr: string) => {
            const [h, m] = timeStr.split(':');
            const d = new Date(dateObj);
            d.setHours(parseInt(h), parseInt(m), 0);
            return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
        };

        const startIso = formatTime(ev.startTime);
        const endIso = formatTime(ev.endTime);

        return `${base}&text=${titleText}&dates=${startIso}/${endIso}&details=${descText}`;
    };

    const downloadIcsFile = (ev: OrgaEvent) => {
        const dateObj = new Date(ev.date.seconds * 1000);
        
        const formatTime = (timeStr: string) => {
            const [h, m] = timeStr.split(':');
            const d = new Date(dateObj);
            d.setHours(parseInt(h), parseInt(m), 0);
            return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
        };

        const startIso = formatTime(ev.startTime);
        const endIso = formatTime(ev.endTime);
        const nowIso = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

        const icsLines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Bingeki//Team Calendar//FR",
            "BEGIN:VEVENT",
            `UID:event-${ev.id}@bingeki.com`,
            `DTSTAMP:${nowIso}`,
            `DTSTART:${startIso}`,
            `DTEND:${endIso}`,
            `SUMMARY:${ev.title}`,
            `DESCRIPTION:${ev.description || ""}`,
            "END:VEVENT",
            "END:VCALENDAR"
        ].join("\r\n");

        const blob = new Blob([icsLines], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${ev.title.toLowerCase().replace(/\s+/g, "_")}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            
            {/* Calendar Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
                    <Calendar size={18} />
                    Calendrier de l'équipe
                </h2>
                {isSuperAdmin && (
                    <button
                        className={`${styles.btnManga} ${styles.btnPrimary}`}
                        onClick={() => setModalOpen(true)}
                    >
                        <Plus size={16} />
                        Ajouter un événement
                    </button>
                )}
            </div>

            {/* Events Timelines / List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {events.length === 0 ? (
                    <div style={{
                        border: '3px dashed #ccc',
                        background: '#fff',
                        padding: '3rem',
                        textAlign: 'center',
                        color: '#666',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                    }}>
                        <AlertCircle size={24} />
                        <span>Aucun événement ou oral planifié pour le moment.</span>
                    </div>
                ) : (
                    events.map((ev) => {
                        const eventType = EVENT_TYPES.find(t => t.key === ev.type);
                        const eventDate = new Date(ev.date.seconds * 1000);
                        const dateFormatted = eventDate.toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        });

                        return (
                            <div key={ev.id} style={{
                                border: '3px solid #000',
                                boxShadow: '5px 5px 0 #000',
                                background: '#fff',
                                padding: '1.25rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem',
                                position: 'relative'
                            }}>
                                {/* Event Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {eventType && (
                                            <span style={{
                                                fontSize: '0.65rem',
                                                fontWeight: 900,
                                                background: eventType.color,
                                                color: '#fff',
                                                padding: '0.15rem 0.5rem',
                                                border: '1.5px solid #000',
                                                boxShadow: '1.5px 1.5px 0 #000',
                                                textTransform: 'uppercase'
                                            }}>
                                                {eventType.label}
                                            </span>
                                        )}
                                        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.1rem', margin: 0, textTransform: 'uppercase', color: '#000' }}>
                                            {ev.title}
                                        </h3>
                                    </div>

                                    {isSuperAdmin && (
                                        <button
                                            onClick={() => {
                                                if (confirm('Voulez-vous supprimer cet événement ?')) {
                                                    onDeleteEvent(ev.id);
                                                }
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#ef4444',
                                                padding: '0.2rem',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                            title="Supprimer l'événement"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* Event Time & Location details */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: '#444', fontWeight: 600 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <Clock size={14} />
                                        <span style={{ textTransform: 'capitalize' }}>{dateFormatted}</span>
                                        <span style={{ color: '#888' }}>({ev.startTime} — {ev.endTime})</span>
                                    </div>
                                </div>

                                {/* Description */}
                                {ev.description && (
                                    <div style={{
                                        background: '#fafafa',
                                        border: '2px solid #000',
                                        padding: '0.75rem',
                                        fontSize: '0.85rem',
                                        lineHeight: '1.4',
                                        color: '#333',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {ev.description}
                                    </div>
                                )}

                                {/* Export buttons */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem', borderTop: '2px dashed #eee', paddingTop: '0.75rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: 800, alignSelf: 'center', marginRight: '0.5rem', textTransform: 'uppercase' }}>
                                        Exporter :
                                    </span>
                                    
                                    {/* Google Calendar */}
                                    <a
                                        href={getGoogleCalendarUrl(ev)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`${styles.btnManga} ${styles.btnSecondary} ${styles.btnSmall}`}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.35rem',
                                            textTransform: 'none',
                                            border: '1.5px solid #000',
                                            boxShadow: '2px 2px 0 #000',
                                            background: '#fff',
                                            fontSize: '0.7rem',
                                            fontWeight: 'bold',
                                            padding: '0.2rem 0.5rem'
                                        }}
                                    >
                                        <svg viewBox="0 0 24 24" width="12" height="12" fill="#4285F4">
                                            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z"/>
                                        </svg>
                                        Google
                                    </a>

                                    {/* Apple Calendar */}
                                    <button
                                        onClick={() => downloadIcsFile(ev)}
                                        className={`${styles.btnManga} ${styles.btnSecondary} ${styles.btnSmall}`}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.35rem',
                                            textTransform: 'none',
                                            border: '1.5px solid #000',
                                            boxShadow: '2px 2px 0 #000',
                                            background: '#fff',
                                            fontSize: '0.7rem',
                                            fontWeight: 'bold',
                                            padding: '0.2rem 0.5rem'
                                        }}
                                    >
                                        <svg viewBox="0 0 24 24" width="12" height="12" fill="#000">
                                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.7-1.13 1.84-.99 2.94.97.08 2.15-.52 2.82-1.33z"/>
                                        </svg>
                                        Apple / Outlook (.ics)
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Create Event Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Ajouter un événement"
                variant="manga"
                maxWidth="450px"
            >
                <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Titre de l'événement</label>
                        <input
                            required
                            className={styles.formInput}
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Ex: Oral blanc d'anglais ou Point Pédago"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Catégorie</label>
                        <MangaSelect
                            value={type}
                            onChange={val => setType(val as OrgaEvent['type'])}
                            options={EVENT_TYPES.map(t => ({
                                value: t.key,
                                label: t.label
                            }))}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Date</label>
                        <input
                            required
                            type="date"
                            className={styles.formInput}
                            value={date}
                            onChange={e => setDate(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Heure de début</label>
                            <input
                                required
                                type="time"
                                className={styles.formInput}
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Heure de fin</label>
                            <input
                                required
                                type="time"
                                className={styles.formInput}
                                value={endTime}
                                onChange={e => setEndTime(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Description / Infos (optionnel)</label>
                        <textarea
                            className={styles.formTextarea}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Détails du jury, salle, préparation nécessaire..."
                            style={{ minHeight: '80px', resize: 'vertical' }}
                        />
                    </div>

                    <div className={styles.formActions}>
                        <button
                            type="button"
                            className={`${styles.btnManga} ${styles.btnSecondary}`}
                            onClick={() => setModalOpen(false)}
                            disabled={saving}
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className={`${styles.btnManga} ${styles.btnPrimary}`}
                            disabled={saving}
                        >
                            {saving ? 'Création...' : 'Créer l\'événement'}
                        </button>
                    </div>
                </form>
            </Modal>

        </div>
    );
}
