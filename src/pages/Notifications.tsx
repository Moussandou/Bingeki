/**
 * Notifications page
 */
import { Layout } from '@/components/layout/Layout';
import { useTranslation } from 'react-i18next';
import { SEO } from '@/components/layout/SEO';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Check, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Link } from '@/components/routing/LocalizedLink';

export default function Notifications() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { notifications, markAsRead, markAllAsRead } = useNotifications();

    return (
        <Layout>
            <SEO title={t('header.notifications') || 'Notifications'} />
            <div className="container" style={{ paddingBottom: '4rem', paddingTop: '2rem', maxWidth: '800px', minHeight: '80vh' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Button variant="manga" size="icon" onClick={() => navigate(-1)}>
                            <ArrowLeft size={20} />
                        </Button>
                        <h1 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', color: 'var(--color-text)' }}>
                            {t('header.notifications') || 'Notifications'}
                        </h1>
                    </div>
                    {notifications.some(n => !n.read) && (
                        <Button variant="outline" size="sm" onClick={() => markAllAsRead()}>
                            <Check size={16} /> {t('common.mark_all_read') || 'Tout marquer comme lu'}
                        </Button>
                    )}
                </div>

                {/* List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {notifications.length === 0 ? (
                        <div className="manga-panel" style={{ padding: '3rem', textAlign: 'center', opacity: 0.6 }}>
                            <Bell size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <p>{t('common.no_notifications') || 'Aucune notification'}</p>
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <motion.div
                                key={n.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="manga-panel"
                                style={{
                                    padding: '1.5rem',
                                    background: n.read ? 'var(--color-surface)' : 'rgba(var(--color-primary-rgb), 0.05)',
                                    border: n.read ? '1px solid var(--color-border)' : '1px solid var(--color-primary)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '1rem'
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)' }} />}
                                        <h3 style={{ fontWeight: 900, fontSize: '1.1rem' }}>{n.title}</h3>
                                        <span style={{ fontSize: '0.8rem', opacity: 0.5, marginLeft: 'auto' }}>
                                            {(() => {
                                                if (!n.createdAt) return '';
                                                const date = (typeof n.createdAt === 'object' && 'seconds' in n.createdAt)
                                                    ? new Date(n.createdAt.seconds * 1000)
                                                    : new Date(n.createdAt);
                                                
                                                return isNaN(date.getTime()) ? '' : 
                                                    date.toLocaleDateString() + ' ' + 
                                                    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                            })()}
                                        </span>
                                    </div>
                                    <p style={{ opacity: 0.8, lineHeight: 1.5 }}>{n.body}</p>
                                    {n.link && (
                                        <div style={{ marginTop: '1rem' }}>
                                            <Link to={n.link}>
                                                <Button size="sm" variant="outline" onClick={() => markAsRead(n.id)}>
                                                    {t('common.view_details') || 'Voir détails'}
                                                </Button>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </Layout>
    );
}
