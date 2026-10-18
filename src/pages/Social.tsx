import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, BookOpen, MessageCircle, PenLine, Settings, Trophy, Users } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/layout/SEO';
import { Button } from '@/components/ui/Button';
import { Link } from '@/components/routing/LocalizedLink';
import { useAuthStore } from '@/store/authStore';
import { useLibraryStore } from '@/store/libraryStore';
import { CommunityFeed } from '@/components/social/CommunityFeed';
import { CommunityThread } from '@/components/social/CommunityThread';
import { ReviewComposer } from '@/components/social/ReviewComposer';
import { CommunityDistinctions } from '@/components/social/CommunityDistinctions';
import { CommunitySettings } from '@/components/social/CommunitySettings';
import { CommunityHighlights } from '@/components/social/CommunityHighlights';
import { LegacySocialPanel } from '@/components/social/LegacySocialPanel';
import type { CommunityFilter } from '@/types/community';
import styles from '@/components/social/Community.module.css';

export default function Social() {
    const { t } = useTranslation('community');
    const { user } = useAuthStore();
    const { works } = useLibraryStore();
    const [params, setParams] = useSearchParams();
    const rawTab = params.get('tab') || 'feed';
    const tab = rawTab === 'challenges' || rawTab === 'ranking' ? 'distinctions' : rawTab === 'activity' ? 'friends' : rawTab;
    const filterParam = params.get('filter');
    const filter: CommunityFilter = filterParam === 'friends' || filterParam === 'following' || filterParam === 'discover' ? filterParam : 'readings';
    const [composing, setComposing] = useState(params.get('compose') === '1');
    const [refresh, setRefresh] = useState(0);
    const [revealedId, setRevealedId] = useState<string | null>(null);
    const postId = params.get('post');
    const workKey = params.get('work') || undefined;
    const unitParam = Number(params.get('unit'));
    const unit = Number.isInteger(unitParam) && unitParam > 0 && unitParam <= 5000 ? unitParam : null;
    const setTab = (next: string) => { setParams({ tab: next }); setComposing(false); setRevealedId(null); };
    const openPost = (id: string, reveal = false) => {
        setRevealedId(reveal ? id : null);
        setParams(current => { const next = new URLSearchParams(current); next.set('post', id); next.delete('compose'); return next; });
        setComposing(false);
    };
    const backToFeed = () => {
        setParams(current => { const next = new URLSearchParams(current); next.delete('post'); return next; });
        setRevealedId(null);
    };
    const changeFilter = (next: CommunityFilter) => {
        setParams(current => { const updated = new URLSearchParams(current); updated.set('filter', next); updated.delete('post'); return updated; });
    };

    return <Layout>
        <SEO title={t('pageTitle')} description={t('pageDescription')} />
        <div className={styles.page}>
            <header className={styles.hero}>
                <div><div className={styles.eyebrow}>{t('eyebrow')}</div><h1>{t('headline')}<span>{t('headlineAccent')}</span></h1><p>{t('intro')}</p></div>
                <div className={styles.heroActions}>
                    {user ? <Button icon={<PenLine size={18} />} onClick={() => { backToFeed(); setComposing(true); }}>{t('writeReview')}</Button> : <Link to="/auth" className={styles.textButton}>{t('signIn')} <ArrowUpRight size={16} /></Link>}
                    <button className={styles.textButton} onClick={() => setTab('friends')}><Users size={16} />{t('manageFriends')}</button>
                </div>
            </header>
            <nav className={styles.tabs} aria-label={t('navigation')}>
                {[
                    { id: 'feed', icon: <BookOpen size={18} /> },
                    { id: 'discussions', icon: <MessageCircle size={18} /> },
                    { id: 'distinctions', icon: <Trophy size={18} /> },
                ].map(item => <button key={item.id} aria-current={tab === item.id && !postId ? 'page' : undefined} onClick={() => setTab(item.id)}>{item.icon}{t(item.id)}</button>)}
                {user && <button className={styles.settingsButton} aria-label={t('preferences')} aria-current={tab === 'settings' ? 'page' : undefined} onClick={() => setTab('settings')}><Settings size={18} /></button>}
            </nav>
            {!user ? <CommunityFeed onOpen={openPost} /> : postId ? <CommunityThread key={`${user.uid}:${postId}`} id={postId} reveal={revealedId === postId} onBack={backToFeed} /> : <>
                {(tab === 'feed' || tab === 'discussions' || !['distinctions', 'friends', 'parties', 'settings', 'official'].includes(tab)) && <div className={styles.columns}>
                    <section className={styles.feedColumn} aria-label={t('feed')}>
                        {tab === 'discussions' ? <section className={styles.discussionPicker}>
                            <h2>{t('discussionsTitle')}</h2><p>{t('discussionsHint')}</p>
                            <label htmlFor="community-work">{t('work')}</label>
                            <select id="community-work" value={workKey || ''} onChange={e => setParams({ tab: 'discussions', ...(e.target.value ? { work: e.target.value } : {}) })}>
                                <option value="">{t('allWorks')}</option>
                                {works.map(work => <option key={`${work.type}:${work.id}`} value={`${work.type}:${work.id}`}>{work.title}</option>)}
                            </select>
                            <label htmlFor="discussion-unit">{t('unitFilter')}</label>
                            <input id="discussion-unit" type="number" min="1" max="5000" value={unit || ''} onChange={e => {
                                const next = new URLSearchParams(params);
                                if (e.target.value) next.set('unit', e.target.value); else next.delete('unit');
                                setParams(next, { replace: true });
                            }} />
                        </section> : <div className={styles.filters} role="group" aria-label={t('filterFeed')}>
                            {(['readings', 'friends', 'following', 'discover'] as const).map(value => <button key={value} aria-pressed={filter === value} onClick={() => changeFilter(value)}>{t(`filters.${value}`)}</button>)}
                        </div>}
                        {composing ? <ReviewComposer works={works} initialWorkKey={workKey} initialUnit={unit || undefined} onCancel={() => setComposing(false)} onSaved={() => { setComposing(false); setRefresh(v => v + 1); }} /> :
                            <button className={styles.composePrompt} onClick={() => setComposing(true)}><PenLine size={18} /><span>{t('composePrompt')}</span><ArrowUpRight size={18} /></button>}
                        <CommunityFeed key={`${user.uid}:${tab}:${filter}:${workKey}:${unit}`} filter={tab === 'discussions' ? 'discover' : filter} workKey={workKey} unit={tab === 'discussions' ? unit : null} refresh={refresh} onOpen={openPost} onDiscover={() => changeFilter('discover')} />
                    </section>
                    <aside className={styles.sidebar}>
                        <CommunityDistinctions key={refresh} compact />
                        <CommunityHighlights key={`highlights:${refresh}`} />
                        <section className={styles.sidebarNote}><div className={styles.eyebrow}>{t('houseRulesLabel')}</div><h3>{t('houseRulesTitle')}</h3><p>{t('houseRules')}</p></section>
                        <nav className={styles.secondaryLinks} aria-label={t('moreCommunity')}>
                            <button onClick={() => setTab('friends')}>{t('manageFriends')} →</button>
                            <button onClick={() => setTab('parties')}>{t('watchParties')} →</button>
                            <button onClick={() => setTab('official')}>{t('officialNews')} →</button>
                        </nav>
                    </aside>
                </div>}
                {tab === 'distinctions' && <div className={styles.fullPanel}>
                    <CommunityDistinctions />
                    <details open={rawTab === 'ranking'} className={styles.legacySection}><summary>{t('historicalRanking')}</summary><LegacySocialPanel activeTab="ranking" /></details>
                    <details open={rawTab === 'challenges'} className={styles.legacySection}><summary>{t('friendChallenges')}</summary><LegacySocialPanel activeTab="challenges" /></details>
                </div>}
                {tab === 'friends' && <div className={styles.fullPanel}><h2>{t('manageFriends')}</h2><LegacySocialPanel activeTab="friends" /><details className={styles.legacySection}><summary>{t('friendActivity')}</summary><LegacySocialPanel activeTab="activity" /></details></div>}
                {tab === 'parties' && <LegacySocialPanel activeTab="parties" />}
                {tab === 'official' && <LegacySocialPanel activeTab="feed" />}
                {tab === 'settings' && <CommunitySettings key={user.uid} />}
            </>}
        </div>
    </Layout>;
}
