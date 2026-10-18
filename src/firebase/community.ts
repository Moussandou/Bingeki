import { httpsCallable } from 'firebase/functions';
import { functions } from './config';
import { logger } from '@/utils/logger';
import type {
    CommunityCategory, CommunityCursor, CommunityDashboard, CommunityFilter,
    CommunityPage, CommunityReport, CommunityThread, ReviewInput,
    CommunityHighlight, CommunityInsights,
} from '@/types/community';

type WriteAction =
    | { action: 'publish' | 'edit'; id: string; review: ReviewInput }
    | { action: 'delete'; id: string }
    | { action: 'reply'; id: string; replyId: string; text: string }
    | { action: 'deleteReply'; id: string; replyId: string }
    | { action: 'react'; id: string; enabled: boolean }
    | { action: 'report'; id: string; replyId?: string; reason: string }
    | { action: 'block' | 'follow'; userId: string; enabled: boolean }
    | { action: 'preferences'; replies: boolean; digest: boolean }
    | { action: 'equip'; title: string | null }
    | { action: 'moderate'; id: string; reportId: string; resolution: 'hide' | 'dismiss' }
    | { action: 'visit'; empty: boolean };

async function call<T>(name: string, input: object): Promise<T> {
    try {
        const result = await httpsCallable<object, T>(functions, name)(input);
        return result.data;
    } catch (error) {
        logger.error(`[Community] ${name} failed`, error);
        throw error;
    }
}
export const getCommunityFeed = (input: {
    filter?: CommunityFilter; workKey?: string; authorId?: string;
    unit?: number | null; cursor?: CommunityCursor | null;
}) => call<CommunityPage>('communityRead', { action: 'feed', ...input });
export const getCommunityThread = (id: string, reveal = false, cursor?: CommunityCursor | null) =>
    call<CommunityThread>('communityRead', { action: 'thread', id, reveal, ...(cursor ? { cursor } : {}) });
export const getCommunityDashboard = (category: CommunityCategory = 'reviews') =>
    call<CommunityDashboard>('communityRead', { action: 'dashboard', category });
export const getCommunityReports = (cursor?: CommunityCursor | null) =>
    call<{ items: CommunityReport[]; cursor: CommunityCursor | null }>('communityRead', { action: 'reports', ...(cursor ? { cursor } : {}) });
export const communityWrite = (action: WriteAction) =>
    call<{ success: boolean; id?: string; xp?: number }>('communityWrite', action);
export const getCommunityHighlights = () => call<{ items: CommunityHighlight[] }>('communityRead', { action: 'highlights' });
export const getCommunityInsights = () => call<CommunityInsights>('communityRead', { action: 'insights' });
