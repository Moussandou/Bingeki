/**
 * Comment type definitions
 */
// Comment Types for Work Discussions

export interface Comment {
    id: string;
    userId: string;
    userName: string;
    userPhoto: string;
    workId: number;
    text: string;
    timestamp: number;
    likes: string[]; // Array of user IDs who liked
    spoiler: boolean;
    replyTo?: string; // Parent comment ID for replies
}

export interface CommentWithReplies extends Comment {
    replies: CommentWithReplies[];
}
