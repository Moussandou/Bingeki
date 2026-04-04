import React, { useState, useEffect } from 'react';
import { getProxiedImageUrl } from '@/utils/imageProxy';
import { useSettingsStore } from '@/store/settingsStore';
import styles from './OptimizedImage.module.css';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string | undefined;
    alt: string;
    lowResSrc?: string;
    fallback?: string;
    className?: string;
    containerClassName?: string;
    containerStyle?: React.CSSProperties;
    showSkeleton?: boolean;
    objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
    priority?: boolean;
    fill?: boolean;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
    src,
    alt,
    fallback = 'https://api.dicebear.com/7.x/shapes/svg?seed=fallback',
    className = '',
    containerClassName = '',
    containerStyle = {},
    showSkeleton = true,
    objectFit = 'cover',
    priority = false,
    fill = false,
    style,
    lowResSrc,
    ...props
}) => {
    const { dataSaver } = useSettingsStore();
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [startTime, setStartTime] = useState(Date.now());
    const [placeholderLoaded, setPlaceholderLoaded] = useState(false);
    const [isVisible, setIsVisible] = useState(priority);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Intersection Observer to prevent over-loading
    useEffect(() => {
        if (priority || isVisible || !src) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    setStartTime(Date.now()); // Restart timer for accuracy
                    observer.disconnect();
                }
            },
            { rootMargin: '400px', threshold: 0.01 }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [priority, isVisible, src]);

    // If data saver is on, we ONLY use the low res source if available
    const effectiveSrc = (dataSaver && lowResSrc) ? lowResSrc : src;
    const finalSrc = getProxiedImageUrl(effectiveSrc) || fallback;

    // Reset state when src changes
    useEffect(() => {
        setIsLoaded(false);
        setHasError(false);
        setPlaceholderLoaded(false);
        if (!priority) setIsVisible(false);
    }, [src, priority]);

    const wrapperStyles: React.CSSProperties = {
        ...(fill ? { position: 'absolute', inset: 0 } : {}),
        ...containerStyle
    };

    const handleLoad = () => {
        const duration = Date.now() - startTime;
        setIsLoaded(true);
        
        // Log timing and if it beat the placeholder
        if (duration > 2500) {
            console.warn(`[OptimizedImage] 🐢 Slow Main: ${finalSrc.substring(0, 50)}... took ${duration}ms (Placeholder: ${placeholderLoaded ? 'yes' : 'no'})`);
        } else if (duration < 500) {
            console.debug(`[OptimizedImage] ⚡ Fast load: ${duration}ms`);
        }
    };

    return (
        <div 
            ref={containerRef}
            className={`${styles.wrapper} ${containerClassName}`}
            style={wrapperStyles}
            data-testid="optimized-image-container"
        >
            {/* Shimmer effect while loading (delayed to avoid flicker) */}
            {showSkeleton && !isLoaded && !hasError && (
                <div 
                    className={styles.shimmer} 
                    style={{ animationDelay: '100ms' }} // Wait 100ms before showing shimmer
                />
            )}

            {/* Low-res placeholder for progressive loading (only if not in data saver) */}
            {!dataSaver && lowResSrc && !hasError && isVisible && (
                <img
                    src={isVisible ? lowResSrc : undefined}
                    alt=""
                    className={`${styles.placeholder} ${isLoaded ? styles.placeholderHidden : ''}`}
                    style={{ objectFit }}
                    aria-hidden="true"
                    onLoad={() => {
                        setPlaceholderLoaded(true);
                    }}
                />
            )}

            {isVisible && (
                <img
                    src={finalSrc}
                    alt={alt}
                    className={`${styles.image} ${isLoaded ? styles.imageLoaded : ''} ${className}`}
                    style={{ objectFit, ...style }}
                    onLoad={handleLoad}
                    onError={(e) => {
                        setHasError(true);
                        console.error(`[OptimizedImage] ❌ Failed: ${finalSrc}`);
                        if (fallback && e.currentTarget.src !== fallback) {
                            e.currentTarget.src = fallback;
                        }
                    }}
                    loading={priority ? 'eager' : 'lazy'}
                    referrerPolicy="no-referrer"
                    {...props}
                />
            )}
        </div>
    );
};
