/**
 * Bingeki Banner component (ui)
 */
import React from 'react';
import styles from './BingekiBanner.module.css';


interface BingekiBannerProps {
    className?: string;
    style?: React.CSSProperties;
    title?: string;
    subtitle?: string;
    showSpeedlines?: boolean;
    showHalftone?: boolean;
}

export const BingekiBanner: React.FC<BingekiBannerProps> = ({
    className,
    style,
    title = "BINGEKI",
    subtitle = "Votre collection, votre histoire.",
    showSpeedlines = true,
    showHalftone = true
}) => {
    return (
        <div
            className={`${styles.bannerContainer} ${className || ''}`}
            style={style}
            role="banner"
        >
            {showHalftone && <div className={styles.halftoneOverlay} />}
            {showSpeedlines && <div className={styles.speedlinesOverlay} />}

            <div className={styles.content}>
                <h1 className={styles.title}>{title}</h1>
                {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
            </div>
        </div>
    );
};
