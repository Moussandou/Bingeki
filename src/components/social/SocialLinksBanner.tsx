import { DiscordIcon, TikTokIcon, InstagramIcon } from '@/components/ui/BrandIcons';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export function SocialLinksBanner() {
    const { t } = useTranslation();

    const socials = [
        {
            name: 'Discord',
            icon: <DiscordIcon size={24} />,
            url: 'https://discord.gg/gjkBRjsbWx',
            color: '#5865F2',
            title: t('dashboard.community_discord'),
            desc: t('dashboard.community_discord_desc'),
            shadow: '8px 8px 0 rgba(88, 101, 242, 0.3)'
        },
        {
            name: 'TikTok',
            icon: <TikTokIcon size={24} />,
            url: 'https://www.tiktok.com/@bingeki',
            color: '#FE2C55',
            title: t('dashboard.community_tiktok'),
            desc: t('dashboard.community_tiktok_desc'),
            shadow: '8px 8px 0 rgba(254, 44, 85, 0.3)'
        },
        {
            name: 'Instagram',
            icon: <InstagramIcon size={24} />,
            url: 'https://www.instagram.com/bingeki.fr',
            color: '#E4405F',
            title: t('dashboard.community_instagram'),
            desc: t('dashboard.community_instagram_desc'),
            shadow: '8px 8px 0 rgba(228, 64, 95, 0.3)'
        }
    ];

    return (
        <section style={{ marginBottom: '4rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ 
                    fontFamily: 'var(--font-heading)', 
                    fontSize: '1.8rem', 
                    fontWeight: 900, 
                    margin: 0,
                    textTransform: 'uppercase'
                }}>
                    {t('dashboard.community_title')}
                </h2>
                <p style={{ opacity: 0.7, fontSize: '0.9rem', fontWeight: 600 }}>
                    {t('dashboard.community_subtitle')}
                </p>
            </div>

            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                gap: '1.5rem' 
            }}>
                {socials.map((social) => (
                    <motion.a
                        key={social.name}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ y: -8, x: -4 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            textDecoration: 'none',
                            color: 'inherit',
                            display: 'block'
                        }}
                    >
                        <div style={{
                            background: 'var(--color-surface)',
                            border: '3px solid var(--color-border-heavy)',
                            padding: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1.25rem',
                            boxShadow: social.shadow,
                            position: 'relative',
                            overflow: 'hidden',
                            height: '100%',
                            minHeight: '100px'
                        }}>
                            {/* Colorful accent line */}
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: '6px',
                                background: social.color
                            }} />

                            <div style={{
                                width: '50px',
                                height: '50px',
                                background: social.color,
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                border: '2px solid var(--color-text)',
                                boxShadow: '4px 4px 0 var(--color-text)'
                            }}>
                                {social.icon}
                            </div>

                            <div style={{ flex: 1 }}>
                                <h3 style={{
                                    margin: 0,
                                    fontSize: '1rem',
                                    fontWeight: 900,
                                    fontFamily: 'var(--font-heading)',
                                    textTransform: 'uppercase',
                                    color: 'var(--color-text-contrast)'
                                }}>
                                    {social.title}
                                </h3>
                                <p style={{
                                    margin: '0.25rem 0 0',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    opacity: 0.8,
                                    color: 'var(--color-text-muted)'
                                }}>
                                    {social.desc}
                                </p>
                            </div>
                        </div>
                    </motion.a>
                ))}
            </div>
        </section>
    );
}
