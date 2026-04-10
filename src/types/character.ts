/**
 * Character type definitions
 */
export interface FavoriteCharacter {
    id: number;
    name: string;
    image: string;
    role?: string; // Main, Supporting
    workId?: number; // To link back to the anime/manga
    workTitle?: string;
}
