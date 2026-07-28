/**
 * Badge type definitions.
 *
 * The catalogue itself lives in src/shared/gamificationCore.ts, next to the
 * unlock rules, so the client and the Cloud Function cannot disagree on it.
 */
import { BADGE_DEFINITIONS } from '@/shared/gamificationCore';

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    unlockedAt?: number; // Timestamp
}

export const MOCK_BADGES: Badge[] = BADGE_DEFINITIONS;

