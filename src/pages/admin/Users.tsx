/**
 * Users page
 */
import { useState, useEffect, useMemo } from 'react';
import { Search, Shield, Ban, ExternalLink, Edit, Eye, Trash2, Clock, Circle, ArrowUpDown, LayoutGrid, List } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { getAllUsers, toggleUserBan, toggleUserAdmin, adminUpdateUserGamification, deleteUserData, type UserProfile } from '@/firebase/firestore';
import { Link } from '@/components/routing/LocalizedLink';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

export default function AdminUsers() {
    const { t } = useTranslation();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [filter, setFilter] = useState<'all' | 'admin' | 'banned'>('all');

    // Modal State
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [modalType, setModalType] = useState<'level' | 'details' | null>(null);
    const [editLevel, setEditLevel] = useState(1);
    const [editXp, setEditXp] = useState(0);
    const [sortBy, setSortBy] = useState<'lastLogin' | 'createdAt' | 'xp' | 'level' | 'name'>('lastLogin');

    const formatRelativeDate = (timestamp: number | undefined) => {
        if (!timestamp) return '-';
        const diffMs = Date.now() - timestamp;
        const diffMin = Math.floor(diffMs / 60000);
        const diffH = Math.floor(diffMs / 3600000);
        const diffD = Math.floor(diffMs / 86400000);
        if (diffMin < 1) return "A l'instant";
        if (diffMin < 60) return `Il y a ${diffMin} min`;
        if (diffH < 24) return `Il y a ${diffH}h`;
        if (diffD < 30) return `Il y a ${diffD}j`;
        return new Date(timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const isOnline = (lastLogin: number | undefined) => {
        if (!lastLogin) return false;
        return (Date.now() - lastLogin) < 15 * 60 * 1000;
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const data = await getAllUsers();
                setUsers(data as UserProfile[]);
            } catch (e) {
                console.error("Failed to load users", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const filteredUsers = useMemo(() => {
        let filtered = users.filter(user => {
            const matchesSearch = 
                (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (user.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (user.uid.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesFilter = 
                filter === 'all' ? true :
                filter === 'admin' ? user.isAdmin :
                filter === 'banned' ? user.isBanned : true;

            return matchesSearch && matchesFilter;
        });
        return [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'lastLogin': return (b.lastLogin || 0) - (a.lastLogin || 0);
                case 'createdAt': return (b.createdAt || b.lastLogin || 0) - (a.createdAt || a.lastLogin || 0);
                case 'xp': return (b.xp || 0) - (a.xp || 0);
                case 'level': return (b.level || 0) - (a.level || 0);
                case 'name': return (a.displayName || '').localeCompare(b.displayName || '');
                default: return 0;
            }
        });
    }, [users, searchTerm, sortBy]);

    const handleBan = async (uid: string, currentStatus?: boolean) => {
        const action = currentStatus ? t('admin.users.action_unban') : t('admin.users.action_ban');
        if (!confirm(t('admin.users.confirm_ban', { action }))) return;

        // Optimistic update
        setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isBanned: !currentStatus } : u));

        try {
            await toggleUserBan(uid, !currentStatus);
        } catch {
            alert(t('admin.users.update_error'));
            // Revert
            setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isBanned: currentStatus } : u));
        }
    };

    const handleAdmin = async (uid: string, currentStatus?: boolean) => {
        const action = currentStatus ? t('admin.users.action_remove') : t('admin.users.action_give');
        if (!confirm(t('admin.users.confirm_admin', { action }))) return;

        setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isAdmin: !currentStatus } : u));

        try {
            await toggleUserAdmin(uid, !currentStatus);
        } catch {
            alert(t('admin.users.update_error'));
            setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isAdmin: currentStatus } : u));
        }
    };

    const openLevelModal = (user: UserProfile) => {
        setSelectedUser(user);
        setEditLevel(user.level || 1);
        setEditXp(user.xp || 0);
        setModalType('level');
    };

    const openDetailsModal = (user: UserProfile) => {
        setSelectedUser(user);
        setModalType('details');
    };

    const handleSaveLevel = async () => {
        if (!selectedUser) return;
        try {
            await adminUpdateUserGamification(selectedUser.uid, Number(editLevel), Number(editXp));
            setUsers(prev => prev.map(u => u.uid === selectedUser.uid ? { ...u, level: Number(editLevel), xp: Number(editXp) } : u));
            setModalType(null);
            alert("User stats updated successfully!");
        } catch (e) {
            console.error(e);
            alert("Failed to update user stats.");
        }
    };

    const handleDeleteAccount = async (uid: string, name: string) => {
        if (!confirm(t('admin.users.confirm_delete', { name }))) return;

        try {
            await deleteUserData(uid);
            setUsers(prev => prev.filter(u => u.uid !== uid));
            alert(t('admin.users.delete_success'));
        } catch (error) {
            console.error(error);
            alert(t('admin.users.delete_error'));
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                        {t('admin.users.title')}
                    </h1>
                    <p style={{ color: 'var(--color-text-dim)', fontFamily: 'monospace' }}>
                        {t('admin.users.members_count', { count: users.length })}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flex: '1', minWidth: '280px' }}>
                        <input
                            type="text"
                            placeholder={t('admin.users.search_placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: '0.75rem 1rem 0.75rem 2.5rem',
                                border: '2px solid var(--color-border)',
                                fontFamily: 'monospace',
                                width: '100%',
                                outline: 'none',
                                background: 'var(--color-surface)',
                                color: 'var(--color-text)',
                                fontSize: '0.9rem'
                            }}
                        />
                        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
                    </div>

                    {/* Sort */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
                        <ArrowUpDown size={14} style={{ color: 'var(--color-text-dim)', marginRight: '0.25rem' }} />
                        {([
                            { key: 'lastLogin', label: 'Connexion' },
                            { key: 'createdAt', label: 'Inscription' },
                            { key: 'xp', label: 'XP' },
                            { key: 'level', label: 'Niveau' },
                            { key: 'name', label: 'Nom' },
                        ] as const).map(opt => (
                            <button
                                key={opt.key}
                                onClick={() => setSortBy(opt.key)}
                                style={{
                                    padding: '0.4rem 0.7rem',
                                    border: sortBy === opt.key ? '2px solid var(--color-text)' : '2px solid var(--color-border)',
                                    background: sortBy === opt.key ? 'var(--color-text)' : 'var(--color-surface)',
                                    color: sortBy === opt.key ? 'var(--color-surface)' : 'var(--color-text)',
                                    fontFamily: 'monospace',
                                    fontSize: '0.75rem',
                                    fontWeight: sortBy === opt.key ? 900 : 500,
                                    cursor: 'pointer',
                                    textTransform: 'uppercase',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Filter Toggle */}
                    <div style={{ display: 'flex', border: '2px solid var(--color-border)', overflow: 'hidden' }}>
                        {(['all', 'admin', 'banned'] as const).map(opt => (
                            <button
                                key={opt}
                                onClick={() => setFilter(opt)}
                                style={{
                                    padding: '0.4rem 0.8rem',
                                    background: filter === opt ? 'var(--color-primary)' : 'var(--color-surface)',
                                    color: filter === opt ? 'white' : 'var(--color-text)',
                                    border: 'none',
                                    borderRight: opt !== 'banned' ? '1px solid var(--color-border)' : 'none',
                                    cursor: 'pointer',
                                    fontFamily: 'monospace',
                                    fontSize: '0.7rem',
                                    fontWeight: 900,
                                    textTransform: 'uppercase'
                                }}
                            >
                                {opt === 'all' ? 'Tous' : opt === 'admin' ? 'Admins' : 'Bannis'}
                            </button>
                        ))}
                    </div>

                    {/* View Toggle */}
                    <div style={{ display: 'flex', border: '2px solid var(--color-border)', overflow: 'hidden', marginLeft: 'auto' }}>
                        <button
                            onClick={() => setViewMode('grid')}
                            style={{
                                padding: '0.4rem 0.6rem',
                                background: viewMode === 'grid' ? 'var(--color-text)' : 'var(--color-surface)',
                                color: viewMode === 'grid' ? 'var(--color-surface)' : 'var(--color-text)',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            title="Vue Grille"
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            style={{
                                padding: '0.4rem 0.6rem',
                                background: viewMode === 'table' ? 'var(--color-text)' : 'var(--color-surface)',
                                color: viewMode === 'table' ? 'var(--color-surface)' : 'var(--color-text)',
                                borderLeft: '2px solid var(--color-border)',
                                borderTop: 'none',
                                borderBottom: 'none',
                                borderRight: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            title="Vue Tableau"
                        >
                            <List size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>
                    <p>{t('admin.users.loading')}</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {filteredUsers.map(user => (
                        <Card key={user.uid} variant="manga" style={{
                            padding: '1.5rem',
                            background: 'var(--color-surface)',
                            position: 'relative',
                            opacity: user.isBanned ? 0.7 : 1,
                            filter: user.isBanned ? 'grayscale(100%)' : 'none'
                        }}>
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{
                                        width: '48px', height: '48px',
                                        borderRadius: '50%',
                                        border: '2px solid var(--color-border)',
                                        overflow: 'hidden',
                                        background: 'var(--color-surface-hover)'
                                    }}>
                                        {user.photoURL && (
                                            <OptimizedImage
                                                src={user.photoURL}
                                                alt=""
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        )}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {user.displayName || t('admin.users.no_name')}
                                        </h3>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                                    </div>
                                </div>
                                {user.isAdmin && (
                                    <div style={{ background: 'var(--color-text)', color: 'var(--color-surface)', padding: '0.25rem 0.5rem', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                        <Shield size={10} /> {t('admin.users.admin')}
                                    </div>
                                )}
                            </div>

                            {/* Connection status */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: '0.5rem', fontFamily: 'monospace' }}>
                                {isOnline(user.lastLogin) ? (
                                    <span style={{ color: '#22c55e', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Circle size={8} fill="#22c55e" /> En ligne
                                    </span>
                                ) : (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Clock size={11} /> Connecte {formatRelativeDate(user.lastLogin)}
                                    </span>
                                )}
                            </div>

                            {/* Registration date */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: 'var(--color-text-dim)', marginBottom: '0.5rem', fontFamily: 'monospace' }}>
                                {user.createdAt
                                    ? `Inscrit le ${new Date(user.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
                                    : 'Inscription inconnue'
                                }
                            </div>

                            {/* Stats Strip */}
                            <div style={{ display: 'flex', gap: '1rem', padding: '0.5rem 0', borderTop: '1px solid #eee', borderBottom: '1px solid #eee', marginBottom: '1rem', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                                <div>LVL <b>{user.level || 1}</b></div>
                                <div>XP <b>{user.xp || 0}</b></div>
                                <div>Ban <b>{user.isBanned ? t('admin.users.ban_yes') : t('admin.users.ban_no')}</b></div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Ban size={16} /> {t('admin.users.ban')}
                                    </span>
                                    <Switch isOn={!!user.isBanned} onToggle={() => handleBan(user.uid, user.isBanned)} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Shield size={16} /> {t('admin.users.admin')}
                                    </span>
                                    <Switch isOn={!!user.isAdmin} onToggle={() => handleAdmin(user.uid, user.isAdmin)} />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openLevelModal(user)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}
                                    >
                                        <Edit size={14} /> Edit Level
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openDetailsModal(user)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}
                                    >
                                        <Eye size={14} /> Details
                                    </Button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    <Link to={`/profile/${user.uid}`} style={{
                                        padding: '0.5rem',
                                        background: 'var(--color-text)',
                                        color: 'var(--color-surface)',
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase',
                                        fontSize: '0.75rem',
                                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px'
                                    }}>
                                        <ExternalLink size={14} /> View
                                    </Link>

                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteAccount(user.uid, user.displayName || 'User')}
                                        style={{
                                            color: '#ef4444',
                                            border: '1px solid currentColor',
                                            fontSize: '0.75rem',
                                            fontWeight: 900,
                                            display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center'
                                        }}
                                    >
                                        <Trash2 size={14} /> Delete
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div style={{ background: 'var(--color-surface)', border: '3px solid var(--color-border)', overflowX: 'auto', width: '100%', marginTop: '0.5rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                        <thead style={{ background: 'var(--color-text)', color: 'var(--color-surface)' }}>
                            <tr>
                                <th style={{ padding: '1rem', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>User</th>
                                <th style={{ padding: '1rem', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>Stats</th>
                                <th style={{ padding: '1rem', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>Status</th>
                                <th style={{ padding: '1rem', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>Role</th>
                                <th style={{ padding: '1rem', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 900, fontFamily: 'var(--font-heading)', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user, idx) => (
                                <tr key={user.uid} style={{ 
                                    borderBottom: '1px solid var(--color-border)',
                                    background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                                    opacity: user.isBanned ? 0.6 : 1
                                }}>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                                                {user.photoURL && <OptimizedImage src={user.photoURL} alt="" />}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{user.displayName || 'N/A'}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', fontFamily: 'monospace' }}>{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                        Lvl <b>{user.level || 1}</b> • XP <b>{user.xp || 0}</b>
                                    </td>
                                    <td style={{ padding: '1rem', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                        {isOnline(user.lastLogin) ? (
                                            <span style={{ color: '#22c55e', fontWeight: 800 }}>● Online</span>
                                        ) : (
                                            <span style={{ opacity: 0.7 }}>{formatRelativeDate(user.lastLogin)}</span>
                                        )}
                                        {user.isBanned && <div style={{ color: '#ef4444', fontWeight: 900, textTransform: 'uppercase', marginTop: '2px' }}>BANNED</div>}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {user.isAdmin ? (
                                            <span style={{ background: 'var(--color-text)', color: 'var(--color-surface)', padding: '2px 6px', fontSize: '0.65rem', fontWeight: 900 }}>ADMIN</span>
                                        ) : (
                                            <span style={{ opacity: 0.5, fontSize: '0.65rem' }}>USER</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button 
                                                onClick={() => openDetailsModal(user)}
                                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text)' }}
                                                title="Details"
                                            ><Eye size={18} /></button>
                                            <button 
                                                onClick={() => openLevelModal(user)}
                                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text)' }}
                                                title="Edit Stats"
                                            ><Edit size={18} /></button>
                                            <button 
                                                onClick={() => openDetailsModal(user)}
                                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-primary)' }}
                                                title="View Details"
                                            ><Eye size={18} /></button>
                                            <button 
                                                onClick={() => handleBan(user.uid, user.isBanned)}
                                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: user.isBanned ? '#22c55e' : '#ef4444' }}
                                                title={user.isBanned ? 'Unban' : 'Ban'}
                                            ><Ban size={18} /></button>
                                            <Link to={`/profile/${user.uid}`} style={{ color: 'var(--color-text)' }} title="View Profile"><ExternalLink size={18} /></Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Level Edit Modal */}
            <Modal isOpen={modalType === 'level'} onClose={() => setModalType(null)} title="Edit User Stats">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Level</label>
                        <Input type="number" value={editLevel} onChange={(e) => setEditLevel(Number(e.target.value))} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>XP</label>
                        <Input type="number" value={editXp} onChange={(e) => setEditXp(Number(e.target.value))} />
                    </div>
                    <Button onClick={handleSaveLevel} style={{ width: '100%' }}>Save Changes</Button>
                </div>
            </Modal>

            {/* User Details Modal */}
            <Modal isOpen={modalType === 'details'} onClose={() => setModalType(null)} title="User Details">
                {selectedUser && (
                    <div style={{
                        maxHeight: '70vh',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                    }}>
                        {/* Basic Info */}
                        <div style={{ background: 'var(--color-surface)', border: '2px solid var(--color-border)', padding: '1rem' }}>
                            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', marginBottom: '0.75rem', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.5rem' }}>BASIC INFO</h3>
                            <table style={{ width: '100%', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                                <tbody>
                                    <tr><td style={{ fontWeight: 'bold', padding: '0.25rem 0', width: '40%' }}>UID:</td><td style={{ wordBreak: 'break-all' }}>{selectedUser.uid}</td></tr>
                                    <tr><td style={{ fontWeight: 'bold', padding: '0.25rem 0' }}>Display Name:</td><td>{selectedUser.displayName || 'N/A'}</td></tr>
                                    <tr><td style={{ fontWeight: 'bold', padding: '0.25rem 0' }}>Email:</td><td>{selectedUser.email || 'N/A'}</td></tr>
                                    <tr><td style={{ fontWeight: 'bold', padding: '0.25rem 0' }}>Photo URL:</td><td style={{ wordBreak: 'break-all', fontSize: '0.75rem' }}>{selectedUser.photoURL || 'N/A'}</td></tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Gamification */}
                        <div style={{ background: 'var(--color-surface)', border: '2px solid var(--color-border)', padding: '1rem' }}>
                            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', marginBottom: '0.75rem', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.5rem' }}>GAMIFICATION</h3>
                            <table style={{ width: '100%', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                                <tbody>
                                    <tr><td style={{ fontWeight: 'bold', padding: '0.25rem 0', width: '40%' }}>Level:</td><td>{selectedUser.level || 1}</td></tr>
                                    <tr><td style={{ fontWeight: 'bold', padding: '0.25rem 0' }}>XP:</td><td>{(selectedUser.xp || 0).toLocaleString()}</td></tr>
                                    <tr><td style={{ fontWeight: 'bold', padding: '0.25rem 0' }}>Streak:</td><td>{selectedUser.streak || 0} days</td></tr>
                                    <tr><td style={{ fontWeight: 'bold', padding: '0.25rem 0' }}>Last Login:</td><td>{selectedUser.lastLogin || 'N/A'}</td></tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Admin Status */}
                        <div style={{ background: 'var(--color-surface)', border: '2px solid var(--color-border)', padding: '1rem' }}>
                            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', marginBottom: '0.75rem', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.5rem' }}>PERMISSIONS</h3>
                            <table style={{ width: '100%', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                                <tbody>
                                    <tr><td style={{ fontWeight: 'bold', padding: '0.25rem 0', width: '40%' }}>Is Admin:</td><td>{selectedUser.isAdmin ? '✅ YES' : '❌ NO'}</td></tr>
                                    <tr><td style={{ fontWeight: 'bold', padding: '0.25rem 0' }}>Is Banned:</td><td>{selectedUser.isBanned ? '🚫 YES' : '✅ NO'}</td></tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Profile Customization */}
                        {(selectedUser.banner || selectedUser.bio || selectedUser.themeColor) && (
                            <div style={{ background: 'var(--color-surface)', border: '2px solid var(--color-border)', padding: '1rem' }}>
                                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', marginBottom: '0.75rem', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.5rem' }}>PROFILE CUSTOMIZATION</h3>
                                <table style={{ width: '100%', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                                    <tbody>
                                        <tr><td style={{ fontWeight: 'bold', padding: '0.25rem 0', width: '40%' }}>Banner:</td><td style={{ wordBreak: 'break-all', fontSize: '0.75rem' }}>{selectedUser.banner || 'N/A'}</td></tr>
                                        <tr><td style={{ fontWeight: 'bold', padding: '0.25rem 0' }}>Bio:</td><td>{selectedUser.bio || 'N/A'}</td></tr>
                                        <tr>
                                            <td style={{ fontWeight: 'bold', padding: '0.25rem 0' }}>Colors:</td>
                                            <td>
                                                {selectedUser.themeColor && <span style={{ marginRight: '8px' }}>Theme: <span style={{ color: selectedUser.themeColor }}>■</span></span>}
                                                {selectedUser.cardBgColor && <span style={{ marginRight: '8px' }}>Card: <span style={{ color: selectedUser.cardBgColor }}>■</span></span>}
                                                {selectedUser.borderColor && <span>Border: <span style={{ color: selectedUser.borderColor }}>■</span></span>}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Raw JSON (Collapsed) */}
                        <details style={{ background: 'var(--color-surface)', border: '2px solid var(--color-border)', padding: '1rem' }}>
                            <summary style={{ fontFamily: 'var(--font-heading)', fontWeight: 'bold', cursor: 'pointer' }}>📄 VIEW RAW JSON</summary>
                            <pre style={{ marginTop: '1rem', fontSize: '0.75rem', overflow: 'auto', background: 'var(--color-surface-hover)', padding: '1rem', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                                {JSON.stringify(selectedUser, null, 2)}
                            </pre>
                        </details>
                    </div>
                )}
            </Modal>
        </div>
    );
}
