import { useState, useEffect, useCallback } from 'react';
import { GitCommit, GitFork, Star, Info, RefreshCw, ExternalLink } from 'lucide-react';
import styles from './Orga.module.css';

interface GitHubRepo {
    name: string;
    full_name: string;
    description: string;
    html_url: string;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    pushed_at: string;
}

interface GitHubCommit {
    sha: string;
    html_url: string;
    commit: {
        author: {
            name: string;
            date: string;
        };
        message: string;
    };
    author?: {
        login: string;
        avatar_url: string;
        html_url: string;
    };
}

export function RepoStats() {
    const [repoInfo, setRepoInfo] = useState<GitHubRepo | null>(null);
    const [commits, setCommits] = useState<GitHubCommit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch repo info
            const repoRes = await fetch('https://api.github.com/repos/Moussandou/Bingeki-V2');
            if (!repoRes.ok) {
                throw new Error(`Erreur lors du chargement des infos dépôt (${repoRes.status})`);
            }
            const repoData = await repoRes.json();
            setRepoInfo(repoData);

            // Fetch latest 5 commits
            const commitsRes = await fetch('https://api.github.com/repos/Moussandou/Bingeki-V2/commits?per_page=5');
            if (commitsRes.ok) {
                const commitsData = await commitsRes.json();
                setCommits(commitsData);
            }
        } catch (err: any) {
            console.error('Error fetching GitHub data:', err);
            setError(err.message || 'Impossible de se connecter à GitHub.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatRelativeTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMin = Math.round(diffMs / 60000);
            const diffHours = Math.round(diffMs / 3600000);
            const diffDays = Math.round(diffMs / 86400000);

            if (diffMin < 60) return `Il y a ${diffMin} min`;
            if (diffHours < 24) return `Il y a ${diffHours} h`;
            if (diffDays < 7) return `Il y a ${diffDays} j`;
            return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        } catch {
            return '';
        }
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem',
                border: '3px solid #000',
                background: '#fff',
                boxShadow: '4px 4px 0 #000',
                gap: 'var(--space-md)'
            }}>
                <RefreshCw size={24} style={{ animation: 'spin 2s linear infinite' }} />
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.85rem' }}>
                    CHARGEMENT DES INFOS DEPO...
                </span>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                padding: '2rem',
                border: '3px solid #000',
                background: '#fee2e2',
                color: '#991b1b',
                boxShadow: '4px 4px 0 #000',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-sm)'
            }}>
                <div style={{ fontWeight: 900, fontSize: '1rem', fontFamily: 'var(--font-heading)' }}>
                    ⚠️ ERREUR GITHUB
                </div>
                <p style={{ fontSize: '0.8rem' }}>{error}</p>
                <button
                    onClick={fetchData}
                    className={`${styles.btnManga} ${styles.btnSecondary} ${styles.btnSmall}`}
                    style={{ alignSelf: 'flex-start', marginTop: '0.5rem', border: '2px solid #000' }}
                >
                    Réessayer
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            
            {/* Stats Dashboard Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                
                {/* Repo Meta Card */}
                <div style={{ border: '3px solid #000', boxShadow: '4px 4px 0 #000', background: '#fff', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: 800, textTransform: 'uppercase' }}>Dépôt</div>
                    <a
                        href={repoInfo?.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1rem', color: '#000', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                        {repoInfo?.name}
                        <ExternalLink size={12} />
                    </a>
                    <span style={{ fontSize: '0.75rem', color: '#333', fontStyle: 'italic' }}>
                        {repoInfo?.description || 'Pas de description.'}
                    </span>
                </div>

                {/* Stars Card */}
                <div style={{ border: '3px solid #000', boxShadow: '4px 4px 0 #000', background: '#fff', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: '#fef08a', border: '2px solid #000', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
                        <Star size={20} color="#000" fill="#000" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: 800, textTransform: 'uppercase' }}>Stars</div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.25rem' }}>
                            {repoInfo?.stargazers_count}
                        </div>
                    </div>
                </div>

                {/* Forks Card */}
                <div style={{ border: '3px solid #000', boxShadow: '4px 4px 0 #000', background: '#fff', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: '#e0f2fe', border: '2px solid #000', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
                        <GitFork size={20} color="#000" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: 800, textTransform: 'uppercase' }}>Forks</div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.25rem' }}>
                            {repoInfo?.forks_count}
                        </div>
                    </div>
                </div>

                {/* Issues Card */}
                <div style={{ border: '3px solid #000', boxShadow: '4px 4px 0 #000', background: '#fff', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: '#fee2e2', border: '2px solid #000', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
                        <Info size={20} color="#000" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: 800, textTransform: 'uppercase' }}>Issues ouvertes</div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.25rem' }}>
                            {repoInfo?.open_issues_count}
                        </div>
                    </div>
                </div>
            </div>

            {/* Commits Section */}
            <div style={{ border: '3px solid #000', boxShadow: '6px 6px 0 #000', background: '#fff', padding: 'var(--space-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #000', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <GitCommit size={18} />
                        Derniers commits
                    </h3>
                    <button
                        onClick={fetchData}
                        className={`${styles.btnManga} ${styles.btnSecondary} ${styles.btnSmall}`}
                        style={{ border: '2px solid #000', padding: '0.2rem 0.5rem' }}
                    >
                        <RefreshCw size={11} style={{ marginRight: 2 }} />
                        Actualiser
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {commits.map((c) => {
                        const avatarUrl = c.author?.avatar_url;
                        const login = c.author?.login || c.commit.author.name;
                        const dateStr = formatRelativeTime(c.commit.author.date);
                        
                        return (
                            <div key={c.sha} style={{
                                border: '2px solid #000',
                                padding: '0.75rem',
                                background: '#fafafa',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem'
                            }}>
                                {/* Author Avatar */}
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={login}
                                        style={{ width: '32px', height: '32px', border: '2px solid #000', borderRadius: '50%' }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        border: '2px solid #000',
                                        borderRadius: '50%',
                                        background: '#ddd',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.7rem',
                                        fontWeight: 'bold'
                                    }}>
                                        {login.slice(0, 2).toUpperCase()}
                                    </div>
                                )}

                                {/* Commit Info */}
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {c.commit.message.split('\n')[0]}
                                    </span>
                                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.7rem', color: '#666', marginTop: '0.15rem' }}>
                                        <span style={{ fontWeight: 800 }}>{login}</span>
                                        <span>•</span>
                                        <span>{dateStr}</span>
                                    </div>
                                </div>

                                {/* Link to SHA */}
                                <a
                                    href={c.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        fontFamily: 'monospace',
                                        fontSize: '0.75rem',
                                        border: '2px solid #000',
                                        padding: '0.1rem 0.4rem',
                                        background: '#fff',
                                        color: '#000',
                                        fontWeight: 'bold',
                                        textDecoration: 'none'
                                    }}
                                >
                                    {c.sha.slice(0, 7)}
                                </a>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
