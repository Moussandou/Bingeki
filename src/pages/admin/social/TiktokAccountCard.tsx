/**
 * Compte TikTok Bingeki : connexion (Login Kit) et état de la lecture des
 * stats TikTok de tous les posts. Les tokens restent côté serveur.
 */
import { useEffect, useState } from 'react';
import { Loader2, Music2, RefreshCw } from 'lucide-react';
import { logger } from '@/utils/logger';
import type { TiktokStatus } from '@/shared/socialBot';
import { getTiktokAuthUrl, subscribeToTiktokStatus, triggerCron } from '@/firebase/socialBot';
import { formatAgo, formatCount } from './helpers';
import s from './SocialBot.module.css';

export function TiktokAccountCard() {
    const [status, setStatus] = useState<TiktokStatus | null>(null);
    const [busy, setBusy] = useState<null | 'connect' | 'sync'>(null);

    useEffect(() => subscribeToTiktokStatus(setStatus), []);

    const connect = async () => {
        setBusy('connect');
        try {
            const { url } = await getTiktokAuthUrl();
            window.location.assign(url);
        } catch (e) {
            logger.error('[SocialBot] tiktok auth url failed:', e);
            alert('Impossible de lancer la connexion TikTok (voir console).');
            setBusy(null);
        }
    };

    const sync = async () => {
        setBusy('sync');
        try {
            const res = await triggerCron('tiktokStats');
            if (res?.result?.note) alert(`Stats TikTok : ${res.result.note}`);
        } catch (e) {
            logger.error('[SocialBot] tiktok sync failed:', e);
            alert(`La lecture TikTok a échoué : ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setBusy(null);
        }
    };

    const connected = !!status?.connected;

    return (
        <section className={s.panel} aria-labelledby="tiktok-title">
            <div className={s.sectionHead}>
                <h2 id="tiktok-title" className={s.panelTitle}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Music2 size={18} /> Compte TikTok</span>
                </h2>
                <span className={`${s.chip} ${connected && !status?.lastError ? s.chipOk : connected ? s.chipErr : ''}`}>
                    {connected ? (status?.lastError ? 'Erreur' : 'Connecté') : 'Pas connecté'}
                </span>
            </div>

            {connected ? (
                <>
                    <p className={s.muted}>
                        <strong>{status?.displayName || 'Bingeki'}</strong>
                        {typeof status?.followerCount === 'number' && <> · {formatCount(status.followerCount)} abonnés</>}
                        {typeof status?.videoCount === 'number' && <> · {status.videoCount} vidéos</>}
                    </p>
                    <p className={s.small}>
                        Les vues, likes, commentaires et partages de tous les posts TikTok sont lus tout seuls à 6h30 et 18h30, sans toucher au quota Buffer.
                        {' '}Dernière lecture : {status?.lastSyncAt ? formatAgo(status.lastSyncAt) : 'pas encore'}.
                    </p>
                    {status?.lastError && <p className={s.errText}>{status.lastError}</p>}
                </>
            ) : (
                <p className={s.muted}>
                    Connecte le compte TikTok Bingeki pour récupérer automatiquement les chiffres de tous les posts TikTok.
                </p>
            )}

            <div className={s.chipRow}>
                {connected && (
                    <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={sync} disabled={busy !== null}>
                        {busy === 'sync' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Lire maintenant
                    </button>
                )}
                <button
                    type="button"
                    className={`${s.btn} ${s.btnSmall} ${connected ? '' : s.btnPrimary}`}
                    onClick={connect}
                    disabled={busy !== null}
                >
                    {busy === 'connect' && <Loader2 size={14} className="animate-spin" />}
                    {connected ? 'Reconnecter' : 'Connecter TikTok'}
                </button>
            </div>
        </section>
    );
}
