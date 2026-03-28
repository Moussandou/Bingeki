import React from 'react';
import { getProxiedImageUrl } from '@/utils/imageProxy';
import styles from './OptimizedImage.module.css';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string | undefined;
    alt: string;
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
    ...props
}) => {
    const finalSrc = getProxiedImageUrl(src) || fallback;

    const wrapperStyles: React.CSSProperties = {
        ...(fill ? { position: 'absolute', inset: 0 } : {}),
        ...containerStyle
    };

    return (
        <div 
            className={`${styles.wrapper} ${containerClassName}`}
            style={wrapperStyles}
        >
            <img
                src={finalSrc}
                alt={alt}
                className={`${styles.image} ${className}`}
                style={{ width: '100%', height: '100%', objectFit, ...style }}
                onError={(e) => {
                    if (fallback && e.currentTarget.src !== fallback) {
                        e.currentTarget.src = fallback;
                    }
                }}
                loading={priority ? 'eager' : 'lazy'}
                referrerPolicy="no-referrer"
                {...props}
            />
        </div>
    );
};
