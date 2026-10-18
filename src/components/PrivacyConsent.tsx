import { useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { getConsent, setConsent, subscribeConsent } from '@/services/consent';
import { Button } from '@/components/ui/Button';

export function PrivacyConsent({ inline = false }: { inline?: boolean }) {
    const consent = useSyncExternalStore(subscribeConsent, getConsent, () => null);
    const [failed, setFailed] = useState(false);
    const { i18n } = useTranslation();
    const en = i18n.resolvedLanguage?.startsWith('en');
    const save = (value: 'accepted' | 'rejected') => {
        const saved = setConsent(value);
        setFailed(!saved);
    };

    if (inline ? consent === null : consent !== null) return null;

    return (
        <aside
            aria-label={en ? 'Privacy preferences' : 'Confidentialité'}
            style={inline
                ? { marginTop: '2rem', maxWidth: '32rem' }
                : { position: 'fixed', bottom: '1rem', left: '1rem', maxWidth: 'min(32rem, calc(100vw - 2rem))', zIndex: 10000 }}
        >
            <div className="manga-panel" style={{ background: 'var(--color-surface)', color: 'var(--color-text)', padding: '1rem' }}>
                <p>{en
                    ? inline
                        ? 'Your current choice is saved. You can update it here at any time.'
                        : 'Optional Google Analytics measures usage and AdSense loads advertising. They stay off unless you accept. You can change your choice on the privacy page at any time.'
                    : inline
                        ? 'Votre choix actuel est enregistré. Vous pouvez le modifier ici à tout moment.'
                        : 'Google Analytics mesure les usages et AdSense charge la publicité. Ces services facultatifs restent désactivés sans votre accord. Vous pouvez modifier votre choix sur la page de confidentialité à tout moment.'}</p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                    <Button onClick={() => save('rejected')}>{en ? 'Refuse / withdraw' : 'Refuser / retirer'}</Button>
                    <Button onClick={() => save('accepted')}>{en ? 'Accept' : 'Accepter'}</Button>
                </div>
                {failed && <p role="alert">{en ? 'Preferences could not be saved.' : 'Impossible de sauvegarder votre choix.'}</p>}
            </div>
        </aside>
    );
}
