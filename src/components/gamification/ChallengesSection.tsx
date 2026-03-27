import { useState, useEffect, useCallback } from 'react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Trophy, Swords, Target, Flame, Plus, Users, BookOpen, Check, X, Ban } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useLibraryStore } from '@/store/libraryStore';
import {
    getUserChallenges,
    createChallenge,
    getFriends,
    acceptChallengeInvitation,
    declineChallengeInvitation,
    cancelChallenge,
    type Friend,
} from '@/firebase/firestore';
import type { Challenge, ChallengeParticipant } from '@/types/challenge';
import { useToast } from '@/context/ToastContext';

interface ChallengesSectionProps {
    onNavigateToProfile?: (uid: string) => void;
}

export function ChallengesSection({ onNavigateToProfile }: ChallengesSectionProps) {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { works } = useLibraryStore();
    const { addToast } = useToast();

    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Form state
    const [newChallenge, setNewChallenge] = useState({
        title: '',
        type: 'race_to_finish' as Challenge['type'],
        workId: 0,
        workTitle: '',
        workImage: '',
        selectedFriends: [] as string[]
    });

    const loadData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);

        const [challengeData, friendData] = await Promise.all([
            getUserChallenges(user.uid),
            getFriends(user.uid)
        ]);

        setChallenges(challengeData);
        setFriends(friendData.filter(f => f.status === 'accepted'));
        setIsLoading(false);
    }, [user]);

    useEffect(() => {
        if (user) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            loadData();
        }
    }, [user, loadData]);

    const handleCreateChallenge = async () => {
        if (!user || !newChallenge.title || newChallenge.selectedFriends.length === 0) {
            addToast(t('components.challenges_section.toast_fill_fields'), 'error');
            return;
        }

        const participants: ChallengeParticipant[] = [
            {
                id: user.uid,
                name: user.displayName || 'Moi',
                photo: user.photoURL || '',
                progress: 0,
                joinedAt: Date.now(),
                status: 'accepted' // Creator is automatically accepted
            },
            ...newChallenge.selectedFriends.map(friendUid => {
                const friend = friends.find(f => f.uid === friendUid);
                return {
                    id: friendUid,
                    name: friend?.displayName || 'Ami',
                    photo: friend?.photoURL || '',
                    progress: 0,
                    joinedAt: Date.now(),
                    status: 'pending' as const // Invited friends start as pending
                };
            })
        ];

        const challenge: Omit<Challenge, 'id'> = {
            title: newChallenge.title,
            type: newChallenge.type,
            workId: newChallenge.workId || undefined,
            workTitle: newChallenge.workTitle || undefined,
            workImage: newChallenge.workImage || undefined,
            participants,
            participantIds: [user.uid, ...newChallenge.selectedFriends], // For querying
            startDate: Date.now(),
            status: 'active',
            createdBy: user.uid
        };

        await createChallenge(challenge);
        addToast(t('components.challenges_section.toast_created'), 'success');
        setIsCreateModalOpen(false);
        setNewChallenge({ title: '', type: 'race_to_finish', workId: 0, workTitle: '', workImage: '', selectedFriends: [] });
        loadData();
    };

    const toggleFriendSelect = (uid: string) => {
        setNewChallenge(prev => ({
            ...prev,
            selectedFriends: prev.selectedFriends.includes(uid)
                ? prev.selectedFriends.filter(id => id !== uid)
                : [...prev.selectedFriends, uid]
        }));
    };

    const getStatusColor = (status: Challenge['status']) => {
        switch (status) {
            case 'active': return '#22c55e';
            case 'pending': return '#eab308';
            case 'completed': return '#6b7280';
            case 'cancelled': return '#ef4444';
        }
    };

    const handleAccept = async (challengeId: string) => {
        if (!user) return;
        await acceptChallengeInvitation(challengeId, user.uid);
        addToast(t('components.challenges_section.toast_accepted'), 'success');
        loadData();
    };

    const handleDecline = async (challengeId: string) => {
        if (!user) return;
        await declineChallengeInvitation(challengeId, user.uid);
        addToast(t('components.challenges_section.toast_declined'), 'info');
        loadData();
    };

    const handleCancel = async (challengeId: string) => {
        await cancelChallenge(challengeId);
        addToast(t('components.challenges_section.toast_cancelled'), 'info');
        loadData();
    };

    const getMyParticipantStatus = (challenge: Challenge): ChallengeParticipant['status'] | null => {
        const me = challenge.participants.find(p => p.id === user?.uid);
        return me?.status || null;
    };

    const getChallengeIcon = (type: Challenge['type']) => {
        switch (type) {
            case 'race_to_finish': return <Target size={20} />;
            case 'most_chapters': return <Swords size={20} />;
            case 'streak_battle': return <Flame size={20} />;
        }
    };

    const getStatusLabel = (status: Challenge['status']) => {
        switch (status) {
            case 'active': return t('components.challenges_section.status_active');
            case 'pending': return t('components.challenges_section.status_pending');
            case 'completed': return t('components.challenges_section.status_completed');
            default: return status;
        }
    };

    const getChallengeTypeLabel = (type: Challenge['type']) => {
        return t(`components.challenges_section.types.${type}`);
    };

    if (!user) {
        return (
            <div className="manga-panel" style={{ padding: '2rem', textAlign: 'center', background: 'var(--color-surface)' }}>
                <p style={{ opacity: 0.6 }}>{t('components.challenges_section.login_required')}</p>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Trophy size={24} /> {t('components.challenges_section.title')}
                </h2>
                <Button onClick={() => setIsCreateModalOpen(true)} variant="manga" size="sm" icon={<Plus size={16} />}>
                    {t('components.challenges_section.new_challenge')}
                </Button>
            </div>

            {isLoading ? (
                <p style={{ textAlign: 'center', opacity: 0.6 }}>{t('components.challenges_section.loading')}</p>
            ) : challenges.length === 0 ? (
                <div className="manga-panel" style={{ padding: '2rem', textAlign: 'center', background: 'var(--color-surface)' }}>
                    <Trophy size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <p style={{ fontWeight: 600 }}>{t('components.challenges_section.no_challenges')}</p>
                    <p style={{ opacity: 0.6, fontSize: '0.9rem', marginTop: '0.5rem' }}>{t('components.challenges_section.no_challenges_hint')}</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {challenges.map(challenge => (
                        <div key={challenge.id} className="manga-panel" style={{ padding: '1.25rem', background: 'var(--color-surface)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                        {getChallengeIcon(challenge.type)}
                                        <h3 style={{ fontWeight: 800, fontSize: '1.1rem' }}>{challenge.title}</h3>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>{getChallengeTypeLabel(challenge.type)}</p>
                                    {challenge.workTitle && (
                                        <p style={{ fontSize: '0.85rem', color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                                            📖 {challenge.workTitle}
                                        </p>
                                    )}
                                </div>
                                <span style={{
                                    padding: '0.25rem 0.75rem',
                                    background: getStatusColor(challenge.status),
                                    color: '#fff',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase'
                                }}>
                                    {getStatusLabel(challenge.status)}
                                </span>
                            </div>

                            {/* Participants */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {challenge.participants
                                    .sort((a, b) => b.progress - a.progress)
                                    .map((p, index) => (
                                        <div
                                            key={p.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                                cursor: onNavigateToProfile ? 'pointer' : 'default'
                                            }}
                                            onClick={() => onNavigateToProfile?.(p.id)}
                                        >
                                            <span style={{ fontWeight: 900, fontSize: '1.1rem', width: '24px', color: index === 0 ? '#ffd700' : '#666' }}>
                                                #{index + 1}
                                            </span>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-border-heavy)' }}>
                                                <OptimizedImage
                                                    src={p.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`}
                                                    alt=""
                                                    style={{ width: '100%', height: '100%' }}
                                                    objectFit="cover"
                                                    showSkeleton={false}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                                    {p.name} {p.id === user.uid && <span style={{ opacity: 0.5 }}>{t('components.challenges_section.you')}</span>}
                                                </p>
                                            </div>
                                            <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>
                                                {p.progress} {challenge.type === 'streak_battle' ? t('components.challenges_section.days') : t('components.challenges_section.chapters_abbr')}
                                            </span>
                                        </div>
                                    ))}
                            </div>

                            {/* Action Buttons */}
                            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                {/* Accept/Decline for pending invitations */}
                                {getMyParticipantStatus(challenge) === 'pending' && challenge.createdBy !== user.uid && (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="manga"
                                            onClick={() => handleAccept(challenge.id)}
                                            icon={<Check size={16} />}
                                        >
                                            {t('components.challenges_section.accept')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDecline(challenge.id)}
                                            icon={<X size={16} />}
                                        >
                                            {t('components.challenges_section.decline')}
                                        </Button>
                                    </>
                                )}
                                {/* Cancel button for creator */}
                                {challenge.createdBy === user.uid && challenge.status !== 'completed' && challenge.status !== 'cancelled' && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleCancel(challenge.id)}
                                        icon={<Ban size={16} />}
                                        style={{ color: '#ef4444' }}
                                    >
                                        {t('components.challenges_section.cancel')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Challenge Modal */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title={t('components.challenges_section.modal_title')}>
                <div style={{ padding: '1rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ fontWeight: 700, fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>{t('components.challenges_section.challenge_name')}</label>
                        <input
                            type="text"
                            value={newChallenge.title}
                            onChange={e => setNewChallenge(prev => ({ ...prev, title: e.target.value }))}
                            placeholder={t('components.challenges_section.challenge_name_placeholder')}
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
                        <label style={{ fontWeight: 700, fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>{t('components.challenges_section.challenge_type')}</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {(['race_to_finish', 'most_chapters', 'streak_battle'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setNewChallenge(prev => ({ ...prev, type }))}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        border: '2px solid var(--color-border-heavy)',
                                        background: newChallenge.type === type ? 'var(--color-border-heavy)' : 'var(--color-surface)',
                                        color: newChallenge.type === type ? 'var(--color-text-inverse)' : 'var(--color-text)',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    {getChallengeIcon(type)} {getChallengeTypeLabel(type)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ fontWeight: 700, fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                            <BookOpen size={16} style={{ marginRight: '0.5rem' }} />
                            {t('components.challenges_section.challenge_work')}
                        </label>
                        {works.length === 0 ? (
                            <p style={{ opacity: 0.6, fontStyle: 'italic' }}>{t('components.challenges_section.add_works_hint')}</p>
                        ) : (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', maxHeight: '200px', overflowY: 'auto' }}>
                                {works.map(work => (
                                    <div
                                        key={work.id}
                                        onClick={() => setNewChallenge(prev => ({
                                            ...prev,
                                            workId: Number(work.id),
                                            workTitle: work.title,
                                            workImage: work.image
                                        }))}
                                        style={{
                                            width: 70,
                                            cursor: 'pointer',
                                            opacity: newChallenge.workId === work.id ? 1 : 0.6,
                                            border: newChallenge.workId === work.id ? '2px solid var(--color-border-heavy)' : '2px solid transparent',
                                            borderRadius: '4px',
                                            padding: '2px'
                                        }}
                                    >
                                        <div style={{ width: '100%', aspectRatio: '2/3', borderRadius: '4px', overflow: 'hidden' }}>
                                            <OptimizedImage src={work.image} alt={work.title} style={{ width: '100%', height: '100%' }} objectFit="cover" />
                                        </div>
                                        <p style={{ fontSize: '0.65rem', textAlign: 'center', marginTop: '0.25rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{work.title}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ fontWeight: 700, fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                            <Users size={16} style={{ marginRight: '0.5rem' }} />
                            {t('components.challenges_section.invite_friends')} ({newChallenge.selectedFriends.length} {t('components.challenges_section.selected')})
                        </label>
                        {friends.length === 0 ? (
                            <p style={{ opacity: 0.6, fontStyle: 'italic' }}>{t('components.challenges_section.no_friends')}</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                                {friends.map(friend => (
                                    <div
                                        key={friend.uid}
                                        onClick={() => toggleFriendSelect(friend.uid)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            padding: '0.75rem',
                                            border: newChallenge.selectedFriends.includes(friend.uid) ? '2px solid var(--color-border-heavy)' : '1px solid var(--color-border)',
                                            background: newChallenge.selectedFriends.includes(friend.uid) ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                                            cursor: 'pointer',
                                            borderRadius: '4px'
                                        }}
                                    >
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-border-heavy)' }}>
                                            <OptimizedImage
                                                src={friend.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.displayName}`}
                                                alt=""
                                                style={{ width: '100%', height: '100%' }}
                                                objectFit="cover"
                                                showSkeleton={false}
                                            />
                                        </div>
                                        <span style={{ fontWeight: 600 }}>{friend.displayName}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>{t('components.challenges_section.cancel_btn')}</Button>
                        <Button variant="manga" onClick={handleCreateChallenge}>{t('components.challenges_section.create_btn')}</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
