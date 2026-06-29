/**
 * Admin Command Palette (Cmd+K)
 * Navigation rapide, recherche d'utilisateurs et actions admin
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, LayoutDashboard, Users, MessageSquare,
    Activity, Settings, User, Zap
} from 'lucide-react';
import { searchUsersByPrefix, type UserProfile } from '@/firebase/firestore';
import styles from './CommandPalette.module.css';

interface CommandItem {
    id: string;
    label: string;
    hint?: string;
    icon: React.ReactNode;
    action: () => void;
    section: 'navigation' | 'action' | 'user';
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: Props) {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const [userResults, setUserResults] = useState<UserProfile[]>([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const go = useCallback((path: string) => {
        navigate(path);
        onClose();
    }, [navigate, onClose]);

    const staticCommands: CommandItem[] = [
        { id: 'dashboard', label: 'Dashboard', hint: '/admin', icon: <LayoutDashboard size={16} />, action: () => go('/admin'), section: 'navigation' },
        { id: 'users', label: 'Utilisateurs', hint: '/admin/users', icon: <Users size={16} />, action: () => go('/admin/users'), section: 'navigation' },
        { id: 'feedback', label: 'Feedback', hint: '/admin/feedback', icon: <MessageSquare size={16} />, action: () => go('/admin/feedback'), section: 'navigation' },
        { id: 'health', label: 'Système & Santé', hint: '/admin/health', icon: <Activity size={16} />, action: () => go('/admin/health'), section: 'navigation' },
        { id: 'survey', label: 'Survey Dashboard', hint: '/admin/survey', icon: <Settings size={16} />, action: () => go('/admin/survey'), section: 'navigation' },
        { id: 'migrations', label: 'Migrations', hint: '/admin/migrations', icon: <Zap size={16} />, action: () => go('/admin/migrations'), section: 'navigation' },
        { id: 'analytics-growth', label: 'Analytics: Growth', hint: '/admin/analytics/growth', icon: <Activity size={16} />, action: () => go('/admin/analytics/growth'), section: 'navigation' },
        { id: 'analytics-retention', label: 'Analytics: Rétention', hint: '/admin/analytics/retention', icon: <Activity size={16} />, action: () => go('/admin/analytics/retention'), section: 'navigation' },
        { id: 'analytics-engagement', label: 'Analytics: Engagement', hint: '/admin/analytics/engagement', icon: <Activity size={16} />, action: () => go('/admin/analytics/engagement'), section: 'navigation' },
    ];

    // Fuzzy filter
    const filtered = query.trim()
        ? staticCommands.filter(c =>
            c.label.toLowerCase().includes(query.toLowerCase()) ||
            (c.hint || '').toLowerCase().includes(query.toLowerCase())
        )
        : staticCommands;

    // User results as CommandItems
    const userCommands: CommandItem[] = userResults.map(u => ({
        id: `user-${u.uid}`,
        label: u.displayName || u.email || u.uid,
        hint: u.email || u.uid.slice(0, 12) + '...',
        icon: <User size={16} />,
        action: () => { go(`/admin/users?highlight=${u.uid}`); },
        section: 'user' as const
    }));

    const allItems = [...filtered, ...userCommands];

    // User search with debounce
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (query.length < 2) {
            setUserResults([]);
            return;
        }
        setSearchingUsers(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const results = await searchUsersByPrefix(query, 5);
                setUserResults(results);
            } catch {
                setUserResults([]);
            } finally {
                setSearchingUsers(false);
            }
        }, 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query]);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setActiveIndex(0);
            setUserResults([]);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Keyboard nav
    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(i => Math.min(i + 1, allItems.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(i => Math.max(i - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (allItems[activeIndex]) allItems[activeIndex].action();
                break;
            case 'Escape':
                onClose();
                break;
        }
    };

    // Reset index when results change
    useEffect(() => { setActiveIndex(0); }, [filtered.length, userResults.length]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.palette} onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
                <div className={styles.inputWrapper}>
                    <Search size={18} style={{ opacity: 0.4 }} />
                    <input
                        ref={inputRef}
                        className={styles.input}
                        type="text"
                        placeholder="Rechercher une page, un user, une action..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className={styles.results}>
                    {filtered.length > 0 && (
                        <>
                            {filtered.map((item, idx) => (
                                <button
                                    key={item.id}
                                    className={`${styles.item} ${activeIndex === idx ? styles.itemActive : ''}`}
                                    onClick={item.action}
                                    onMouseEnter={() => setActiveIndex(idx)}
                                >
                                    {item.icon}
                                    <span className={styles.itemLabel}>{item.label}</span>
                                    {item.hint && <span className={styles.itemHint}>{item.hint}</span>}
                                </button>
                            ))}
                        </>
                    )}

                    {userCommands.length > 0 && (
                        <>
                            <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', opacity: 0.4 }}>
                                Utilisateurs
                            </div>
                            {userCommands.map((item, idx) => {
                                const globalIdx = filtered.length + idx;
                                return (
                                    <button
                                        key={item.id}
                                        className={`${styles.item} ${activeIndex === globalIdx ? styles.itemActive : ''}`}
                                        onClick={item.action}
                                        onMouseEnter={() => setActiveIndex(globalIdx)}
                                    >
                                        {item.icon}
                                        <span className={styles.itemLabel}>{item.label}</span>
                                        <span className={styles.itemHint}>{item.hint}</span>
                                    </button>
                                );
                            })}
                        </>
                    )}

                    {searchingUsers && (
                        <div style={{ padding: '0.75rem', fontSize: '0.8rem', opacity: 0.5, textAlign: 'center' }}>
                            Recherche...
                        </div>
                    )}

                    {query.length > 0 && allItems.length === 0 && !searchingUsers && (
                        <div style={{ padding: '2rem', textAlign: 'center', fontSize: '0.85rem', opacity: 0.4 }}>
                            Aucun résultat
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <span><span className={styles.kbd}>↑↓</span> naviguer</span>
                    <span><span className={styles.kbd}>↵</span> ouvrir</span>
                    <span><span className={styles.kbd}>esc</span> fermer</span>
                </div>
            </div>
        </div>
    );
}
