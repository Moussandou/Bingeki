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

export const MOCK_ARCS: Arc[] = [
    { id: '1', title: 'Introduction', start: 1, end: 5, color: '#3498db', description: 'Le début de l\'aventure' },
    { id: '2', title: 'Arc du Tournoi', start: 6, end: 15, color: '#e74c3c', description: 'Affrontements épiques' },
    { id: '3', title: 'Arc de l\'Investigation', start: 16, end: 25, color: '#9b59b6', description: 'Révélations sombres' },
    { id: '4', title: 'Guerre Totale', start: 26, end: 50, color: '#f1c40f', description: 'Le combat final approche' },
];
