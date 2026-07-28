/**
 * Friend Recommendations component (social)
 */
import { logger } from '@/utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { Users } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getFriends, getUserLibrary } from '@/firebase/firestore';
import { type Work } from '@/store/libraryStore';
import { useNavigate } from 'react-router-dom';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

interface RecommendedWork {
    id: number;
    title: string;
    image: string;
    type: 'anime' | 'manga';
    friendsWatching: { name: string; photo: string }[];
}

// Cache de session : évite de rejouer le waterfall Firestore (amis + bibliothèques) à chaque montage
let recsSessionCache: { uid: string; ts: number; data: RecommendedWork[] } | null = null;
const RECS_CACHE_TTL = 5 * 60 * 1000;

const getFreshRecsCache = (uid: string | undefined): RecommendedWork[] | null => {
    if (!uid || !recsSessionCache) return null;
    if (recsSessionCache.uid !== uid || Date.now() - recsSessionCache.ts > RECS_CACHE_TTL) return null;
    return recsSessionCache.data;
};

export function FriendRecommendations() {
    const user = useAuthStore(state => state.user);
    const navigate = useNavigate();

    const [recommendations, setRecommendations] = useState<RecommendedWork[]>(() => getFreshRecsCache(user?.uid) ?? []);
    const [isLoading, setIsLoading] = useState(() => getFreshRecsCache(user?.uid) === null);

    const loadRecommendations = useCallback(async () => {
        if (!user) return;
        const cached = getFreshRecsCache(user.uid);
        if (cached) {
            setRecommendations(cached);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);

        try {
            // Get user's friends
            const friends = await getFriends(user.uid);
            const acceptedFriends = friends.filter(f => f.status === 'accepted');

            if (acceptedFriends.length === 0) {
                recsSessionCache = { uid: user.uid, ts: Date.now(), data: [] };
                setRecommendations([]);
                setIsLoading(false);
                return;
            }

            // Get user's own library to exclude works they already have
            const userLibrary = await getUserLibrary(user.uid);
            const userWorkIds = new Set(userLibrary.map(w => w.id));

            // Fetch all friend libraries in parallel
            const workCounts: Map<number, { work: Work; friends: { name: string; photo: string }[] }> = new Map();
            const limitedFriends = acceptedFriends.slice(0, 10);
            const friendLibraries = await Promise.all(
                limitedFriends.map(f => getUserLibrary(f.uid))
            );

            limitedFriends.forEach((friend, i) => {
                for (const work of friendLibraries[i]) {
                    const workId = Number(work.id);
                    if (userWorkIds.has(workId)) continue;
                    if (work.status !== 'reading') continue;

                    if (workCounts.has(workId)) {
                        workCounts.get(workId)!.friends.push({
                            name: friend.displayName,
                            photo: friend.photoURL || ''
                        });
                    } else {
                        workCounts.set(workId, {
                            work,
                            friends: [{ name: friend.displayName, photo: friend.photoURL || '' }]
                        });
                    }
                }
            });

            // Sort by number of friends watching and take top 6
            const sortedWorks = Array.from(workCounts.entries())
                .sort((a, b) => b[1].friends.length - a[1].friends.length)
                .slice(0, 6)
                .map(([id, data]) => ({
                    id,
                    title: data.work.title,
                    image: data.work.image,
                    type: data.work.type || ((data.work.totalChapters || data.work.currentChapter) ? 'manga' : 'anime'),
                    friendsWatching: data.friends
                }));

            recsSessionCache = { uid: user.uid, ts: Date.now(), data: sortedWorks };
            setRecommendations(sortedWorks);
        } catch (error) {
            logger.error('Error loading recommendations:', error);
            // If it's a permission error, effectively just hide the section
            if ((error as { code?: string }).code === 'permission-denied') {
                logger.warn('Social features require updated Firestore rules. Check firestore.rules deployment.');
            }
        }

        setIsLoading(false);
    }, [user]);

    useEffect(() => {
        if (user) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            loadRecommendations();
        }
    }, [user, loadRecommendations]);

    if (!user) return null;

    if (isLoading) {
        return (
            <div style={{ padding: '1rem', textAlign: 'center', opacity: 0.6 }}>
                Chargement des recommandations...
            </div>
        );
    }

    if (recommendations.length === 0) return null;

    return (
        <div style={{ marginBottom: '2rem' }}>
            <h2 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.5rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                <Users size={24} /> Tes amis lisent/regardent
            </h2>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '1rem'
            }}>
                {recommendations.map(work => (
                    <div
                        key={work.id}
                        onClick={() => navigate(`/work/${work.id}?type=${work.type}`)}
                        style={{
                            cursor: 'pointer',
                            transition: 'transform 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <div style={{
                            position: 'relative',
                            aspectRatio: '2/3',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '2px solid #000',
                            marginBottom: '0.5rem'
                        }}>
                            <OptimizedImage
                                src={work.image}
                                alt={work.title}
                            />

                            {/* Friends overlay */}
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                padding: '0.5rem',
                                background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                            }}>
                                <div style={{ display: 'flex', marginLeft: '-4px' }}>
                                    {work.friendsWatching.slice(0, 3).map((f, i) => (
                                        <div key={i} style={{
                                            width: 22,
                                            height: 22,
                                            borderRadius: '50%',
                                            overflow: 'hidden',
                                            border: '2px solid #fff',
                                            marginLeft: '-4px'
                                        }}>
                                            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                                <OptimizedImage
                                                    src={f.photo || undefined}
                                                    alt=""
                                                    fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${f.name}`}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 600 }}>
                                    {work.friendsWatching.length} ami{work.friendsWatching.length > 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>

                        <p style={{
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>{work.title}</p>
                        <p style={{
                            fontSize: '0.7rem',
                            opacity: 0.6,
                            textTransform: 'uppercase'
                        }}>{work.type}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
