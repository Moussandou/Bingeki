/**
 * Guest Banner component (layout)
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';

export function GuestBanner() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const navigate = useNavigate();

    if (user) return null;

    return (
        <div style={{
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            padding: '1rem 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            borderBottom: '3px solid var(--color-primary)',
            borderTop: '2px solid var(--color-border-heavy)',
            marginBottom: '1rem'
        }}>
            <div>
                <p style={{ fontWeight: 900, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                    {t('discover.guest_banner.title')}
                </p>
                <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                    {t('discover.guest_banner.subtitle')}
                </p>
            </div>
            <Button onClick={() => navigate('/auth')} variant="primary" size="sm">
                {t('discover.guest_banner.cta')}
            </Button>
        </div>
    );
}
