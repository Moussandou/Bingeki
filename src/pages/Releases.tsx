/**
 * Releases — page unifiée Agenda (semaine) + Saisons. Sélection du
 * mode via `?mode=week|season` sur l'URL pour que l'onglet actif
 * survive à un partage de lien ou un back/forward.
 *
 * Les panels internes gardent leur propre styling (Schedule.module.css
 * et Seasons.module.css) — cette page n'apporte que le wrapper, le
 * titre commun et le tabs switcher.
 */

import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/layout/SEO';
import { Calendar, CalendarRange } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SchedulePanel } from '@/components/releases/SchedulePanel';
import { SeasonsPanel } from '@/components/releases/SeasonsPanel';
import styles from './Releases.module.css';

type Mode = 'week' | 'season';

function readMode(param: string | null): Mode {
    return param === 'season' ? 'season' : 'week';
}

export default function Releases() {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const mode = readMode(searchParams.get('mode'));

    const switchMode = (next: Mode) => {
        if (next === mode) return;
        const params = new URLSearchParams(searchParams);
        params.set('mode', next);
        // Purge les params spécifiques à l'autre mode pour ne pas polluer.
        if (next === 'week') {
            params.delete('year');
            params.delete('season');
        }
        setSearchParams(params, { replace: true });
    };

    return (
        <Layout>
            <SEO title={t('releases.title', 'Sorties anime')} />
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>
                        {mode === 'week'
                            ? <Calendar size={40} />
                            : <CalendarRange size={40} />}
                        {t('releases.title')}
                    </h1>
                    <p style={{ opacity: 0.7 }}>{t('releases.subtitle')}</p>
                </div>

                <div className={styles.tabs} role="tablist">
                    <button
                        role="tab"
                        aria-selected={mode === 'week'}
                        className={`${styles.tab} ${mode === 'week' ? styles.active : ''}`}
                        onClick={() => switchMode('week')}
                    >
                        <Calendar size={18} /> {t('releases.tab_week')}
                    </button>
                    <button
                        role="tab"
                        aria-selected={mode === 'season'}
                        className={`${styles.tab} ${mode === 'season' ? styles.active : ''}`}
                        onClick={() => switchMode('season')}
                    >
                        <CalendarRange size={18} /> {t('releases.tab_season')}
                    </button>
                </div>

                {mode === 'week' ? <SchedulePanel /> : <SeasonsPanel />}
            </div>
        </Layout>
    );
}
