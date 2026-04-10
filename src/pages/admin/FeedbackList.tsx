/**
 * Feedback List page
 */
import { Layout } from '@/components/layout/Layout';
import { getAllFeedback, type FeedbackData } from '@/firebase/firestore';
import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Star, User, Calendar, Mail, Bug, Lightbulb } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function FeedbackList() {
    const { t } = useTranslation();
    const [feedbacks, setFeedbacks] = useState<FeedbackData[]>([]);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();
    const { user } = useAuthStore();

    useEffect(() => {
        const fetchFeedback = async () => {
            try {
                const data = await getAllFeedback();
                setFeedbacks(data);
            } catch {
                addToast(t('admin.feedback.load_error'), 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchFeedback();
    }, [addToast, t]);

    // Simple auth check (could be more robust)
    if (!user) {
        return (
            <Layout>
                <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>
                    <h1>Accès refusé</h1>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="container" style={{ padding: '2rem' }}>
                <h1 style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '2rem',
                    marginBottom: '2rem',
                    textTransform: 'uppercase'
                }}>
                    Admin Feedback ({feedbacks.length})
                </h1>

                {loading ? (
                    <p>Chargement...</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {feedbacks.map((item: FeedbackData) => (
                            <div key={item.id} style={{
                                background: '#fff',
                                border: '2px solid var(--color-shadow-solid)',
                                padding: '1.5rem',
                                boxShadow: '4px 4px 0 var(--color-shadow-solid)',
                                position: 'relative'
                            }}>
                                {/* Header */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    marginBottom: '1rem',
                                    borderBottom: '1px solid #eee',
                                    paddingBottom: '0.5rem'
                                }}>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        {/* Category Badge */}
                                        <div style={{
                                            padding: '0.25rem 0.5rem',
                                            background: item.category === 'bug' ? '#ef4444' : item.category === 'feature' ? '#3b82f6' : '#10b981',
                                            color: '#fff',
                                            fontWeight: 700,
                                            fontSize: '0.75rem',
                                            textTransform: 'uppercase',
                                            display: 'flex', alignItems: 'center', gap: '0.25rem'
                                        }}>
                                            {item.category === 'bug' && <Bug size={12} />}
                                            {item.category === 'feature' && <Lightbulb size={12} />}
                                            {item.category === 'general' && <MessageSquare size={12} />}
                                            {item.category}
                                        </div>

                                        {/* Rating */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 900 }}>
                                            <Star size={16} fill="#000" />
                                            {item.rating}/10
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Calendar size={14} />
                                        {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>

                                {/* Message */}
                                <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                                    {item.message}
                                </p>

                                {/* Footer (User Info) */}
                                <div style={{
                                    display: 'flex',
                                    gap: '1.5rem',
                                    fontSize: '0.9rem',
                                    background: '#f9f9f9',
                                    padding: '0.75rem',
                                    border: '1px solid #ddd'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <User size={16} />
                                        <span style={{ fontWeight: 600 }}>{item.userName || 'Anonyme'}</span>
                                    </div>
                                    {item.contactEmail && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Mail size={16} />
                                            <a href={`mailto:${item.contactEmail}`} style={{ textDecoration: 'underline' }}>{item.contactEmail}</a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}
