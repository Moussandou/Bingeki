/**
 * Level-to-rank letter mapping and associated colors
 */
export const calculateRank = (level: number): string => {
    if (level >= 100) return '臭';
    if (level >= 75) return 'S';
    if (level >= 50) return 'A';
    if (level >= 30) return 'B';
    if (level >= 20) return 'C';
    if (level >= 10) return 'D';
    if (level >= 5) return 'E';
    return 'F';
};

export const getRankColor = (rank: string): string => {
    switch (rank) {
        case '臭': return '#000000'; // Special Black
        case 'S': return '#D4AF37'; // Metalic Gold (darker than yellow)
        case 'A': return '#FF4500'; // Red-Orange (Good)
        case 'B': return '#8A2BE2'; // BlueViolet (darker purple)
        case 'C': return '#0000CD'; // MediumBlue (darker blue)
        case 'D': return '#228B22'; // ForestGreen (darker lime)
        case 'E': return '#696969'; // DimGray (darker gray)
        default: return '#000000'; // Black
    }
};
