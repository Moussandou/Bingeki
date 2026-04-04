import type { TierList } from '@/firebase/firestore';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Heart, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './TierListCard.module.css';

interface TierListCardProps {
    tierList: TierList;
}

export function TierListCard({ tierList }: TierListCardProps) {
    const navigate = useNavigate();
    const { lang } = useParams();

    // Get the first 3 tiers that have at least one item
    const tiersWithItems = tierList.tiers.filter(t => t.items.length > 0).slice(0, 3);
    
    // Fallback if no items at all
    const previewTiers = tiersWithItems.length > 0 ? tiersWithItems : [tierList.tiers[0]];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -8, transition: { duration: 0.2 } }}
            onClick={() => navigate(`/${lang}/tierlist/${tierList.id}`)}
            className={styles.card}
        >
            {/* Preview Section - Shows multiple tiers */}
            <div className={styles.previewContainer}>
                {previewTiers.map((tier, idx) => (
                    <div 
                        key={tier.id} 
                        className={styles.previewRow}
                        style={{ 
                            background: tier.color,
                            zIndex: 3 - idx,
                            height: previewTiers.length === 1 ? '100%' : `${100 / previewTiers.length}%`
                        }}
                    >
                        <div className={styles.previewLabel}>
                            {tier.label}
                        </div>
                        <div className={styles.previewItems}>
                            {tier.items.slice(0, 6).map(item => {
                                // Extract image URLs safely (handles both string and Jikan object)
                                const src = typeof item.image === 'string' ? item.image : item.image?.jpg?.image_url;
                                const lowResSrc = typeof item.image === 'string' ? undefined : item.image?.jpg?.small_image_url;

                                return (
                                    <OptimizedImage
                                        key={item.id}
                                        src={src}
                                        lowResSrc={lowResSrc}
                                        alt={item.name}
                                        className={styles.previewImage}
                                        style={{ width: '40px', height: '54px' }}
                                        objectFit="cover"
                                        showSkeleton={false}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Info Section */}
            <div className={styles.info}>
                <h3 className={styles.infoTitle}>
                    {tierList.title}
                </h3>

                <div className={styles.infoMeta}>
                    <div className={styles.metaAuthor}>
                        {tierList.authorPhoto ? (
                            <OptimizedImage
                                src={tierList.authorPhoto}
                                className={styles.authorAvatar}
                                style={{ width: 20, height: 20 }}
                                alt="Author"
                                objectFit="cover"
                                showSkeleton={false}
                            />
                        ) : (
                            <User size={14} />
                        )}
                        <span>{tierList.authorName}</span>
                    </div>
                    <div className={styles.metaLikes}>
                        <Heart
                            size={14}
                            fill={tierList.likes.length > 0 ? 'var(--color-primary)' : 'none'}
                            color={tierList.likes.length > 0 ? 'var(--color-primary)' : 'var(--color-text-dim)'}
                        />
                        <span>{tierList.likes.length}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
