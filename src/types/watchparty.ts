/**
 * Watchparty type definitions
 */
// Watch/Read Party type definition

export interface WatchParty {
    id: string;
    title: string;
    workId: number;
    workTitle: string;
    workImage?: string;
    workType: 'anime' | 'manga';
    hostId: string;
    hostName: string;
    participants: PartyParticipant[];
    currentEpisode: number;
    status: 'active' | 'paused' | 'ended';
    createdAt: number;
    lastActivity: number;
}

export interface PartyParticipant {
    id: string;
    name: string;
    photo: string;
    joinedAt: number;
    isReady: boolean;
    currentProgress: number;
}

export const PARTY_STATUS_LABELS: Record<WatchParty['status'], string> = {
    active: 'En cours',
    paused: 'En pause',
    ended: 'Terminée'
};
