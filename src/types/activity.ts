// Activity Event Types for Social Feed

export interface ActivityEvent {
    id: string;
    userId: string;
    userName: string;
    userPhoto: string;
    type: 'watch' | 'read' | 'complete' | 'add_work' | 'level_up' | 'badge';
    workId?: number;
    workTitle?: string;
    workImage?: string;
    workType?: 'anime' | 'manga';
    episodeNumber?: number;
    badgeName?: string;
    newLevel?: number;
    timestamp: number;
}

// Activity type emojis
export const ACTIVITY_EMOJIS: Record<ActivityEvent['type'], string> = {
    'watch': '🎬',
    'read': '📚',
    'complete': '🏆',
    'add_work': '➕',
    'level_up': '⬆️',
    'badge': '🏅',
};

// Helper function to get translated activity label
// Usage: getActivityLabel(activity.type, t)
export const getActivityLabel = (type: ActivityEvent['type'], t: (key: string) => string): string => {
    return t(`activity_labels.${type}`);
};
