import { logger } from '@/utils/logger';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '@/components/routing/LocalizedLink';
import { Layout } from '@/components/layout/Layout';

import { useLibraryStore, type Work } from '@/store/libraryStore';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Trash2, ArrowUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import { getAnimeEpisodes, getAnimeEpisodeDetails } from '@/services/animeApi';
import { getFriendsReadingWork, type UserProfile } from '@/firebase/firestore';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';



import {
    getWorkCharacters, getWorkRecommendations, getWorkPictures, getWorkStatistics, type JikanCharacter, type JikanRelation, type JikanRecommendation, type JikanPicture, type JikanTheme, type JikanStatistics, type JikanStreaming,
    getAnimeStaff, type JikanStaff, getWorkReviews, type JikanReview, getWorkFull, ApiError
} from '../services/animeApi';
import { useTranslationData } from '@/services/translationService';
import { handleProgressUpdateWithXP } from '@/utils/progressUtils';
import { useGamificationStore } from '@/store/gamificationStore';
import { SEO } from '@/components/layout/SEO';
import { getDisplayTitle } from '@/utils/titleUtils';
import styles from './WorkDetails.module.css';


import { TrailerSection } from '@/components/work-details/TrailerSection';
import { CastingSection } from '@/components/work-details/CastingSection';
import { UniverseSection } from '@/components/work-details/UniverseSection';
import { FriendsActivitySection } from '@/components/work-details/FriendsActivitySection';
import { CommentsSection } from '@/components/work-details/CommentsSection';
import { StatsSection } from '@/components/work-details/StatsSection';
import { LibraryProgressSection } from '@/components/work-details/LibraryProgressSection';
import { RatingAndNotesSection } from '@/components/work-details/RatingAndNotesSection';
import { ReviewsSection } from '@/components/work-details/ReviewsSection';
import { GallerySection } from '@/components/work-details/GallerySection';
import { ThemesSection } from '@/components/work-details/ThemesSection';
import { RecommendationsSection } from '@/components/work-details/RecommendationsSection';
import { WorkMainHeader } from '@/components/work-details/WorkMainHeader';
import { SynopsisSection } from '@/components/work-details/SynopsisSection';
import { WorkInfoGrid } from '@/components/work-details/WorkInfoGrid';
import { DeleteWorkModal } from '@/components/work-details/DeleteWorkModal';
import { WorkCoverSection } from '@/components/work-details/WorkCoverSection';
import { WorkTabs } from '@/components/work-details/WorkTabs';
import { EpisodesSection } from '@/components/work-details/EpisodesSection';
import { type ContentItem } from '@/components/library/ContentList';
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


export default function WorkDetails() {
    const { id } = useParams();
    const navigate = useLocalizedNavigate();
    const { t, i18n } = useTranslation();
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
    
    // Automated Translation Hook
    const { translatedText: aiSynopsis, loading: loadingSynopsis } = useTranslationData(
        work?.synopsis,
        work?.id,
        'work',
        'synopsis',
        i18n.language
    );

    const [isNotesExpanded, setIsNotesExpanded] = useState(false);

    // Tab & Episodes State
    const [activeTab, setActiveTab] = useState<'info' | 'episodes' | 'gallery' | 'themes' | 'stats' | 'reviews'>('info');
    const [episodes, setEpisodes] = useState<ContentItem[]>([]);
    const [episodesPage, setEpisodesPage] = useState(1);
    const [hasMoreEpisodes, setHasMoreEpisodes] = useState(false);
    const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);



    // Friends reading this
    const [friendsReading, setFriendsReading] = useState<{ count: number; friends: { profile: UserProfile; work: Work }[] }>({ count: 0, friends: [] });

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
                const normalized = (typeParam as string).toLowerCase();
                if (['manga', 'novel', 'manhwa', 'manhua', 'doujinshi', 'oneshot', 'oel'].includes(normalized)) {
                    typeToFetch = 'manga';
                }
            }

            const loadWork = async (type: 'anime' | 'manga', isRetry = false) => {
                try {
                    const res = await getWorkFull(Number(id), type);
                    const workTypeNormalized = res.type ? res.type.toLowerCase() : type;
                    const internalType = (workTypeNormalized === 'manga' || workTypeNormalized === 'manhwa' || workTypeNormalized === 'manhua' || workTypeNormalized === 'novel') ? 'manga' : 'anime';
     
                    // Fix: Jikan API sometimes returns null for youtube_id even if embed_url is valid.
                    // Extract it manually to fix thumbnails and external links.
                    const trailer = res.trailer ? { ...res.trailer } : undefined;
                    if (trailer && !trailer.youtube_id && trailer.embed_url) {
                        const match = trailer.embed_url.match(/\/embed\/([a-zA-Z0-9_-]+)/);
                        if (match) {
                            trailer.youtube_id = match[1];
                        }
                    }

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
                        trailer: trailer,
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
                } catch (err) {
                    if (!isRetry && err instanceof ApiError && err.status === 404) {
                        const nextType = type === 'anime' ? 'manga' : 'anime';
                        loadWork(nextType, true);
                    } else {
                        logger.error("Failed to fetch work details", err);
                        if (err instanceof ApiError) {
                            setFetchError({ status: err.status, message: err.message });
                        } else {
                            setFetchError({ status: 500, message: "Internal Error" });
                        }
                        setIsFetchingDetails(false);
                    }
                }
            };

            loadWork(typeToFetch);
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

    // Load friends reading when work changes
    useEffect(() => {
        if (work?.id) {
            // Load friends reading this work
            if (user) {
                getFriendsReadingWork(user.uid, Number(work.id))
                    .then(data => setFriendsReading(data))
                    .catch(err => logger.error("[WorkDetails] Error fetching friends reading:", err));
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

    if (fetchError?.status === 404 && !libraryWork) {
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
                    <WorkCoverSection work={work} titleLanguage={titleLanguage} />

                    {/* Info */}
                    <div className={styles.infoSection}>
                        <WorkTabs 
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            workType={work.type}
                        />

                        {activeTab === 'episodes' && (
                            <EpisodesSection 
                                work={work}
                                episodes={episodes}
                                handleEpisodeSelect={handleEpisodeSelect}
                                handleExpandEpisode={handleExpandEpisode}
                                isLoadingEpisodes={isLoadingEpisodes}
                                episodesPage={episodesPage}
                                hasMoreEpisodes={hasMoreEpisodes}
                                streaming={streaming}
                                setEpisodesPage={setEpisodesPage}
                                libraryWork={libraryWork}
                                totalEpisodesPage={totalEpisodesPage}
                                updateWorkDetails={updateWorkDetails}
                            />
                        )}

                        {activeTab === 'info' && (
                            <>
                                <WorkMainHeader 
                                    work={work}
                                    titleLanguage={titleLanguage}
                                    hideScores={hideScores}
                                    streaming={streaming}
                                    updateWorkDetails={updateWorkDetails}
                                    handleEpisodeSelect={handleEpisodeSelect}
                                />

                                <SynopsisSection 
                                    synopsis={work.synopsis}
                                    aiSynopsis={aiSynopsis}
                                    loadingSynopsis={loadingSynopsis}
                                    spoilerMode={spoilerMode}
                                />

                                {/* DETAILED INFO & TRAILER SECTION */}
                                <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <WorkInfoGrid work={work} />

                                    {/* Trailer - Theater Mode */}
                                    {work.trailer && work.trailer.embed_url && (
                                        <TrailerSection
                                            trailer={work.trailer as JikanTrailer}
                                            isTrailerOpen={isTrailerOpen}
                                            setIsTrailerOpen={setIsTrailerOpen}
                                        />
                                    )}

                                    {/* CASTING SECTION */}
                                    <CastingSection
                                        characters={characters}
                                        isCastingExpanded={isCastingExpanded}
                                        setIsCastingExpanded={setIsCastingExpanded}
                                    />

                                    {/* Univers Etendu */}
                                    <UniverseSection
                                        relations={relations}
                                        expandedRelations={expandedRelations}
                                        setExpandedRelations={setExpandedRelations}
                                    />



                                </div>

                                <LibraryProgressSection
                                    user={user}
                                    libraryWork={libraryWork}
                                    fetchedWork={fetchedWork as Work | null}
                                    work={work as Work}
                                    isEditing={isEditing}
                                    progress={progress}
                                    setProgress={setProgress}
                                    setIsEditing={setIsEditing}
                                    handleSave={handleSave}
                                    handleEpisodeSelect={handleEpisodeSelect}
                                    addWork={addWork}
                                    updateStatus={updateStatus}
                                    updateWorkDetails={updateWorkDetails}
                                    handleProgressUpdateWithXP={handleProgressUpdateWithXP}
                                    addToast={addToast}
                                />

                                <RatingAndNotesSection
                                    libraryWork={libraryWork}
                                    work={work as Work}
                                    isNotesExpanded={isNotesExpanded}
                                    setIsNotesExpanded={setIsNotesExpanded}
                                    updateWorkDetails={updateWorkDetails}
                                />

                                {/* Friends Activity Section */}
                                <FriendsActivitySection friendsReading={friendsReading} />

                                {/* Comments Section */}
                                <CommentsSection workId={Number(work.id)} />

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



                                        <StatsSection
                                            statistics={statistics}
                                            staff={staff}
                                            hideScores={hideScores}
                                            isStaffExpanded={isStaffExpanded}
                                            setIsStaffExpanded={setIsStaffExpanded}
                                        />
                                    </>
                                )}
                            </div>
                        )}



                        {activeTab === 'reviews' && (
                            <ReviewsSection reviews={reviews} hideScores={hideScores} />
                        )}

                        {activeTab === 'gallery' && (
                            <GallerySection pictures={pictures} />
                        )}

                        {activeTab === 'themes' && (
                            <ThemesSection themes={themes} workTitle={work.title} />
                        )}
                    </div>
                </div>

                {/* RECOMMENDATIONS SECTION (Outside infoSection for full width or bottom) */}
                <RecommendationsSection recommendations={recommendations} workType={work.type} />

                {/* Delete Confirmation Modal */}
                <DeleteWorkModal 
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={handleDelete}
                    workTitle={work.title}
                />


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


