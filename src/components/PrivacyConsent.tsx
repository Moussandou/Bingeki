import { useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { getConsent, setConsent, subscribeConsent } from '@/services/consent';
import { Button } from '@/components/ui/Button';

export function PrivacyConsent() {
    const consent = useSyncExternalStore(subscribeConsent, getConsent, () => null);
    const [editing, setEditing] = useState(false);
    const [failed, setFailed] = useState(false);
    const { i18n } = useTranslation();
    const en = i18n.resolvedLanguage?.startsWith('en');
    const save = (value: 'accepted' | 'rejected') => {
        const saved = setConsent(value);
        setFailed(!saved);
        if (saved) setEditing(false);
    };

    return (
        <aside aria-label={en ? 'Privacy preferences' : 'Confidentialité'}
            style={{ position: 'fixed', bottom: '1rem', left: '1rem', maxWidth: 'min(32rem, calc(100vw - 2rem))', zIndex: 10000 }}>
            {consent !== null && !editing ? (
                <Button variant="ghost" onClick={() => setEditing(true)}>
                    {en ? 'Privacy preferences' : 'Confidentialité'}
                </Button>
            ) : (
                <div className="manga-panel" style={{ background: 'var(--color-surface)', color: 'var(--color-text)', padding: '1rem' }}>
                    <p>{en
                        ? 'Optional Google Analytics measures usage and AdSense loads advertising. They stay off unless you accept. You can refuse or withdraw here at any time.'
                        : 'Google Analytics mesure les usages et AdSense charge la publicité. Ces services facultatifs restent désactivés sans votre accord. Vous pouvez refuser ou retirer votre accord ici à tout moment.'}</p>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                        <Button onClick={() => save('rejected')}>{en ? 'Refuse / withdraw' : 'Refuser / retirer'}</Button>
                        <Button onClick={() => save('accepted')}>{en ? 'Accept' : 'Accepter'}</Button>
                    </div>
                    {failed && <p role="alert">{en ? 'Preferences could not be saved.' : 'Impossible de sauvegarder votre choix.'}</p>}
                </div>
            )}
        </aside>
    );
}
