import { Mail, MapPin, Globe, Briefcase, Coffee } from 'lucide-react';
import { DiscordIcon, TikTokIcon, GithubIcon, LinkedinIcon, InstagramIcon } from '@/components/ui/BrandIcons';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { InstallPWA } from '@/components/pwa/InstallPWA';
import { Link } from '@/components/routing/LocalizedLink';
import styles from './Footer.module.css';

export function Footer() {
    const { t } = useTranslation();
    const location = useLocation();
    const isLandingPage = /^\/(en|fr)?\/?$/.test(location.pathname);

    return (
        <footer className={styles.footer}>
            {/* Center "End" marker */}
            <div className={styles.endMarker}>
                {t('footer.tbc')}
            </div>

            <div className="container" style={{ textAlign: 'center', color: 'var(--color-text)' }}>

                {/* Contact Info Row */}
                <div className={styles.contactRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MapPin size={18} />
                        <span>Marseille, France</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Mail size={18} />
                        <a href="mailto:bingeki.official@gmail.com" style={{ color: 'var(--color-text)', textDecoration: 'none' }}>bingeki.official@gmail.com</a>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Link to="/feedback" style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: 900, borderBottom: '2px solid var(--color-text)' }}>
                            {t('footer.feedback')}
                        </Link>
                    </div>
                </div>

                {/* Social Icons Row */}
                <div className={styles.socialRow}>
                    <InstallPWA variant="footer" />
                    <div style={{ width: 1, height: 24, background: 'var(--color-border)', margin: '0 0.5rem' }} />
                    
                    {/* Highlighted Socials */}
                    <a href="https://discord.gg/gjkBRjsbWx" target="_blank" rel="noopener noreferrer"
                        title="Discord"
                        className={`${styles.socialIconActive} ${styles.discord}`}
                    >
                        <DiscordIcon size={24} />
                    </a>
                    <a href="https://www.tiktok.com/@bingeki" target="_blank" rel="noopener noreferrer"
                        title="TikTok"
                        className={`${styles.socialIconActive} ${styles.tiktok}`}
                    >
                        <TikTokIcon size={24} />
                    </a>
                    <a href="https://www.instagram.com/bingeki.fr" target="_blank" rel="noopener noreferrer"
                        title="Instagram"
                        className={`${styles.socialIconActive} ${styles.instagram}`}
                    >
                        <InstagramIcon size={24} />
                    </a>

                    <div style={{ width: 1, height: 24, background: 'var(--color-border)', margin: '0 0.5rem' }} />

                    {/* Other Links */}
                    <a href="https://github.com/Moussandou" target="_blank" rel="noopener noreferrer"
                        className={styles.socialIcon}
                    >
                        <GithubIcon size={20} />
                    </a>
                    <a href="https://www.linkedin.com/in/moussandou" target="_blank" rel="noopener noreferrer"
                        className={styles.socialIcon}
                    >
                        <LinkedinIcon size={20} />
                    </a>
                    <a href="https://www.malt.fr/profile/moussandoumroivili" target="_blank" rel="noopener noreferrer"
                        title="Malt"
                        className={styles.socialIcon}
                    >
                        <Briefcase size={20} />
                    </a>
                    <a href="https://moussandou.github.io/Portfolio/" target="_blank" rel="noopener noreferrer"
                        title="Portfolio"
                        className={styles.socialIcon}
                    >
                        <Globe size={20} />
                    </a>
                    {!isLandingPage && (
                        <a href="https://ko-fi.com/moussandou" target="_blank" rel="noopener noreferrer"
                            title="Ko-fi"
                            className={styles.socialIcon}
                        >
                            <Coffee size={20} color="#ff5e5b" />
                        </a>
                    )}
                </div>

                {/* Tips for Devs Section */}
                {isLandingPage && (
                    <div className={styles.supportSection}>
                        <div className={styles.supportTag}>
                            {t('landing.features.support.tag')}
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                            <p style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem', color: '#000' }}>
                                {t('landing.features.support.description_1')}
                            </p>
                            <p style={{ fontSize: '0.95rem', marginBottom: '1.5rem', color: '#000', opacity: 0.85 }}>
                                {t('landing.features.support.description_2')}
                            </p>
                            <a
                                href="https://ko-fi.com/moussandou"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.kofiButton}
                            >
                                <OptimizedImage
                                    src="/Ko-fi logo.gif"
                                    alt={t('landing.features.support.kofi_alt')}
                                    style={{
                                        height: '36px',
                                        display: 'block',
                                        margin: '0 auto'
                                    }}
                                    objectFit="contain"
                                    showSkeleton={false}
                                />
                            </a>
                            <p style={{ fontSize: '0.75rem', marginTop: '1rem', color: '#000', opacity: 0.7, fontWeight: 600 }}>
                                {t('footer.contribution_msg')}
                            </p>
                        </div>
                    </div>
                )}

                {/* Copyright & Legal */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                    <p style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6, fontSize: '0.8rem', margin: 0 }}>
                        &copy; {new Date().getFullYear()} {t('footer.copyright')}
                    </p>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <Link to="/changelog" style={{ color: 'var(--color-text)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, opacity: 0.8 }}>
                            {t('footer.changelog')}
                        </Link>
                        <a href="https://github.com/Moussandou/Bingeki-V2/wiki" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, opacity: 0.8 }}>
                            {t('footer.wiki')}
                        </a>
                        <Link to="/legal" style={{ color: 'var(--color-text)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, opacity: 0.8 }}>
                            {t('footer.legal')}
                        </Link>
                        <Link to="/privacy" style={{ color: 'var(--color-text)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, opacity: 0.8 }}>
                            {t('footer.privacy')}
                        </Link>
                        <Link to="/terms" style={{ color: 'var(--color-text)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, opacity: 0.8 }}>
                            {t('footer.terms')}
                        </Link>
                        <Link to="/contact" style={{ color: 'var(--color-text)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, opacity: 0.8 }}>
                            {t('footer.contact')}
                        </Link>
                        <Link to="/about" style={{ color: 'var(--color-text)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, opacity: 0.8 }}>
                            {t('footer.about')}
                        </Link>
                        <Link to="/news" style={{ color: 'var(--color-text)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, opacity: 0.8 }}>
                            Anime News
                        </Link>
                        <Link to="/credits" style={{ color: 'var(--color-text)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, opacity: 0.8 }}>
                            {t('footer.credits')}
                        </Link>
                        <Link to="/donors" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 900, opacity: 1, textShadow: '0 0 10px var(--color-primary-glow)' }}>
                            {t('footer.donors')}
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

