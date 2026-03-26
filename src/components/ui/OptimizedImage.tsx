import React, { useState, useEffect } from 'react';
import styles from './OptimizedImage.module.css';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string | undefined;
    alt: string;
    fallback?: string;
    className?: string;
    containerClassName?: string;
    showSkeleton?: boolean;
    objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
    src,
    alt,
    fallback = 'https://api.dicebear.com/7.x/shapes/svg?seed=fallback',
    className = '',
    containerClassName = '',
    showSkeleton = true,
    objectFit = 'cover',
    style,
    ...props
}) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const [imageSrc, setImageSrc] = useState<string | undefined | null>(src);

    useEffect(() => {
        setImageSrc(src);
        setLoaded(false);
        setError(false);
    }, [src]);

    const handleLoad = () => {
        setLoaded(true);
    };

    const handleError = () => {
        if (!error && fallback) {
            setImageSrc(fallback);
            setError(true);
        }
    };

    // If no src is provided at all, use fallback immediately
    const finalSrc = imageSrc || fallback;

    return (
        <div className={`${styles.wrapper} ${containerClassName}`}>
            {showSkeleton && !loaded && !error && <div className={styles.skeleton} />}
            <img
                src={finalSrc}
                alt={alt}
                onLoad={handleLoad}
                onError={handleError}
                loading="lazy"
                decoding="async"
                referrerPolicy={finalSrc?.includes('myanimelist.net') ? 'no-referrer' : undefined}
                className={`${styles.image} ${!loaded && !error ? styles.loading : styles.loaded} ${className}`}
                style={{ ...style, objectFit }}
                {...props}
            />
        </div>
    );
};
