/**
 * Types + constantes + helpers partagés par SearchFilters, ActiveFiltersBar
 * et GlobalSearch. Isolé dans son propre fichier pour ne pas casser la
 * règle react-refresh/only-export-components sur le fichier composant.
 */

export interface SearchFilterState {
    demographic: number | null;
    genres: number[];
    themes: number[];
    minScore: number | null;
    status: 'airing' | 'complete' | 'upcoming' | 'publishing' | 'hiatus' | 'discontinued' | null;
    orderBy: 'relevance' | 'score' | 'popularity' | 'title' | 'start_date';
}

export const EMPTY_FILTERS: SearchFilterState = {
    demographic: null,
    genres: [],
    themes: [],
    minScore: null,
    status: null,
    orderBy: 'relevance',
};

export function isEmptyFilters(f: SearchFilterState): boolean {
    return f.demographic === null
        && f.genres.length === 0
        && f.themes.length === 0
        && f.minScore === null
        && f.status === null
        && (f.orderBy === 'relevance' || !f.orderBy);
}
