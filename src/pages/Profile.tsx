
import { Layout } from '@/components/layout/Layout';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal'; // Assuming Modal exists, verified in previous steps

import { useGamificationStore, XP_REWARDS } from '@/store/gamificationStore';
import { useLibraryStore, type Work } from '@/store/libraryStore';
import { type GamificationData } from '@/utils/dataProtection';
import { useAuthStore } from '@/store/authStore';
import { logout } from '@/firebase/auth';
import {
    Settings, Award, BookOpen, CheckCircle, Library, Trophy, Flame, Info,
    PenTool,
    X,
    Play,
    Film,
    User,
    Plus,
    UserPlus,
    UserCheck,
    Clock,
    Share2,
    Copy,
    Check
} from 'lucide-react';
import { HunterLicenseCard } from '@/components/profile/HunterLicenseCard';
import { 
    getUserProfile, 
    saveUserProfileToFirestore, 
    compareLibraries, 
    checkFriendship, 
    sendFriendRequest, 
    type UserProfile
} from '@/firebase/firestore';
import { Input } from '@/components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { isBot } from '@/utils/isBot';
import { getBadgeIcon, getBadgeColors } from '@/utils/badges';
import type { Badge } from '@/types/badge';
import type { FavoriteCharacter } from '@/types/character';
import { SEO } from '@/components/layout/SEO';
import { storage } from '@/firebase/config';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/context/ToastContext';
import { AddFavoriteCharacterModal } from '@/components/profile/AddFavoriteCharacterModal';
import { useShare } from '@/hooks/useShare';
import { compressImage } from '@/utils/imageOptimization';

export default function Profile() {
    const { user, setUser, loading, userProfile } = useAuthStore();
    const navigate = useNavigate();
    const { uid } = useParams<{ uid: string }>();
    const { i18n, t } = useTranslation();
    const { addToast } = useToast();
    const { share } = useShare();

    // Context & Profile Logic
    const isOwnProfile = !uid || (user && user.uid === uid);


    // Default (local) stats
    const { level, xp, xpToNextLevel, streak, badges, totalChaptersRead, totalAnimeEpisodesWatched, totalMoviesWatched, totalWorksAdded, totalWorksCompleted } = useGamificationStore();
    const { works, favoriteCharacters, setFavoriteCharacters } = useLibraryStore();

    // Local States
    const [showGuide, setShowGuide] = useState(false);
    const [hoveredBadgeId, setHoveredBadgeId] = useState<string | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddCharModalOpen, setIsAddCharModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [extendedProfile, setExtendedProfile] = useState<Partial<UserProfile>>(userProfile || {});
    


    // Visited Profile Stats (if viewing someone else)
    const [visitedStats, setVisitedStats] = useState<Partial<GamificationData> | null>(null);

    // Library comparison (for visited profiles)
    const [commonWorks, setCommonWorks] = useState<{ common: Work[]; count: number } | null>(null);
    const [friendshipStatus, setFriendshipStatus] = useState<'accepted' | 'pending' | 'none' | 'loading'>('loading');

    // Load Profile Data logic
    useEffect(() => {
        const targetUid = uid || user?.uid;
        if (!targetUid) return;

        setLoadingProfile(true);

        // Load User Profile (Banner, Bio, XP, Level, etc.) - main document has all data
        getUserProfile(targetUid).then(profile => {
            if (profile) {
                setExtendedProfile(profile);
                // For visited profiles, set stats from the profile data
                if (!isOwnProfile) {
                    setVisitedStats({
                        level: profile.level || 1,
                        xp: profile.xp || 0,
                        xpToNextLevel: 100,
                        streak: profile.streak || 0,
                        badges: (profile.badges as Badge[]) || [],
                        totalChaptersRead: profile.totalChaptersRead || 0,
                        totalAnimeEpisodesWatched: profile.totalAnimeEpisodesWatched || 0,
                        totalMoviesWatched: profile.totalMoviesWatched || 0,
                        totalWorksAdded: profile.totalWorksAdded || 0,
                        totalWorksCompleted: profile.totalWorksCompleted || 0
                    });
                }
            }
            setLoadingProfile(false);
        });

        // If own profile, sync form with loaded profile
        if (isOwnProfile && user?.uid) {
            getUserProfile(user.uid).then(p => {
                if (p) {
                    setExtendedProfile(p);
                    setEditForm({
                        displayName: p.displayName || user?.displayName || '',
                        avatar: p.photoURL || user?.photoURL || '',
                        banner: p.banner || '',
                        bannerPosition: p.bannerPosition || 'center',
                        bio: p.bio || '',
                        themeColor: p.themeColor || '#000000',
                        cardBgColor: p.cardBgColor || '#ffffff',
                        borderColor: p.borderColor || '#000000',
                        favoriteManga: p.favoriteManga || '',
                        top3Favorites: p.top3Favorites || [],
                        featuredBadge: p.featuredBadge || '',
                        favoriteCharacters: p.favoriteCharacters || [],
                        isSuperAdmin: p.isSuperAdmin || false
                    });
                }
            });
        }

        // Load friendship status and common works if visiting another profile
        if (!isOwnProfile && user?.uid && uid) {
            checkFriendship(user.uid, uid).then(status => {
                setFriendshipStatus(status);
            });
            compareLibraries(user.uid, uid).then(common => {
                setCommonWorks(common);
            });
        } else {
            setFriendshipStatus('none');
        }

    }, [uid, user?.uid, isOwnProfile, user?.displayName, user?.photoURL]);

    // Redirect guest if no UID provided (visiting /profile directly)
    useEffect(() => {
        if (loading) return; // Wait for auth check to complete

        // If checking own profile but no user is logged in, redirect
        if (!uid && !user) {
            navigate('/auth');
        }
    }, [uid, user, navigate, loading]);

    // Computed Stats to display
    const displayStats = isOwnProfile ? {
        level, xp, xpToNextLevel, streak, badgeCount: badges.length
    } : (visitedStats ? {
        level: visitedStats.level || 1,
        xp: visitedStats.xp || 0,
        xpToNextLevel: visitedStats.xpToNextLevel || 100,
        streak: visitedStats.streak || 0,
        badgeCount: visitedStats.badges?.length || 0
    } : {
        level: 1, xp: 0, xpToNextLevel: 100, streak: 0, badgeCount: 0
    });

    const displayBadges = isOwnProfile ? badges : (visitedStats?.badges || []);

    // Extended stats for display
    const displayTotalChapters = isOwnProfile ? totalChaptersRead : (visitedStats?.totalChaptersRead || 0);
    const displayTotalAnime = isOwnProfile ? totalAnimeEpisodesWatched : (visitedStats?.totalAnimeEpisodesWatched || 0);
    const displayTotalMovies = isOwnProfile ? totalMoviesWatched : (visitedStats?.totalMoviesWatched || 0);
    const displayTotalWorks = isOwnProfile ? totalWorksAdded : (visitedStats?.totalWorksAdded || 0);
    const displayWorksCompleted = isOwnProfile ? totalWorksCompleted : (visitedStats?.totalWorksCompleted || 0);

    // Display Favorite Characters
    const displayFavoriteCharacters = isOwnProfile ? favoriteCharacters : (extendedProfile?.favoriteCharacters || []);


    // Edit Form State
    const [editForm, setEditForm] = useState({
        displayName: '',
        avatar: '', // URL or Data URL
        banner: '',
        bannerPosition: 'center',
        bio: '',
        themeColor: '#000000',
        cardBgColor: '#ffffff',
        borderColor: '#000000',
        favoriteManga: '',
        top3Favorites: [] as string[],
        featuredBadge: '',
        favoriteCharacters: [] as FavoriteCharacter[],
        isSuperAdmin: false
    });

    // --- Drag & Drop Handlers ---
    // --- Drag & Drop Handlers REMOVED (Simpler URL-only approach) ---
    /* 
    const handleDragOver = ...
    const handleDragLeave = ...
    const handleDrop = ...
    const handleFileUpload = ... 
    */
    // ---------------------------
    // ---------------------------

    // ---------------------------

    const handleSaveProfile = async () => {
        if (!user || isSaving) return;

        setIsSaving(true);
        let bannerUrl = editForm.banner;
        let avatarUrl = editForm.avatar;

        try {
            // Upload Avatar if changed (Data URL)
            if (avatarUrl && avatarUrl.startsWith('data:')) {
                const storageRef = ref(storage, `users/${user.uid}/avatar_${Date.now()}`);
                // Compress avatar to 400x400
                const compressedAvatar = await compressImage(avatarUrl, { maxWidth: 400, maxHeight: 400, quality: 0.8 });
                await uploadString(storageRef, compressedAvatar, 'data_url');
                avatarUrl = await getDownloadURL(storageRef);
            }

            // If banner is a Data URL (new upload), upload to Storage
            if (bannerUrl && bannerUrl.startsWith('data:')) {
                const storageRef = ref(storage, `banners/${user.uid}_${Date.now()}`);
                // Compress banner to 1200x400
                const compressedBanner = await compressImage(bannerUrl, { maxWidth: 1200, maxHeight: 400, quality: 0.8 });
                await uploadString(storageRef, compressedBanner, 'data_url');
                bannerUrl = await getDownloadURL(storageRef);
            }

            // Ensure top3Favorites doesn't contain empty strings
            const cleanTop3 = editForm.top3Favorites.filter(id => id && id.trim() !== '');

            const profileData = {
                uid: user.uid,
                ...editForm,
                displayName: editForm.displayName,
                photoURL: avatarUrl,
                banner: bannerUrl,
                bannerPosition: editForm.bannerPosition,
                top3Favorites: cleanTop3,
                isSuperAdmin: editForm.isSuperAdmin
            };

            await saveUserProfileToFirestore(profileData, true);

            setExtendedProfile({ ...extendedProfile, ...profileData });
            setEditForm(prev => ({ ...prev, banner: bannerUrl, avatar: avatarUrl, bannerPosition: editForm.bannerPosition, top3Favorites: cleanTop3 }));

            addToast(t('profile.toast.profile_updated'), 'success');
            setIsEditModalOpen(false);
        } catch (error) {
            console.error("Error saving profile:", error);
            addToast(t('profile.toast.save_error') + (error instanceof Error ? error.message : 'Inconnue'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        setUser(null);
        navigate('/');
    };

    const handleSendFriendRequest = async () => {
        if (!user || !uid) return;

        try {
            await sendFriendRequest(
                user.uid,
                {
                    displayName: user.displayName || 'User',
                    photoURL: user.photoURL || ''
                },
                {
                    uid: uid,
                    displayName: extendedProfile.displayName || 'User',
                    photoURL: extendedProfile.photoURL || '',
                    email: null,
                    lastLogin: Date.now(),
                    ...extendedProfile
                } as UserProfile
            );
            setFriendshipStatus('pending');
            addToast(t('profile.toast.friend_request_sent'), 'success');
        } catch (error) {
            console.error(error);
            addToast(t('profile.toast.friend_request_error'), 'error');
        }
    };

    if (loadingProfile && !user && !isBot()) return <div style={{ padding: '2rem' }}>{t('profile.loading')}</div>;

    return (
        <Layout>
            <SEO
                title={extendedProfile.displayName ? t('profile.seo_title', { name: extendedProfile.displayName }) : t('profile.title')}
                description={extendedProfile.bio || t('profile.seo_description')}
            />
            <div style={{ minHeight: 'calc(100vh - 80px)' }}>
                <div className="container" style={{ paddingBottom: '4rem', paddingTop: '2rem' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <h1 className="text-outline" style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', color: 'var(--color-text)', textShadow: '2px 2px 0 var(--color-shadow)', wordBreak: 'break-word' }}>
                            {t('profile.title')}
                        </h1>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {isOwnProfile && (
                                <>
                                    <Button variant="primary" onClick={() => setIsEditModalOpen(true)} icon={<PenTool size={18} />}>{t('profile.edit')}</Button>
                                    <Button variant="ghost" onClick={() => setShowGuide(true)} icon={<Info size={18} />}>{t('profile.guide')}</Button>
                                    <Button variant="manga" size="icon" onClick={() => navigate('/settings')}><Settings size={18} /></Button>
                                </>
                            )}
                            {!isOwnProfile && (
                                <>
                                    {friendshipStatus === 'none' && (
                                        <Button variant="primary" onClick={handleSendFriendRequest} icon={<UserPlus size={18} />}>
                                            {t('profile.add_friend')}
                                        </Button>
                                    )}
                                    {friendshipStatus === 'pending' && (
                                        <Button variant="ghost" disabled icon={<Clock size={18} />}>
                                            {t('profile.request_pending')}
                                        </Button>
                                    )}
                                    {friendshipStatus === 'accepted' && (
                                        <Button variant="ghost" disabled icon={<UserCheck size={18} />}>
                                            {t('profile.friends')}
                                        </Button>
                                    )}

                                    {(friendshipStatus === 'accepted' || userProfile?.isAdmin) && (
                                        <Button variant="primary" onClick={() => navigate(`/users/${uid}/library`)} icon={<Library size={18} />}>{t('profile.view_library')}</Button>
                                    )}
                                    <Button variant="ghost" onClick={() => navigate(-1)}>{t('profile.back')}</Button>
                                </>
                            )}
                            <div style={{ position: 'relative' }}>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    title={t('profile.share', 'Partager')}
                                    onClick={() => { setShareModalOpen(!shareModalOpen); setCopied(false); }}
                                >
                                    <Share2 size={18} />
                                </Button>
                                <AnimatePresence>
                                    {shareModalOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                            transition={{ duration: 0.15 }}
                                            style={{
                                                position: 'absolute',
                                                top: 'calc(100% + 8px)',
                                                right: 0,
                                                background: 'var(--color-surface)',
                                                border: '2px solid var(--color-border)',
                                                borderRadius: '12px',
                                                padding: '1rem',
                                                boxShadow: '6px 6px 0 var(--color-shadow-solid)',
                                                zIndex: 50,
                                                width: '320px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.75rem',
                                            }}
                                        >
                                            {/* Mini profile preview */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <img
                                                    src={extendedProfile.photoURL || (isOwnProfile ? user?.photoURL : '') || `https://api.dicebear.com/7.x/avataaars/svg?seed=${extendedProfile.displayName}`}
                                                    alt=""
                                                    style={{ width: '36px', height: '36px', borderRadius: '0', objectFit: 'cover', border: `2px solid ${extendedProfile.themeColor || 'var(--color-primary)'}`, boxShadow: `2px 2px 0 ${extendedProfile.themeColor || 'var(--color-primary)'}` }}
                                                />
                                                <div>
                                                    <p style={{ fontWeight: 800, fontSize: '0.9rem', margin: 0 }}>{extendedProfile.displayName || (isOwnProfile ? user?.displayName : 'User')}</p>
                                                    <p style={{ fontSize: '0.7rem', opacity: 0.5, margin: 0 }}>Lvl {extendedProfile.level || 1}</p>
                                                </div>
                                            </div>

                                            {/* Link + copy */}
                                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                <div style={{ flex: 1, padding: '0.5rem 0.6rem', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: '6px', overflow: 'hidden' }}>
                                                    <span style={{ fontSize: '0.7rem', opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', fontFamily: 'monospace' }}>
                                                        {`${window.location.origin}/${i18n.language || 'fr'}/profile/${uid || user?.uid || ''}`}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        const profileUid = uid || user?.uid || '';
                                                        const lang = i18n.language || 'fr';
                                                        const url = `${window.location.origin}/${lang}/profile/${profileUid}`;
                                                        const result = await share({ url, title: `${extendedProfile.displayName} - Bingeki` });
                                                        if (result === 'copied') {
                                                            setCopied(true);
                                                            addToast(t('profile.link_copied', 'Lien copié !'), 'success');
                                                            setTimeout(() => setCopied(false), 2000);
                                                        }
                                                    }}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                                                        padding: '0.5rem 0.75rem', background: copied ? '#22c55e' : 'var(--color-primary)',
                                                        color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer',
                                                        fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap',
                                                        transition: 'background 0.2s',
                                                    }}
                                                >
                                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                                    {copied ? 'Copié !' : t('share.copy_link', 'Copier')}
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                {/* Backdrop to close */}
                                {shareModalOpen && (
                                    <div
                                        onClick={() => setShareModalOpen(false)}
                                        style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>



                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {/* ID Card / Hunter License Style */}
                        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                            <HunterLicenseCard
                                user={{
                                    uid: uid || user?.uid || '',
                                    displayName: extendedProfile.displayName || (isOwnProfile ? user?.displayName : 'Héros'),
                                    photoURL: extendedProfile.photoURL || (isOwnProfile ? user?.photoURL : ''),
                                    ...extendedProfile
                                }}

                                isOwnProfile={!!isOwnProfile}
                                onLogout={handleLogout}
                                featuredBadgeData={extendedProfile.featuredBadge ? displayBadges.find((b: Badge) => b.id === extendedProfile.featuredBadge) : null}
                                favoriteMangaData={extendedProfile.favoriteManga ? (() => {
                                    if (!isOwnProfile) return null;
                                    const w = works.find(w => w.id === Number(extendedProfile.favoriteManga) || w.title === extendedProfile.favoriteManga);
                                    return w ? { title: w.title, image: w.image } : null;
                                })() : null}
                                top3FavoritesData={extendedProfile.top3Favorites ? extendedProfile.top3Favorites.map(fid => {
                                    const w = works.find(w => w.id === Number(fid) || w.title === fid);
                                    return w ? { id: String(w.id), title: w.title, image: w.image } : null;
                                }).filter((item): item is { id: string; title: string; image: string } => item !== null) : []}
                                stats={{
                                    ...displayStats,
                                    totalChaptersRead: displayTotalChapters,
                                    totalWorksAdded: displayTotalWorks,
                                    totalWorksCompleted: displayWorksCompleted
                                }}
                            />
                        </motion.div>

                        {/* Content & Stats */}
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
                                {/* Chapitres lus */}
                                <div className="manga-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--color-surface)', color: 'var(--color-text)' }}>
                                    <div style={{ padding: '0.75rem', background: 'var(--color-border-heavy)', color: 'var(--color-text-inverse)' }}>
                                        <BookOpen size={24} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: displayTotalChapters > 9999 ? '1.25rem' : '1.75rem', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayTotalChapters}</div>
                                        <p style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('profile.chapters_read')}</p>
                                    </div>
                                </div>

                                {/* En cours */}
                                <div className="manga-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--color-primary)', color: '#fff' }}>
                                    <div style={{ padding: '0.75rem', background: 'var(--color-primary)', color: '#fff' }}>
                                        <Flame size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>{isOwnProfile ? works.filter(w => w.status === 'reading').length : '-'}</div>
                                        <p style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', opacity: 0.6 }}>{t('profile.in_progress')}</p>
                                    </div>
                                </div>

                                {/* Terminées */}
                                <div className="manga-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--color-surface)', color: 'var(--color-text)' }}>
                                    <div style={{ padding: '0.75rem', background: '#22c55e', color: '#fff' }}>
                                        <CheckCircle size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>{displayWorksCompleted}</div>
                                        <p style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', opacity: 0.6 }}>{t('profile.completed')}</p>
                                    </div>
                                </div>

                                {/* Episodes Vus */}
                                <div className="manga-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--color-surface)', color: 'var(--color-text)' }}>
                                    <div style={{ padding: '0.75rem', background: '#0ea5e9', color: '#fff' }}>
                                        <Play size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>{displayTotalAnime}</div>
                                        <p style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', opacity: 0.6 }}>{t('profile.episodes_watched')}</p>
                                    </div>
                                </div>

                                {/* Films Vus */}
                                <div className="manga-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--color-surface)', color: 'var(--color-text)' }}>
                                    <div style={{ padding: '0.75rem', background: '#f43f5e', color: '#fff' }}>
                                        <Film size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>{displayTotalMovies}</div>
                                        <p style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', opacity: 0.6 }}>{t('profile.movies_watched')}</p>
                                    </div>
                                </div>

                                {/* Collection */}
                                <div className="manga-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--color-surface)', color: 'var(--color-text)' }}>
                                    <div style={{ padding: '0.75rem', background: 'var(--color-border-heavy)', color: 'var(--color-text-inverse)' }}>
                                        <Library size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>{displayTotalWorks}</div>
                                        <p style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', opacity: 0.6 }}>{t('profile.collection')}</p>
                                    </div>
                                </div>

                                {/* Badges */}
                                <div className="manga-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--color-surface)', color: 'var(--color-text)' }}>
                                    <div style={{ padding: '0.75rem', background: '#fbbf24', color: '#000' }}>
                                        <Award size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>{displayStats.badgeCount} / 16</div>
                                        <p style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', opacity: 0.6 }}>{t('profile.badges')}</p>
                                    </div>
                                </div>

                                {/* XP Total */}
                                <div className="manga-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--color-surface)', color: 'var(--color-text)' }}>
                                    <div style={{ padding: '0.75rem', background: '#8b5cf6', color: '#fff' }}>
                                        <Trophy size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>{displayStats.xp}</div>
                                        <p style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', opacity: 0.6 }}>{t('profile.xp_total')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Common Works Section (only for visited profiles) */}
                            {!isOwnProfile && commonWorks && commonWorks.count > 0 && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <h3 className="manga-title" style={{ fontSize: '1.2rem', marginBottom: '1rem', background: 'var(--color-surface)', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Library size={20} /> {t('profile.common_works', { count: commonWorks.count, context: commonWorks.count > 1 ? 'plural' : '' })}
                                    </h3>
                                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        {commonWorks.common.slice(0, 8).map(work => (
                                            <div
                                                key={work.id}
                                                onClick={() => navigate(`/work/${work.id}?type=${work.type || 'manga'}`)}
                                                style={{
                                                    width: 80,
                                                    cursor: 'pointer',
                                                    transition: 'transform 0.2s'
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                            >
                                                <div style={{
                                                    width: 80,
                                                    height: 110,
                                                    borderRadius: '4px',
                                                    overflow: 'hidden',
                                                    border: '2px solid var(--color-border-heavy)',
                                                    marginBottom: '0.25rem'
                                                }}>
                                                    <img
                                                        src={work.image || `https://via.placeholder.com/80x110?text=${work.type}`}
                                                        alt={work.title}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                </div>
                                                <p style={{
                                                    fontSize: '0.7rem',
                                                    fontWeight: 600,
                                                    textAlign: 'center',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>{work.title}</p>
                                            </div>
                                        ))}
                                        {commonWorks.count > 8 && (
                                            <div style={{
                                                width: 80,
                                                height: 110,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: 'var(--color-surface-hover)',
                                                borderRadius: '4px',
                                                border: '2px dashed var(--color-border)',
                                                fontWeight: 700,
                                                fontSize: '0.9rem',
                                                color: 'var(--color-text-dim)'
                                            }}>
                                                +{commonWorks.count - 8}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}


                            {/* Favorite Characters Section */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', background: '#ffe4e6', padding: '0.5rem', borderRadius: '8px' }}>
                                <h3 className="manga-title" style={{ fontSize: '1.5rem', marginBottom: 0, background: 'transparent', color: '#e11d48', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <User size={24} /> {t('profile.favorite_characters') || "Personnages Favoris"}
                                </h3>
                                {isOwnProfile && (
                                    <Button size="sm" variant="ghost" onClick={() => setIsAddCharModalOpen(true)} style={{ color: '#e11d48', borderColor: '#e11d48' }}>
                                        <Plus size={16} /> {t('common.add') || "Ajouter"}
                                    </Button>
                                )}
                            </div>

                            {displayFavoriteCharacters && displayFavoriteCharacters.length > 0 ? (
                                <>
                                    <div className="manga-panel" style={{ padding: '1.5rem', background: 'var(--color-surface)', display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1.5rem' }}>
                                        {displayFavoriteCharacters.map((char) => (
                                            <div
                                                key={char.id}
                                                className="character-card"
                                                style={{
                                                    minWidth: '100px',
                                                    maxWidth: '100px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    position: 'relative'
                                                }}
                                            >
                                                {/* Remove button - only for own profile */}
                                                {isOwnProfile && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            const updated = favoriteCharacters.filter(c => c.id !== char.id);
                                                            setFavoriteCharacters(updated);
                                                            setExtendedProfile(prev => ({ ...prev, favoriteCharacters: updated }));
                                                            if (user) {
                                                                await saveUserProfileToFirestore({ uid: user.uid, favoriteCharacters: updated }, true);
                                                            }
                                                            addToast(t('profile.character_removed') || 'Personnage retiré', 'success');
                                                        }}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '-4px',
                                                            right: '6px',
                                                            background: '#e11d48',
                                                            border: 'none',
                                                            borderRadius: '50%',
                                                            width: '22px',
                                                            height: '22px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: 'pointer',
                                                            color: 'white',
                                                            zIndex: 10
                                                        }}
                                                        title={t('common.remove') || 'Retirer'}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                                <div
                                                    onClick={() => navigate(`/character/${char.id}`)}
                                                    style={{
                                                        width: '80px',
                                                        height: '80px',
                                                        borderRadius: '50%',
                                                        overflow: 'hidden',
                                                        border: '3px solid #e11d48',
                                                        boxShadow: '4px 4px 0 var(--color-shadow-solid)',
                                                        cursor: 'pointer'
                                                    }}>
                                                    <img
                                                        src={char.image}
                                                        alt={char.name}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                </div>
                                                <p style={{
                                                    fontSize: '0.8rem',
                                                    fontWeight: 700,
                                                    textAlign: 'center',
                                                    lineHeight: '1.2'
                                                }}>
                                                    {char.name}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ marginBottom: '2rem' }}></div>
                                </>
                            ) : (
                                isOwnProfile && (
                                    <div style={{ padding: '2rem', border: '2px dashed var(--color-border)', borderRadius: '8px', textAlign: 'center', marginBottom: '2rem' }}>
                                        <p style={{ marginBottom: '1rem' }}>Vous n'avez pas encore de personnages favoris.</p>
                                        <Button onClick={() => setIsAddCharModalOpen(true)}>Ajouter des personnages</Button>
                                    </div>
                                )
                            )}


                            <h3 className="manga-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem', background: 'var(--color-secondary)', color: 'var(--color-text)' }}>{t('profile.recent_badges')}</h3>
                            <div className="manga-panel" style={{ padding: '2rem', background: 'var(--color-surface)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '2rem' }}>
                                {displayBadges.map((badge: Badge) => (
                                    <motion.div
                                        key={badge.id}
                                        whileHover={{ scale: 1.1, rotate: 5 }}
                                        onHoverStart={() => setHoveredBadgeId(badge.id)}
                                        onHoverEnd={() => setHoveredBadgeId(null)}
                                        style={{ textAlign: 'center', position: 'relative' }}
                                    >
                                        <div style={{
                                            width: '80px',
                                            height: '80px',
                                            margin: '0 auto 0.5rem',
                                            background: getBadgeColors(badge.rarity).bg,
                                            color: getBadgeColors(badge.rarity).text,
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: `3px solid ${getBadgeColors(badge.rarity).border}`,
                                            boxShadow: badge.rarity === 'legendary' ? '6px 6px 0 var(--color-shadow-solid)' : '4px 4px 0 var(--color-shadow-solid)'
                                        }}>
                                            {getBadgeIcon(badge.icon)}
                                        </div>
                                        <p style={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-text)' }}>{badge.name}</p>

                                        {/* Hover Tooltip */}
                                        <AnimatePresence>
                                            {hoveredBadgeId === badge.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    style={{
                                                        position: 'absolute',
                                                        bottom: '100%',
                                                        left: '50%',
                                                        transform: 'translateX(-50%)',
                                                        background: 'var(--color-border-heavy)',
                                                        color: 'var(--color-text-inverse)',
                                                        padding: '0.5rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.7rem',
                                                        width: '150px',
                                                        zIndex: 20,
                                                        marginBottom: '10px',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    {badge.description}
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '100%',
                                                        left: '50%',
                                                        marginLeft: '-6px',
                                                        borderWidth: '6px',
                                                        borderStyle: 'solid',
                                                        borderColor: 'var(--color-border-heavy) transparent transparent transparent'
                                                    }} />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                ))}

                                {/* Placeholder empty badges */}
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} style={{
                                        width: '80px',
                                        height: '80px',
                                        margin: '0 auto',
                                        background: 'var(--color-surface-hover)',
                                        borderRadius: '50%',
                                        border: '3px dashed var(--color-border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--color-text-dim)',
                                        fontWeight: 900,
                                        fontSize: '1.5rem'
                                    }}>
                                        ?
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Edit Profile Modal */}
                    <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={t('profile.edit_modal.title')} maxWidth="1000px" variant="manga">
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'row', 
                            gap: '0', 
                            height: '80vh', 
                            width: '100%',
                            overflow: 'hidden'
                        }} className="modal-content-container">
                            {/* Unified Scroll Container */}
                            <div className="manga-scroll" style={{ flex: 1, display: 'flex', flexDirection: 'row', overflowY: 'auto', gap: 0 }}>
                                {/* Left Col: Form */}
                                <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', gap: '2.5rem', padding: '2rem 1.5rem', paddingRight: '2.5rem', minWidth: 0, borderRight: '3px solid var(--color-border)' }}>
                                
                                {/* SECTION: BASIC INFO */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderBottom: '4px solid var(--color-text)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                                        {t('profile.edit_modal.pseudo')} & Photo
                                    </h3>
                                    
                                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                        <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
                                            <div style={{ width: '100%', height: '100%', borderRadius: '0', overflow: 'hidden', border: '4px solid var(--color-primary)', boxShadow: '6px 6px 0 var(--color-primary)' }}>
                                                <img
                                                    src={editForm.avatar || 'https://via.placeholder.com/150'}
                                                    alt="Avatar"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            </div>
                                            <label htmlFor="avatar-upload" style={{ position: 'absolute', bottom: -10, right: -10, background: 'var(--color-text)', color: 'var(--color-surface)', borderRadius: '0', padding: '8px', cursor: 'pointer', border: '3px solid var(--color-primary)', display: 'flex', boxShadow: '4px 4px 0 var(--color-primary)' }}>
                                                <PenTool size={16} />
                                            </label>
                                            <input id="avatar-upload" type="file" accept="image/*" style={{ display: 'none' }} 
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => setEditForm(prev => ({ ...prev, avatar: reader.result as string }));
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <Input
                                                placeholder="Pseudo"
                                                value={editForm.displayName}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                                                style={{ height: '50px', fontSize: '1.1rem', borderRadius: 0, border: '3px solid var(--color-text)', fontWeight: 900, boxShadow: '4px 4px 0 var(--color-shadow-solid)' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION: BANNER */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderBottom: '4px solid var(--color-text)', paddingBottom: '0.5rem' }}>
                                        {t('profile.edit_modal.banner_label')}
                                    </h3>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text)', opacity: 0.8, fontWeight: 700, marginBottom: '0.5rem' }}>
                                        {t('profile.edit_modal.banner_help')}
                                    </div>
                                    <Input
                                        placeholder={t('profile.edit_modal.banner_placeholder')}
                                        value={editForm.banner}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, banner: e.target.value }))}
                                        style={{ height: '45px', borderRadius: 0, border: '3px solid var(--color-text)', fontWeight: 900, boxShadow: '4px 4px 0 var(--color-shadow-solid)' }}
                                    />
                                    
                                    {editForm.banner && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <div style={{ width: '100%', height: '150px', border: '4px solid var(--color-text)', overflow: 'hidden', position: 'relative', background: '#000', boxShadow: '6px 6px 0 var(--color-shadow-solid)' }}>
                                                <img
                                                    src={editForm.banner}
                                                    alt="Aperçu"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `center ${editForm.bannerPosition || '50%'}` }}
                                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                                />
                                                <button onClick={() => setEditForm(prev => ({ ...prev, banner: '' }))}
                                                    style={{ position: 'absolute', top: 10, right: 10, background: '#ff4444', color: 'white', border: '3px solid #000', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                            <div style={{ marginTop: '1.5rem', padding: '1rem', border: '2px dashed var(--color-text)', background: 'rgba(var(--color-text-rgb), 0.03)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase' }}>Position Verticale</label>
                                                    <span style={{ fontWeight: 900 }}>{editForm.bannerPosition || '50%'}</span>
                                                </div>
                                                <input type="range" min="0" max="100" value={parseInt(editForm.bannerPosition?.replace('%', '') || '50')} 
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, bannerPosition: `${e.target.value}%` }))}
                                                    style={{ width: '100%', accentColor: 'var(--color-text)' }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* SECTION: STYLE */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderBottom: '4px solid var(--color-text)', paddingBottom: '0.5rem' }}>
                                        {t('profile.edit_modal.colors')}
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                                        {['themeColor', 'cardBgColor', 'borderColor'].map((key) => (
                                            <div key={key}>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                                    {key === 'themeColor' ? t('profile.edit_modal.accent') : key === 'cardBgColor' ? t('profile.edit_modal.background') : t('profile.edit_modal.border')}
                                                </div>
                                                <div style={{ position: 'relative', height: '50px', border: '3px solid var(--color-text)', boxShadow: '4px 4px 0 var(--color-shadow-solid)', background: 'var(--color-surface)', overflow: 'hidden' }}>
                                                    <input type="color" value={editForm[key as keyof typeof editForm] as string} onChange={(e) => setEditForm(prev => ({ ...prev, [key]: e.target.value }))} 
                                                        style={{ position: 'absolute', top: '-10px', left: '-10px', width: 'calc(100% + 20px)', height: 'calc(100% + 20px)', border: 'none', cursor: 'pointer' }} 
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                    {/* SECTION: CREATOR PRIVILEGES */}
                                    {(userProfile?.isSuperAdmin || userProfile?.isAdmin) && (
                                        <div style={{ padding: '1.25rem', border: '3px solid var(--color-primary)', background: 'rgba(var(--color-primary-rgb), 0.05)', marginTop: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', overflow: 'hidden' }}>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                ✨ Mode Légendaire
                                            </h3>
                                            <Button 
                                                onClick={() => setEditForm(prev => ({ ...prev, isSuperAdmin: !prev.isSuperAdmin }))}
                                                variant={editForm.isSuperAdmin ? "primary" : "secondary"}
                                                style={{ width: '100%', height: '54px', fontWeight: 900, textTransform: 'uppercase', position: 'relative', zIndex: 1 }}
                                                icon={<Trophy size={20} />}
                                            >
                                                {editForm.isSuperAdmin ? "Désactiver" : "Activer"}
                                            </Button>
                                            <p style={{ fontSize: '0.75rem', fontWeight: 700, textAlign: 'center', opacity: 0.8 }}>
                                                {editForm.isSuperAdmin ? "Effets Premium : Particules, Tilt 3D, Holofoil." : "Transformez votre carte avec des effets premium."}
                                            </p>
                                            {editForm.isSuperAdmin && (
                                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)', animation: 'legendary-shimmer 2s infinite', pointerEvents: 'none' }} />
                                            )}
                                        </div>
                                    )}

                                {/* SECTION: CONTENT */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', borderBottom: '4px solid var(--color-text)', paddingBottom: '0.5rem' }}>
                                        Contenu & Favoris
                                    </h3>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase' }}>{t('profile.edit_modal.top3')}</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {[0, 1, 2].map(index => (
                                                <select key={index} value={editForm.top3Favorites[index] || ''}
                                                    onChange={(e) => {
                                                        const newTop3 = [...editForm.top3Favorites];
                                                        e.target.value === "" ? newTop3.splice(index, 1) : newTop3[index] = e.target.value;
                                                        setEditForm(prev => ({ ...prev, top3Favorites: newTop3 }));
                                                    }}
                                                    style={{ width: '100%', padding: '0.8rem', border: '3px solid var(--color-text)', fontWeight: '900', background: 'var(--color-surface)', color: 'var(--color-text)', borderRadius: 0, boxShadow: '4px 4px 0 var(--color-shadow-solid)' }}
                                                >
                                                    <option value="">{t('profile.edit_modal.select_favorite', { index: index + 1 })}</option>
                                                    {works.sort((a, b) => a.title.localeCompare(b.title)).map(w => (
                                                        <option key={w.id} value={w.id} disabled={editForm.top3Favorites.includes(String(w.id)) && editForm.top3Favorites[index] !== String(w.id)}>
                                                            {w.title}
                                                        </option>
                                                    ))}
                                                </select>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase' }}>{t('profile.edit_modal.featured_badge')}</div>
                                        <select value={editForm.featuredBadge} onChange={(e) => setEditForm(prev => ({ ...prev, featuredBadge: e.target.value }))}
                                            style={{ width: '100%', padding: '0.8rem', border: '3px solid var(--color-text)', fontWeight: '900', background: 'var(--color-surface)', color: 'var(--color-text)', borderRadius: 0, boxShadow: '4px 4px 0 var(--color-shadow-solid)' }}
                                        >
                                            <option value="">{t('profile.edit_modal.none')}</option>
                                            {badges.map(b => <option key={b.id} value={b.id}>{b.name} ({b.rarity})</option>)}
                                        </select>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase' }}>{t('profile.edit_modal.bio')}</div>
                                        <textarea className="manga-input" placeholder={t('profile.edit_modal.bio_placeholder')} value={editForm.bio} onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))} rows={4}
                                            style={{ width: '100%', padding: '1rem', border: '3px solid var(--color-text)', fontFamily: 'inherit', fontSize: '1rem', fontWeight: 700, resize: 'vertical', background: 'var(--color-surface)', color: 'var(--color-text)', borderRadius: 0, boxShadow: '4px 4px 0 var(--color-shadow-solid)' }}
                                        />
                                    </div>
                                </div>

                                <Button variant="primary" onClick={handleSaveProfile} 
                                    style={{ marginTop: '2rem', borderRadius: 0, border: '4px solid var(--color-text)', boxShadow: '8px 8px 0 var(--color-shadow-solid)', height: '60px', fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}
                                >
                                    {t('profile.edit_modal.save')}
                                </Button>
                                </div>

                                {/* Right Col: Live Preview (Desktop Only) */}
                                <div className="desktop-only-preview" style={{ flex: '1 1 45%', minWidth: '400px', background: 'var(--color-surface-hover)', padding: '2rem 1.5rem', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                                    <div className="manga-halftone" style={{ opacity: 0.1, pointerEvents: 'none' }}></div>
                                    <div style={{ width: '100%', position: 'sticky', top: 0, zIndex: 1 }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div className="manga-title" style={{ width: 'auto', padding: '2px 10px', fontSize: '0.7rem' }}>
                                                Aperçu en direct
                                            </div>
                                        </div>
                                        <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
                                            <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center' }}>
                                                <HunterLicenseCard
                                                user={{
                                                    ...extendedProfile,
                                                    uid: uid || user?.uid || '',
                                                    displayName: editForm.displayName,
                                                    photoURL: editForm.avatar,
                                                    bio: editForm.bio,
                                                    banner: editForm.banner,
                                                    bannerPosition: editForm.bannerPosition,
                                                    themeColor: editForm.themeColor,
                                                    cardBgColor: editForm.cardBgColor,
                                                    borderColor: editForm.borderColor,
                                                    featuredBadge: editForm.featuredBadge,
                                                    top3Favorites: editForm.top3Favorites,
                                                    isSuperAdmin: editForm.isSuperAdmin
                                                }}
                                                isOwnProfile={false}
                                                featuredBadgeData={editForm.featuredBadge ? displayBadges.find((b: Badge) => b.id === editForm.featuredBadge) : null}
                                                top3FavoritesData={editForm.top3Favorites.map(fid => {
                                                    const w = works.find(w => w.id === Number(fid) || w.title === fid);
                                                    return w ? { id: String(w.id), title: w.title, image: w.image } : null;
                                                }).filter((item): item is { id: string; title: string; image: string } => item !== null)}
                                                stats={{
                                                    ...displayStats,
                                                    totalChaptersRead: displayTotalChapters,
                                                    totalWorksAdded: displayTotalWorks,
                                                    totalWorksCompleted: displayWorksCompleted
                                                }}
                                            />
                                            </div>
                                            <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--color-surface)', border: '1px dashed var(--color-border)', fontSize: '0.75rem', textAlign: 'center', opacity: 0.8 }}>
                                                Les modifications sont visibles instantanément ici avant l'enregistrement.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>



                    <style>{`
                        @media (max-width: 900px) {
                            .modal-content-container { flex-direction: column !important; height: auto !important; }
                            .desktop-only-preview { display: none !important; }
                        }
                        .manga-scroll::-webkit-scrollbar {
                            width: 10px;
                        }
                        .manga-scroll::-webkit-scrollbar-track {
                            background: var(--color-surface);
                            border-left: 2px solid var(--color-text);
                        }
                        .manga-scroll::-webkit-scrollbar-thumb {
                            background: var(--color-text);
                            border: 2px solid var(--color-surface);
                        }
                        .manga-scroll::-webkit-scrollbar-thumb:hover {
                            background: var(--color-primary);
                        }
                        @keyframes legendary-shimmer {
                            0% { transform: translateX(-100%) skewX(-15deg); }
                            100% { transform: translateX(200%) skewX(-15deg); }
                        }
                    `}</style>
                </Modal>

                <AddFavoriteCharacterModal
                    isOpen={isAddCharModalOpen}
                    onClose={() => setIsAddCharModalOpen(false)}
                    currentFavorites={extendedProfile.favoriteCharacters || []}
                    onUpdate={(newFavs) => setExtendedProfile(prev => ({ ...prev, favoriteCharacters: newFavs }))}
                />

                {/* Guide Modal (unchanged) */}
                <Modal isOpen={showGuide} onClose={() => setShowGuide(false)} title={t('profile.guide_modal.title')}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ background: 'var(--color-border-heavy)', color: 'var(--color-text-inverse)', padding: '1rem', borderRadius: '4px', flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <Trophy size={20} className="text-primary" />
                                    <h4 style={{ fontSize: '1.2rem', fontWeight: 900 }}>{t('profile.guide_modal.xp_title')}</h4>
                                </div>
                                <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                                    {t('profile.guide_modal.xp_desc')}
                                </p>
                                <ul style={{ fontSize: '0.85rem', marginTop: '0.5rem', paddingLeft: '1.2rem' }}>
                                    <li>{t('profile.guide_modal.xp_read')} <strong>+{XP_REWARDS.UPDATE_PROGRESS} XP</strong></li>
                                    <li>{t('profile.guide_modal.xp_add')} <strong>+{XP_REWARDS.ADD_WORK} XP</strong></li>
                                    <li>{t('profile.guide_modal.xp_complete')} <strong>+{XP_REWARDS.COMPLETE_WORK} XP</strong></li>
                                    <li>{t('profile.guide_modal.xp_daily')} <strong>+{XP_REWARDS.DAILY_LOGIN} XP (+ bonus de série)</strong></li>
                                </ul>
                            </div>
                            <div style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '2px solid var(--color-border-heavy)', padding: '1rem', borderRadius: '4px', flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <Flame size={20} color="var(--color-primary)" />
                                    <h4 style={{ fontSize: '1.2rem', fontWeight: 900 }}>{t('profile.guide_modal.streak_title')}</h4>
                                </div>
                                <p style={{ fontSize: '0.9rem' }}>
                                    {t('profile.guide_modal.streak_desc')}
                                </p>
                                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
                                    {t('profile.guide_modal.streak_warning')}
                                </p>
                            </div>
                        </div>
                        <div style={{ background: 'var(--color-surface-hover)', padding: '1rem', borderRadius: '4px', borderLeft: '4px solid var(--color-primary)' }}>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '0.5rem' }}>{t('profile.guide_modal.ranks_title')}</h4>
                            <p style={{ fontSize: '0.9rem' }}>
                                {t('profile.guide_modal.ranks_desc')}
                            </p>
                        </div>
                    </div>
                </Modal>
                </div>
            </div>
        </Layout>
    );
}

