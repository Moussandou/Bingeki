import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Link } from '@/components/routing/LocalizedLink';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Privacy() {
    const { t } = useTranslation();

    return (
        <Layout>
            <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
                <Link to="/">
                    <Button variant="ghost" icon={<ArrowLeft size={20} />} style={{ marginBottom: '2rem' }}>
                        {t('common.back')}
                    </Button>
                </Link>

                <div className="manga-panel" style={{ background: 'var(--color-surface)', padding: '3rem', color: 'var(--color-text)' }}>
                    <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '3rem', marginBottom: '2rem', textTransform: 'uppercase' }}>
                        {t('privacy.title')}
                    </h1>

                    <section style={{ marginBottom: '3rem' }}>
                        <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>{t('privacy.intro')}</p>
                    </section>

                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1rem', borderBottom: '2px solid var(--color-border-heavy)', paddingBottom: '0.5rem' }}>
                            {t('privacy.cookies_title')}
                        </h2>
                        <p>{t('privacy.cookies_desc')}</p>
                    </section>

                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1rem', borderBottom: '2px solid var(--color-border-heavy)', paddingBottom: '0.5rem' }}>
                            {t('privacy.ads_title')}
                        </h2>
                        <p>{t('privacy.ads_desc')}</p>
                    </section>

                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1rem', borderBottom: '2px solid var(--color-border-heavy)', paddingBottom: '0.5rem' }}>
                            {t('privacy.data_title')}
                        </h2>
                        <p>{t('privacy.data_desc')}</p>
                    </section>

                </div>
            </div>
        </Layout>
    );
}
