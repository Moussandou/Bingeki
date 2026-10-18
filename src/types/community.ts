export type CommunityFilter = 'readings' | 'friends' | 'discover' | 'following';
export type CommunityCategory = 'reviews' | 'shonen' | 'chapters' | 'explored' | 'useful';
export interface CommunityCursor { id: string; createdAt: number }
export interface ReviewInput {
    workId: number;
    workType: 'anime' | 'manga';
    unit: number | null;
    text: string;
    rating: number | null;
    visibility: 'public' | 'friends';
    spoiler: boolean;
}
export interface CommunityPost extends Omit<ReviewInput, 'text'> {
    id: string;
    userId: string;
    userName: string;
    userPhoto: string;
    title: string | null;
    workKey: string;
    workTitle: string;
    workImage: string;
    text: string | null;
    concealed: boolean;
    createdAt: number;
    updatedAt: number;
    usefulCount: number;
    replyCount: number;
    reacted: boolean;
    following: boolean;
}
export interface CommunityReply {
    id: string;
    userId: string;
    userName: string;
    text: string | null;
    concealed: boolean;
    createdAt: number;
}
export interface CommunityPage { items: CommunityPost[]; cursor: CommunityCursor | null }
export interface CommunityThread {
    post: CommunityPost;
    replies: CommunityReply[];
    cursor: CommunityCursor | null;
}
export interface Distinction { id: string; permanent: boolean; expiresAt: number | null }
export interface CommunityStats {
    reviews: number; shonen: number; chapters: number; useful: number; explored: string[]; xp: number;
}
export interface CommunityLeader {
    userId: string; userName: string; reviews: number; shonen: number;
    chapters: number; useful: number; explored: number;
}
export interface CommunityDashboard {
    week: string;
    endsAt: number;
    stats: CommunityStats;
    leaders: CommunityLeader[];
    distinctions: Distinction[];
    equipped: Distinction | null;
    preferences: { replies: boolean; digest: boolean };
    blocked: string[];
    following: string[];
}
export interface CommunityReport {
    id: string; userId: string; postId: string; replyId: string | null;
    reason: string; createdAt: number; text: string | null; workTitle: string;
}
export interface CommunityHighlight {
    workKey: string; workTitle: string; workType: 'anime' | 'manga'; unit: number | null;
    count: number; responses: number; related: boolean;
}
export interface CommunityInsights {
    visitors: number; emptyFeeds: number; returnedAfterSevenDays: number;
    activeReaders: number; contributors: number; reviews: number; answered: number;
    reports: number; limited: boolean;
}
