import { useState } from 'react';
import { Edit3, Check } from 'lucide-react';
import type { UserProfile } from '@/firebase/users';
import type { OrgaTask } from '@/types/orga';
import { getMemberColor } from '@/types/orga';
import styles from './Orga.module.css';

interface WhoDoesWhatProps {
    members: UserProfile[];
    tasks: OrgaTask[];
    isSuperAdmin: boolean;
    onUpdateRole: (uid: string, role: string) => Promise<void>;
    onUpdateName: (uid: string, name: string) => Promise<void>;
}

export function WhoDoesWhat({ members, tasks, isSuperAdmin, onUpdateRole, onUpdateName }: WhoDoesWhatProps) {
    const [editingUid, setEditingUid] = useState<string | null>(null);
    const [roleValue, setRoleValue] = useState('');

    const [editingNameUid, setEditingNameUid] = useState<string | null>(null);
    const [nameValue, setNameValue] = useState('');

    const startEdit = (uid: string, currentRole: string) => {
        setEditingUid(uid);
        setRoleValue(currentRole);
        setEditingNameUid(null);
    };

    const saveRole = async (uid: string) => {
        await onUpdateRole(uid, roleValue.trim());
        setEditingUid(null);
    };

    const startEditName = (uid: string, currentName: string) => {
        setEditingNameUid(uid);
        setNameValue(currentName);
        setEditingUid(null);
    };

    const saveName = async (uid: string) => {
        if (nameValue.trim()) {
            await onUpdateName(uid, nameValue.trim());
        }
        setEditingNameUid(null);
    };

    return (
        <div className={styles.whoGrid}>
            {members.map(member => {
                const name = member.displayName || member.uid.slice(0, 6);
                const color = getMemberColor(name);
                const orgaRole = (member as unknown as { orgaRole?: string }).orgaRole || '';
                const inProgress = tasks.filter(
                    t => t.assigneeUid === member.uid && t.status !== 'done'
                ).length;
                const isEditing = editingUid === member.uid;
                const isEditingName = editingNameUid === member.uid;

                return (
                    <div key={member.uid} className={styles.memberCard}>
                        {member.photoURL ? (
                            <img
                                src={member.photoURL}
                                alt={name}
                                className={styles.memberAvatar}
                                style={{ borderColor: color }}
                            />
                        ) : (
                            <div
                                className={styles.memberAvatarPlaceholder}
                                style={{ background: color, borderColor: '#000' }}
                            >
                                {name[0]}
                            </div>
                        )}

                        {isEditingName ? (
                            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', width: '100%', marginBottom: '0.25rem' }}>
                                <input
                                    className={styles.formInput}
                                    value={nameValue}
                                    onChange={e => setNameValue(e.target.value)}
                                    placeholder="Nom..."
                                    autoFocus
                                    onKeyDown={e => { if (e.key === 'Enter') saveName(member.uid); }}
                                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem', flex: 1, fontWeight: 'bold', textTransform: 'uppercase' }}
                                />
                                <button
                                    className={`${styles.btnManga} ${styles.btnPrimary} ${styles.btnSmall}`}
                                    onClick={() => saveName(member.uid)}
                                    style={{ padding: '0.3rem 0.5rem' }}
                                >
                                    <Check size={12} />
                                </button>
                            </div>
                        ) : (
                            <div
                                className={styles.memberName}
                                style={{ cursor: isSuperAdmin ? 'pointer' : 'default' }}
                                onClick={() => isSuperAdmin && startEditName(member.uid, name)}
                                title={isSuperAdmin ? 'Cliquer pour renommer' : undefined}
                            >
                                {name}
                            </div>
                        )}

                        {isEditing ? (
                            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', width: '100%' }}>
                                <input
                                    className={styles.formInput}
                                    value={roleValue}
                                    onChange={e => setRoleValue(e.target.value)}
                                    placeholder="Lead Frontend..."
                                    autoFocus
                                    onKeyDown={e => { if (e.key === 'Enter') saveRole(member.uid); }}
                                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', flex: 1 }}
                                />
                                <button
                                    className={`${styles.btnManga} ${styles.btnPrimary} ${styles.btnSmall}`}
                                    onClick={() => saveRole(member.uid)}
                                    style={{ padding: '0.3rem 0.5rem' }}
                                >
                                    <Check size={12} />
                                </button>
                            </div>
                        ) : (
                            <div
                                className={styles.memberRole}
                                style={{ cursor: isSuperAdmin ? 'pointer' : 'default', minHeight: '1.2em' }}
                                onClick={() => isSuperAdmin && startEdit(member.uid, orgaRole)}
                                title={isSuperAdmin ? 'Cliquer pour éditer le rôle' : undefined}
                            >
                                {orgaRole || (isSuperAdmin ? (
                                    <span style={{ opacity: 0.4, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Edit3 size={10} /> Assigner un rôle
                                    </span>
                                ) : '—')}
                            </div>
                        )}

                        <div className={styles.memberTaskCount}>
                            {inProgress} tâche{inProgress !== 1 ? 's' : ''} en cours
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
