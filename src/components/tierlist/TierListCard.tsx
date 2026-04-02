import type { TierList } from '@/firebase/firestore';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Heart, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';

interface TierListCardProps {
    tierList: TierList;
}

export function TierListCard({ tierList }: TierListCardProps) {
    const navigate = useNavigate();
    const { lang } = useParams();

    // Find the first tier with items to show as preview
    const previewTier = tierList.tiers.find(t => t.items.length > 0) || tierList.tiers[0];
    const previewItems = previewTier?.items.slice(0, 5) || [];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ x: -2, y: -2, boxShadow: '8px 8px 0 var(--color-primary)' }}
            onClick={() => navigate(`/${lang}/tier-list/${tierList.id}`)}
            className="tier-list-card"
            style={{
                background: '#1a1a1a',
                border: '3px solid var(--color-border-heavy)',
                borderRadius: 0,
                boxShadow: '4px 4px 0 var(--color-shadow-solid)',
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Preview Section */}
            <div style={{
                height: '100px',
                background: previewTier?.color || '#333',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                overflow: 'hidden'
            }}>
                <div style={{
                    writingMode: 'vertical-rl',
                    textOrientation: 'upright',
                    fontWeight: 900,
                    fontSize: '1.2rem',
                    color: '#000',
                    marginRight: '0.5rem',
                    fontFamily: 'var(--font-heading)'
                }}>
                    {previewTier?.label || 'RANK'}
                </div>
                {previewItems.map(item => (
                    <OptimizedImage
                        key={item.id}
                        src={item.image}
                        alt={item.name}
                        style={{
                            width: '60px',
                            height: '80px',
                            borderRadius: 0,
                            border: '2px solid black'
                        }}
                        objectFit="cover"
                        showSkeleton={false}
                    />
                ))}
            </div>

            {/* Info Section */}
            <div style={{ padding: '1rem' }}>
                <h3 style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '1.2rem',
                    color: 'white',
                    fontFamily: 'var(--font-heading)'
                }}>
                    {tierList.title}
                </h3>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#888', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {tierList.authorPhoto ? (
                            <OptimizedImage src={tierList.authorPhoto} style={{ width: 24, height: 24, borderRadius: '50%' }} alt="Author" objectFit="cover" showSkeleton={false} />
                        ) : (
                            <User size={16} />
                        )}
                        <span>{tierList.authorName}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Heart size={16} fill={tierList.likes.length > 0 ? '#ef4444' : 'none'} color={tierList.likes.length > 0 ? '#ef4444' : '#888'} />
                        <span>{tierList.likes.length}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
