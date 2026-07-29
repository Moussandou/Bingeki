import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, EyeOff, Send, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RecursiveComment } from './RecursiveComment';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/context/ToastContext';
import { logger } from '@/utils/logger';
import { getCommentsWithReplies, addComment, toggleCommentLike } from '@/firebase/interactions';
import type { CommentWithReplies } from '@/types/comment';

interface CommentsSectionProps {
    workId: number;
}

export function CommentsSection({ workId }: CommentsSectionProps) {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { addToast } = useToast();

    const [comments, setComments] = useState<CommentWithReplies[]>([]);
    const [isLoadingComments, setIsLoadingComments] = useState(true);
    const [commentError, setCommentError] = useState<string | null>(null);

    const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [isSpoiler, setIsSpoiler] = useState(false);
    const [revealedSpoilers, setRevealedSpoilers] = useState<string[]>([]);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');

    useEffect(() => {
        getCommentsWithReplies(workId)
            .then(data => {
                setComments(data);
                setIsLoadingComments(false);
            })
            .catch(err => {
                logger.error("Error loading comments:", err);
                setIsLoadingComments(false);
                if (err.message?.includes('permission-denied') || err.message?.includes('Missing or insufficient permissions')) {
                    setCommentError(t('work_details.comments.permission_error'));
                } else {
                    setCommentError(t('work_details.comments.generic_error'));
                }
            });
    }, [workId, t]);

    const handleSubmitComment = async () => {
        if (!newComment.trim() || !user) {
            logger.log('[Comments] Submit blocked - missing data:', { hasComment: !!newComment.trim(), hasUser: !!user, workId });
            return;
        }

        try {
            const commentData = {
                userId: user.uid,
                userName: user.displayName || 'Anonyme',
                userPhoto: user.photoURL || '',
                workId: workId,
                text: newComment,
                spoiler: isSpoiler
            };

            logger.log('[Comments] Submitting comment:', commentData);
            const result = await addComment(commentData);
            logger.log('[Comments] Add result:', result);

            if (result) {
                setNewComment('');
                setIsSpoiler(false);
                addToast(t('work_details.comments.added_toast'), 'success');

                // Reload comments
                const updated = await getCommentsWithReplies(workId);
                logger.log('[Comments] Reloaded comments:', updated.length);
                setComments(updated);
            } else {
                addToast(t('work_details.comments.error_toast'), 'error');
            }
        } catch (error) {
            logger.error('[Comments] Submit error:', error);
            addToast(t('work_details.comments.error_toast'), 'error');
        }
    };

    const handleLikeComment = async (commentId: string) => {
        if (!user) return;
        try {
            await toggleCommentLike(commentId, user.uid);
            const updated = await getCommentsWithReplies(workId);
            setComments(updated);
        } catch (error) {
            logger.error('[Comments] Error toggling like:', error);
            addToast(t('work_details.comments.like_error'), 'error');
        }
    };

    const handleReply = async (parentId: string) => {
        if (!replyText.trim() || !user) return;

        try {
            const replyData = {
                userId: user.uid,
                userName: user.displayName || 'Anonyme',
                userPhoto: user.photoURL || '',
                workId: workId,
                text: replyText,
                spoiler: false,
                replyTo: parentId
            };

            const result = await addComment(replyData);
            if (result) {
                setReplyText('');
                setReplyingTo(null);
                addToast(t('work_details.comments.reply_added_toast'), 'success');
                const updated = await getCommentsWithReplies(workId);
                setComments(updated);
            }
        } catch (error) {
            logger.error('[Comments] Reply error:', error);
            addToast(t('work_details.comments.reply_error_toast'), 'error');
        }
    };

    return (
        <div style={{
            marginBottom: '2rem',
            border: '2px solid var(--color-border-heavy)',
            padding: '1.5rem',
            boxShadow: '8px 8px 0 var(--color-shadow-solid)',
            background: 'var(--color-surface)'
        }}>
            <h3
                onClick={() => setIsCommentsExpanded(!isCommentsExpanded)}
                style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.5rem',
                    marginBottom: isCommentsExpanded ? '1.5rem' : 0,
                    color: 'var(--color-text)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    userSelect: 'none',
                    justifyContent: 'space-between'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MessageCircle size={24} /> {t('work_details.comments.title')} ({comments.length})
                </div>
                <span>{isCommentsExpanded ? '▼' : '►'}</span>
            </h3>

            {isCommentsExpanded && (
                <div>

                    {/* New comment form */}
                    {user ? (
                        <div style={{
                            marginBottom: '2rem',
                            background: 'var(--color-surface)',
                            padding: '1.5rem',
                            border: '3px solid var(--color-border-heavy)',
                            boxShadow: '6px 6px 0 var(--color-shadow-solid)',
                            position: 'relative'
                        }}>
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder={t('work_details.comments.placeholder')}
                                style={{
                                    width: '100%',
                                    minHeight: '100px',
                                    border: '2px solid var(--color-border-heavy)',
                                    padding: '1rem',
                                    fontFamily: 'inherit',
                                    fontSize: '1rem',
                                    fontWeight: 500,
                                    resize: 'vertical',
                                    marginBottom: '1rem',
                                    outline: 'none',
                                    background: 'var(--color-surface-hover)',
                                    color: 'var(--color-text)',
                                }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={isSpoiler}
                                        onChange={(e) => setIsSpoiler(e.target.checked)}
                                        style={{ accentColor: '#000', width: 16, height: 16 }}
                                    />
                                    <EyeOff size={16} /> {t('work_details.comments.spoiler')}
                                </label>
                                <Button
                                    onClick={handleSubmitComment}
                                    variant="primary"
                                    size="md"
                                    icon={<Send size={18} />}
                                    style={{
                                        border: '2px solid var(--color-border-heavy)',
                                        boxShadow: '4px 4px 0 var(--color-shadow-solid)',
                                        fontWeight: 900
                                    }}
                                >
                                    {t('work_details.comments.submit')}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <p style={{ opacity: 0.6, fontStyle: 'italic', marginBottom: '1rem' }}>{t('work_details.comments.login_to_comment')}</p>
                    )}

                    {/* Error State */}
                    {commentError && (
                        <div style={{
                            background: '#fee2e2',
                            border: '2px solid #ef4444',
                            padding: '1rem',
                            marginBottom: '1rem',
                            borderRadius: '4px',
                            color: '#b91c1c',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <AlertTriangle size={20} />
                            <div>
                                <strong>{t('work_details.comments.error_loading')}</strong> {commentError}
                            </div>
                        </div>
                    )}

                    {/* Comments list */}
                    {isLoadingComments ? (
                        <p style={{ textAlign: 'center', opacity: 0.6 }}>{t('work_details.comments.loading')}</p>
                    ) : comments.length === 0 && !commentError ? (
                        <p style={{ textAlign: 'center', opacity: 0.6, padding: '2rem' }}>{t('work_details.comments.no_comments')}</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {comments.map(comment => (
                                <RecursiveComment
                                    key={comment.id}
                                    comment={comment}
                                    user={user}
                                    replyingTo={replyingTo}
                                    setReplyingTo={setReplyingTo}
                                    replyText={replyText}
                                    setReplyText={setReplyText}
                                    handleReply={handleReply}
                                    handleLike={handleLikeComment}
                                    revealedSpoilers={revealedSpoilers}
                                    setRevealedSpoilers={setRevealedSpoilers}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
