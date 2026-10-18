/**
 * Admin Social Bot — /admin/social.
 *
 * Trois onglets : Valider (file + post sélectionné), Publiés (historique)
 * et Automatisations (modes, santé, outils). L'onglet et le post ouverts
 * vivent dans l'URL (?tab=…&post=…) pour pouvoir ouvrir un post précis
 * depuis le téléphone. Sur mobile, les onglets passent en barre du bas.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCheck, History, SlidersHorizontal } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import type { BotConfig, CronHealth, PendingPost, PublishedPost, WatchdogStatus } from '@/shared/socialBot';
import { DEFAULT_BOT_CONFIG } from '@/shared/socialBot';
import {
    subscribeToBotConfig, subscribeToCronHealth, subscribeToPendingPosts, subscribeToPublishedPosts,
    connectTiktok,
} from '@/firebase/socialBot';
import { logger } from '@/utils/logger';
import { PublishedPostModal } from '@/components/admin/PublishedPostModal';
import { ValidationView } from './social/ValidationView';
import { PublishedView } from './social/PublishedView';
import { AutomationsView } from './social/AutomationsView';
import { healthSummary } from './social/helpers';
import s from './social/SocialBot.module.css';

type Tab = 'valider' | 'publies' | 'autos';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'valider', label: 'Valider', icon: <CheckCheck size={20} /> },
    { id: 'publies', label: 'Publiés', icon: <History size={20} /> },
    { id: 'autos', label: 'Automatisations', icon: <SlidersHorizontal size={20} /> },
];

export default function AdminSocial() {
    const previewSuper = typeof window !== 'undefined'
        && window.location?.pathname?.includes('/_preview/admin-social');
    const isSuperAdmin = useAuthStore((state) => state.userProfile?.isSuperAdmin === true) || previewSuper;

    const [params, setParams] = useSearchParams();
    const tabParam = params.get('tab');
    const tab: Tab = tabParam === 'publies' || tabParam === 'autos' ? tabParam : 'valider';
    const activeId = params.get('post');

    const [pending, setPending] = useState<PendingPost[]>([]);
    const [published, setPublished] = useState<PublishedPost[]>([]);
    const [config, setConfig] = useState<BotConfig>(DEFAULT_BOT_CONFIG);
    const [health, setHealth] = useState<Record<string, CronHealth>>({});
    const [watchdog, setWatchdog] = useState<WatchdogStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [openPublished, setOpenPublished] = useState<PublishedPost | null>(null);
    // Retour de TikTok après l'autorisation du compte (Redirect URI de
    // Login Kit = cette page) : ?code=…&state=… ou ?error=…
    const [tiktokReturn] = useState(() => {
        const q = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
        return { code: q.get('code'), state: q.get('state'), error: q.get('error') };
    });
    const [notice, setNotice] = useState<string | null>(() => {
        if (tiktokReturn.error || (tiktokReturn.code && !tiktokReturn.state)) {
            return `Connexion TikTok annulée${tiktokReturn.error ? ` (${tiktokReturn.error})` : ''}.`;
        }
        return tiktokReturn.code ? 'Connexion du compte TikTok…' : null;
    });
    const tiktokHandled = useRef(false);
    useEffect(() => {
        const { code, state, error } = tiktokReturn;
        if (tiktokHandled.current || (!code && !error)) return;
        tiktokHandled.current = true;
        setParams((prev) => {
            const p = new URLSearchParams(prev);
            ['code', 'state', 'scopes', 'error', 'error_description'].forEach((k) => p.delete(k));
            p.set('tab', 'autos');
            return p;
        }, { replace: true });
        if (!code || !state) return;
        connectTiktok(code, state)
            .then((res) => setNotice(`Compte TikTok connecté.${res.note ? ` ${res.note}` : ''}`))
            .catch((e) => {
                logger.error('[AdminSocial] tiktok connect failed:', e);
                setNotice(`La connexion TikTok a échoué : ${e instanceof Error ? e.message : String(e)}`);
            });
    }, [tiktokReturn, setParams]);

    useEffect(() => {
        const unsubs = [
            subscribeToPendingPosts((posts) => { setPending(posts); setLoading(false); }),
            subscribeToPublishedPosts(setPublished, 60),
            subscribeToBotConfig(setConfig),
            subscribeToCronHealth((records, wd) => { setHealth(records); setWatchdog(wd); }),
        ];
        return () => unsubs.forEach((u) => u());
    }, []);

    const setTab = (next: Tab) => {
        setParams((prev) => {
            const p = new URLSearchParams(prev);
            if (next === 'valider') p.delete('tab'); else p.set('tab', next);
            return p;
        });
        window.scrollTo({ top: 0 });
    };

    const selectPost = useCallback((id: string | null) => {
        setParams((prev) => {
            const p = new URLSearchParams(prev);
            if (id) p.set('post', id); else p.delete('post');
            return p;
        }, { replace: true });
    }, [setParams]);

    const { failing, ok } = healthSummary(health);
    const toValidate = pending.filter((p) => !p.validatedAt).length;
    const toPublish = pending.length - toValidate;

    return (
        <div className={s.page}>
            <header className={s.header}>
                <div className={s.headerLeft}>
                    <span className={s.brand}>Social bot</span>
                    <nav className={s.tabs} aria-label="Sections du social bot">
                        {TABS.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                className={s.tab}
                                aria-current={tab === t.id ? 'page' : undefined}
                                onClick={() => setTab(t.id)}
                            >
                                {t.label}
                                {t.id === 'valider' && pending.length > 0 && <span className={s.tabCount}>{pending.length}</span>}
                            </button>
                        ))}
                    </nav>
                </div>
                <button type="button" className={s.healthPill} onClick={() => setTab('autos')}>
                    <span className={`${s.dot} ${ok ? s.dotOk : s.dotErr}`} aria-hidden="true" />
                    {ok ? 'Tout tourne' : `${failing.length} cron${failing.length > 1 ? 's' : ''} en erreur`}
                </button>
                <p className={s.mobileSummary}>
                    {toPublish > 0 && <><strong>{toPublish}</strong> à publier · </>}
                    <strong>{toValidate}</strong> à valider
                </p>
            </header>

            {!config.enabled && (
                <div className={s.banner} role="status">
                    Bot coupé : plus aucun post n'est généré ni publié automatiquement.
                    {isSuperAdmin && <button type="button" className={s.linkBtn} onClick={() => setTab('autos')}>Relancer</button>}
                </div>
            )}

            {notice && (
                <div className={s.banner} role="status">
                    {notice}
                    <button type="button" className={s.linkBtn} onClick={() => setNotice(null)}>Fermer</button>
                </div>
            )}

            <main className={s.content}>
                {tab === 'valider' && (
                    <ValidationView
                        pending={pending}
                        published={published}
                        config={config}
                        loading={loading}
                        activeId={activeId}
                        onSelect={selectPost}
                        onOpenPublished={setOpenPublished}
                        onShowAllPublished={() => setTab('publies')}
                    />
                )}
                {tab === 'publies' && <PublishedView published={published} onOpen={setOpenPublished} />}
                {tab === 'autos' && (
                    <AutomationsView config={config} health={health} watchdog={watchdog} published={published} isSuperAdmin={isSuperAdmin} />
                )}
            </main>

            <nav className={s.bottomNav} aria-label="Sections du social bot">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        className={s.bottomTab}
                        aria-current={tab === t.id ? 'page' : undefined}
                        onClick={() => setTab(t.id)}
                    >
                        {t.icon}
                        {t.id === 'autos' ? 'Autos' : t.label}
                    </button>
                ))}
            </nav>

            {openPublished && (
                <PublishedPostModal post={openPublished} onClose={() => setOpenPublished(null)} />
            )}
        </div>
    );
}
