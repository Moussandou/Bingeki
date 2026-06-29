import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import type { OrgaTask, TaskStatus, TaskPriority } from '@/types/orga';
import { TASK_STATUSES, TASK_PRIORITIES, getMemberColor } from '@/types/orga';
import type { UserProfile } from '@/firebase/users';
import styles from './Orga.module.css';
import { Trash2, Paperclip, Image as ImageIcon, GitBranch } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '@/firebase/config';
import { MangaSelect } from '@/components/ui/MangaSelect';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: OrgaTask | null;
    members: UserProfile[];
    sprintId: string;
    isSuperAdmin: boolean;
    onCreate: (data: {
        title: string; description?: string;
        assigneeUid: string; assigneeName: string;
        priority: TaskPriority; status: TaskStatus;
        deadline?: Date; sprintId: string;
        attachments?: string[];
        gitLink?: string;
    }) => Promise<void>;
    onUpdate: (taskId: string, data: Record<string, unknown>) => Promise<void>;
    onDelete: (taskId: string) => Promise<void>;
}

export function TaskModal({
    isOpen, onClose, task, members, sprintId,
    isSuperAdmin, onCreate, onUpdate, onDelete,
}: TaskModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assigneeUid, setAssigneeUid] = useState('');
    const [priority, setPriority] = useState<TaskPriority>('medium');
    const [status, setStatus] = useState<TaskStatus>('todo');
    const [deadline, setDeadline] = useState('');
    const [attachments, setAttachments] = useState<string[]>([]);
    const [gitLink, setGitLink] = useState('');
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isEditingMode, setIsEditingMode] = useState(false);

    const isEdit = !!task;

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || '');
            setAssigneeUid(task.assigneeUid);
            setPriority(task.priority);
            setStatus(task.status);
            setDeadline(
                task.deadline
                    ? new Date(task.deadline.seconds * 1000).toISOString().split('T')[0]
                    : ''
            );
            setAttachments(task.attachments || []);
            setGitLink(task.gitLink || '');
            setIsEditingMode(false);
        } else {
            setTitle('');
            setDescription('');
            setAssigneeUid(members[0]?.uid || '');
            setPriority('medium');
            setStatus('todo');
            setDeadline('');
            setAttachments([]);
            setGitLink('');
            setIsEditingMode(true);
        }
    }, [task, members, isOpen]);

    const handleCancel = () => {
        if (isEdit) {
            setIsEditingMode(false);
            if (task) {
                setTitle(task.title);
                setDescription(task.description || '');
                setAssigneeUid(task.assigneeUid);
                setPriority(task.priority);
                setStatus(task.status);
                setDeadline(
                    task.deadline
                        ? new Date(task.deadline.seconds * 1000).toISOString().split('T')[0]
                        : ''
                );
                setAttachments(task.attachments || []);
                setGitLink(task.gitLink || '');
            }
        } else {
            onClose();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSaving(true);

        const member = members.find(m => m.uid === assigneeUid);
        const assigneeName = member?.displayName || assigneeUid.slice(0, 6);

        try {
            if (isEdit) {
                await onUpdate(task.id, {
                    title: title.trim(),
                    description: description.trim() || undefined,
                    assigneeUid,
                    assigneeName,
                    priority,
                    status,
                    deadline: deadline ? new Date(deadline) : null,
                    attachments,
                    gitLink: gitLink.trim() || null,
                });
            } else {
                await onCreate({
                    title: title.trim(),
                    description: description.trim() || undefined,
                    assigneeUid,
                    assigneeName,
                    priority,
                    status,
                    deadline: deadline ? new Date(deadline) : undefined,
                    sprintId,
                    attachments,
                    gitLink: gitLink.trim() || undefined,
                });
            }
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!task) return;
        if (!confirm('Supprimer cette tâche ?')) return;
        setSaving(true);
        try {
            await onDelete(task.id);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uid = auth.currentUser?.uid;
        if (!uid) return;

        setUploading(true);
        try {
            const timestamp = Date.now();
            const storageRef = ref(storage, `users/${uid}/orga-attachments/${sprintId}/${timestamp}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);
            setAttachments(prev => [...prev, url]);
        } catch (err) {
            console.error('Error uploading file:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveAttachment = (urlToRemove: string) => {
        setAttachments(prev => prev.filter(url => url !== urlToRemove));
    };

    const handleAddMention = (memberName: string) => {
        setDescription(prev => {
            const base = prev.trim() ? prev + ' ' : '';
            return base + `@${memberName} `;
        });
    };

    const canEdit = isSuperAdmin || (task && task.assigneeUid === auth.currentUser?.uid);

    if (!isEditingMode && task) {
        const priorityObj = TASK_PRIORITIES.find(p => p.key === priority);
        const statusObj = TASK_STATUSES.find(s => s.key === status);
        const assigneeMember = members.find(m => m.uid === assigneeUid);
        const assigneeDisplayName = assigneeMember?.displayName || assigneeUid.slice(0, 6);
        const memberColor = getMemberColor(assigneeUid);

        const formattedDeadline = task.deadline
            ? new Date(task.deadline.seconds * 1000).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
              })
            : null;

        return (
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title="Détails de la tâche"
                variant="manga"
                maxWidth="500px"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <div>
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', textTransform: 'uppercase', color: '#000', margin: 0 }}>
                            {title}
                        </h3>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap', alignItems: 'center' }}>
                        {priorityObj && (
                            <span className={styles.priorityBadge} style={{ background: priorityObj.color }}>
                                {priorityObj.label}
                            </span>
                        )}
                        {statusObj && (
                            <span className={styles.historyStatusBadge} style={{ background: '#eee', color: '#333' }}>
                                {statusObj.label}
                            </span>
                        )}
                        <span className={styles.assigneePill}>
                            <span className={styles.assigneeDot} style={{ background: memberColor }} />
                            {assigneeDisplayName}
                        </span>
                    </div>

                    {formattedDeadline && (
                        <div style={{ fontSize: '0.8rem', color: '#666', fontWeight: 600 }}>
                            📅 Date limite : {formattedDeadline}
                        </div>
                    )}

                    {gitLink && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                            <span style={{ fontWeight: 600, color: '#666' }}>Lien Git :</span>
                            <a
                                href={gitLink.startsWith('http') ? gitLink : `https://github.com/Moussandou/Bingeki-V2/tree/${gitLink}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${styles.btnManga} ${styles.btnSecondary} ${styles.btnSmall}`}
                                style={{ padding: '0.15rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textTransform: 'none', border: '1px solid #000', boxShadow: '2px 2px 0 #000' }}
                            >
                                <GitBranch size={12} />
                                {gitLink.replace('https://github.com/Moussandou/Bingeki-V2/', '')}
                            </a>
                        </div>
                    )}

                    <div style={{
                        background: '#fafafa',
                        border: '2px solid #000',
                        boxShadow: '3px 3px 0 #000',
                        padding: 'var(--space-md)',
                        fontSize: '0.9rem',
                        lineHeight: '1.4',
                        whiteSpace: 'pre-wrap',
                        color: '#1a1a1a',
                        minHeight: '80px',
                    }}>
                        {description || <span style={{ color: '#888', fontStyle: 'italic' }}>Aucune description fournie.</span>}
                    </div>

                    {attachments.length > 0 && (
                        <div>
                            <label className={styles.formLabel} style={{ marginBottom: '0.5rem' }}>Images associées</label>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {attachments.map((url, idx) => (
                                    <a
                                        key={idx}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ display: 'block', width: '80px', height: '80px', border: '2px solid #000', overflow: 'hidden' }}
                                    >
                                        <img
                                            src={url}
                                            alt={`Pièce jointe ${idx + 1}`}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className={styles.formActions} style={{ marginTop: 'var(--space-lg)' }}>
                        {isSuperAdmin && (
                            <button
                                type="button"
                                className={`${styles.btnManga} ${styles.btnDanger} ${styles.btnSmall}`}
                                onClick={handleDelete}
                                disabled={saving}
                            >
                                <Trash2 size={14} />
                                Supprimer
                            </button>
                        )}
                        <div style={{ flex: 1 }} />
                        <button
                            type="button"
                            className={`${styles.btnManga} ${styles.btnSecondary}`}
                            onClick={onClose}
                        >
                            Fermer
                        </button>
                        {canEdit && (
                            <button
                                type="button"
                                className={`${styles.btnManga} ${styles.btnPrimary}`}
                                onClick={() => setIsEditingMode(true)}
                            >
                                Modifier
                            </button>
                        )}
                    </div>
                </div>
            </Modal>
        );
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}
            variant="manga"
            maxWidth="500px"
        >
            <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Titre *</label>
                    <input
                        className={styles.formInput}
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Titre de la tâche"
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Description</label>
                    <textarea
                        className={styles.formTextarea}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Détails optionnels..."
                    />
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.65rem', color: '#666', fontWeight: 600 }}>Quick Mention:</span>
                        {members.map(m => {
                            const name = m.displayName || m.uid.slice(0, 6);
                            return (
                                <button
                                    key={m.uid}
                                    type="button"
                                    onClick={() => handleAddMention(name)}
                                    className={`${styles.btnManga} ${styles.btnSecondary} ${styles.btnSmall}`}
                                    style={{ padding: '0.1rem 0.35rem', fontSize: '0.65rem' }}
                                >
                                    @{name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Assigné</label>
                    <MangaSelect
                        value={assigneeUid}
                        onChange={setAssigneeUid}
                        options={members.map(m => ({
                            value: m.uid,
                            label: m.displayName || m.uid.slice(0, 6)
                        }))}
                        disabled={!isSuperAdmin && isEdit}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Priorité</label>
                        <MangaSelect
                            value={priority}
                            onChange={val => setPriority(val as TaskPriority)}
                            options={TASK_PRIORITIES.map(p => ({
                                value: p.key,
                                label: p.label
                            }))}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Statut</label>
                        <MangaSelect
                            value={status}
                            onChange={val => setStatus(val as TaskStatus)}
                            options={TASK_STATUSES.map(s => ({
                                value: s.key,
                                label: s.label
                            }))}
                        />
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Deadline</label>
                    <input
                        className={styles.formInput}
                        type="date"
                        value={deadline}
                        onChange={e => setDeadline(e.target.value)}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Lien de travail (PR ou Branche Git)</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            className={styles.formInput}
                            value={gitLink}
                            onChange={e => setGitLink(e.target.value)}
                            placeholder="Ex: feat/orga-tabs ou URL Pull Request"
                            style={{ paddingLeft: '2.2rem' }}
                        />
                        <GitBranch size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                    </div>
                </div>

                <div className={styles.formGroup} style={{ marginBottom: 'var(--space-lg)' }}>
                    <label className={styles.formLabel}>Images / Pièces jointes</label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                        {attachments.map((url, idx) => (
                            <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', border: '2px solid #000' }}>
                                <img
                                    src={url}
                                    alt={`Attachment ${idx + 1}`}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveAttachment(url)}
                                    style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        background: '#ef4444',
                                        color: '#fff',
                                        border: '2px solid #000',
                                        width: '20px',
                                        height: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                    }}
                                >
                                    X
                                </button>
                            </div>
                        ))}
                        {uploading && (
                            <div style={{
                                width: '80px',
                                height: '80px',
                                border: '2px dashed #000',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                background: '#eee'
                            }}>
                                Upload...
                            </div>
                        )}
                    </div>
                    <label
                        className={`${styles.btnManga} ${styles.btnSecondary} ${styles.btnSmall}`}
                        style={{ cursor: 'pointer', display: 'inline-flex', alignSelf: 'flex-start' }}
                    >
                        <ImageIcon size={14} style={{ marginRight: 4 }} />
                        Ajouter une image
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                            disabled={uploading}
                        />
                    </label>
                </div>

                <div className={styles.formActions}>
                    {isEdit && isSuperAdmin && (
                        <button
                            type="button"
                            className={`${styles.btnManga} ${styles.btnDanger} ${styles.btnSmall}`}
                            onClick={handleDelete}
                            disabled={saving}
                        >
                            <Trash2 size={14} />
                            Supprimer
                        </button>
                    )}
                    <div style={{ flex: 1 }} />
                    <button
                        type="button"
                        className={`${styles.btnManga} ${styles.btnSecondary}`}
                        onClick={handleCancel}
                        disabled={saving || uploading}
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        className={`${styles.btnManga} ${styles.btnPrimary}`}
                        disabled={saving || uploading || !title.trim()}
                    >
                        {saving ? '...' : isEdit ? 'Enregistrer' : 'Créer'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
