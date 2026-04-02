import { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/layout/Layout';
import { getTierListById, toggleTierListLike, deleteTierList } from '@/firebase/firestore';
import type { TierList } from '@/firebase/firestore';
import { TierRow } from '@/components/tierlist/TierRow';
import { Button } from '@/components/ui/Button';
import { Download, Copy, User, Calendar, Heart, Trash2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useToast } from '@/context/ToastContext';
import { useAuthStore } from '@/store/authStore';
import { logger } from '@/utils/logger';

export default function ViewTierList() {
    const { t } = useTranslation();
    const { id, lang } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const { user } = useAuthStore();
    const tiersRef = useRef<HTMLDivElement>(null);
    const [tierList, setTierList] = useState<TierList | null>(null);
    const [loading, setLoading] = useState(true);
    const [likeLoading, setLikeLoading] = useState(false);

    useEffect(() => {
        if (!id) return;
        const fetchList = async () => {
            try {
                const data = await getTierListById(id);
                setTierList(data);
            } catch (error) {
                logger.error(error);
                addToast(t('tierlist.load_error'), 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchList();
    }, [id, addToast, t]);

    const handleExportImage = async () => {
        if (!tiersRef.current || !tierList) return;
        try {
            const canvas = await html2canvas(tiersRef.current, {
                backgroundColor: '#111',
                scale: 2,
                useCORS: true,
                allowTaint: true
            });
            const link = document.createElement('a');
            link.download = `${tierList.title.replace(/\s+/g, '_')}_tierlist.png`;
            link.href = canvas.toDataURL();
            link.click();
            addToast(t('tierlist.export_success'), 'success');
        } catch (error) {
            logger.error(error);
            addToast(t('tierlist.export_error'), 'error');
        }
    };

    const handleLike = async () => {
        if (!user || !tierList || !id) return;
        setLikeLoading(true);
        try {
            await toggleTierListLike(id, user.uid);
            const hasLiked = tierList.likes.includes(user.uid);
            setTierList(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    likes: hasLiked
                        ? prev.likes.filter(uid => uid !== user.uid)
                        : [...prev.likes, user.uid]
                };
            });
        } catch (error) {
            logger.error(error);
            addToast(t('tierlist.like_error'), 'error');
        } finally {
            setLikeLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!tierList || !id) return;
        if (!window.confirm(t('tierlist.delete_confirm'))) return;
        try {
            await deleteTierList(id);
            addToast(t('tierlist.delete_success'), 'success');
            navigate(`/${lang}/tier-list`);
        } catch (error) {
            logger.error(error);
            addToast(t('tierlist.delete_error'), 'error');
        }
    };

    if (loading) {
        return (
            <Layout>
                <div style={{ padding: '4rem', textAlign: 'center', color: 'white' }}>{t('common.loading')}</div>
            </Layout>
        );
    }

    if (!tierList) {
        return (
            <Layout>
                <div style={{ padding: '4rem', textAlign: 'center', color: 'white' }}>
                    <h2>{t('tierlist.not_found')}</h2>
                    <Button onClick={() => navigate(`/${lang}/tier-list`)} variant="outline">{t('tierlist.back_to_feed')}</Button>
                </div>
            </Layout>
        );
    }

    const isAuthor = user?.uid === tierList.userId;
    const hasLiked = user ? tierList.likes.includes(user.uid) : false;

    return (
        <Layout>
            <div className="container" style={{ padding: '2rem' }}>
                {/* Header Info */}
                <div style={{ marginBottom: '2rem', color: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1 style={{
                                fontSize: '3rem',
                                fontFamily: 'var(--font-heading)',
                                margin: '0 0 1rem 0',
                                lineHeight: 1
                            }}>
                                {tierList.title}
                            </h1>
                            <div style={{ display: 'flex', gap: '2rem', color: '#888' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <User size={18} />
                                    <span>{t('tierlist.created_by')} <strong>{tierList.authorName}</strong></span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Calendar size={18} />
                                    <span>{new Date(tierList.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            {/* Like button */}
                            {user && (
                                <button
                                    onClick={handleLike}
                                    disabled={likeLoading}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        background: 'transparent',
                                        border: '1px solid #444',
                                        borderRadius: '4px',
                                        color: hasLiked ? '#e74c3c' : '#888',
                                        cursor: likeLoading ? 'default' : 'pointer',
                                        padding: '0.5rem 0.75rem',
                                        fontSize: '0.9rem',
                                        transition: 'color 0.2s, border-color 0.2s',
                                    }}
                                >
                                    <Heart size={18} fill={hasLiked ? 'currentColor' : 'none'} />
                                    <span>{tierList.likes.length}</span>
                                </button>
                            )}
                            <Button onClick={handleExportImage} variant="primary" icon={<Download size={20} />}>
                                {t('tierlist.export_image')}
                            </Button>
                            <Button onClick={() => navigate(`/${lang}/tier-list/create`)} variant="outline" icon={<Copy size={20} />}>
                                {t('tierlist.create_your_own')}
                            </Button>
                            {/* Delete button — author only */}
                            {isAuthor && (
                                <Button onClick={handleDelete} variant="ghost" icon={<Trash2 size={18} />}>
                                    {t('tierlist.delete_button')}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tier List Display */}
                <div
                    ref={tiersRef}
                    style={{
                        background: '#111',
                        padding: '1rem',
                        border: '3px solid var(--color-border-heavy)',
                        borderRadius: 0
                    }}
                >
                    {tierList.tiers.map(tier => (
                        <TierRow
                            key={tier.id}
                            tier={tier}
                            readOnly={true}
                        />
                    ))}
                </div>
            </div>
        </Layout>
    );
}
