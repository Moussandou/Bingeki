import React, { useState, useEffect } from 'react';
import { getProxiedImageUrl } from '@/utils/imageProxy';
import styles from './OptimizedImage.module.css';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string | undefined;
    alt: string;
    fallback?: string;
    className?: string;
    containerClassName?: string;
    showSkeleton?: boolean;
    objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
    priority?: boolean;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
    src,
    alt,
    fallback = 'https://api.dicebear.com/7.x/shapes/svg?seed=fallback',
    className = '',
    containerClassName = '',
    showSkeleton = true,
    objectFit = 'cover',
    priority = false,
    style,
    ...props
}) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const [imageSrc, setImageSrc] = useState<string | undefined | null>(getProxiedImageUrl(src));

    useEffect(() => {
        setImageSrc(getProxiedImageUrl(src));
        setLoaded(false);
        setError(false);
    }, [src]);

    // If no src is provided at all, use fallback immediately
    const finalSrc = imageSrc || fallback;

    return (
        <div className={`${styles.wrapper} ${containerClassName}`}>
            {showSkeleton && !loaded && !error && <div className={styles.skeleton} />}
            <img
                src={finalSrc}
                alt={alt}
                className={`${styles.image} ${!loaded && !error ? styles.loading : styles.loaded} ${className}`}
                style={{ ...style, objectFit }}
                onLoad={() => setLoaded(true)}
                onError={() => {
                    setError(true);
                    if (imageSrc !== fallback) {
                        setImageSrc(fallback);
                    }
                }}
                loading={priority ? 'eager' : 'lazy'}
                {...props}
            />
        </div>
    );
};
