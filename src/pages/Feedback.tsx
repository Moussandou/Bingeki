import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/context/ToastContext';
import { submitFeedback, getUserFeedback, getFeedbackById } from '@/firebase/firestore';
import type { FeedbackData } from '@/firebase/firestore';
import { uploadFeedbackImage } from '@/firebase/storage';
import {
    Send, Bug, Lightbulb, MessageSquare,
    Mail, Inbox, ArrowLeft, User as UserIcon
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ImageUpload } from '@/components/feedback/ImageUpload';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { TicketCard } from '@/components/feedback/TicketCard';
import styles from './Feedback.module.css';

type Tab = 'submit' | 'tickets';

export default function Feedback() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Derived State from URL
    const activeTab = (searchParams.get('tab') as Tab) || 'submit';
    const selectedTicketId = searchParams.get('id');

    // Submission State
    const [category, setCategory] = useState<'bug' | 'feature' | 'general'>('general');
    const [priority, setPriority] = useState<FeedbackData['priority']>('medium');
    const [message, setMessage] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [submittedId, setSubmittedId] = useState<string | null>(null);

    // Tickets List State
    const [tickets, setTickets] = useState<FeedbackData[]>([]);
    const [loadingTickets, setLoadingTickets] = useState(false);
    const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'resolved'>('all');

    // Detail View State
    const [selectedTicket, setSelectedTicket] = useState<FeedbackData | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Navigation Helpers
    const switchTab = (tab: Tab) => {
        setSearchParams({ tab });
    };

    const openTicket = (id: string) => {
        setSearchParams({ tab: 'tickets', id });
    };

    const closeTicket = () => {
        setSearchParams({ tab: 'tickets' });
    };

    // Load Tickets using auth user
    useEffect(() => {
        if (activeTab === 'tickets' && user && !selectedTicketId) {
            setLoadingTickets(true);
            getUserFeedback(user.uid)
                .then(setTickets)
                .catch(err => console.error("Error loading tickets", err))
                .finally(() => setLoadingTickets(false));
        }
    }, [activeTab, user, selectedTicketId]);

    // Load Single Ticket Detail
    useEffect(() => {
        if (!selectedTicketId) {
            setSelectedTicket(null);
            return;
        }

        const loadDetail = async () => {
            setLoadingDetail(true);
            try {
                const detail = await getFeedbackById(selectedTicketId);
                if (detail) {
                    if (user && detail.userId !== user.uid && !user.email?.endsWith('@bingeki.com')) {
                        addToast(t('feedback.error_permission'), 'error');
                        closeTicket();
                        return;
                    }
                    setSelectedTicket(detail);
                }
            } catch (error) {
                console.error('Error loading feedback detail:', error);
                addToast(t('feedback.error_loading_detail'), 'error');
            } finally {
                setLoadingDetail(false);
            }
        };

        loadDetail();
    }, [selectedTicketId, user, addToast, t]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (category !== 'bug' && !message.trim()) {
            addToast(t('feedback.toast_write_message'), 'error');
            return;
        }

        // For bugs, message is required
        if (category === 'bug' && !message.trim()) {
            addToast(t('feedback.toast_write_message'), 'error'); // Or specific message for bug description
            return;
        }

        setIsSubmitting(true);
        let uploadedUrls: string[] = [];

        try {
            if (attachments.length > 0) {
                const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                const uploadPromises = attachments.map(file => uploadFeedbackImage(tempId, file));
                uploadedUrls = await Promise.all(uploadPromises);
            }

            const feedbackId = await submitFeedback({
                rating: 0, // 0 means N/A
                category,
                priority,
                message,
                userId: user?.uid,
                userName: user?.displayName || 'Guest',
                contactEmail: user?.email || email,
                userAgent: navigator.userAgent,
                attachments: uploadedUrls
            });

            if (feedbackId) {
                setSubmittedId(feedbackId);
                setIsSuccess(true);
                addToast(t('feedback.toast_success'), 'success');

                // Refresh tickets if loaded
                if (user && activeTab === 'tickets') {
                    getUserFeedback(user.uid).then(setTickets);
                }

                setMessage('');
                setAttachments([]);
                if (!user) setEmail('');
            }
        } catch (error) {
            console.error('[Feedback] Submission error:', error);
            addToast(t('feedback.toast_unexpected'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString(undefined, {
            day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical': return '#ef4444';
            case 'high': return '#f97316';
            case 'medium': return '#3b82f6';
            case 'low': return '#10b981';
            default: return '#6b7280';
        }
    };

    const filteredTickets = tickets.filter(ticket => {
        if (ticketFilter === 'all') return true;
        if (ticketFilter === 'open') return ticket.status === 'open' || ticket.status === 'in_progress';
        if (ticketFilter === 'resolved') return ticket.status === 'resolved' || ticket.status === 'closed';
        return true;
    });

    // Render Success View
    if (isSuccess && activeTab === 'submit') {
        return (
            <Layout>
                <div className={styles.container}>
                    <div className={styles.successContainer}>
                        <div className={styles.successIcon}>✨</div>
                        <h1 className={styles.successTitle}>{t('feedback.success_title')}</h1>
                        <p className={styles.successMessage}>{t('feedback.success_message')}</p>
                        <div className={styles.successActions}>
                            {user && (
                                <Button variant="outline" onClick={() => {
                                    setIsSuccess(false);
                                    // Navigate to ticket details
                                    if (submittedId) openTicket(submittedId);
                                }}>
                                    {t('feedback.view_details')}
                                </Button>
                            )}
                            <Button onClick={() => navigate('/')}>{t('feedback.back_home')}</Button>
                            <Button variant="ghost" onClick={() => {
                                setIsSuccess(false);
                                setMessage('');
                            }}>
                                {t('feedback.submit_another')}
                            </Button>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>{t('feedback.title')}</h1>
                    <p className={styles.subtitle}>{t('feedback.subtitle_1')}</p>
                </div>

                {/* Tab Switcher */}
                {user && (
                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tab} ${activeTab === 'submit' ? styles.activeTab : ''}`}
                            onClick={() => switchTab('submit')}
                        >
                            {t('feedback.submit_btn')}
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'tickets' ? styles.activeTab : ''}`}
                            onClick={() => switchTab('tickets')}
                        >
                            {t('feedback.my_tickets')}
                        </button>
                    </div>
                )}

                {activeTab === 'submit' && (
                    <div className={styles.formCard}>
                        <form onSubmit={handleSubmit} className={styles.form}>
                            {/* Category & Priority */}
                            <div className={styles.selectionRow}>
                                <div style={{ flex: 1 }}>
                                    <label className={styles.sectionLabel}>{t('feedback.category_label')}</label>
                                    <div className={styles.categoryGrid}>
                                        {(['bug', 'feature', 'general'] as const).map(cat => (
                                            <button
                                                key={cat} type="button" onClick={() => setCategory(cat)}
                                                className={`${styles.categoryButton} ${category === cat ? styles.categoryActive : ''} ${styles[`cat-${cat}`]}`}
                                            >
                                                {cat === 'bug' ? <Bug size={20} /> : cat === 'feature' ? <Lightbulb size={20} /> : <MessageSquare size={20} />}
                                                <span>{t(`feedback.category_${cat}`)}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className={styles.sectionLabel}>{t('feedback.priority_label')}</label>
                                    <div className={styles.priorityGrid}>
                                        {(['low', 'medium', 'high', 'critical'] as const).map(prio => (
                                            <button
                                                key={prio} type="button" onClick={() => setPriority(prio)}
                                                className={`${styles.priorityButton} ${priority === prio ? styles.priorityActive : ''} ${styles[`prio-${prio}`]}`}
                                            >
                                                <span>{t(`feedback.priority_${prio}`)}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <ImageUpload onImagesChange={setAttachments} />

                            <div className={styles.formSection}>
                                <label className={styles.sectionLabel}>{t('feedback.message_label')}</label>
                                <textarea
                                    value={message} onChange={(e) => setMessage(e.target.value)}
                                    placeholder={category === 'bug' ? "Décrivez le bug..." : t('feedback.message_placeholder')}
                                    className={styles.textarea}
                                />
                            </div>

                            {!user && (
                                <div className={styles.formSection}>
                                    <label className={styles.sectionLabel}>{t('feedback.email_label')}</label>
                                    <div className={styles.inputWrapper}>
                                        <Mail className={styles.inputIcon} size={20} />
                                        <input
                                            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                            placeholder={t('feedback.email_placeholder')} className={styles.input}
                                        />
                                    </div>
                                </div>
                            )}

                            <Button type="submit" variant="primary" size="lg" disabled={isSubmitting} icon={<Send size={20} />}>
                                {isSubmitting ? t('feedback.submit_sending') : t('feedback.submit_btn')}
                            </Button>
                        </form>
                    </div>
                )}

                {activeTab === 'tickets' && (
                    <div className={styles.ticketsSection}>
                        {selectedTicketId ? (
                            <div className={styles.detailView}>
                                <button className={styles.backBtn} onClick={closeTicket}>
                                    <ArrowLeft size={18} />
                                    <span>Retour à la liste</span>
                                </button>

                                {loadingDetail ? (
                                    <div className={styles.loadingArea}>
                                        <div className={styles.spinner} />
                                    </div>
                                ) : selectedTicket ? (
                                    <div className={styles.detailCard}>
                                        <div className={styles.detailHeader}>
                                            <div>
                                                <h2 className={styles.ticketTitle}>Ticket #{selectedTicket.id.substring(0, 8)}</h2>
                                                <div className={styles.detailMeta}>
                                                    <StatusBadge status={selectedTicket.status} />
                                                    <span className={styles.priorityPill} style={{ background: getPriorityColor(selectedTicket.priority) }}>
                                                        {t(`feedback.priority_${selectedTicket.priority}`)}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className={styles.dateText}>{formatDate(selectedTicket.timestamp)}</span>
                                        </div>

                                        <div className={styles.detailContent}>
                                            <p className={styles.fullMessage}>{selectedTicket.message}</p>

                                            {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                                                <div className={styles.attachmentStrip}>
                                                    {selectedTicket.attachments.map((url, i) => (
                                                        <a key={i} href={url} target="_blank" rel="noreferrer" className={styles.attachmentThumb}>
                                                            <OptimizedImage src={url} alt="Attachment" />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className={styles.conversation}>
                                            <h3 className={styles.convTitle}><MessageSquare size={18} /> Historique</h3>
                                            <div className={styles.timeline}>
                                                <div className={`${styles.bubble} ${styles.userBubble}`}>
                                                    <div className={styles.bubbleHeader}>
                                                        <UserIcon size={14} /> <span>{selectedTicket.userName}</span>
                                                        <span className={styles.bubbleTime}>{formatDate(selectedTicket.timestamp)}</span>
                                                    </div>
                                                    <div className={styles.bubbleText}>{selectedTicket.message}</div>
                                                </div>

                                                {selectedTicket.adminResponses.map((res, i) => (
                                                    <div key={i} className={`${styles.bubble} ${styles.adminBubble}`}>
                                                        <div className={styles.bubbleHeader}>
                                                            <span className={styles.adminTag}>ADMIN</span> <span>{res.adminName}</span>
                                                            <span className={styles.bubbleTime}>{formatDate(res.timestamp)}</span>
                                                        </div>
                                                        <div className={styles.bubbleText}>{res.message}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p>Ticket non trouvé.</p>
                                )}
                            </div>
                        ) : (
                            <div className={styles.listView}>
                                {/* ... Same list view ... */}
                                <div className={styles.listControls}>
                                    <div className={styles.filterBar}>
                                        <button
                                            className={`${styles.filterBtn} ${ticketFilter === 'all' ? styles.filterActive : ''}`}
                                            onClick={() => setTicketFilter('all')}
                                        >
                                            Tous ({tickets.length})
                                        </button>
                                        <button
                                            className={`${styles.filterBtn} ${ticketFilter === 'open' ? styles.filterActive : ''}`}
                                            onClick={() => setTicketFilter('open')}
                                        >
                                            En cours ({tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length})
                                        </button>
                                        <button
                                            className={`${styles.filterBtn} ${ticketFilter === 'resolved' ? styles.filterActive : ''}`}
                                            onClick={() => setTicketFilter('resolved')}
                                        >
                                            Résolus ({tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length})
                                        </button>
                                    </div>
                                </div>

                                {loadingTickets ? (
                                    <div className={styles.loadingArea}>
                                        <div className={styles.spinner} />
                                    </div>
                                ) : filteredTickets.length > 0 ? (
                                    <div className={styles.ticketsGrid}>
                                        {filteredTickets.map(ticket => (
                                            <div key={ticket.id} onClick={() => openTicket(ticket.id)}>
                                                <TicketCard ticket={ticket} />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.emptyState}>
                                        <Inbox size={48} />
                                        <p>{t('feedback.no_tickets')}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}
