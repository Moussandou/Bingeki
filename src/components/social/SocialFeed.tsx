import React from 'react';
import { InstagramEmbed } from './InstagramEmbed';
import styles from './SocialFeed.module.css';

export const SocialFeed: React.FC = () => {
  // Provided Instagram post URL
  const feedPosts = [
    "https://www.instagram.com/reel/DEvO9UooA1e/?utm_source=ig_embed&amp;utm_campaign=loading"
  ];

  return (
    <div className={styles.feedContainer}>
      <div className={styles.intro}>
        <h2>Bingeki Society</h2>
        <p>Retrouvez les dernières actus et les meilleurs moments de la communauté !</p>
      </div>

      {feedPosts.map((url, index) => (
        <div key={index} className={styles.postWrapper}>
          <InstagramEmbed url={url} />
        </div>
      ))}
    </div>
  );
};
