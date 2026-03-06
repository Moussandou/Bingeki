import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Link } from '@/components/routing/LocalizedLink';
import { ArrowLeft, Mail, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Contact() {
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
                        {t('contact.title')}
                    </h1>

                    <section style={{ marginBottom: '3rem' }}>
                        <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>{t('contact.intro')}</p>
                    </section>

                    <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ padding: '1.5rem', border: '2px solid var(--color-border)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Mail size={24} style={{ color: 'var(--color-primary)' }} />
                            <div>
                                <h3 style={{ margin: 0, fontWeight: 800 }}>{t('contact.email_label')}</h3>
                                <a href="mailto:bingeki.official@gmail.com" style={{ color: 'var(--color-text)', textDecoration: 'none' }}>bingeki.official@gmail.com</a>
                            </div>
                        </div>

                        <div style={{ padding: '1.5rem', border: '2px solid var(--color-border)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <MessageSquare size={24} style={{ color: 'var(--color-primary)' }} />
                            <div>
                                <h3 style={{ margin: 0, fontWeight: 800 }}>{t('footer.feedback')}</h3>
                                <Link to="/feedback" style={{ color: 'var(--color-text)', textDecoration: 'underline' }}>
                                    Envoyer un feedback via le formulaire
                                </Link>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </Layout>
    );
}
