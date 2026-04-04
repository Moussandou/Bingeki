import { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/layout/Layout';
import { getTierListById, toggleTierListLike, deleteTierList } from '@/firebase/firestore';
import type { TierList } from '@/firebase/firestore';
import { TierRow } from '@/components/tierlist/TierRow';
import { Button } from '@/components/ui/Button';
import { Download, Copy, User, Calendar, Heart, Trash2, ArrowLeft } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useToast } from '@/context/ToastContext';
import { useAuthStore } from '@/store/authStore';
import { logger } from '@/utils/logger';
import { cn } from '@/utils/cn';
import styles from './ViewTierList.module.css';

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
            navigate(`/${lang}/tierlist`);
        } catch (error) {
            logger.error(error);
            addToast(t('tierlist.delete_error'), 'error');
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className={styles.loading}>{t('common.loading')}</div>
            </Layout>
        );
    }

    if (!tierList) {
        return (
            <Layout>
                <div className={styles.notFound}>
                    <h2>{t('tierlist.not_found')}</h2>
                    <Button onClick={() => navigate(`/${lang}/tierlist`)} variant="outline">
                        {t('tierlist.back_to_feed')}
                    </Button>
                </div>
            </Layout>
        );
    }

    const isAuthor = user?.uid === tierList.userId;
    const hasLiked = user ? tierList.likes.includes(user.uid) : false;

    return (
        <Layout>
            <div className={`container ${styles.container}`}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.backButton}>
                        <Button
                            variant="ghost"
                            icon={<ArrowLeft size={16} />}
                            onClick={() => navigate(`/${lang}/tierlist`)}
                        >
                            {t('tierlist.back_to_feed')}
                        </Button>
                    </div>

                    <div className={styles.titleRow}>
                        <div className={styles.titleBlock}>
                            <h1 className={styles.title}>{tierList.title}</h1>
                            <div className={styles.meta}>
                                <div className={styles.metaItem}>
                                    <User size={18} />
                                    <span>{t('tierlist.created_by')} <strong>{tierList.authorName}</strong></span>
                                </div>
                                <div className={styles.metaItem}>
                                    <Calendar size={18} />
                                    <span>{new Date(tierList.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.actions}>
                            {user && (
                                <button
                                    onClick={handleLike}
                                    disabled={likeLoading}
                                    className={cn(styles.likeButton, hasLiked && styles.likeButtonActive)}
                                >
                                    <Heart size={18} fill={hasLiked ? 'currentColor' : 'none'} />
                                    <span>{tierList.likes.length}</span>
                                </button>
                            )}
                            <Button onClick={handleExportImage} variant="primary" icon={<Download size={20} />}>
                                {t('tierlist.export_image')}
                            </Button>
                            <Button onClick={() => navigate(`/${lang}/tierlist/create`)} variant="manga" icon={<Copy size={20} />}>
                                {t('tierlist.create_your_own')}
                            </Button>
                            {isAuthor && (
                                <Button onClick={handleDelete} variant="manga" icon={<Trash2 size={18} />} className={styles.deleteButton}>
                                    {t('tierlist.delete_button')}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tier List Display */}
                <div ref={tiersRef} className={styles.tiersPanel}>
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
