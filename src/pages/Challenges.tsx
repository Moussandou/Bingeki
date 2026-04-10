/**
 * Challenges page
 */
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/layout/Layout';

export default function Challenges() {
    const { t } = useTranslation();

    return (
        <Layout>
            <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
                <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem' }}>{t('challenges.title')}</h1>
                <p>{t('challenges.description')}</p>
            </div>
        </Layout>
    );
}
