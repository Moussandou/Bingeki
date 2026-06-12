import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ArrowLeft } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import type { JikanPicture } from '@/services/animeApi';
import styles from '@/pages/WorkDetails.module.css';

interface GallerySectionProps {
    pictures: JikanPicture[];
}

export function GallerySection({ pictures }: GallerySectionProps) {
    const { t } = useTranslation();
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

    return (
        <div className="animate-fade-in">
            <h2 className={styles.sectionTitle} style={{ marginBottom: '1.5rem' }}>{t('work_details.gallery.title')}</h2>
            {pictures.length > 0 ? (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: '0.5rem'
                }}>
                    {pictures.map((pic, idx) => (
                        <div key={idx} style={{
                            border: '2px solid var(--color-border-heavy)',
                            boxShadow: '4px 4px 0 var(--color-shadow-solid)',
                            aspectRatio: '1/1.4',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            background: 'var(--color-surface)',
                            transition: 'transform 0.1s'
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translate(-2px, -2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translate(0, 0)'}
                            onClick={() => setSelectedImageIndex(idx)}
                        >
                            <OptimizedImage
                                src={pic.jpg.large_image_url}
                                alt={`Gallery ${idx + 1}`}
                                objectFit="cover"
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6, fontStyle: 'italic' }}>
                    {t('work_details.gallery.no_images')}
                </div>
            )}

            {/* GALLERY LIGHTBOX */}
            {selectedImageIndex !== null && pictures.length > 0 && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem'
                    }}
                    onClick={() => setSelectedImageIndex(null)}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImageIndex(null);
                        }}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            background: 'none',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            zIndex: 1001
                        }}
                    >
                        <X size={40} />
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImageIndex((prev) => (prev === 0 || prev === null ? pictures.length - 1 : prev - 1));
                        }}
                        style={{
                            position: 'absolute',
                            left: '20px',
                            background: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '50px',
                            height: '50px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 1001,
                            boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                        }}
                    >
                        <ArrowLeft size={30} color="#000" />
                    </button>

                    <OptimizedImage
                        src={pictures[selectedImageIndex].jpg.large_image_url}
                        alt="Lightbox"
                        objectFit="contain"
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            boxShadow: '0 0 20px rgba(0,0,0,0.5)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImageIndex((prev) => (prev === pictures.length - 1 || prev === null ? 0 : prev + 1));
                        }}
                        style={{
                            position: 'absolute',
                            right: '20px',
                            background: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '50px',
                            height: '50px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 1001,
                            boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                        }}
                    >
                        <ArrowLeft size={30} color="#000" style={{ transform: 'rotate(180deg)' }} />
                    </button>

                    <div style={{
                        position: 'absolute',
                        bottom: '20px',
                        color: '#fff',
                        fontWeight: 900,
                        fontSize: '1.2rem'
                    }}>
                        {selectedImageIndex + 1} / {pictures.length}
                    </div>
                </div>
            )}
        </div>
    );
}
