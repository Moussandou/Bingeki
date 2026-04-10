/**
 * Fetches and assembles work detail data from Jikan API
 * Merges API responses with local library state
 */
import { useState, useEffect } from 'react';
import {
    getWorkDetails,
    getWorkCharacters,
    getWorkRelations,
    getWorkRecommendations,
    getWorkPictures,
    getWorkThemes,
    getWorkStatistics,
    getAnimeStreaming,
    getAnimeStaff,
    getWorkReviews,
    type JikanCharacter,
    type JikanRelation,
    type JikanRecommendation,
    type JikanPicture,
    type JikanTheme,
    type JikanStatistics,
    type JikanStreaming,
    type JikanStaff,
    type JikanReview,
    type JikanResult
} from '@/services/animeApi';

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

export interface DetailedWork {
    id: number;
    title: string;
    type: 'anime' | 'manga';
    format?: string;
    image: string;
    synopsis: string;
    totalChapters: number;
    status: string;
    score?: number;
    currentChapter: number;
    rating: number;
    notes: string;
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

export interface UseWorkDataResult {
    work: DetailedWork | null;
    isLoading: boolean;
    characters: JikanCharacter[];
    relations: JikanRelation[];
    recommendations: JikanRecommendation[];
    pictures: JikanPicture[];
    themes: JikanTheme | null;
    statistics: JikanStatistics | null;
    streaming: JikanStreaming[];
    staff: JikanStaff[];
    reviews: JikanReview[];
}


export function useWorkData(
    id: string | undefined,
    typeParam: 'anime' | 'manga' | null,
    libraryWork?: {
        id: number;
        title: string;
        type: 'anime' | 'manga';
        image: string;
        synopsis?: string;
        totalChapters: number;
        currentChapter: number;
        rating: number;
        notes: string;
        status: string;
        score?: number;
    } | null
): UseWorkDataResult {
    const [fetchedWork, setFetchedWork] = useState<DetailedWork | null>(null);
    const [isLoading, setIsLoading] = useState(false);


    const [characters, setCharacters] = useState<JikanCharacter[]>([]);
    const [relations, setRelations] = useState<JikanRelation[]>([]);
    const [recommendations, setRecommendations] = useState<JikanRecommendation[]>([]);
    const [pictures, setPictures] = useState<JikanPicture[]>([]);
    const [themes, setThemes] = useState<JikanTheme | null>(null);
    const [statistics, setStatistics] = useState<JikanStatistics | null>(null);
    const [streaming, setStreaming] = useState<JikanStreaming[]>([]);
    const [staff, setStaff] = useState<JikanStaff[]>([]);
    const [reviews, setReviews] = useState<JikanReview[]>([]);


    const work: DetailedWork | null = libraryWork ? {
        ...libraryWork,
        synopsis: libraryWork.synopsis || '',
        format: libraryWork.type,
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


    useEffect(() => {
        if (!id) return;

        const fetchWork = async () => {
            setIsLoading(true);
            try {

                let typeToFetch: 'anime' | 'manga' = 'anime';
                if (typeParam) {
                    const normalized = typeParam.toLowerCase();
                    if (['manga', 'novel', 'manhwa', 'manhua', 'doujinshi', 'oneshot', 'oel'].includes(normalized)) {
                        typeToFetch = 'manga';
                    }
                } else if (libraryWork?.type) {
                    typeToFetch = libraryWork.type;
                }

                const res = await getWorkDetails(Number(id), typeToFetch);
                const workTypeNormalized = res.type ? res.type.toLowerCase() : typeToFetch;
                const internalType = (
                    workTypeNormalized === 'manga' ||
                    workTypeNormalized === 'manhwa' ||
                    workTypeNormalized === 'manhua' ||
                    workTypeNormalized === 'novel'
                ) ? 'manga' : 'anime';

                const mapped: DetailedWork = mapJikanToDetailedWork(res, internalType);
                setFetchedWork(mapped);
            } catch (error) {
                console.error('Error fetching work details:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchWork();
    }, [id, typeParam, libraryWork?.type]);


    useEffect(() => {
        if (!id || !work) return;

        const fetchRelatedData = async () => {
            const workTypeNormalized = work.type.toLowerCase();
            const type = (
                workTypeNormalized === 'manga' ||
                workTypeNormalized === 'manhwa' ||
                workTypeNormalized === 'manhua' ||
                workTypeNormalized === 'novel'
            ) ? 'manga' : 'anime';

            try {

                const [chars, rels, recs, pics, stats] = await Promise.all([
                    getWorkCharacters(Number(id), type),
                    getWorkRelations(Number(id), type),
                    getWorkRecommendations(Number(id), type),
                    getWorkPictures(Number(id), type),
                    getWorkStatistics(Number(id), type)
                ]);

                setCharacters(chars);
                setRelations(rels);
                setRecommendations(recs);
                setPictures(pics);
                setStatistics(stats);


                if (type === 'anime') {
                    const [themesData, streamData, staffData] = await Promise.all([
                        getWorkThemes(Number(id)),
                        getAnimeStreaming(Number(id)),
                        getAnimeStaff(Number(id))
                    ]);
                    setThemes(themesData);
                    setStreaming(streamData);
                    setStaff(staffData);
                }


                const revs = await getWorkReviews(Number(id), type);
                setReviews(revs);
            } catch (error) {
                console.error('Error fetching related data:', error);
            }
        };

        fetchRelatedData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, work?.type]);

    return {
        work,
        isLoading,
        characters,
        relations,
        recommendations,
        pictures,
        themes,
        statistics,
        streaming,
        staff,
        reviews
    };
}

function mapJikanToDetailedWork(res: JikanResult, internalType: 'anime' | 'manga'): DetailedWork {
    return {
        id: res.mal_id,
        title: res.title,
        type: internalType,
        format: res.type,
        image: res.images.jpg.large_image_url,
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
}
