/**
 * Tier List Preview Modal component (tierlist)
 */
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Heart, User, Calendar } from 'lucide-react';
import type { TierList } from '@/firebase/firestore';
import { TierRow } from './TierRow';
import { Button } from '@/components/ui/Button';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './TierListPreviewModal.module.css';

interface TierListPreviewModalProps {
    tierList: TierList | null;
    isOpen: boolean;
    onClose: () => void;
}

export function TierListPreviewModal({ tierList, isOpen, onClose }: TierListPreviewModalProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { lang } = useParams();

    if (!tierList) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className={styles.overlay} onClick={onClose}>
                    <motion.div
                        className={styles.modal}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className={styles.header}>
                            <div className={styles.headerContent}>
                                <h2 className={styles.title}>{tierList.title}</h2>
                                <div className={styles.meta}>
                                    <span className={styles.metaItem}>
                                        <User size={14} /> {tierList.authorName}
                                    </span>
                                    <span className={styles.metaItem}>
                                        <Calendar size={14} /> {new Date(tierList.createdAt).toLocaleDateString()}
                                    </span>
                                    <span className={styles.metaItem}>
                                        <Heart size={14} fill={tierList.likes.length > 0 ? 'currentColor' : 'none'} /> {tierList.likes.length}
                                    </span>
                                </div>
                            </div>
                            <button className={styles.closeBtn} onClick={onClose}>
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className={styles.content}>
                            <div className={styles.tierContainer}>
                                {tierList.tiers.map((tier) => (
                                    <TierRow key={tier.id} tier={tier} readOnly={true} />
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className={styles.footer}>
                            <Button 
                                variant="outline" 
                                onClick={onClose}
                                className={styles.footerBtn}
                            >
                                {t('common.close')}
                            </Button>
                            <Button
                                variant="primary"
                                icon={<ExternalLink size={18} />}
                                onClick={() => {
                                    onClose();
                                    navigate(`/${lang}/tierlist/${tierList.id}`);
                                }}
                                className={styles.footerBtn}
                            >
                                {t('tierlist.view_full')}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
