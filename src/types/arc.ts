/**
 * Arc type definitions
 */
export interface Arc {
    id: string;
    title: string;
    start: number; // chapter/episode start
    end: number;   // chapter/episode end
    color?: string;
    description?: string;
}
