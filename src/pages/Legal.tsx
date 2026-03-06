import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Link } from '@/components/routing/LocalizedLink';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Legal() {
    const { t } = useTranslation();

    return (
        <Layout>
            <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
                <Link to="/">
                    <Button variant="ghost" icon={<ArrowLeft size={20} />} style={{ marginBottom: '2rem' }}>
                        {t('legal.back')}
                    </Button>
                </Link>

                <div className="manga-panel" style={{ background: 'var(--color-surface)', padding: '3rem', color: 'var(--color-text)' }}>
                    <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '3rem', marginBottom: '2rem', textTransform: 'uppercase' }}>
                        {t('legal.title')}
                    </h1>

                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1rem', borderBottom: '2px solid var(--color-border-heavy)', paddingBottom: '0.5rem' }}>{t('legal.section1_title')}</h2>
                        <p><strong>{t('legal.name')}</strong> Moussandou Mroivili</p>
                        <p><strong>{t('legal.address')}</strong> Marseille, France</p>
                        <p><strong>{t('legal.contact')}</strong> bingeki.official@gmail.com</p>
                        <p><strong>{t('legal.status')}</strong> {t('legal.status_value')}</p>
                    </section>

                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1rem', borderBottom: '2px solid var(--color-border-heavy)', paddingBottom: '0.5rem' }}>{t('legal.section2_title')}</h2>
                        <p>{t('legal.hosting_text')}</p>
                        <p>{t('legal.hosting_data')}</p>
                    </section>

                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1rem', borderBottom: '2px solid var(--color-border-heavy)', paddingBottom: '0.5rem' }}>{t('legal.section3_title')}</h2>
                        <p>{t('legal.ip_design')}</p>
                        <p>{t('legal.ip_images')}</p>
                    </section>

                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1rem', borderBottom: '2px solid var(--color-border-heavy)', paddingBottom: '0.5rem' }}>{t('legal.section4_title')}</h2>
                        <p style={{ marginBottom: '1rem' }}>{t('legal.gdpr_intro')}</p>
                        <ul style={{ listStyle: 'disc', paddingLeft: '2rem', lineHeight: '1.6' }}>
                            <li><strong>{t('legal.gdpr_collect_title')}</strong> {t('legal.gdpr_collect')}</li>
                            <li><strong>{t('legal.gdpr_responsible_title')}</strong> {t('legal.gdpr_responsible')}</li>
                            <li><strong>{t('legal.gdpr_access_title')}</strong> {t('legal.gdpr_access')}</li>
                            <li><strong>{t('legal.gdpr_share_title')}</strong> {t('legal.gdpr_share')}</li>
                            <li><strong>{t('legal.gdpr_cookies_title')}</strong> {t('legal.gdpr_cookies')}</li>
                        </ul>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1rem', borderBottom: '2px solid var(--color-border-heavy)', paddingBottom: '0.5rem' }}>{t('legal.section5_title')}</h2>
                        <p>{t('legal.contact_text')} <strong>bingeki.official@gmail.com</strong></p>
                    </section>
                </div>
            </div>
        </Layout>
    );
}
