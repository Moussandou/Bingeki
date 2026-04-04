import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Play, Users, Plus, BookOpen, Tv, LogOut, Ban } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useAuthStore } from '@/store/authStore';
import { useLibraryStore } from '@/store/libraryStore';
import {
    getUserWatchParties,
    createWatchParty,
    updateWatchPartyProgress,
    getFriends,
    endWatchParty,
    leaveWatchParty,
    type Friend
} from '@/firebase/firestore';
import type { WatchParty, PartyParticipant } from '@/types/watchparty';
import { PARTY_STATUS_LABELS } from '@/types/watchparty';
import { useToast } from '@/context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { handleProgressUpdateWithXP } from '@/utils/progressUtils';

export function WatchPartiesSection() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { works } = useLibraryStore();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [parties, setParties] = useState<WatchParty[]>([]);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Form state
    const [newParty, setNewParty] = useState({
        workId: 0,
        title: '',
        selectedFriends: [] as string[]
    });

    const loadData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);

        const [partyData, friendData] = await Promise.all([
            getUserWatchParties(user.uid),
            getFriends(user.uid)
        ]);

        setParties(partyData);
        setFriends(friendData.filter(f => f.status === 'accepted'));
        setIsLoading(false);
    }, [user]);

    useEffect(() => {
        if (user) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            loadData();
        }
    }, [user, loadData]);

    const handleCreateParty = async () => {
        if (!user || !newParty.workId) {
            addToast(t('watch_parties.select_work'), 'error');
            return;
        }

        const selectedWork = works.find(w => w.id === newParty.workId);
        if (!selectedWork) return;

        const participants: PartyParticipant[] = [
            {
                id: user.uid,
                name: user.displayName || t('watch_parties.host'),
                photo: user.photoURL || '',
                joinedAt: Date.now(),
                isReady: true,
                currentProgress: selectedWork.currentChapter || 0
            },
            ...newParty.selectedFriends.map(friendUid => {
                const friend = friends.find(f => f.uid === friendUid);
                return {
                    id: friendUid,
                    name: friend?.displayName || 'Ami',
                    photo: friend?.photoURL || '',
                    joinedAt: Date.now(),
                    isReady: false,
                    currentProgress: 0
                };
            })
        ];

        const party: Omit<WatchParty, 'id'> = {
            title: newParty.title || `${selectedWork.type === 'anime' ? 'Watch' : 'Read'} Party - ${selectedWork.title}`,
            workId: Number(selectedWork.id),
            workTitle: selectedWork.title,
            workImage: selectedWork.image,
            workType: selectedWork.type,
            hostId: user.uid,
            hostName: user.displayName || t('watch_parties.host'),
            participants,
            currentEpisode: selectedWork.currentChapter || 1,
            status: 'active',
            createdAt: Date.now(),
            lastActivity: Date.now()
        };

        await createWatchParty(party);
        addToast(t('watch_parties.party_created'), 'success');
        setIsCreateModalOpen(false);
        setNewParty({ workId: 0, title: '', selectedFriends: [] });
        loadData();
    };

    const handleAdvanceEpisode = async (partyId: string, currentEp: number, workId: number) => {
        const newEpisode = currentEp + 1;

        // Update watch party
        await updateWatchPartyProgress(partyId, newEpisode);

        // Sync with library
        const libraryWork = works.find(w => Number(w.id) === workId);
        if (libraryWork && newEpisode > (libraryWork.currentChapter || 0)) {
            handleProgressUpdateWithXP(libraryWork.id, newEpisode, libraryWork.totalChapters);
        }

        addToast(t('watch_parties.episode_advanced'), 'success');
        loadData();
    };

    const toggleFriendSelect = (uid: string) => {
        setNewParty(prev => ({
            ...prev,
            selectedFriends: prev.selectedFriends.includes(uid)
                ? prev.selectedFriends.filter(id => id !== uid)
                : [...prev.selectedFriends, uid]
        }));
    };

    const handleEndParty = async (partyId: string) => {
        await endWatchParty(partyId);
        addToast(t('watch_parties.party_ended'), 'success');
        loadData();
    };

    const handleLeaveParty = async (partyId: string) => {
        if (!user) return;
        await leaveWatchParty(partyId, user.uid);
        addToast(t('watch_parties.left_party'), 'info');
        loadData();
    };

    if (!user) {
        return (
            <div className="manga-panel" style={{ padding: '2rem', textAlign: 'center', background: 'var(--color-surface)' }}>
                <p style={{ opacity: 0.6 }}>{t('watch_parties.login_required')}</p>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Tv size={24} /> {t('watch_parties.title')}
                </h2>
                <Button onClick={() => setIsCreateModalOpen(true)} variant="manga" size="sm" icon={<Plus size={16} />}>
                    {t('watch_parties.new_party')}
                </Button>
            </div>

            {isLoading ? (
                <p style={{ textAlign: 'center', opacity: 0.6 }}>{t('common.loading')}</p>
            ) : parties.length === 0 ? (
                <div className="manga-panel" style={{ padding: '2rem', textAlign: 'center', background: 'var(--color-surface)' }}>
                    <Tv size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <p style={{ fontWeight: 600 }}>{t('watch_parties.no_parties')}</p>
                    <p style={{ opacity: 0.6, fontSize: '0.9rem', marginTop: '0.5rem' }}>{t('watch_parties.no_parties_desc')}</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {parties.map(party => (
                        <div key={party.id} className="manga-panel" style={{ padding: '1.25rem', background: 'var(--color-surface)' }}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                {/* Work image */}
                                <div
                                    style={{ width: 80, height: 110, borderRadius: '4px', overflow: 'hidden', border: '2px solid var(--color-border-heavy)', cursor: 'pointer', flexShrink: 0 }}
                                    onClick={() => navigate(`/work/${party.workId}?type=${party.workType}`)}
                                >
                                    <OptimizedImage
                                        src={party.workImage || `https://via.placeholder.com/80x110?text=${party.workType}`}
                                        alt={party.workTitle}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>

                                {/* Party info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <div>
                                            <h3 style={{ fontWeight: 800, fontSize: '1.1rem' }}>{party.title}</h3>
                                            <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>{party.workTitle}</p>
                                        </div>
                                        <span style={{
                                            padding: '0.25rem 0.5rem',
                                            background: party.status === 'active' ? '#22c55e' : party.status === 'paused' ? '#eab308' : '#6b7280',
                                            color: '#fff',
                                            borderRadius: '4px',
                                            fontSize: '0.7rem',
                                            fontWeight: 700
                                        }}>
                                            {PARTY_STATUS_LABELS[party.status]}
                                        </span>
                                    </div>

                                    {/* Current progress */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        {party.workType === 'anime' ? <Play size={16} /> : <BookOpen size={16} />}
                                        <span style={{ fontWeight: 700 }}>
                                            {party.workType === 'anime' ? t('watch_parties.episode') : t('watch_parties.chapter')} {party.currentEpisode}
                                        </span>
                                        {party.hostId === user.uid && party.status === 'active' && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleAdvanceEpisode(party.id, party.currentEpisode, party.workId)}
                                                style={{ marginLeft: 'auto' }}
                                            >
                                                +1
                                            </Button>
                                        )}
                                    </div>

                                    {/* Participants */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Users size={14} style={{ opacity: 0.6 }} />
                                        <div style={{ display: 'flex', marginLeft: '-4px' }}>
                                            {party.participants.slice(0, 5).map(p => (
                                                <div key={p.id} style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: '50%',
                                                    overflow: 'hidden',
                                                    border: `2px solid ${p.isReady ? '#22c55e' : '#ccc'}`,
                                                    marginLeft: '-4px'
                                                }}>
                                                    <OptimizedImage src={p.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                            ))}
                                        </div>
                                        <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{party.participants.length} {party.participants.length > 1 ? t('watch_parties.participants') : t('watch_parties.participant')}</span>
                                    </div>

                                    {/* Action Buttons */}
                                    {party.status === 'active' && (
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            {party.hostId === user.uid ? (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleEndParty(party.id)}
                                                    icon={<Ban size={14} />}
                                                    style={{ color: '#ef4444' }}
                                                >
                                                    {t('watch_parties.end_party')}
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleLeaveParty(party.id)}
                                                    icon={<LogOut size={14} />}
                                                >
                                                    {t('watch_parties.leave_party')}
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Party Modal */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title={t('watch_parties.new_party')}>
                <div style={{ padding: '1rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ fontWeight: 700, fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>{t('watch_parties.choose_work')}</label>
                        {works.filter(w => w.status === 'reading').length === 0 ? (
                            <p style={{ opacity: 0.6, fontStyle: 'italic' }}>{t('watch_parties.add_work_first')}</p>
                        ) : (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', maxHeight: '200px', overflowY: 'auto' }}>
                                {works.filter(w => w.status === 'reading').map(work => (
                                    <div
                                        key={work.id}
                                        onClick={() => setNewParty(prev => ({ ...prev, workId: Number(work.id) }))}
                                        style={{
                                            width: 70,
                                            cursor: 'pointer',
                                            opacity: newParty.workId === work.id ? 1 : 0.6,
                                            border: newParty.workId === work.id ? '2px solid var(--color-border-heavy)' : '2px solid transparent',
                                            borderRadius: '4px',
                                            padding: '2px'
                                        }}
                                    >
                                        <div style={{ width: '100%', aspectRatio: '2/3', borderRadius: '4px', overflow: 'hidden' }}>
                                            <OptimizedImage src={work.image} alt={work.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                        <p style={{ fontSize: '0.65rem', textAlign: 'center', marginTop: '0.25rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{work.title}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ fontWeight: 700, fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>{t('watch_parties.party_name')}</label>
                        <input
                            type="text"
                            value={newParty.title}
                            onChange={e => setNewParty(prev => ({ ...prev, title: e.target.value }))}
                            placeholder={t('watch_parties.party_name_placeholder')}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '2px solid var(--color-border-heavy)',
                                fontSize: '1rem',
                                fontFamily: 'inherit',
                                background: 'var(--color-surface)',
                                color: 'var(--color-text)'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ fontWeight: 700, fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                            <Users size={16} style={{ marginRight: '0.5rem' }} />
                            {t('watch_parties.invite_friends')} ({newParty.selectedFriends.length})
                        </label>
                        {friends.length === 0 ? (
                            <p style={{ opacity: 0.6, fontStyle: 'italic' }}>{t('watch_parties.no_friends')}</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                                {friends.map(friend => (
                                    <div
                                        key={friend.uid}
                                        onClick={() => toggleFriendSelect(friend.uid)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            padding: '0.5rem',
                                            border: newParty.selectedFriends.includes(friend.uid) ? '2px solid var(--color-border-heavy)' : '1px solid var(--color-border)',
                                            background: newParty.selectedFriends.includes(friend.uid) ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                                            cursor: 'pointer',
                                            borderRadius: '4px'
                                        }}
                                    >
                                        <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-border-heavy)' }}>
                                            <OptimizedImage
                                                src={friend.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.displayName}`}
                                                alt=""
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{friend.displayName}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>{t('common.cancel')}</Button>
                        <Button variant="manga" onClick={handleCreateParty}>{t('watch_parties.create_party')}</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
