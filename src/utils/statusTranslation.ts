// Utility to translate work status to French
export const statusToFrench = (status: string): string => {
    const translations: Record<string, string> = {
        'reading': 'En cours',
        'completed': 'Terminé',
        'plan_to_read': 'À lire',
        'on_hold': 'En pause',
        'dropped': 'Abandonné',
        'finished_airing': 'Terminé',
        'currently_airing': 'En cours',
    };
    return translations[status] || status;
};
