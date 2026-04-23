/**
 * Optimized Image component (ui)
 */
import React, { useState, useEffect, useMemo } from 'react';
import { getProxiedImageUrl } from '@/utils/imageProxy';
import { getFirebaseThumbnail } from '@/utils/imageOptimization';
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
    lowResSrc: providedLowResSrc,
    ...props
}) => {
    const { dataSaver } = useSettingsStore();

    // Auto-generate thumbnail for Firebase URLs if not provided
    const lowResSrc = useMemo(() => {
        if (providedLowResSrc) return providedLowResSrc;
        if (src && src.includes('firebasestorage.googleapis.com')) {
            return getFirebaseThumbnail(src, '200x200');
        }
        return undefined;
    }, [src, providedLowResSrc]);
    
    // Determine if we should apply CORS based on the domain
    const crossOriginValue = useMemo(() => {
        if (!src) return undefined;
        
        // List of domains known to support CORS (lowercase for comparison)
        const corsSafeDomains = [
            'firebasestorage.googleapis.com',
            'cdn.myanimelist.net',
            'api.dicebear.com',
            'localhost',
            '127.0.0.1',
            window.location.hostname
        ];
        
        try {
            const url = new URL(src);
            const isSafe = corsSafeDomains.some(domain => 
                url.hostname === domain || url.hostname.endsWith('.' + domain)
            );
            return isSafe ? 'anonymous' : undefined;
        } catch {
            // Not a valid URL or a relative path, default to no CORS
            return undefined;
        }
    }, [src]);

    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const startTimeRef = React.useRef(Date.now());
    const [placeholderLoaded, setPlaceholderLoaded] = useState(false);
    const [placeholderError, setPlaceholderError] = useState(false);
    const [isVisible, setIsVisible] = useState(priority);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Initialize start time on mount
    useEffect(() => {
        startTimeRef.current = Date.now();
    }, []);

    // Intersection Observer to prevent over-loading
    useEffect(() => {
        if (priority || isVisible || !src) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    startTimeRef.current = Date.now(); // Restart timer for accuracy
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
    const [prevSrc, setPrevSrc] = useState(src);
    if (src !== prevSrc) {
        setPrevSrc(src);
        setIsLoaded(false);
        setHasError(false);
        setPlaceholderLoaded(false);
        setPlaceholderError(false);
        if (!priority) setIsVisible(false);
    }

    const wrapperStyles: React.CSSProperties = {
        ...(fill ? { position: 'absolute', inset: 0 } : {}),
        ...containerStyle
    };

    const handleLoad = () => {
        const duration = Date.now() - startTimeRef.current;
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
            {!dataSaver && lowResSrc && !hasError && !placeholderError && isVisible && (
                <img
                    src={isVisible ? lowResSrc : undefined}
                    alt=""
                    className={`${styles.placeholder} ${isLoaded ? styles.placeholderHidden : ''}`}
                    style={{ objectFit }}
                    aria-hidden="true"
                    crossOrigin={crossOriginValue}
                    onLoad={() => {
                        setPlaceholderLoaded(true);
                    }}
                    onError={() => {
                        setPlaceholderError(true);
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
                    crossOrigin={crossOriginValue}
                    {...props}
                />
            )}
        </div>
    );
};
