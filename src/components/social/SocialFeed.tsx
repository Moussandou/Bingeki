import React from 'react';
import { InstagramEmbed } from './InstagramEmbed';
import styles from './SocialFeed.module.css';

export const SocialFeed: React.FC = () => {
    // Provided Instagram post URLs
    const feedPosts = [
        { url: "https://www.instagram.com/p/DWO09Q7kdR_/", type: 'featured' },
        { url: "https://www.instagram.com/reel/DWRlnqHoR0Z/", type: 'action' },
        { url: "https://www.instagram.com/reel/DWUeYR4CcaJ/", type: 'tilted' },
        { url: "https://www.instagram.com/p/DWW5zGEmE67/", type: 'side' }
    ];

    return (
        <div className={styles.feedWrapper}>
            <div className={`manga-panel ${styles.feedContainer}`}>
                <div className="manga-halftone" style={{ opacity: 0.1 }} />
                
                {/* Decorative Background SFX */}
                <div className={styles.bgSfxLeft}>ゴゴゴ</div>
                <div className={styles.bgSfxRight}>ドドド</div>

                <div className={styles.intro}>
                    <h2 className="manga-title">BINGEKI SOCIETY</h2>
                    <p className={styles.subtitle}>Les dérnières actualités et moments forts de la communauté.</p>
                </div>

                <div className={styles.mangaGrid}>
                    {feedPosts.map((post, index) => (
                        <div 
                            key={index} 
                            className={`${styles.postWrapper} ${styles[post.type]}`}
                            style={{ '--index': index } as React.CSSProperties}
                        >
                            <div className={styles.panelDecoration}>
                                {post.type === 'action' && <span className={styles.sticker}>アクション!</span>}
                                {post.type === 'featured' && <span className={styles.sticker}>注目!</span>}
                            </div>
                            <InstagramEmbed url={post.url} />
                        </div>
                    ))}
                </div>

                {/* Bottom Impact SFX */}
                <div className={styles.impactSfx}>バアン!</div>
            </div>
        </div>
    );
};
