import { logger } from '@/utils/logger';
import { useParams, useSearchParams } from 'react-router-dom';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useTranslation } from 'react-i18next';
import { Link, useLocalizedNavigate } from '@/components/routing/LocalizedLink';
import { Layout } from '@/components/layout/Layout';
import { createPortal } from 'react-dom';
import { useLibraryStore, type Work } from '@/store/libraryStore';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal'; // Import Modal
import { ArrowLeft, Star, BookOpen, Check, Trash2, Tv, FileText, Trophy, AlertTriangle, MessageCircle, Heart, Send, EyeOff, Reply, Video, Calendar, BarChart, Music, Disc, X, ArrowUp } from 'lucide-react';
import { useState, useEffect, memo } from 'react';


import { useToast } from '@/context/ToastContext';
import { ContentList, type ContentItem } from '@/components/library/ContentList';
import { getAnimeEpisodes, getAnimeEpisodeDetails } from '@/services/animeApi';
import { getCommentsWithReplies, addComment, toggleCommentLike, getFriendsReadingWork, type UserProfile } from '@/firebase/firestore';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { CommentWithReplies } from '@/types/comment';
import logoCrunchyroll from '@/assets/logo_crunchyroll.png';
import logoADN from '@/assets/logo_adn.png';

import {
    getWorkCharacters, getWorkRecommendations, getWorkPictures, getWorkStatistics, type JikanCharacter, type JikanRelation, type JikanRecommendation, type JikanPicture, type JikanTheme, type JikanStatistics, type JikanStreaming,
    getAnimeStaff, type JikanStaff, getWorkReviews, type JikanReview, getWorkFull, ApiError
} from '../services/animeApi';
import { handleProgressUpdateWithXP } from '@/utils/progressUtils';
import { useGamificationStore } from '@/store/gamificationStore';
import { SEO } from '@/components/layout/SEO';
import { getDisplayTitle } from '@/utils/titleUtils';
import styles from './WorkDetails.module.css';

// Helper Component for Recursive Comments

interface Comment {
    id: string;
    userId: string;
    userName: string;
    userPhoto: string;
    text: string;
    timestamp: number;
    likes: string[];
    spoiler: boolean;
    replies?: Comment[];
}

interface RecursiveCommentProps {
    comment: Comment;
    user: { uid: string; displayName: string | null; photoURL: string | null } | null;
    replyingTo: string | null;
    setReplyingTo: (id: string | null) => void;
    replyText: string;
    setReplyText: (text: string) => void;
    handleReply: (id: string) => void;
    handleLike: (id: string) => void;
    revealedSpoilers: string[];
    setRevealedSpoilers: React.Dispatch<React.SetStateAction<string[]>>;
}


interface JikanEntity {
    mal_id: number;
    type: string;
    name: string;
    url: string;
}

interface JikanTrailer {
    youtube_id: string;
    url: string;
    embed_url: string;
    images: {
        image_url?: string;
        small_image_url?: string;
        medium_image_url?: string;
        large_image_url?: string;
        maximum_image_url?: string;
    };
}

interface DetailedWork extends Omit<Work, 'status'> {
    status: Work['status'] | string;
    trailer?: JikanTrailer;
    studios?: JikanEntity[];
    genres?: JikanEntity[];
    season?: string;
    year?: number;
    rank?: number;
    popularity?: number;
    duration?: string;
    ratingString?: string;
    source?: string;
}

const RecursiveComment = memo(function RecursiveComment({
    comment,
    user,
    replyingTo,
    setReplyingTo,
    replyText,
    setReplyText,
    handleReply,
    handleLike,
    revealedSpoilers,
    setRevealedSpoilers
}: RecursiveCommentProps) {
    const isRevealed = revealedSpoilers.includes(comment.id);
    /* eslint-disable-next-line */
    const [timeAgo, setTimeAgo] = useState<string>('');
    const { t } = useTranslation();
    
    useEffect(() => {
        const timeDiff = Date.now() - comment.timestamp;
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const formatted = hours < 1 
            ? t('work_details.comments.time_now') 
            : hours < 24 
                ? t('work_details.comments.time_hours', { hours }) 
                : t('work_details.comments.time_days', { days: Math.floor(hours / 24) });
        setTimeAgo(formatted);
    }, [comment.timestamp, t]);
    const isReplying = replyingTo === comment.id;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            width: '100%'
        }}>
            {/* Comment Card */}
            <div style={{
                padding: '1rem',
                background: 'var(--color-surface)',
                border: '2px solid var(--color-border-heavy)',
                boxShadow: '4px 4px 0 var(--color-shadow)',
                transition: 'transform 0.2s',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-border-heavy)' }}>
                        <OptimizedImage src={comment.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userName}`} alt="" />
                    </div>
                    <div>
                        <p style={{ fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase' }}>{comment.userName}</p>
                        <p style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 600 }}>{timeAgo}</p>
                    </div>
                </div>

                {/* Content */}
                {comment.spoiler && !isRevealed ? (
                    <div
                        onClick={() => setRevealedSpoilers((prev) => [...prev, comment.id])}
                        style={{
                            padding: '0.75rem',
                            background: 'var(--color-border-heavy)',
                            color: 'var(--color-text-inverse)',
                            cursor: 'pointer',
                            textAlign: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                        }}
                    >
                        <EyeOff size={14} /> {t('work_details.comments.spoiler')}
                    </div>
                ) : (
                    <p style={{ fontSize: '0.95rem', lineHeight: 1.5, fontWeight: 500 }}>{comment.text}</p>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}>
                    <button
                        onClick={() => handleLike(comment.id)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            color: user && comment.likes.includes(user.uid) ? '#ef4444' : 'var(--color-text)',
                            fontWeight: 700,
                            fontSize: '0.8rem'
                        }}
                    >
                        <Heart size={16} fill={user && comment.likes.includes(user.uid) ? '#ef4444' : 'none'} />
                        {comment.likes.length}
                    </button>
                    {user && (
                        <button
                            onClick={() => {
                                if (isReplying) {
                                    setReplyingTo(null);
                                    setReplyText('');
                                } else {
                                    setReplyingTo(comment.id);
                                    setReplyText(''); // Clear text when opening new reply
                                }
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                color: isReplying ? '#3b82f6' : 'var(--color-text)',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                opacity: isReplying ? 1 : 0.6
                            }}
                        >
                            <Reply size={16} />
                            {t('work_details.comments.reply')}
                        </button>
                    )}
                </div>

                {/* Reply Form (Localized) */}
                {isReplying && (
                    <div style={{ marginTop: '1rem', animation: 'fadeIn 0.2s ease-out' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder={t('work_details.comments.reply_to', { name: comment.userName })}
                                autoFocus
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    border: '2px solid var(--color-border-heavy)',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    background: 'var(--color-surface-hover)',
                                    color: 'var(--color-text)'
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleReply(comment.id)}
                            />
                            <button
                                onClick={() => handleReply(comment.id)}
                                style={{
                                    background: 'var(--color-border-heavy)',
                                    color: 'var(--color-text-inverse)',
                                    border: 'none',
                                    padding: '0 1.25rem',
                                    cursor: 'pointer',
                                    fontWeight: 800,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'transform 0.1s'
                                }}
                                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Nested Replies (Staircase) */}
            {comment.replies && comment.replies.length > 0 && (
                <div className={styles.commentReplyContainer}>
                    {comment.replies.map((reply) => (
                        <RecursiveComment
                            key={reply.id}
                            comment={reply}
                            user={user}
                            replyingTo={replyingTo}
                            setReplyingTo={setReplyingTo}
                            replyText={replyText}
                            setReplyText={setReplyText}
                            handleReply={handleReply}
                            handleLike={handleLike}
                            revealedSpoilers={revealedSpoilers}
                            setRevealedSpoilers={setRevealedSpoilers}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});

export default function WorkDetails() {
    const { id } = useParams();
    const navigate = useLocalizedNavigate();
    const { t } = useTranslation();
    const { addToast } = useToast(); // Initialize hook
    const { getWork, addWork, updateStatus, updateWorkDetails, removeWork } = useLibraryStore(); // Add removeWork
    const { recalculateStats } = useGamificationStore();
    const { user } = useAuthStore();
    const { spoilerMode, titleLanguage, hideScores } = useSettingsStore();

    // Query Params for Public/Guest Access
    const [searchParams] = useSearchParams();
    const typeParam = searchParams.get('type') as 'anime' | 'manga' | null;
    const [fetchedWork, setFetchedWork] = useState<DetailedWork | null>(null);
    const [isFetchingDetails, setIsFetchingDetails] = useState(false);
    const [fetchError, setFetchError] = useState<{ status: number; message: string } | null>(null);

    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

    // Expandable sections state
    const [isCastingExpanded, setIsCastingExpanded] = useState(false);
    const [isStaffExpanded, setIsStaffExpanded] = useState(false);
    const [isTrailerOpen, setIsTrailerOpen] = useState(false);


    // const castingScrollRef = useRef<HTMLDivElement>(null); // Removed as we switched to grid

    const libraryWork = getWork(Number(id));

    // Merge library work with fetched details to get the best of both worlds (user progress + rich API data)
    const work = libraryWork ? {
        ...libraryWork,
        ...(fetchedWork ? {
            trailer: fetchedWork.trailer,
            studios: fetchedWork.studios,
            genres: fetchedWork.genres,
            season: fetchedWork.season,
            year: fetchedWork.year,
            rank: fetchedWork.rank,
            popularity: fetchedWork.popularity,
            duration: fetchedWork.duration,
            ratingString: fetchedWork.ratingString,
            source: fetchedWork.source
        } : {})
    } : fetchedWork;

    const [isEditing, setIsEditing] = useState(false);
    const [progress, setProgress] = useState(libraryWork?.currentChapter || 0); // Use libraryWork for initial progress
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
    const [isNotesExpanded, setIsNotesExpanded] = useState(false);
    const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);

    // Tab & Episodes State
    const [activeTab, setActiveTab] = useState<'info' | 'episodes' | 'gallery' | 'themes' | 'stats' | 'reviews'>('info');
    const [episodes, setEpisodes] = useState<ContentItem[]>([]);
    const [episodesPage, setEpisodesPage] = useState(1);
    const [hasMoreEpisodes, setHasMoreEpisodes] = useState(false);
    const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);

    // Comments State
    const [comments, setComments] = useState<CommentWithReplies[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isSpoiler, setIsSpoiler] = useState(false);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [revealedSpoilers, setRevealedSpoilers] = useState<string[]>([]);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');

    // Friends reading this
    const [friendsReading, setFriendsReading] = useState<{ count: number; friends: UserProfile[] }>({ count: 0, friends: [] });

    // New Data: Characters & Relations
    const [characters, setCharacters] = useState<JikanCharacter[]>([]);
    const [relations, setRelations] = useState<JikanRelation[]>([]);
    const [recommendations, setRecommendations] = useState<JikanRecommendation[]>([]);
    const [pictures, setPictures] = useState<JikanPicture[]>([]);
    const [themes, setThemes] = useState<JikanTheme | null>(null);
    const [statistics, setStatistics] = useState<JikanStatistics | null>(null);
    const [streaming, setStreaming] = useState<JikanStreaming[]>([]);
    const [reviews, setReviews] = useState<JikanReview[]>([]);
    const [staff, setStaff] = useState<JikanStaff[]>([]);
    const [expandedRelations, setExpandedRelations] = useState<Record<number, boolean>>({});

    // Pagination & UI State
    const [totalEpisodesPage, setTotalEpisodesPage] = useState(1);
    const [showScrollTop, setShowScrollTop] = useState(false);


    // Initial Fetch for non-library items
    useEffect(() => {
        // Fetch details if we don't have them in state (fetchedWork), even if we have the library work (which might be stale/minimal)
        if (id && !fetchedWork && !isFetchingDetails) {
            setIsFetchingDetails(true);
            let typeToFetch: 'anime' | 'manga' = 'anime';
            // 1. Priority: check library
            if (libraryWork && libraryWork.type) {
                const libType = (libraryWork.type as string).toLowerCase();
                if (['manga', 'novel', 'manhwa', 'manhua', 'doujinshi', 'oneshot', 'oel'].includes(libType)) {
                    typeToFetch = 'manga';
                }
            } 
            // 2. Secondary: check URL parameter
            else if (typeParam) {
                const normalized = typeParam.toLowerCase();
                if (['manga', 'novel', 'manhwa', 'manhua', 'doujinshi', 'oneshot', 'oel'].includes(normalized)) {
                    typeToFetch = 'manga';
                }
            }

            getWorkFull(Number(id), typeToFetch).then(res => {
                const workTypeNormalized = res.type ? res.type.toLowerCase() : typeToFetch;
                const internalType = (workTypeNormalized === 'manga' || workTypeNormalized === 'manhwa' || workTypeNormalized === 'manhua' || workTypeNormalized === 'novel') ? 'manga' : 'anime';
 
                const mapped: DetailedWork = {
                    id: res.mal_id,
                    title: res.title,
                    title_english: res.title_english,
                    title_japanese: res.title_japanese,
                    type: internalType,
                    format: res.type,
                    image: res.images.jpg.large_image_url,
                    image_small: res.images.jpg.small_image_url,
                    synopsis: res.synopsis,
                    totalChapters: res.chapters || res.episodes || 0,
                    status: res.status ? res.status.toLowerCase().replace(/ /g, '_') : 'unknown',
                    score: res.score ?? undefined,
                    currentChapter: 0,
                    rating: 0,
                    notes: '',
                    trailer: res.trailer,
                    studios: res.studios || [],
                    genres: res.genres || [],
                    season: res.season,
                    year: res.year,
                    rank: res.rank,
                    popularity: res.popularity,
                    duration: res.duration,
                    ratingString: res.rating,
                    source: res.source
                };
 
                // Sync extra data from /full immediately
                if (res.relations) setRelations(res.relations);
                if (res.theme) setThemes(res.theme);
                if (res.streaming) setStreaming(res.streaming);
 
                setFetchedWork(mapped);
                setFetchError(null);
                setIsFetchingDetails(false);
            })
            .catch(err => {
                logger.error("Failed to fetch work details", err);
                if (err instanceof ApiError) {
                    setFetchError({ status: err.status, message: err.message });
                } else {
                    setFetchError({ status: 500, message: "Internal Error" });
                }
                setIsFetchingDetails(false);
            });
        }
    }, [id, libraryWork, fetchedWork, typeParam, isFetchingDetails]);

    // Fetch Characters, Relations, Recommendations, Pictures
    // Fetch Characters, Relations, Recommendations, Pictures
    useEffect(() => {
        if (!id || !work) return;



        const fetchData = async () => {
            if (!work.type) return;
            const type = work.type === 'manga' ? 'manga' : 'anime';

            try {
                // Fetch basic UI data immediately
                const [chars, recs, pics] = await Promise.all([
                    getWorkCharacters(Number(id), type),
                    getWorkRecommendations(Number(id), type),
                    getWorkPictures(Number(id), type)
                ]);
                
                setCharacters(chars);
                setRecommendations(recs);
                setPictures(pics);

                // Fetch other data only if we are in the respective tab or section is expanded
                // This will be handled by specific tab activation later or if we just want to avoid hitting the API too much on mount
                // For now, let's keep statistics, staff, and reviews delayed or concurrent
                
                // Statistics
                getWorkStatistics(Number(id), type).then(setStatistics);
                
                if (type === 'anime') {
                    getAnimeStaff(Number(id)).then(setStaff);
                }
                
                getWorkReviews(Number(id), type).then(setReviews);

            } catch (error) {
                logger.error('Error fetching details:', error);
            }
        };

        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, work?.type]); // work?.type is safe here as it will trigger re-fetch if type changes

    // ... existing ...


    // Normalize displayWork for UI usage (deprecated activeWork, just use work)
    // const activeWork = displayWork; 
    // const isInLibrary = !!work;

    const handleSave = () => {
        if (!libraryWork || !work) return; // Guard for guests
        // Use centralized utility for progress & XP logic
        const success = handleProgressUpdateWithXP(libraryWork.id!, progress, work.totalChapters || 0);
        if (success) {
            addToast(t('work_details.progress.saved_toast'), 'success');
        }

        setIsEditing(false);
    };

    const handleDelete = () => {
        if (!work) return;
        removeWork(work.id);
        
        const updatedWorks = useLibraryStore.getState().works;
        recalculateStats(updatedWorks);

        addToast(t('work_details.danger.deleted_toast', { title: work.title }), 'error');
        navigate('/library');
    };

    // Fetch episodes or generate chapters when tab updates
    useEffect(() => {
        if (activeTab === 'episodes' && work) {
            setIsLoadingEpisodes(true);
            const workType = work.type?.toLowerCase();

            if (workType === 'anime') {
                getAnimeEpisodes(Number(work.id), episodesPage).then(res => {
                    const mapped = res.data.map((ep) => ({
                        id: ep.mal_id,
                        title: ep.title,
                        number: ep.mal_id,
                        date: ep.aired,
                        isFiller: ep.filler,
                        synopsis: null // Initialize with null
                    }));
                    setEpisodes(mapped);
                    setHasMoreEpisodes(res.pagination.has_next_page);
                    setTotalEpisodesPage(res.pagination.last_visible_page || 1);
                    setIsLoadingEpisodes(false);
                });
            } else {

                // Generate chapters locally with simulated pagination (100 per page to be manageable)
                const itemsPerPage = 50; // Use 50 as default chunk size for chapters
                const total = work.totalChapters || 100; // Fallback if unknown
                const start = (episodesPage - 1) * itemsPerPage + 1;
                const end = Math.min(start + itemsPerPage - 1, total);

                const generated: ContentItem[] = [];
                for (let i = start; i <= end; i++) {
                    generated.push({
                        id: i,
                        title: `Chapitre ${i}`,
                        number: i,
                        date: null,
                        isFiller: false
                    });
                }

                // Simulate network delay for feeling
                setTimeout(() => {
                    setEpisodes(generated);
                    setHasMoreEpisodes(end < total);
                    setIsLoadingEpisodes(false);
                }, 300);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [work?.id, work?.type, work?.totalChapters, activeTab, episodesPage]);

    const [commentError, setCommentError] = useState<string | null>(null);

    // Load comments and friends reading when work changes
    useEffect(() => {
        if (work?.id) {
            // Load comments
            setIsLoadingComments(true);
            setCommentError(null); // Reset error
            getCommentsWithReplies(Number(work.id))
                .then(data => {
                    setComments(data);
                    setIsLoadingComments(false);
                })
                .catch(err => {
                    logger.error("Error loading comments:", err);
                    setIsLoadingComments(false);
                    if (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions')) {
                        setCommentError(t('work_details.comments.permission_error'));
                    } else {
                        setCommentError(t('work_details.comments.generic_error'));
                    }
                });

            // Load friends reading this work
            if (user) {
                getFriendsReadingWork(user.uid, Number(work.id)).then(data => {
                    setFriendsReading(data);
                });
            }
        }
    }, [work?.id, user?.uid, user, t]);

    // Scroll To Top Visibility
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
            setShowScrollTop(scrollTop > 400);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        document.body.addEventListener('scroll', handleScroll, { passive: true }); // Catch body scroll

        return () => {
            window.removeEventListener('scroll', handleScroll);
            document.body.removeEventListener('scroll', handleScroll);
        };
    }, []);

    if (fetchError?.status === 404) {
        return (
            <Layout>
                <div className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
                    <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem' }}>{t('work_details.not_found')}</h1>
                    <p>{t('work_details.not_found_desc')}</p>
                    <Button onClick={() => navigate('/discover')} style={{ marginTop: '1rem' }}>{t('work_details.back')}</Button>
                </div>
            </Layout>
        );
    }

    if (!work) {
        if (isFetchingDetails) {
            return (
                <Layout>
                    <div className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
                        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem' }}>{t('work_details.loading')}</h1>
                    </div>
                </Layout>
            );
        }
        return (
            <Layout>
                <div className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
                    <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem' }}>{t('work_details.not_found')}</h1>
                    <p>{t('work_details.not_found_desc')}</p>
                    <Button onClick={() => navigate('/discover')} style={{ marginTop: '1rem' }}>{t('work_details.back')}</Button>
                </div>
            </Layout>
        );
    }

    const handleSubmitComment = async () => {
        if (!newComment.trim() || !user || !work) {
            logger.log('[Comments] Submit blocked - missing data:', { hasComment: !!newComment.trim(), hasUser: !!user, hasWork: !!work });
            return;
        }

        try {
            const commentData = {
                userId: user.uid,
                userName: user.displayName || 'Anonyme',
                userPhoto: user.photoURL || '',
                workId: Number(work.id),
                text: newComment,
                spoiler: isSpoiler
            };

            logger.log('[Comments] Submitting comment:', commentData);
            const result = await addComment(commentData);
            logger.log('[Comments] Add result:', result);

            if (result) {
                setNewComment('');
                setIsSpoiler(false);
                addToast(t('work_details.comments.added_toast'), 'success');


                // Reload comments
                const updated = await getCommentsWithReplies(Number(work.id));
                logger.log('[Comments] Reloaded comments:', updated.length);
                setComments(updated);
            } else {
                addToast(t('work_details.comments.error_toast'), 'error');
            }
        } catch (error) {
            logger.error('[Comments] Submit error:', error);
            addToast(t('work_details.comments.error_toast'), 'error');
        }
    };

    const handleLikeComment = async (commentId: string) => {
        if (!user) return;
        await toggleCommentLike(commentId, user.uid);
        if (work) {
            const updated = await getCommentsWithReplies(Number(work.id));
            setComments(updated);
        }
    };

    const handleReply = async (parentId: string) => {
        if (!replyText.trim() || !user || !work) return;

        try {
            const replyData = {
                userId: user.uid,
                userName: user.displayName || 'Anonyme',
                userPhoto: user.photoURL || '',
                workId: Number(work.id),
                text: replyText,
                spoiler: false,
                replyTo: parentId
            };

            const result = await addComment(replyData);
            if (result) {
                setReplyText('');
                setReplyingTo(null);
                addToast(t('work_details.comments.reply_added_toast'), 'success');
                const updated = await getCommentsWithReplies(Number(work.id));
                setComments(updated);
            }
        } catch (error) {
            logger.error('[Comments] Reply error:', error);
            addToast(t('work_details.comments.reply_error_toast'), 'error');
        }
    };

    const handleEpisodeSelect = (number: number) => {
        if (work && libraryWork) {
            const success = handleProgressUpdateWithXP(work.id, number, work.totalChapters);
            if (success) {
                setProgress(number);
                // addToast(`Progression mise à jour...`); // Removed to prevent spam on rapid clicks
            }
        }
    };

    const handleExpandEpisode = async (episodeNumber: number) => {
        if (work.type !== 'anime') return;

        logger.log(`Fetching details for anime ${work.id} episode ${episodeNumber}`);
        try {
            const details = await getAnimeEpisodeDetails(Number(work.id), episodeNumber);
            logger.log("Details received:", details);
            if (details) {
                setEpisodes(prev => prev.map(ep =>
                    ep.number === episodeNumber ? { ...ep, synopsis: details.synopsis } : ep
                ));
            } else {
                logger.warn("No details returned from API");
            }
        } catch (error) {
            logger.error("Failed to fetch episode details", error);
        }
    };

    return (
        <Layout>
            <SEO 
                title={getDisplayTitle(work, titleLanguage)}
                description={work.synopsis?.slice(0, 160)}
                image={work.image}
            />
            <div className={`container ${styles.container}`}>
                <Button
                    onClick={() => navigate(-1)}
                    variant="ghost"
                    icon={<ArrowLeft size={20} />}
                    className={styles.backButton}
                >
                    {t('work_details.back')}
                </Button>

                <div className={`manga-panel ${styles.detailsPanel}`}>

                    {/* Cover Image */}
                    <div className={styles.coverSection}>
                        <div className={styles.coverImageWrapper}>                            <OptimizedImage
                                src={work.image}
                                lowResSrc={work.image_small}
                                alt={getDisplayTitle(work, titleLanguage)}
                                className={styles.poster}
                            />

                            <div className={styles.typeLabel}>
                                {work.type ? work.type.toUpperCase() : 'TYPE'}
                            </div>
                        </div>
                    </div>

                    {/* Info */}
                    <div className={styles.infoSection}>
                        <div className={styles.tabsContainer}>
                            <button
                                onClick={() => setActiveTab('info')}
                                className={`${styles.tabButton} ${activeTab === 'info' ? styles.activeTab : ''}`}
                            >
                                {t('work_details.tabs.general')}
                            </button>
                            {(work.type) && (
                                <button
                                    onClick={() => setActiveTab('episodes')}
                                    className={`${styles.tabButton} ${activeTab === 'episodes' ? styles.activeTab : ''}`}
                                >
                                    {work.type === 'manga' ? t('work_details.tabs.chapters_list') : t('work_details.tabs.episodes_list')}
                                </button>
                            )}
                            {work.type !== 'manga' && (
                                <button
                                    className={`${styles.tabButton} ${activeTab === 'themes' ? styles.activeTab : ''}`}
                                    onClick={() => setActiveTab('themes')}
                                >
                                    {t('work_details.tabs.music')}
                                </button>
                            )}
                            <button
                                onClick={() => setActiveTab('reviews')}
                                className={`${styles.tabButton} ${activeTab === 'reviews' ? styles.activeTab : ''}`}
                            >
                                {t('work_details.tabs.reviews')}
                            </button>
                            <button
                                onClick={() => setActiveTab('gallery')}
                                className={`${styles.tabButton} ${activeTab === 'gallery' ? styles.activeTab : ''}`}
                            >
                                {t('work_details.tabs.gallery')}
                            </button>
                            <button
                                onClick={() => setActiveTab('stats')}
                                className={`${styles.tabButton} ${activeTab === 'stats' ? styles.activeTab : ''}`}
                            >
                                {t('work_details.tabs.stats')}
                            </button>
                        </div>

                        {activeTab === 'episodes' && (
                            work.type === 'manga' && (!work.totalChapters || work.totalChapters === 0) ? (
                                <div style={{ textAlign: 'center', padding: '3rem', border: '2px dashed var(--color-border-heavy)' }}>
                                    <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: '1rem' }}>{t('work_details.chapters.unknown_count')}</h3>
                                    <p style={{ marginBottom: '1rem' }}>{t('work_details.chapters.unknown_desc')}</p>
                                    <Button
                                        onClick={() => {
                                            const newTotal = prompt(t('work_details.chapters.prompt'), "0");
                                            if (newTotal && !isNaN(Number(newTotal))) {
                                                updateWorkDetails(work.id, { totalChapters: Number(newTotal) });
                                            }
                                        }}
                                        variant="manga"
                                    >
                                        {t('work_details.chapters.set_count')}
                                    </Button>
                                </div>
                            ) : (
                                <ContentList
                                    items={episodes}
                                    currentProgress={work.currentChapter || 0}
                                    onSelect={handleEpisodeSelect}
                                    onExpand={handleExpandEpisode}
                                    isLoading={isLoadingEpisodes}
                                    page={episodesPage}
                                    hasNextPage={hasMoreEpisodes}
                                    streamingServices={streaming}
                                    hasPrevPage={episodesPage > 1}
                                    onNextPage={() => setEpisodesPage(p => p + 1)}
                                    onPrevPage={() => setEpisodesPage(p => p - 1)}
                                    workTitle={work.title}
                                    workType={work.type === 'manga' ? 'manga' : 'anime'}
                                    readOnly={!libraryWork}
                                    lastPage={work.type === 'manga' ? Math.ceil((work.totalChapters || 100) / 50) : totalEpisodesPage}
                                    onFirstPage={() => setEpisodesPage(1)}
                                    onLastPage={() => setEpisodesPage(work.type === 'manga' ? Math.ceil((work.totalChapters || 100) / 50) : totalEpisodesPage)}
                                    onGoToPage={(p) => setEpisodesPage(p)}
                                />
                            )
                        )}

                        {activeTab === 'info' && (
                            <>
                                <h1 className={styles.title}>
                                    {getDisplayTitle(work, titleLanguage)}
                                </h1>

                                <div className={styles.metaContainer}>
                                    <div className={styles.metaItem}>
                                        <Trophy size={20} />
                                        {!hideScores && <span>{t('work_details.meta.score')}: {work.score || '?'}</span>}
                                    </div>
                                    <div
                                        onClick={() => {
                                            const newTotal = prompt(t('work_details.chapters.prompt_total'), work.totalChapters?.toString() || "");
                                            if (newTotal && !isNaN(Number(newTotal))) {
                                                updateWorkDetails(Number(work.id), { totalChapters: Number(newTotal) });
                                            }
                                        }}
                                        className={styles.metaItem}
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        title={t('work_details.chapters.click_to_edit')}
                                    >
                                        <BookOpen size={20} />
                                        <span>{work.totalChapters || '?'} {(work.type === 'manga') ? t('work_details.meta.chaps') : t('work_details.meta.eps')}</span>
                                    </div>

                                    {/* Minimalist Streaming Buttons */}
                                    {!(work.type === 'manga') ? (
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {/* Dynamic Streaming Links */}
                                            {streaming.map((s) => {
                                                const name = s.name.toLowerCase();

                                                // Service detection and styling
                                                const getServiceStyle = () => {
                                                    if (name.includes('crunchyroll')) return { bg: '#f47521', logo: logoCrunchyroll, short: 'CR' };
                                                    if (name.includes('adn') || name.includes('animation digital')) return { bg: '#0099ff', logo: logoADN, short: 'ADN' };
                                                    if (name.includes('netflix')) return { bg: '#e50914', logo: null, short: 'N' };
                                                    if (name.includes('prime') || name.includes('amazon')) return { bg: '#00a8e1', logo: null, short: 'PRIME' };
                                                    if (name.includes('hulu')) return { bg: '#1ce783', logo: null, short: 'HULU' };
                                                    if (name.includes('disney')) return { bg: '#113ccf', logo: null, short: 'D+' };
                                                    if (name.includes('funimation')) return { bg: '#5b0bb5', logo: null, short: 'FUNI' };
                                                    if (name.includes('hidive')) return { bg: '#00baff', logo: null, short: 'HIDIVE' };
                                                    if (name.includes('wakanim')) return { bg: '#e60012', logo: null, short: 'WAKA' };
                                                    if (name.includes('bilibili')) return { bg: '#00a1d6', logo: null, short: 'BILI' };
                                                    return { bg: '#000', logo: null, short: s.name.slice(0, 4).toUpperCase() };
                                                };

                                                const service = getServiceStyle();

                                                return (
                                                    <a
                                                        key={s.name}
                                                        href={s.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            border: `2px solid ${service.bg}`,
                                                            padding: '0.4rem 0.6rem',
                                                            background: service.logo ? '#fff' : service.bg,
                                                            cursor: 'pointer',
                                                            borderRadius: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            textDecoration: 'none',
                                                            color: service.logo ? '#000' : '#fff',
                                                            height: '36px',
                                                            minWidth: '36px',
                                                            justifyContent: 'center',
                                                            fontWeight: 800,
                                                            fontSize: '0.75rem',
                                                            letterSpacing: '0.5px',
                                                            boxShadow: '2px 2px 0 rgba(0,0,0,0.2)',
                                                        }}
                                                        title={`${t('work_details.streaming.watch_on')} ${s.name}`}
                                                    >
                                                        {service.logo ? (
                                                            <OptimizedImage 
                                                                src={service.logo} 
                                                                alt={service.short} 
                                                                containerClassName={styles.serviceLogoContainer}
                                                                style={{ width: '22px', height: '22px' }} 
                                                                objectFit="contain" 
                                                            />
                                                        ) : (
                                                            <span>{service.short}</span>
                                                        )}
                                                    </a>
                                                );
                                            })}

                                            {/* Generic Streaming Fallback (Google Search) */}
                                            <button
                                                onClick={() => {
                                                    const nextEp = (work.currentChapter || 0) + 1;
                                                    handleEpisodeSelect(nextEp);
                                                    window.open(`https://www.google.com/search?q=${encodeURIComponent(work.title)} episode ${nextEp} streaming vostfr`, '_blank');
                                                }}
                                                style={{ border: '2px solid var(--color-border-heavy)', padding: '0.5rem 1rem', background: 'var(--color-surface)', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', height: '40px', gap: '0.5rem', fontWeight: 700, color: 'var(--color-text)' }}
                                                title={`${t('work_details.streaming.search_episode')} ${(work.currentChapter || 0) + 1}`}
                                            >
                                                <Tv size={20} />
                                                <span>{t('work_details.streaming.watch')}</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                const nextChap = (work.currentChapter || 0) + 1;
                                                handleEpisodeSelect(nextChap);
                                                window.open(`https://www.google.com/search?q=${encodeURIComponent(work.title)} chapitre ${nextChap} scan fr`, '_blank');
                                            }}
                                            style={{ border: '2px solid #22c55e', color: '#22c55e', padding: '0.5rem 1rem', background: 'var(--color-surface)', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
                                            title={`${t('work_details.streaming.search_chapter')} ${(work.currentChapter || 0) + 1}`}
                                        >
                                            <FileText size={20} />
                                            <span>{t('work_details.streaming.read')}</span>
                                        </button>
                                    )}
                                </div>

                                {work.synopsis && (
                                    <div style={{ marginBottom: '2rem' }}>
                                        <h3 className={styles.synopsisTitle}>{t('work_details.synopsis.title')}</h3>
                                        <div
                                            onClick={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
                                            style={{ cursor: 'pointer', position: 'relative' }}
                                        >
                                            <p className={`${spoilerMode ? 'spoiler-blur' : ''} ${styles.synopsisText}`} style={{
                                                maxHeight: isSynopsisExpanded ? 'none' : '100px',
                                                WebkitLineClamp: isSynopsisExpanded ? 'none' : 4,
                                            }}>
                                                {work.synopsis}
                                            </p>
                                            {!isSynopsisExpanded && (
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    left: 0,
                                                    right: 0,
                                                    height: '40px',
                                                    background: 'linear-gradient(transparent, var(--color-surface))',
                                                    pointerEvents: 'none'
                                                }} />
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                fontWeight: 900,
                                                fontSize: '0.9rem',
                                                marginTop: '0.5rem',
                                                cursor: 'pointer',
                                                textDecoration: 'underline',
                                                padding: 0,
                                                color: 'var(--color-text)'
                                            }}
                                        >
                                            {isSynopsisExpanded ? t('work_details.synopsis.show_less') : t('work_details.synopsis.show_more')}
                                        </button>
                                    </div>
                                )}

                                {/* DETAILED INFO & TRAILER SECTION */}
                                <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                                    {/* Info Grid */}
                                    <div className={styles.infoGrid}>
                                        {work.season && (
                                            <div className={styles.infoCard}>
                                                <div className={styles.infoLabel}>
                                                    <Calendar size={14} strokeWidth={3} /> {t('work_details.info.season')}
                                                </div>
                                                <div className={styles.infoValue}>{work.season} {work.year}</div>
                                            </div>
                                        )}
                                        {work.studios && work.studios.length > 0 && (
                                            <div className={styles.infoCard}>
                                                <div className={styles.infoLabel}>
                                                    <Video size={14} strokeWidth={3} /> {t('work_details.info.studio')}
                                                </div>
                                                <div className={styles.infoValue}>{work.studios[0].name}</div>
                                            </div>
                                        )}
                                        {work.rank && (
                                            <div className={styles.infoCard}>
                                                <div className={styles.infoLabel}>
                                                    <Trophy size={14} strokeWidth={3} /> {t('work_details.info.rank')}
                                                </div>
                                                <div className={styles.infoValue}>#{work.rank}</div>
                                            </div>
                                        )}
                                        {work.popularity && (
                                            <div className={styles.infoCard}>
                                                <div className={styles.infoLabel}>
                                                    <BarChart size={14} strokeWidth={3} /> {t('work_details.info.popularity')}
                                                </div>
                                                <div className={styles.infoValue}>#{work.popularity}</div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Trailer - Theater Mode */}
                                    {work.trailer && work.trailer.embed_url && (() => {
                                        const trailerThumbnail = work.trailer.images?.maximum_image_url
                                            || work.trailer.images?.large_image_url
                                            || work.trailer.images?.medium_image_url
                                            || work.trailer.images?.small_image_url
                                            || (work.trailer.youtube_id ? `https://img.youtube.com/vi/${work.trailer.youtube_id}/maxresdefault.jpg` : null)
                                            || (work.trailer.youtube_id ? `https://img.youtube.com/vi/${work.trailer.youtube_id}/hqdefault.jpg` : null);

                                        return (
                                            <div style={{ width: '100%', marginTop: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                                    <Video size={20} strokeWidth={2.5} />
                                                    <h3 className={styles.synopsisTitle} style={{ marginBottom: 0 }}>{t('work_details.trailer.title')}</h3>
                                                </div>

                                                {/* Theater Mode Trigger Card */}
                                                <div
                                                    onClick={() => setIsTrailerOpen(true)}
                                                    style={{
                                                        position: 'relative',
                                                        width: '100%',
                                                        height: '200px',
                                                        background: '#000',
                                                        backgroundImage: trailerThumbnail ? `url(${trailerThumbnail})` : 'none',
                                                        backgroundSize: 'cover',
                                                        backgroundPosition: 'center',
                                                        border: '4px solid #000',
                                                        boxShadow: '8px 8px 0 rgba(0,0,0,1)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        overflow: 'hidden',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.transform = 'translate(-2px, -2px)';
                                                        e.currentTarget.style.boxShadow = '10px 10px 0 rgba(0,0,0,1)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.transform = 'translate(0, 0)';
                                                        e.currentTarget.style.boxShadow = '8px 8px 0 rgba(0,0,0,1)';
                                                    }}
                                                >
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: 0, left: 0, right: 0, bottom: 0,
                                                        background: 'rgba(0,0,0,0.4)',
                                                        transition: 'background 0.2s'
                                                    }} />

                                                    <div style={{
                                                        position: 'relative',
                                                        zIndex: 2,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                    }}>
                                                        <div style={{
                                                            width: '80px',
                                                            height: '80px',
                                                            borderRadius: '50%',
                                                            background: 'rgba(255, 255, 255, 0.9)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            border: '4px solid #000',
                                                            backdropFilter: 'blur(4px)',
                                                            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                                                        }}>
                                                            <div style={{
                                                                width: 0,
                                                                height: 0,
                                                                borderTop: '12px solid transparent',
                                                                borderBottom: '12px solid transparent',
                                                                borderLeft: '20px solid #000',
                                                                marginLeft: '6px'
                                                            }} />
                                                        </div>
                                                        <span style={{
                                                            color: '#fff',
                                                            fontFamily: 'var(--font-heading)',
                                                            fontSize: '1.5rem',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '2px',
                                                            textShadow: '3px 3px 0 #000',
                                                            textAlign: 'center',
                                                            padding: '0 1rem'
                                                        }}>
                                                            {t('work_details.trailer.watch')}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Full Screen Trailer Modal (Portal) */}
                                                {isTrailerOpen && createPortal(
                                                    <div
                                                        style={{
                                                            position: 'fixed',
                                                            top: 0, left: 0, right: 0, bottom: 0,
                                                            background: 'rgba(0,0,0,0.95)',
                                                            zIndex: 99999,
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                        onClick={() => setIsTrailerOpen(false)}
                                                    >
                                                        <div
                                                            style={{
                                                                width: '80%',
                                                                maxWidth: '1000px',
                                                                aspectRatio: '16/9',
                                                                background: '#000',
                                                                border: '2px solid #333',
                                                                boxShadow: '0 0 50px rgba(0,0,0,0.8)',
                                                                position: 'relative'
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <iframe
                                                                src={`${work.trailer.embed_url}?autoplay=1`}
                                                                title="Full Screen Trailer"
                                                                frameBorder="0"
                                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                allowFullScreen
                                                                style={{ width: '100%', height: '100%' }}
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setIsTrailerOpen(false);
                                                            }}
                                                            style={{
                                                                position: 'absolute',
                                                                top: '30px',
                                                                right: '30px',
                                                                zIndex: 100000,
                                                                background: '#000',
                                                                border: '2px solid #fff',
                                                                color: '#fff',
                                                                cursor: 'pointer',
                                                                padding: '0.5rem 1rem',
                                                                borderRadius: '50px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.5rem',
                                                                boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = '#333';
                                                                e.currentTarget.style.transform = 'scale(1.05)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = '#000';
                                                                e.currentTarget.style.transform = 'scale(1)';
                                                            }}
                                                        >
                                                            <span style={{ fontWeight: 700, fontSize: '0.9rem', letterSpacing: '1px' }}>{t('work_details.trailer.close')}</span>
                                                            <X size={24} strokeWidth={2.5} />
                                                        </button>
                                                    </div>,
                                                    document.body
                                                )}
                                            </div>
                                        )
                                    })()}

                                    {/* CASTING SECTION */}
                                    {characters.length > 0 && (
                                        <div style={{ marginTop: '1rem' }}>
                                            <h3 className={styles.synopsisTitle} style={{ marginBottom: '1rem' }}>{t('work_details.casting.title')}</h3>

                                            <div style={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: '1rem',
                                                justifyContent: 'center'
                                            }}>
                                                {characters
                                                    .filter(c => c.character.images?.jpg?.image_url)
                                                    .slice(0, isCastingExpanded ? undefined : 12)
                                                    .map((c) => {
                                                        const jpVa = c.voice_actors?.find((va) => va.language === 'Japanese');
                                                        return (
                                                            <div key={c.character.mal_id} className={styles.castingItem} style={{ flex: '1 1 100px', maxWidth: '120px' }}>
                                                                {/* Character Image - Clickable */}
                                                                <div
                                                                    onClick={() => navigate(`/character/${c.character.mal_id}`)}
                                                                    style={{
                                                                        width: '100px',
                                                                        height: '100px',
                                                                        borderRadius: '50%',
                                                                        border: '3px solid var(--color-border-heavy)',
                                                                        overflow: 'hidden',
                                                                        marginBottom: '0.5rem',
                                                                        background: 'var(--color-surface-hover)',
                                                                        cursor: 'pointer',
                                                                        transition: 'transform 0.2s',
                                                                        margin: '0 auto'
                                                                    }}
                                                                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                                >
                                                                    <OptimizedImage
                                                                        src={c.character.images.jpg.image_url}
                                                                        alt={c.character.name}
                                                                        objectFit="cover"
                                                                    />
                                                                </div>
                                                                <div
                                                                    onClick={() => navigate(`/character/${c.character.mal_id}`)}
                                                                    style={{ fontSize: '0.8rem', fontWeight: 800, textAlign: 'center', lineHeight: 1.2, marginBottom: '4px', cursor: 'pointer' }}
                                                                >
                                                                    {c.character.name}
                                                                </div>
                                                                <div style={{ fontSize: '0.7rem', opacity: 0.6, textAlign: 'center', fontWeight: 600, marginBottom: '0.5rem' }}>
                                                                    {c.role}
                                                                </div>

                                                                {/* Seiyuu Info - Clickable */}
                                                                {jpVa && (
                                                                    <div
                                                                        onClick={() => navigate(`/person/${jpVa.person.mal_id}`)}
                                                                        style={{
                                                                            display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 'auto',
                                                                            borderTop: '1px dashed var(--color-border)', paddingTop: '4px', width: '100%', cursor: 'pointer'
                                                                        }}
                                                                        onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                                                                        onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                                                                    >
                                                                        <div style={{
                                                                            width: '40px',
                                                                            height: '40px',
                                                                            borderRadius: '50%',
                                                                            overflow: 'hidden',
                                                                            border: '2px solid var(--color-border-heavy)',
                                                                            marginBottom: '2px'
                                                                        }}>
                                                                            <OptimizedImage
                                                                                src={jpVa.person.images.jpg.image_url}
                                                                                alt={jpVa.person.name}
                                                                                objectFit="cover"
                                                                            />
                                                                        </div>
                                                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-dim)', textAlign: 'center', lineHeight: 1.1 }}>
                                                                            {jpVa.person.name}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                            </div>

                                            {/* Show More / Show Less Button */}
                                            {characters.length > 12 && (
                                                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                                                    <Button
                                                        onClick={() => setIsCastingExpanded(!isCastingExpanded)}
                                                        variant="ghost"
                                                        style={{ border: '1px dashed var(--color-border-heavy)', color: 'var(--color-text)' }}
                                                    >
                                                        {isCastingExpanded ? t('work_details.casting.show_less') : t('work_details.casting.show_more', { count: characters.length - 12 })}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Univers Etendu */}
                                    {relations.length > 0 && (() => {
                                        const MAX_VISIBLE = 5;

                                        return (
                                            <div style={{ marginTop: '2rem' }}>
                                                <h3 className={styles.synopsisTitle} style={{ marginBottom: '1rem', borderTop: '2px solid var(--color-border)', paddingTop: '1rem' }}>{t('work_details.universe.title')}</h3>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                                                    {relations.map((rel, index) => {
                                                        const isExpanded = expandedRelations[index];
                                                        const entries = rel.entry;
                                                        const visibleEntries = isExpanded ? entries : entries.slice(0, MAX_VISIBLE);
                                                        const hasMore = entries.length > MAX_VISIBLE;

                                                        return (
                                                            <div key={index} style={{
                                                                background: 'var(--color-surface)',
                                                                border: '2px solid var(--color-border-heavy)',
                                                                boxShadow: '3px 3px 0 var(--color-shadow-solid)',
                                                                padding: '0.75rem',
                                                                flex: '1 1 250px',
                                                                maxWidth: '400px',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '0.5rem'
                                                            }}>
                                                                <div style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', background: 'var(--color-border-heavy)', color: 'var(--color-text-inverse)', padding: '0.25rem 0.5rem', alignSelf: 'flex-start' }}>
                                                                    {rel.relation}
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                                    {visibleEntries.map((entry) => (
                                                                        <Link to={`/work/${entry.mal_id}`} key={entry.mal_id} style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '0.5rem',
                                                                            textDecoration: 'none',
                                                                            color: 'var(--color-text)',
                                                                            fontWeight: 600,
                                                                            padding: '0.2rem',
                                                                            fontSize: '0.9rem',
                                                                            transition: 'background 0.2s'
                                                                        }}
                                                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                                        >
                                                                            <div style={{ width: '5px', height: '5px', background: 'var(--color-text)', borderRadius: '50%', flexShrink: 0 }} />
                                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name} ({entry.type})</span>
                                                                        </Link>
                                                                    ))}
                                                                    {hasMore && (
                                                                        <button
                                                                            onClick={() => setExpandedRelations(prev => ({ ...prev, [index]: !prev[index] }))}
                                                                            style={{
                                                                                background: 'none',
                                                                                border: '1px dashed var(--color-border-heavy)',
                                                                                padding: '0.25rem 0.5rem',
                                                                                cursor: 'pointer',
                                                                                fontSize: '0.75rem',
                                                                                fontWeight: 700,
                                                                                marginTop: '0.25rem',
                                                                                color: 'var(--color-text)'
                                                                            }}
                                                                        >
                                                                            {isExpanded ? t('work_details.universe.collapse') : t('work_details.universe.expand', { count: entries.length - MAX_VISIBLE })}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}



                                </div>

                                <div style={{ marginBottom: '2rem' }}>
                                    {!libraryWork ? (
                                        <div style={{ padding: '2rem', background: 'var(--color-surface-hover)', textAlign: 'center', border: '2px dashed var(--color-border-heavy)' }}>
                                            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: '1rem' }}>{t('work_details.library.interested_title')}</h3>
                                            <p style={{ marginBottom: '1.5rem' }}>{t('work_details.library.interested_desc')}</p>
                                            <Button
                                                onClick={() => {
                                                    if (user && fetchedWork) {
                                                        const workToAdd: Work = {
                                                            ...fetchedWork,
                                                            type: fetchedWork.type || 'anime', // Fallback or strict assertion
                                                            status: 'plan_to_read', // Default status
                                                        };
                                                        addWork(workToAdd);
                                                        addToast(t('work_details.library.added_toast'), 'success');
                                                    } else {
                                                        navigate('/auth');
                                                    }
                                                }}
                                                variant="primary"
                                                size="lg"
                                                icon={<BookOpen size={20} />}
                                            >
                                                {user ? t('work_details.library.add_to_collection') : t('work_details.library.login_to_add')}
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text)' }}>{t('work_details.progress.title')}</h3>
                                            <div style={{ color: 'var(--color-text)' }}>
                                                {isEditing ? (
                                                    <div className={styles.progressContainer}>
                                                        <input
                                                            type="number"
                                                            value={progress}
                                                            onChange={(e) => setProgress(Number(e.target.value))}
                                                            className={styles.progressInput}
                                                        />
                                                        <span style={{ fontSize: '1.5rem', fontWeight: 900 }}>/ {work.totalChapters || '?'}</span>
                                                        <Button onClick={handleSave} variant="primary" icon={<Check size={20} />}>{t('work_details.progress.ok')}</Button>
                                                    </div>
                                                ) : (
                                                    <div className={styles.progressControls}>
                                                        {/* Decrement buttons */}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleEpisodeSelect(Math.max(0, (work.currentChapter || 0) - 5))}
                                                            style={{ fontWeight: 700, border: '1px solid var(--color-border)' }}
                                                        >-5</Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleEpisodeSelect(Math.max(0, (work.currentChapter || 0) - 3))}
                                                            style={{ fontWeight: 700, border: '1px solid var(--color-border)' }}
                                                        >-3</Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleEpisodeSelect(Math.max(0, (work.currentChapter || 0) - 1))}
                                                            style={{ fontWeight: 700, border: '1px solid var(--color-border)' }}
                                                        >-1</Button>

                                                        {/* Progress display */}
                                                        <span className={styles.progressDisplay}>
                                                            {work.currentChapter} <span style={{ fontSize: '1.25rem', opacity: 0.5 }}>/ {work.totalChapters || '?'}</span>
                                                        </span>

                                                        {/* Increment buttons */}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleEpisodeSelect((work.currentChapter || 0) + 1)}
                                                            style={{ fontWeight: 700, border: '1px solid var(--color-border)' }}
                                                        >+1</Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleEpisodeSelect((work.currentChapter || 0) + 3)}
                                                            style={{ fontWeight: 700, border: '1px solid var(--color-border)' }}
                                                        >+3</Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleEpisodeSelect((work.currentChapter || 0) + 5)}
                                                            style={{ fontWeight: 700, border: '1px solid var(--color-border)' }}
                                                        >+5</Button>
                                                        <Button onClick={() => setIsEditing(true)} variant="manga" size="sm">{t('work_details.progress.edit')}</Button>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {libraryWork && (
                                    <div style={{ marginBottom: '2rem' }}>
                                        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text)' }}>{t('work_details.status.title')}</h3>
                                        <div className={styles.statusButtons}>
                                            {['reading', 'completed', 'plan_to_read', 'dropped'].map((s) => (
                                                <button
                                                    key={s}
                                                    onClick={() => {
                                                        if (s === 'completed' && work.status !== 'completed') {
                                                            setIsCompleteModalOpen(true);
                                                        } else {
                                                            updateStatus(work.id, s as Work['status']);
                                                        }
                                                    }}
                                                    className={`${styles.statusButton} ${work.status === s ? styles.statusButtonActive : ''}`}
                                                >
                                                    {t(`work_details.status.${s}`)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )
                                }

                                <Modal
                                    isOpen={isCompleteModalOpen}
                                    onClose={() => setIsCompleteModalOpen(false)}
                                    title={t('work_details.status.completed')} // Ensure we have a title key or reuse 'completed'
                                >
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ marginBottom: '1.5rem', fontWeight: 500 }}>
                                            {t('work_details.progress.mark_complete_confirm', "Have you finished this work? Your progress will be set to the maximum.")}
                                        </p>
                                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                            <Button
                                                variant="ghost"
                                                onClick={() => setIsCompleteModalOpen(false)}
                                            >
                                                {t('common.cancel')}
                                            </Button>
                                            <Button
                                                variant="primary"
                                                onClick={() => {
                                                    updateStatus(work.id, 'completed');
                                                    if (work.totalChapters && work.totalChapters > 0) {
                                                        handleProgressUpdateWithXP(work.id, work.totalChapters, work.totalChapters);
                                                        updateWorkDetails(work.id, { currentChapter: work.totalChapters }); // Force update store locally just in case
                                                        setProgress(work.totalChapters);
                                                    }
                                                    addToast(t('work_details.progress.saved_toast'), 'success');
                                                    setIsCompleteModalOpen(false);
                                                }}
                                            >
                                                {t('common.confirm')}
                                            </Button>
                                        </div>
                                    </div>
                                </Modal>

                                {/* Rating Section */}
                                {libraryWork && (
                                    <div style={{ marginBottom: '2rem' }}>
                                        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text)' }}>{t('work_details.rating.title')}</h3>
                                        <div className={styles.ratingContainer}>
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                                                <button
                                                    key={star}
                                                    onClick={() => updateWorkDetails(work.id, { rating: star })}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        padding: 0,
                                                        transition: 'transform 0.1s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                >
                                                    <Star
                                                        size={32}
                                                        fill={(work.rating || 0) >= star ? 'var(--color-text)' : 'none'}
                                                        color="var(--color-text)"
                                                        strokeWidth={2}
                                                    />
                                                </button>
                                            ))}
                                            <span style={{ marginLeft: '1rem', fontSize: '1.5rem', fontWeight: 900 }}>{work.rating ? `${work.rating}/10` : '-/10'}</span>
                                        </div>
                                    </div>
                                )}


                                {/* Notes Section */}
                                {libraryWork && (
                                    <div style={{ marginBottom: '2rem' }}>
                                        <h3
                                            onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                                            style={{
                                                fontFamily: 'var(--font-heading)',
                                                fontSize: '1.5rem',
                                                marginBottom: '1rem',
                                                color: 'var(--color-text)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                userSelect: 'none'
                                            }}
                                        >
                                            {t('work_details.notes.title')} {isNotesExpanded ? '▼' : '►'}
                                        </h3>
                                        {isNotesExpanded && (
                                            <textarea
                                                value={work.notes || ''}
                                                onChange={(e) => updateWorkDetails(work.id, { notes: e.target.value })}
                                                placeholder={t('work_details.notes.placeholder')}
                                                className={styles.notesArea}
                                            />
                                        )}
                                    </div>
                                )}

                                {/* Comments Section */}
                                <div style={{
                                    marginBottom: '2rem',
                                    border: '2px solid var(--color-border-heavy)',
                                    padding: '1.5rem',
                                    boxShadow: '8px 8px 0 var(--color-shadow-solid)',
                                    background: 'var(--color-surface)'
                                }}>
                                    <h3
                                        onClick={() => setIsCommentsExpanded(!isCommentsExpanded)}
                                        style={{
                                            fontFamily: 'var(--font-heading)',
                                            fontSize: '1.5rem',
                                            marginBottom: isCommentsExpanded ? '1.5rem' : 0,
                                            color: 'var(--color-text)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <MessageCircle size={24} /> {t('work_details.comments.title')} ({comments.length})
                                        </div>
                                        <span>{isCommentsExpanded ? '▼' : '►'}</span>
                                    </h3>

                                    {isCommentsExpanded && (
                                        <div>

                                            {/* Friends reading indicator */}
                                            {friendsReading.count > 0 && (
                                                <div style={{
                                                    background: 'var(--color-surface-hover)',
                                                    padding: '1rem',
                                                    borderRadius: '8px',
                                                    marginBottom: '1rem',
                                                    border: '1px solid var(--color-border)'
                                                }}>
                                                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' }}>
                                                        👥 <strong>{t('work_details.comments.friends_count', { count: friendsReading.count })}</strong>
                                                    </p>
                                                    <div style={{ display: 'flex', gap: '-8px', marginTop: '0.5rem' }}>
                                                        {friendsReading.friends.slice(0, 5).map(f => (
                                                            <div key={f.uid} style={{
                                                                width: 28,
                                                                height: 28,
                                                                borderRadius: '50%',
                                                                overflow: 'hidden',
                                                                border: '2px solid var(--color-surface)',
                                                                marginLeft: '-8px'
                                                            }}>
                                                                <OptimizedImage
                                                                    src={f.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.displayName}`}
                                                                    alt={f.displayName || ''}
                                                                    objectFit="cover"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* New comment form */}
                                            {user ? (
                                                <div style={{
                                                    marginBottom: '2rem',
                                                    background: 'var(--color-surface)',
                                                    padding: '1.5rem',
                                                    border: '3px solid var(--color-border-heavy)',
                                                    boxShadow: '6px 6px 0 var(--color-shadow-solid)',
                                                    position: 'relative'
                                                }}>
                                                    <textarea
                                                        value={newComment}
                                                        onChange={(e) => setNewComment(e.target.value)}
                                                        placeholder={t('work_details.comments.placeholder')}
                                                        style={{
                                                            width: '100%',
                                                            minHeight: '100px',
                                                            border: '2px solid var(--color-border-heavy)',
                                                            padding: '1rem',
                                                            fontFamily: 'inherit',
                                                            fontSize: '1rem',
                                                            fontWeight: 500,
                                                            resize: 'vertical',
                                                            marginBottom: '1rem',
                                                            outline: 'none',
                                                            background: 'var(--color-surface-hover)',
                                                            color: 'var(--color-text)',
                                                        }}
                                                    />
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isSpoiler}
                                                                onChange={(e) => setIsSpoiler(e.target.checked)}
                                                                style={{ accentColor: '#000', width: 16, height: 16 }}
                                                            />
                                                            <EyeOff size={16} /> {t('work_details.comments.spoiler')}
                                                        </label>
                                                        <Button
                                                            onClick={handleSubmitComment}
                                                            variant="primary"
                                                            size="md"
                                                            icon={<Send size={18} />}
                                                            style={{
                                                                border: '2px solid var(--color-border-heavy)',
                                                                boxShadow: '4px 4px 0 var(--color-shadow-solid)',
                                                                fontWeight: 900
                                                            }}
                                                        >
                                                            {t('work_details.comments.submit')}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p style={{ opacity: 0.6, fontStyle: 'italic', marginBottom: '1rem' }}>{t('work_details.comments.login_to_comment')}</p>
                                            )}

                                            {/* Error State */}
                                            {commentError && (
                                                <div style={{
                                                    background: '#fee2e2',
                                                    border: '2px solid #ef4444',
                                                    padding: '1rem',
                                                    marginBottom: '1rem',
                                                    borderRadius: '4px',
                                                    color: '#b91c1c',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem'
                                                }}>
                                                    <AlertTriangle size={20} />
                                                    <div>
                                                        <strong>{t('work_details.comments.error_loading')}</strong> {commentError}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Comments list */}
                                            {isLoadingComments ? (
                                                <p style={{ textAlign: 'center', opacity: 0.6 }}>{t('work_details.comments.loading')}</p>
                                            ) : comments.length === 0 && !commentError ? (
                                                <p style={{ textAlign: 'center', opacity: 0.6, padding: '2rem' }}>{t('work_details.comments.no_comments')}</p>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                    {comments.map(comment => (
                                                        <RecursiveComment
                                                            key={comment.id}
                                                            comment={comment}
                                                            user={user}
                                                            replyingTo={replyingTo}
                                                            setReplyingTo={setReplyingTo}
                                                            replyText={replyText}
                                                            setReplyText={setReplyText}
                                                            handleReply={handleReply}
                                                            handleLike={handleLikeComment}
                                                            revealedSpoilers={revealedSpoilers}
                                                            setRevealedSpoilers={setRevealedSpoilers}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Danger Zone */}
                                {libraryWork && (
                                    <div style={{ borderTop: '2px dashed var(--color-border-heavy)', paddingTop: '2rem' }}>
                                        <Button
                                            onClick={() => setIsDeleteModalOpen(true)}
                                            style={{
                                                background: '#ff0000',
                                                color: '#fff',
                                                width: '100%',
                                                fontWeight: 900,
                                                textTransform: 'uppercase'
                                            }}
                                            icon={<Trash2 size={20} />}
                                        >
                                            {t('work_details.danger.delete_button')}
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === 'stats' && (
                            <div className="animate-fade-in">
                                {(!statistics && staff.length === 0) ? (
                                    <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.6, fontStyle: 'italic', border: '2px dashed var(--color-border-heavy)' }}>
                                        {t('work_details.stats.no_data')}
                                    </div>
                                ) : (
                                    <>



                                        {/* STAFF SECTION (Moved here) */}
                                        {staff.length > 0 && (
                                            <div style={{ marginBottom: '2rem' }}>
                                                <h3 className={styles.sectionTitle}>{t('work_details.stats.staff_title')}</h3>
                                                <div style={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: '1.5rem',
                                                    justifyContent: 'center'
                                                }}>
                                                    {staff
                                                        .filter(s => s.positions.some(p => p.includes('Director') || p === 'Character Design' || p === 'Music' || p === 'Series Composition'))
                                                        .filter((s, index, self) => index === self.findIndex((t) => t.person.mal_id === s.person.mal_id))
                                                        .slice(0, isStaffExpanded ? undefined : 6)
                                                        .map((s) => (
                                                            <div key={s.person.mal_id} style={{ minWidth: '120px', maxWidth: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                                                <div style={{ width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--color-border-heavy)', marginBottom: '0.5rem', boxShadow: '3px 3px 0 0px var(--color-shadow-solid)' }}>
                                                                    {s.person.images.jpg.image_url ? (
                                                                        <OptimizedImage
                                                                            src={s.person.images.jpg.image_url}
                                                                            alt={s.person.name}
                                                                            objectFit="cover"
                                                                        />
                                                                    ) : (
                                                                        <div style={{ width: '100%', height: '100%', background: 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 900 }}>?</div>
                                                                    )}
                                                                </div>
                                                                <span style={{ fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.2, width: '100%', whiteSpace: 'normal' }}>{s.person.name}</span>
                                                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', marginTop: '0.2rem' }}>
                                                                    {s.positions.filter(p => p.includes('Director') || p === 'Character Design' || p === 'Music' || p === 'Series Composition').join(', ')}
                                                                </span>
                                                            </div>
                                                        ))}
                                                </div>

                                                {/* Show More Staff Button */}
                                                {staff.filter(s => s.positions.some(p => p.includes('Director') || p === 'Character Design' || p === 'Music' || p === 'Series Composition')).length > 6 && (
                                                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                                                        <Button
                                                            onClick={() => setIsStaffExpanded(!isStaffExpanded)}
                                                            variant="ghost"
                                                            style={{ border: '1px dashed var(--color-border-heavy)' }}
                                                        >
                                                            {isStaffExpanded ? t('work_details.stats.show_less') : t('work_details.stats.show_more')}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* STATISTICS SECTION (Moved here) */}
                                        {statistics && (
                                            <div style={{ marginTop: '2rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '2px solid var(--color-border-heavy)', paddingBottom: '0.5rem' }}>
                                                    <BarChart size={24} strokeWidth={2.5} />
                                                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', margin: 0 }}>{t('work_details.stats.title')}</h3>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                                    {/* Status Distribution */}
                                                    <div style={{ border: '2px solid var(--color-border-heavy)', padding: '1rem', background: 'var(--color-surface)', boxShadow: '4px 4px 0 var(--color-shadow)' }}>
                                                        <h4 style={{ fontFamily: 'var(--font-heading)', marginBottom: '1rem' }}>{t('work_details.stats.library_distribution')}</h4>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                            {[
                                                                { label: t('work_details.status.watching'), value: statistics.watching, color: '#2ecc71' },
                                                                { label: t('work_details.status.completed'), value: statistics.completed, color: '#3498db' },
                                                                { label: t('work_details.status.on_hold'), value: statistics.on_hold, color: '#f1c40f' },
                                                                { label: t('work_details.status.dropped'), value: statistics.dropped, color: '#e74c3c' },
                                                                { label: t('work_details.status.plan_to_watch'), value: statistics.plan_to_watch, color: '#95a5a6' }
                                                            ].map(stat => (
                                                                <div key={stat.label}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '2px' }}>
                                                                        <span>{stat.label}</span>
                                                                        <span>{(stat.value || 0).toLocaleString()}</span>
                                                                    </div>
                                                                    <div style={{ height: '8px', background: 'var(--color-surface-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                                                                        <div style={{
                                                                            height: '100%',
                                                                            width: `${((stat.value || 0) / (statistics.total || 1)) * 100}%`,
                                                                            background: stat.color
                                                                        }} />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Score Distribution */}
                                                    {!hideScores && statistics.scores && statistics.scores.length > 0 && (
                                                        <div style={{ border: '2px solid var(--color-border-heavy)', padding: '1rem', background: 'var(--color-surface)', boxShadow: '4px 4px 0 var(--color-shadow)' }}>
                                                            <h4 style={{ fontFamily: 'var(--font-heading)', marginBottom: '1rem' }}>{t('work_details.stats.score_distribution')}</h4>
                                                            <div style={{ display: 'flex', alignItems: 'flex-end', height: '150px', gap: '2px' }}>
                                                                {statistics.scores.sort((a, b) => a.score - b.score).map((score) => (
                                                                    <div key={score.score} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                                        <div style={{
                                                                            width: '100%',
                                                                            background: 'var(--color-text)',
                                                                            height: `${score.percentage}%`,
                                                                            minHeight: '2px',
                                                                            position: 'relative',
                                                                            transition: 'height 0.3s ease'
                                                                        }} title={`${score.percentage}%`}></div>
                                                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, marginTop: '4px' }}>{score.score}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}



                        {activeTab === 'reviews' && (
                            <div className="animate-fade-in">
                                <h2 className={styles.sectionTitle} style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Star size={24} fill="currentColor" /> {t('work_details.reviews.title')}
                                </h2>

                                {reviews.length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', alignContent: 'start' }}>
                                        {reviews.map((review) => (
                                            <div key={review.mal_id} style={{
                                                background: 'var(--color-surface)',
                                                border: '3px solid var(--color-border-heavy)',
                                                boxShadow: '6px 6px 0 var(--color-shadow-solid)',
                                                padding: '1.5rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '1rem'
                                            }}>
                                                {/* Header: User & Score */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--color-border)', paddingBottom: '1rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-border-heavy)' }}>
                                                            <OptimizedImage
                                                                src={review.user.images.jpg.image_url}
                                                                alt={review.user.username}
                                                                objectFit="cover"
                                                            />
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{review.user.username}</div>
                                                            <div style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 600 }}>{new Date(review.date).toLocaleDateString()}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{
                                                        background: 'var(--color-border-heavy)',
                                                        color: 'var(--color-text-inverse)',
                                                        padding: '0.25rem 0.5rem',
                                                        fontWeight: 900,
                                                        fontSize: '1.1rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem'
                                                    }}>
                                                        {!hideScores && (
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                                                                <Star size={14} fill="currentColor" /> {review.score}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Tags */}
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    {review.tags.map(tag => (
                                                        <span key={tag} style={{
                                                            fontSize: '0.7rem',
                                                            fontWeight: 700,
                                                            border: '1px solid var(--color-border-heavy)',
                                                            padding: '2px 6px',
                                                            textTransform: 'uppercase',
                                                            background: tag.toLowerCase().includes('recommended') ? '#dcfce7' : tag.toLowerCase().includes('mixed') ? '#fef9c3' : 'var(--color-surface)'
                                                        }}>
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>

                                                {/* Review Content */}
                                                <div style={{ fontSize: '0.9rem', lineHeight: 1.6, maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem' }} className="scrollbar-thin">
                                                    {review.review}
                                                </div>

                                                {/* Footer: Read More */}
                                                <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                                                    <a
                                                        href={review.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.25rem',
                                                            fontWeight: 800,
                                                            color: 'var(--color-text)',
                                                            textDecoration: 'none',
                                                            fontSize: '0.85rem'
                                                        }}
                                                    >
                                                        {t('work_details.reviews.read_full')} <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ padding: '3rem', textAlign: 'center', border: '2px dashed var(--color-border-heavy)', opacity: 0.7 }}>
                                        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem' }}>{t('work_details.reviews.none_found')}</h3>
                                        <p>{t('work_details.reviews.be_first')}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'gallery' && (
                            <div className="animate-fade-in">
                                <h2 className={styles.sectionTitle} style={{ marginBottom: '1.5rem' }}>{t('work_details.gallery.title')}</h2>
                                {pictures.length > 0 ? (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                                        gap: '0.5rem'
                                    }}>
                                        {pictures.map((pic, idx) => (
                                            <div key={idx} style={{
                                                border: '2px solid var(--color-border-heavy)',
                                                boxShadow: '4px 4px 0 var(--color-shadow-solid)',
                                                aspectRatio: '1/1.4',
                                                overflow: 'hidden',
                                                cursor: 'pointer',
                                                background: 'var(--color-surface)',
                                                transition: 'transform 0.1s'
                                            }}
                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translate(-2px, -2px)'}
                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translate(0, 0)'}
                                                onClick={() => setSelectedImageIndex(idx)}
                                            >
                                                <OptimizedImage
                                                    src={pic.jpg.large_image_url}
                                                    alt={`Gallery ${idx + 1}`}
                                                    objectFit="cover"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6, fontStyle: 'italic' }}>
                                        {t('work_details.gallery.no_images')}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'themes' && (
                            <div className="animate-fade-in">
                                {(themes && (themes.openings.length > 0 || themes.endings.length > 0)) ? (
                                    <>
                                        <h2 className={styles.sectionTitle} style={{ marginBottom: '1.5rem' }}>{t('work_details.themes.title')}</h2>

                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                                            gap: '2rem'
                                        }}>
                                            {/* Openings */}
                                            <div style={{
                                                background: 'var(--color-surface)',
                                                border: '2px solid var(--color-border-heavy)',
                                                boxShadow: '4px 4px 0 var(--color-shadow-solid)',
                                                padding: '1.5rem'
                                            }}>
                                                <h3 style={{
                                                    fontFamily: 'var(--font-heading)',
                                                    fontSize: '1.25rem',
                                                    marginBottom: '1rem',
                                                    borderBottom: '4px solid var(--color-border-heavy)',
                                                    paddingBottom: '0.5rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem'
                                                }}>
                                                    <Music size={24} /> {t('work_details.themes.openings')} ({themes.openings.length})
                                                </h3>
                                                <div style={{ maxHeight: '500px', overflowY: 'auto' }} className="scrollbar-hide">
                                                    {themes.openings.length > 0 ? (
                                                        <ul style={{ listStyle: 'none', padding: 0 }}>
                                                            {themes.openings.map((theme, idx) => (
                                                                <li key={idx} style={{ marginBottom: '0.75rem', borderBottom: '1px dashed var(--color-border)', paddingBottom: '0.75rem' }}>
                                                                    <a
                                                                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(theme + ' ' + work.title)}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        style={{
                                                                            textDecoration: 'none',
                                                                            color: 'var(--color-text)',
                                                                            display: 'flex',
                                                                            alignItems: 'flex-start',
                                                                            gap: '0.75rem'
                                                                        }}
                                                                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                                                                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                                                    >
                                                                        <span style={{
                                                                            background: 'var(--color-border-heavy)',
                                                                            color: 'var(--color-text-inverse)',
                                                                            fontFamily: 'var(--font-heading)',
                                                                            padding: '2px 6px',
                                                                            fontSize: '0.8rem',
                                                                            height: 'fit-content'
                                                                        }}>#{idx + 1}</span>
                                                                        <span style={{ fontWeight: 600, lineHeight: 1.4 }}>{theme} ↗</span>
                                                                    </a>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : <p style={{ opacity: 0.5, fontStyle: 'italic' }}>{t('work_details.themes.no_openings')}</p>}
                                                </div>
                                            </div>

                                            {/* Endings */}
                                            <div style={{
                                                background: 'var(--color-surface)',
                                                border: '2px solid var(--color-border-heavy)',
                                                boxShadow: '4px 4px 0 var(--color-shadow-solid)',
                                                padding: '1.5rem'
                                            }}>
                                                <h3 style={{
                                                    fontFamily: 'var(--font-heading)',
                                                    fontSize: '1.25rem',
                                                    marginBottom: '1rem',
                                                    borderBottom: '4px solid var(--color-border-heavy)',
                                                    paddingBottom: '0.5rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem'
                                                }}>
                                                    <Disc size={24} /> {t('work_details.themes.endings')} ({themes.endings.length})
                                                </h3>
                                                <div style={{ maxHeight: '500px', overflowY: 'auto' }} className="scrollbar-hide">
                                                    {themes.endings.length > 0 ? (
                                                        <ul style={{ listStyle: 'none', padding: 0 }}>
                                                            {themes.endings.map((theme, idx) => (
                                                                <li key={idx} style={{ marginBottom: '0.75rem', borderBottom: '1px dashed var(--color-border)', paddingBottom: '0.75rem' }}>
                                                                    <a
                                                                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(theme + ' ' + work.title)}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        style={{
                                                                            textDecoration: 'none',
                                                                            color: 'var(--color-text)',
                                                                            display: 'flex',
                                                                            alignItems: 'flex-start',
                                                                            gap: '0.75rem'
                                                                        }}
                                                                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                                                                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                                                    >
                                                                        <span style={{
                                                                            background: 'var(--color-border-heavy)',
                                                                            color: 'var(--color-text-inverse)',
                                                                            fontFamily: 'var(--font-heading)',
                                                                            padding: '2px 6px',
                                                                            fontSize: '0.8rem',
                                                                            height: 'fit-content'
                                                                        }}>#{idx + 1}</span>
                                                                        <span style={{ fontWeight: 600, lineHeight: 1.4 }}>{theme} ↗</span>
                                                                    </a>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : <p style={{ opacity: 0.5, fontStyle: 'italic' }}>{t('work_details.themes.no_endings')}</p>}
                                                </div>
                                            </div>
                                        </div>

                                    </>
                                ) : (
                                    <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.6, fontStyle: 'italic', border: '2px dashed var(--color-border-heavy)' }}>
                                        {t('work_details.themes.no_music')}
                                    </div>
                                )}


                            </div>
                        )}
                    </div>
                </div>

                {/* RECOMMENDATIONS SECTION (Outside infoSection for full width or bottom) */}
                {
                    recommendations.length > 0 && (
                        <div className="manga-panel" style={{ marginTop: '3rem', padding: '2rem' }}>
                            <h2 style={{
                                fontFamily: 'var(--font-heading)',
                                fontSize: '2rem',
                                marginBottom: '1.5rem',
                                textTransform: 'uppercase',
                                textAlign: 'center'
                            }}>
                                {t('work_details.recommendations.title')}
                            </h2>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                                gap: '1.5rem'
                            }}>
                                {recommendations.map((rec) => (
                                    <a
                                        key={rec.entry.mal_id}
                                        href={`/work/${rec.entry.mal_id}?type=${work.type}`}
                                        style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                                    >
                                        <div style={{
                                            position: 'relative',
                                            marginBottom: '0.75rem',
                                            border: '3px solid var(--color-border-heavy)',
                                            boxShadow: '6px 6px 0 var(--color-shadow-solid)',
                                            transition: 'transform 0.2s',
                                            background: 'var(--color-border-heavy)'
                                        }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translate(-4px, -4px)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translate(0, 0)'}
                                        >
                                            <OptimizedImage
                                                src={rec.entry.images.jpg.large_image_url}
                                                alt={rec.entry.title}
                                                objectFit="cover"
                                                style={{ width: '100%', aspectRatio: '2/3', display: 'block' }}
                                            />
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                background: 'var(--color-border-heavy)',
                                                color: 'var(--color-text-inverse)',
                                                padding: '4px 8px',
                                                fontSize: '0.7rem',
                                                fontWeight: 800,
                                                textAlign: 'center'
                                            }}>
                                                {rec.votes} {t('work_details.recommendations.votes')}
                                            </div>
                                        </div>
                                        <h4 style={{
                                            fontSize: '0.9rem',
                                            fontWeight: 800,
                                            lineHeight: 1.3,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            textTransform: 'uppercase'
                                        }}>
                                            {rec.entry.title}
                                        </h4>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )
                }

                {/* Delete Confirmation Modal */}
                <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title={t('work_details.danger.modal_title')}>
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                            <div style={{ background: '#fee2e2', padding: '1rem', borderRadius: '50%', color: '#dc2626' }}>
                                <AlertTriangle size={32} />
                            </div>
                        </div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--color-text)' }}>
                            {t('work_details.danger.confirm_title', { title: work.title })}
                        </h3>
                        <p style={{ marginBottom: '2rem', opacity: 0.7 }}>
                            {t('work_details.danger.confirm_desc')}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
                                {t('work_details.danger.cancel')}
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleDelete}
                                style={{ background: '#dc2626', borderColor: '#b91c1c' }}
                            >
                                {t('work_details.danger.confirm_delete')}
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* GALLERY LIGHTBOX */}
                {
                    selectedImageIndex !== null && pictures.length > 0 && (
                        <div
                            style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                zIndex: 1000,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '2rem'
                            }}
                            onClick={() => setSelectedImageIndex(null)}
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedImageIndex(null);
                                }}
                                style={{
                                    position: 'absolute',
                                    top: '20px',
                                    right: '20px',
                                    background: 'none',
                                    border: 'none',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    zIndex: 1001
                                }}
                            >
                                <X size={40} />
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedImageIndex((prev) => (prev === 0 || prev === null ? pictures.length - 1 : prev - 1));
                                }}
                                style={{
                                    position: 'absolute',
                                    left: '20px',
                                    background: '#fff',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '50px',
                                    height: '50px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    zIndex: 1001,
                                    boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                                }}
                            >
                                <ArrowLeft size={30} color="#000" />
                            </button>

                            <OptimizedImage
                                src={pictures[selectedImageIndex].jpg.large_image_url}
                                alt="Lightbox"
                                objectFit="contain"
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    boxShadow: '0 0 20px rgba(0,0,0,0.5)'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            />

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedImageIndex((prev) => (prev === pictures.length - 1 || prev === null ? 0 : prev + 1));
                                }}
                                style={{
                                    position: 'absolute',
                                    right: '20px',
                                    background: '#fff',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '50px',
                                    height: '50px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    zIndex: 1001,
                                    boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                                }}
                            >
                                <ArrowLeft size={30} color="#000" style={{ transform: 'rotate(180deg)' }} />
                            </button>

                            <div style={{
                                position: 'absolute',
                                bottom: '20px',
                                color: '#fff',
                                fontWeight: 900,
                                fontSize: '1.2rem'
                            }}>
                                {selectedImageIndex + 1} / {pictures.length}
                            </div>
                        </div>
                    )
                }
            </div >
            {/* Scroll To Top Button */}
            <button
                onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    document.body.scrollTo({ top: 0, behavior: 'smooth' });
                    document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    border: 'none',
                    cursor: 'pointer',
                    zIndex: 100,
                    opacity: showScrollTop ? 1 : 0,
                    transform: showScrollTop ? 'scale(1)' : 'scale(0.8)',
                    pointerEvents: showScrollTop ? 'auto' : 'none',
                    transition: 'all 0.3s ease'
                }}
                title={t('common.back_to_top') || "Remonter en haut"}
            >
                <ArrowUp size={24} />
            </button>
        </Layout >
    );
}


