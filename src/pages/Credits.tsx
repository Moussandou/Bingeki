import { Layout } from '@/components/layout/Layout';
import styles from './Credits.module.css';
import { Globe, Code, Heart } from 'lucide-react';
import { GithubIcon, LinkedinIcon } from '@/components/ui/BrandIcons';
import { useTranslation } from 'react-i18next';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

export default function Credits() {
    const { t } = useTranslation();

    return (
        <Layout>
            <div className={styles.creditsContainer}>
                {/* Background Details */}
                <div style={{ position: 'absolute', top: '10%', left: '-5%', fontSize: '15rem', opacity: 0.05, fontWeight: 900, transform: 'rotate(10deg)', pointerEvents: 'none' }}>DEV</div>
                <div style={{ position: 'absolute', bottom: '10%', right: '-5%', fontSize: '15rem', opacity: 0.05, fontWeight: 900, transform: 'rotate(-10deg)', pointerEvents: 'none' }}>BUILD</div>

                <div className="container">
                    <h1 className={styles.title}>{t('credits.title')}</h1>

                    <div className={styles.card}>
                        <div className={styles.profileSection}>
                            <div className={styles.avatar}>
                                <OptimizedImage
                                    src="https://media.licdn.com/dms/image/v2/D4E03AQGgqVvXfXyq2A/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1718206192135?e=1741219200&v=beta&t=7y2y2y2y2y2y2y2y2y2y2y2y2y2y2y2y2y2y2y2y2y2"
                                    alt="Moussandou"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=Moussandou`}
                                />
                            </div>
                            <h2 className={styles.name}>Moussandou</h2>
                            <span className={styles.role}>{t('credits.role')}</span>
                        </div>

                        <div className={styles.description}>
                            <p dangerouslySetInnerHTML={{ __html: t('credits.description_1') }} />
                            <p style={{ marginTop: '1rem' }}>
                                {t('credits.description_2')}
                            </p>
                        </div>

                        <div className={styles.techStack}>
                            <div className={styles.techTag} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Code size={16} /> REACT</div>
                            <div className={styles.techTag}>TYPESCRIPT</div>
                            <div className={styles.techTag}>VITE</div>
                            <div className={styles.techTag}>FIREBASE</div>
                            <div className={styles.techTag}>FRAMER MOTION</div>
                            <div className={styles.techTag}>ZUSTAND</div>
                        </div>

                        <div style={{ textAlign: 'center', margin: '2rem 0', fontStyle: 'italic', opacity: 0.7 }}>
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>{t('credits.made_with')} <Heart size={16} fill="currentColor" /> {t('credits.in_marseille')}</span>
                        </div>

                        <div className={styles.socialLinks}>
                            <a href="https://github.com/Moussandou" target="_blank" rel="noopener noreferrer" className={styles.socialBtn}>
                                <GithubIcon size={20} /> GitHub
                            </a>
                            <a href="https://www.linkedin.com/in/moussandou" target="_blank" rel="noopener noreferrer" className={styles.socialBtn}>
                                <LinkedinIcon size={20} /> LinkedIn
                            </a>
                            <a href="https://moussandou.github.io/Portfolio/" target="_blank" rel="noopener noreferrer" className={styles.socialBtn}>
                                <Globe size={20} /> Portfolio
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
