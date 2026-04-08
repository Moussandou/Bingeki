import { Layout } from '@/components/layout/Layout';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { useSettingsStore } from '@/store/settingsStore';
import type { TitleLanguage, ProfileVisibility } from '@/store/settingsStore';
import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, Trash2, Palette, HardDrive, Download, Upload, Info, Github, ShieldAlert, BookOpen, Lock, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';
import { useLibraryStore } from '@/store/libraryStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { useTutorialStore } from '@/store/tutorialStore';
import { SEO } from '@/components/layout/SEO';
import { useToast } from '@/context/ToastContext';
import { getLocalStorageSize, exportData, importData, clearImageCache } from '@/utils/storageUtils';
import { useAuthStore } from '@/store/authStore';
import { saveLibraryToFirestore, saveGamificationToFirestore, deleteUserData, saveUserProfileToFirestore } from '@/firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { MALImportModal } from '@/components/library/MALImportModal';

/** Reusable pill-style option selector */
function OptionSelector<T extends string>({ options, value, onChange }: {
    options: { value: T; label: string; sublabel?: string }[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {options.map(opt => {
                const active = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            border: active ? '2px solid var(--color-accent, #FF2E63)' : '1px solid var(--color-border)',
                            background: active ? 'color-mix(in srgb, var(--color-accent, #FF2E63) 15%, transparent)' : 'var(--color-surface)',
                            color: active ? 'var(--color-accent, #FF2E63)' : 'var(--color-text)',
                            cursor: 'pointer',
                            fontWeight: active ? 700 : 500,
                            fontSize: '0.85rem',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.15rem',
                            minWidth: '90px',
                        }}
                    >
                        <span>{opt.label}</span>
                        {opt.sublabel && (
                            <span style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 400 }}>
                                {opt.sublabel}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}


export default function Settings() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [showConfirmReset, setShowConfirmReset] = useState(false);
    const [storageSize] = useState(() => getLocalStorageSize());
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { user } = useAuthStore();

    const {
        reducedMotion,
        soundEnabled,
        notifications,
        spoilerMode,
        accentColor,
        toggleReducedMotion,
        toggleSound,
        toggleNotifications,
        toggleSpoilerMode,
        nsfwMode,
        toggleNsfwMode,
        setAccentColor,
        // New settings
        titleLanguage,
        setTitleLanguage,
        hideScores,
        toggleHideScores,
        dataSaver,
        toggleDataSaver,
        profileVisibility,
        setProfileVisibility,
        showActivityStatus,
        toggleActivityStatus,
    } = useSettingsStore();



    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const resetAll = async () => {
        try {
            // Reset Zustand stores
            useLibraryStore.getState().resetStore();
            useGamificationStore.getState().resetStore();

            // Save empty data to Firestore
            if (user) {
                await saveLibraryToFirestore(user.uid, []);
                await saveGamificationToFirestore(user.uid, {
                    level: 1,
                    xp: 0,
                    totalXp: 0,
                    xpToNextLevel: 100,
                    streak: 0,
                    lastActivityDate: null,
                    badges: [],
                    totalChaptersRead: 0,
                    totalWorksAdded: 0,
                    totalWorksCompleted: 0,
                    totalAnimeEpisodesWatched: 0,
                    totalMoviesWatched: 0,
                    bonusXp: 0
                });
            }

            // Clear localStorage
            localStorage.clear();

            addToast(t('settings.toast.reset_success'), 'success');

            // Reload after a short delay to show the toast
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            addToast(t('settings.toast.reset_error'), 'error');
            console.error(error);
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            await importData(file);
            addToast(t('settings.toast.import_success'), 'success');
        } catch {
            addToast(t('settings.toast.import_error'), 'error');
        }
    };

    const [showConfirmAccountDelete, setShowConfirmAccountDelete] = useState(false);
    const [showMALImportModal, setShowMALImportModal] = useState(false);

    const handleDeleteAccount = async () => {
        if (!user) return;

        try {
            // 1. Delete Firestore Data
            await deleteUserData(user.uid);

            // 2. Delete Auth Account
            await deleteUser(user);

            // 3. Clear Local State
            useLibraryStore.getState().resetStore();
            useGamificationStore.getState().resetStore();
            localStorage.clear();

            addToast(t('settings.toast.account_deleted'), 'success');
            navigate('/');
        } catch (error) {
            console.error('Delete account error:', error);
            if ((error as { code?: string }).code === 'auth/requires-recent-login') {
                addToast(t('settings.toast.relogin_required'), 'error');
            } else {
                addToast(t('settings.toast.delete_error'), 'error');
            }
        }
    };

    const handleClearCache = () => {
        clearImageCache();
        addToast(t('settings.toast.cache_cleared'), 'success');
    };

    const COLORS = [
        { name: t('settings.colors.red'), value: '#FF2E63' },
        { name: t('settings.colors.cyan'), value: '#08D9D6' },
        { name: t('settings.colors.green'), value: '#10B981' },
        { name: t('settings.colors.yellow'), value: '#F59E0B' },
        { name: t('settings.colors.purple'), value: '#8B5CF6' },
    ];

    const TITLE_OPTIONS: { value: TitleLanguage; label: string; sublabel: string }[] = [
        { value: 'romaji', label: t('settings.content.title_default'), sublabel: t('settings.content.title_default_example') },
        { value: 'english', label: t('settings.content.title_english'), sublabel: t('settings.content.title_english_example') },
        { value: 'native', label: t('settings.content.title_japanese'), sublabel: t('settings.content.title_japanese_example') },
    ];

    const VISIBILITY_OPTIONS: { value: ProfileVisibility; label: string; sublabel: string }[] = [
        { value: 'public', label: t('settings.privacy.visibility_public'), sublabel: t('settings.privacy.visibility_public_desc') },
        { value: 'friends', label: t('settings.privacy.visibility_friends'), sublabel: t('settings.privacy.visibility_friends_desc') },
        { value: 'private', label: t('settings.privacy.visibility_private'), sublabel: t('settings.privacy.visibility_private_desc') },
    ];

    return (
        <Layout>
            <SEO title={t('settings.title', 'Settings')} />
            <div style={{ minHeight: 'calc(100vh - 80px)' }}>
                <div className="container" style={{ paddingBottom: '4rem', paddingTop: '2rem', maxWidth: '800px' }}>

                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        <Button variant="manga" size="icon" onClick={() => navigate(-1)}>
                            <ArrowLeft size={20} />
                        </Button>
                        <h1 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', color: 'var(--color-text)' }}>
                            {t('settings.title')}
                        </h1>
                    </div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                        {/* Personnalisation */}
                        <section>
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-heading)', fontWeight: 900, color: 'var(--color-text)' }}>
                                <Palette size={20} /> {t('settings.appearance.title')}
                            </h2>
                            <div className="manga-panel" style={{ padding: '1.5rem', background: 'var(--color-surface)', color: 'var(--color-text)' }}>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{t('settings.appearance.accent_color')}</p>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {COLORS.map(c => (
                                            <button
                                                key={c.value}
                                                onClick={() => setAccentColor(c.value)}
                                                style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '50%',
                                                    background: c.value,
                                                    border: accentColor === c.value ? '3px solid var(--color-border-heavy)' : '1px solid var(--color-border)',
                                                    cursor: 'pointer',
                                                    transform: accentColor === c.value ? 'scale(1.1)' : 'scale(1)',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                title={c.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div style={{ height: '1px', background: 'var(--color-border)', margin: '1rem 0' }} />
                                <Switch
                                    label={t('settings.appearance.spoiler_mode')}
                                    isOn={spoilerMode}
                                    onToggle={() => {
                                        toggleSpoilerMode();
                                        addToast(!spoilerMode ? t('settings.appearance.spoiler_enabled') : t('settings.appearance.spoiler_disabled'), 'info');
                                    }}
                                />
                                <p style={{ fontSize: '0.85rem', opacity: 0.6, marginTop: '0.5rem' }}>
                                    {t('settings.appearance.spoiler_help')}
                                </p>
                                <div style={{ height: '1px', background: 'var(--color-border)', margin: '1rem 0' }} />
                                <Switch
                                    label={t('settings.appearance.nsfw_mode')}
                                    isOn={nsfwMode}
                                    onToggle={() => {
                                        toggleNsfwMode();
                                        addToast(!nsfwMode ? t('settings.appearance.nsfw_enabled') : t('settings.appearance.nsfw_disabled'), 'info');
                                    }}
                                />
                                <p style={{ fontSize: '0.85rem', opacity: 0.6, marginTop: '0.5rem' }}>
                                    {t('settings.appearance.nsfw_help')}
                                </p>
                                <div style={{ height: '1px', background: 'var(--color-border)', margin: '1rem 0' }} />
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        useTutorialStore.getState().resetTutorial();
                                        useTutorialStore.getState().startTutorial();
                                        navigate('/dashboard');
                                    }}
                                    style={{ width: '100%', justifyContent: 'center' }}
                                >
                                    {t('settings.appearance.restart_tutorial')}
                                </Button>
                            </div>
                        </section>

                        {/* Contenu & Affichage */}
                        <section>
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-heading)', fontWeight: 900, color: 'var(--color-text)' }}>
                                <BookOpen size={20} /> {t('settings.content.title')}
                            </h2>
                            <div className="manga-panel" style={{ padding: '1.5rem', background: 'var(--color-surface)', color: 'var(--color-text)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {/* Title Language */}
                                <div>
                                    <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{t('settings.content.title_language')}</p>
                                    <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '0.75rem' }}>
                                        {t('settings.content.title_language_help')}
                                    </p>
                                    <OptionSelector
                                        options={TITLE_OPTIONS}
                                        value={titleLanguage}
                                        onChange={(v) => {
                                            setTitleLanguage(v);
                                            if (user) {
                                                saveUserProfileToFirestore({ uid: user.uid, titlePriority: v }, true)
                                                    .catch(err => console.error('Failed to sync title language:', err));
                                            }
                                        }}
                                    />
                                </div>

                                <div style={{ height: '1px', background: 'var(--color-border)' }} />

                                {/* Hide Scores */}
                                <Switch
                                    label={t('settings.content.hide_scores')}
                                    isOn={hideScores}
                                    onToggle={() => {
                                        const newValue = !hideScores;
                                        toggleHideScores();
                                        if (user) {
                                            saveUserProfileToFirestore({ uid: user.uid, hideScores: newValue }, true)
                                                .catch(err => console.error('Failed to sync hide scores:', err));
                                        }
                                        addToast(newValue ? t('settings.content.hide_scores_enabled') : t('settings.content.hide_scores_disabled'), 'info');
                                    }}
                                />
                                <p style={{ fontSize: '0.85rem', opacity: 0.6, marginTop: '-0.5rem' }}>
                                    {t('settings.content.hide_scores_help')}
                                </p>

                                <div style={{ height: '1px', background: 'var(--color-border)' }} />

                                {/* Data Saver */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Wifi size={16} style={{ opacity: 0.5 }} />
                                    <div style={{ flex: 1 }}>
                                        <Switch
                                            label={t('settings.content.data_saver')}
                                            isOn={dataSaver}
                                            onToggle={() => {
                                                const newValue = !dataSaver;
                                                toggleDataSaver();
                                                if (user) {
                                                    saveUserProfileToFirestore({ uid: user.uid, dataSaver: newValue }, true)
                                                        .catch(err => console.error('Failed to sync data saver:', err));
                                                }
                                                addToast(newValue ? t('settings.content.data_saver_enabled') : t('settings.content.data_saver_disabled'), 'info');
                                            }}
                                        />
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.85rem', opacity: 0.6, marginTop: '-0.5rem' }}>
                                    {t('settings.content.data_saver_help')}
                                </p>
                            </div>
                        </section>

                        {/* Confidentialité */}
                        <section>
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-heading)', fontWeight: 900, color: 'var(--color-text)' }}>
                                <Lock size={20} /> {t('settings.privacy.title')}
                            </h2>
                            <div className="manga-panel" style={{ padding: '1.5rem', background: 'var(--color-surface)', color: 'var(--color-text)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {/* Profile Visibility */}
                                <div>
                                    <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{t('settings.privacy.profile_visibility')}</p>
                                    <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '0.75rem' }}>
                                        {t('settings.privacy.profile_visibility_help')}
                                    </p>
                                    <OptionSelector
                                        options={VISIBILITY_OPTIONS}
                                        value={profileVisibility}
                                        onChange={(v) => {
                                            setProfileVisibility(v);
                                            if (user) {
                                                saveUserProfileToFirestore({ uid: user.uid, profileVisibility: v }, true)
                                                    .catch(err => console.error('Failed to sync visibility:', err));
                                            }
                                        }}
                                    />

                                </div>

                                <div style={{ height: '1px', background: 'var(--color-border)' }} />

                                {/* Activity Status */}
                                <Switch
                                    label={t('settings.privacy.activity_status')}
                                    isOn={showActivityStatus}
                                    onToggle={() => {
                                        const newValue = !showActivityStatus;
                                        toggleActivityStatus();
                                        if (user) {
                                            saveUserProfileToFirestore({ uid: user.uid, showActivityStatus: newValue }, true)
                                                .catch(err => console.error('Failed to sync activity status:', err));
                                        }
                                        addToast(newValue ? t('settings.privacy.activity_status_enabled') : t('settings.privacy.activity_status_disabled'), 'info');
                                    }}
                                />
                                <p style={{ fontSize: '0.85rem', opacity: 0.6, marginTop: '-0.5rem' }}>
                                    {t('settings.privacy.activity_status_help')}
                                </p>
                            </div>
                        </section>

                        {/* Accessibilité & Audio */}
                        <section>
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-heading)', fontWeight: 900, color: 'var(--color-text)' }}>
                                <Volume2 size={20} /> {t('settings.preferences.title')}
                            </h2>
                            <div className="manga-panel" style={{ padding: '1.5rem', background: 'var(--color-surface)', color: 'var(--color-text)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <Switch
                                    label={t('settings.preferences.reduce_motion')}
                                    isOn={reducedMotion}
                                    onToggle={toggleReducedMotion}
                                />
                                <div style={{ height: '1px', background: 'var(--color-border)' }} />
                                <Switch
                                    label={t('settings.preferences.sound_effects')}
                                    isOn={soundEnabled}
                                    onToggle={toggleSound}
                                />
                                <div style={{ height: '1px', background: 'var(--color-border)' }} />
                                <Switch
                                    label={t('settings.preferences.notifications')}
                                    isOn={notifications}
                                    onToggle={toggleNotifications}
                                />
                            </div>
                        </section>

                        {/* Stockage & Données */}
                        <section>
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-heading)', fontWeight: 900, color: 'var(--color-text)' }}>
                                <HardDrive size={20} /> {t('settings.data.title')}
                            </h2>
                            <div className="manga-panel" style={{ padding: '1.5rem', background: 'var(--color-surface)', color: 'var(--color-text)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <div>
                                        <p style={{ fontWeight: 700 }}>{t('settings.data.storage_used')}</p>
                                        <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>{t('settings.data.storage_local', { size: storageSize })}</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={handleClearCache}>
                                        <Trash2 size={16} /> {t('settings.data.clear_cache')}
                                    </Button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <Button variant="outline" onClick={exportData} icon={<Download size={18} />} style={{ justifyContent: 'center' }}>
                                        {t('settings.data.export_backup')}
                                    </Button>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".json"
                                            onChange={handleImport}
                                            style={{ display: 'none' }}
                                        />
                                        <Button variant="outline" style={{ width: '100%', justifyContent: 'center' }} icon={<Upload size={18} />} onClick={handleImportClick}>
                                            {t('settings.data.import_backup')}
                                        </Button>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <Button variant="outline" style={{ width: '100%', justifyContent: 'center' }} icon={<Upload size={18} />} onClick={() => setShowMALImportModal(true)}>
                                        {t('mal_import.import_mal')}
                                    </Button>
                                </div>
                                <div style={{ height: '1px', background: 'var(--color-border)', margin: '1rem 0' }} />

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <p style={{ fontWeight: 700, color: '#ef4444' }}>{t('settings.data.danger_zone')}</p>
                                            <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>{t('settings.data.danger_desc')}</p>
                                        </div>
                                        {!showConfirmReset ? (
                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <Button variant="outline" size="sm" onClick={() => setShowConfirmReset(true)} style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                                                    <ShieldAlert size={16} /> {t('settings.data.reset_all')}
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => setShowConfirmAccountDelete(true)} style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                                                    <Trash2 size={16} /> {t('settings.data.delete_account')}
                                                </Button>
                                            </div>
                                        ) : showConfirmReset ? (
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '0.8rem', color: '#ef4444', alignSelf: 'center', fontWeight: 'bold' }}>{t('settings.data.confirm_sure')}</span>
                                                <Button variant="ghost" size="sm" onClick={() => setShowConfirmReset(false)}>{t('settings.data.no')}</Button>
                                                <Button variant="primary" size="sm" onClick={resetAll} style={{ background: '#ef4444' }}>{t('settings.data.yes_reset')}</Button>
                                            </div>
                                        ) : null}

                                        {/* Account Deletion Confirmation */}
                                        {showConfirmAccountDelete && (
                                            <div style={{ marginTop: '1rem', padding: '1rem', border: '2px solid #ef4444', background: '#fef2f2' }}>
                                                <p style={{ fontWeight: 700, color: '#ef4444', marginBottom: '0.5rem' }}>{t('settings.data.delete_confirm_title')}</p>
                                                <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                                                    {t('settings.data.delete_confirm_desc')}
                                                </p>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <Button variant="ghost" size="sm" onClick={() => setShowConfirmAccountDelete(false)}>{t('settings.data.cancel')}</Button>
                                                    <Button variant="primary" size="sm" onClick={handleDeleteAccount} style={{ background: '#ef4444' }}>
                                                        {t('settings.data.goodbye')}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* À propos */}
                        <section>
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-heading)', fontWeight: 900, color: 'var(--color-text)' }}>
                                <Info size={20} /> {t('settings.about.title')}
                            </h2>
                            <div className="manga-panel" style={{ padding: '1.5rem', background: 'var(--color-surface)', color: 'var(--color-text)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 900 }}>BINGEKI</h3>
                                        <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>{t('settings.about.version')}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <a href="https://github.com/Moussandou" target="_blank" rel="noopener noreferrer" style={{ opacity: 0.7, transition: 'opacity 0.2s' }}>
                                            <Github size={24} />
                                        </a>
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                    {t('settings.about.made_with')}
                                </p>
                                <p style={{ fontSize: '0.8rem', opacity: 0.5 }}>
                                    {t('settings.about.credits')}
                                </p>
                            </div>
                        </section>

                    </motion.div>
                </div>
            </div>
            <MALImportModal isOpen={showMALImportModal} onClose={() => setShowMALImportModal(false)} />
        </Layout>
    );
}
