import type { JikanResult } from '@/services/animeApi';
import type { Work } from '@/store/libraryStore';

/**
 * Common properties for title selection from different data sources
 */
export interface TitledWork {
    title: string;
    title_english?: string | null;
    title_japanese?: string | null;
}

/**
 * Returns the title of a work based on the user's language preference.
 * Fallbacks are implemented to ensure a title is always returned.
 * 
 * @param work The work object (from Jikan API or Library Store)
 * @param language The preferred title language ('default' | 'english' | 'japanese')
 * @returns The title to display
 */
export const getDisplayTitle = (
    work: TitledWork | Partial<Work> | Partial<JikanResult>,
    language: 'romaji' | 'english' | 'native' | 'default' = 'romaji'
): string => {
    if (!work) return '';

    const { title, title_english, title_japanese } = work as TitledWork;

    switch (language) {
        case 'english':
            return title_english || title;
        case 'native':
            return title_japanese || title;
        case 'romaji':
        case 'default':
        default:
            return title || title_english || title_japanese || 'Unknown Title';
    }
};
