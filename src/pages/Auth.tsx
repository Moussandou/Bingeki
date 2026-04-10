/**
 * Auth page
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { loginWithGoogle, loginWithEmail, registerWithEmail, loginWithDiscord } from '@/firebase/auth';
import { saveUserProfileToFirestore } from '@/firebase/firestore';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from 'react-i18next';
import { Link, useLocalizedNavigate } from '@/components/routing/LocalizedLink';
import { SEO } from '@/components/layout/SEO';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

export default function Auth() {
    const { t } = useTranslation();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');

    const { setUser } = useAuthStore();
    const navigate = useLocalizedNavigate();

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isLogin) {
                const { user, error: loginError } = await loginWithEmail(email, password);
                if (loginError) {
                    setError(loginError);
                } else if (user) {
                    setUser(user);
                    navigate('/dashboard');
                }
            } else {
                if (!displayName.trim()) {
                    setError(t('auth.error_pseudo'));
                    setLoading(false);
                    return;
                }
                const { user, error: registerError } = await registerWithEmail(email, password, displayName);
                if (registerError) {
                    setError(registerError);
                } else if (user) {
                    setUser(user);
                    navigate('/dashboard');
                }
            }
        } catch {
            setError(t('auth.error_generic'));
        }

        setLoading(false);
    };

    const handleDiscordLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const user = await loginWithDiscord();
            if (user) {
                // Check if user has a display name, if not use a temporary one or wait for Modal
                await saveUserProfileToFirestore({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || '', // Use empty string instead of null to signify missing
                    photoURL: user.photoURL,
                    lastLogin: Date.now()
                }, false); // don't force update if already exists
                
                setUser(user);
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error('[Auth] Discord login error:', err);
            // Don't show error if user just closed the popup
            if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
                setError(t('auth.error_generic'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const user = await loginWithGoogle();
            if (user) {
                await saveUserProfileToFirestore({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || '',
                    photoURL: user.photoURL,
                    lastLogin: Date.now()
                }, false);

                setUser(user);
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error('[Auth] Google login error:', err);
            // Don't show error if user just closed the popup
            if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
                setError(t('auth.error_generic'));
            }
        } finally {
            setLoading(false);
        }
    };

    // handleAppleLogin removed

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            padding: '1rem',
            overflow: 'hidden'
        }}>
            <SEO title={isLogin ? t('auth.login_title') : t('auth.register_title')} />
            {/* Back Button */}
            <button
                onClick={() => navigate('/')}
                style={{
                    position: 'absolute',
                    top: '1.5rem',
                    left: '1.5rem',
                    zIndex: 20,
                    background: 'var(--color-surface)',
                    border: '3px solid var(--color-border-heavy)',
                    padding: '0.5rem',
                    boxShadow: '4px 4px 0 var(--color-shadow)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: 900,
                    color: 'var(--color-text)'
                }}
            >
                <ArrowLeft size={24} />
                <span className="hidden-mobile">{t('auth.back')}</span>
            </button>

            <div className="manga-bg-container">
                <div className="manga-halftone"></div>
                <div className="manga-speedlines"></div>
            </div>
            <div className="container mobile-stack" style={{ maxWidth: '1000px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'center' }}>

                {/* Visual Side */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    className="hidden-mobile"
                    style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                >
                    {/* Logo */}
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none' }}>
                        <OptimizedImage 
                            src="/logo.png" 
                            alt="Bingeki Logo" 
                            containerStyle={{ width: 100, height: 100 }} 
                            style={{ width: 100, height: 100, objectFit: 'contain' }} 
                        />
                        <span style={{ fontSize: '3rem', fontFamily: 'var(--font-heading)', fontWeight: 950, color: 'var(--color-text)', letterSpacing: '-0.05em' }}>BINGEKI</span>
                    </Link>

                    <h1 style={{ fontSize: '3.5rem', lineHeight: 1.1, fontFamily: 'var(--font-heading)', fontWeight: 900, color: 'var(--color-text)', textTransform: 'uppercase' }} dangerouslySetInnerHTML={{ __html: t('auth.hero_title') }} />
                    <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', maxWidth: '400px', lineHeight: 1.6 }}>
                        {t('auth.hero_subtitle')}
                    </p>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <div style={{ padding: '0.75rem 1.5rem', background: 'var(--color-surface)', border: '3px solid var(--color-border-heavy)', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', boxShadow: '4px 4px 0 var(--color-primary)', color: 'var(--color-text)' }}>
                            {t('auth.feature_rpg')}
                        </div>
                        <div style={{ padding: '0.75rem 1.5rem', background: 'var(--color-surface)', border: '3px solid var(--color-border-heavy)', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', boxShadow: '4px 4px 0 var(--color-secondary)', color: 'var(--color-text)' }}>
                            {t('auth.feature_progression')}
                        </div>
                    </div>
                </motion.div>

                {/* Form Side */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    {/* Mobile Only Header */}
                    <div className="mobileOnly" style={{ display: 'none', textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <OptimizedImage 
                                src="/logo.png" 
                                alt="Bingeki" 
                                containerStyle={{ width: 60, height: 60 }} 
                                style={{ width: 60, height: 60, objectFit: 'contain' }} 
                            />
                            <span style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)', fontWeight: 900, letterSpacing: '-0.02em' }}>BINGEKI</span>
                        </div>
                        <h1 style={{ fontSize: '2rem', lineHeight: 1.1, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                            {t('auth.mobile_title')}
                        </h1>
                        <p style={{ fontSize: '0.9rem', opacity: 0.7, maxWidth: '280px', margin: '0 auto' }}>
                            {t('auth.mobile_subtitle')}
                        </p>
                    </div>

                    <div className="manga-panel" style={{ padding: '2.5rem', background: 'var(--color-surface)', boxShadow: '8px 8px 0 var(--color-shadow)' }}>
                        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                            <h2 style={{ fontSize: '2.25rem', fontFamily: 'var(--font-heading)', fontWeight: 900, color: 'var(--color-text)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                                {isLogin ? t('auth.welcome_back') : t('auth.create_account')}
                            </h2>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem', fontWeight: 500 }}>
                                {isLogin ? t('auth.resume_progress') : t('auth.start_legend')}
                            </p>
                        </div>

                        {error && (
                            <div style={{
                                background: '#fee2e2',
                                border: '2px solid #ef4444',
                                color: '#b91c1c',
                                padding: '0.75rem 1rem',
                                marginBottom: '1rem',
                                fontWeight: 600,
                                fontSize: '0.9rem'
                            }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {!isLogin && (
                                <div>
                                    <Input
                                        placeholder={t('auth.placeholder_pseudo')}
                                        icon={<User size={18} />}
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                    />
                                </div>
                            )}

                            <div>
                                <Input
                                    type="email"
                                    placeholder={t('auth.placeholder_email')}
                                    icon={<Mail size={18} />}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <Input
                                    type="password"
                                    placeholder={t('auth.placeholder_password')}
                                    icon={<Lock size={18} />}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <Button type="submit" variant="manga" isLoading={loading} style={{ marginTop: '0.5rem', padding: '1rem', fontSize: '1rem' }}>
                                {isLogin ? t('auth.login_btn') : t('auth.register_btn')}
                            </Button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.5rem 0' }}>
                                <div style={{ flex: 1, height: '2px', background: 'var(--color-border-heavy)' }} />
                                <span style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: '0.875rem' }}>{t('auth.or')}</span>
                                <div style={{ flex: 1, height: '2px', background: 'var(--color-border-heavy)' }} />
                            </div>

                            <Button
                                type="button"
                                variant="manga"
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.75rem',
                                    width: '100%',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <OptimizedImage 
                                    src="https://www.google.com/favicon.ico" 
                                    alt="Google" 
                                    containerStyle={{ width: 18, height: 18 }} 
                                    style={{ width: 18, height: 18 }} 
                                />
                                <span>{t('auth.google_login')}</span>
                            </Button>

                            <Button
                                type="button"
                                variant="manga"
                                onClick={handleDiscordLogin}
                                disabled={loading}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.75rem',
                                    width: '100%',
                                    whiteSpace: 'nowrap',
                                    backgroundColor: '#5865F2',
                                    color: 'white',
                                    borderColor: '#000'
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 127 96" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 20, height: 20 }}>
                                    <path d="M107.7 8.07001C99.08 4.11001 90.03 1.22001 80.64 0.0300136C80.48 -0.00998642 80.31 0.0600136 80.22 0.210014C79.03 2.33001 77.71 5.12001 76.78 7.33001C66.58 5.81001 56.45 5.81001 46.42 7.33001C45.5 5.11001 44.17 2.33001 42.97 0.210014C42.88 0.0600136 42.71 -0.00998642 42.55 0.0300136C33.15 1.22001 24.1 4.11001 15.48 8.07001C15.41 8.10001 15.35 8.15001 15.31 8.21001C-2.26002 34.6901 -2.71002 60.5401 5.92998 85.0401C5.97998 85.1701 6.07998 85.2701 6.20998 85.3301C17.7 93.7701 28.77 96.3501 39.67 96.3501C39.87 96.3501 40.06 96.2601 40.18 96.1001C42.9 92.3701 45.28 88.3701 47.19 84.1501C47.34 83.8201 47.14 83.4401 46.8 83.3301C42.86 81.8401 39.12 79.9101 35.59 77.6701C35.28 77.4701 35.26 77.0201 35.54 76.7901C36.31 76.2201 37.07 75.6201 37.8 75.0101C38.07 74.7901 38.46 74.7701 38.74 74.9601C55.08 82.4101 72.07 82.4101 88.22 74.9601C88.51 74.7601 88.89 74.7901 89.17 75.0101C89.9 75.6101 90.66 76.2101 91.43 76.7901C91.71 77.0201 91.69 77.4701 91.38 77.6701C87.84 79.9101 84.09 81.8401 80.14 83.3201C79.8 83.4401 79.6 83.8101 79.75 84.1401C81.66 88.3601 84.05 92.3601 86.77 96.0901C86.89 96.2501 87.08 96.3301 87.27 96.3301C98.19 96.3301 109.28 93.7601 120.78 85.3301C120.91 85.2701 121.01 85.1701 121.06 85.0401C130.65 59.2601 127.31 34.6001 111.66 8.21001C111.62 8.15001 111.56 8.10001 111.49 8.07001ZM42.27 65.5201C37.06 65.5201 32.74 60.7501 32.74 54.9101C32.74 49.0701 36.96 44.3001 42.27 44.3001C47.63 44.3001 51.95 49.0701 51.84 54.9101C51.84 60.7501 47.58 65.5201 42.27 65.5201ZM84.69 65.5201C79.48 65.5201 75.16 60.7501 75.16 54.9101C75.16 49.0701 79.38 44.3001 84.69 44.3001C90.05 44.3001 94.37 49.0701 94.26 54.9101C94.26 60.7501 90.05 65.5201 84.69 65.5201Z" fill="white" />
                                </svg>
                                <span>{t('auth.discord_login')}</span>
                            </Button>

                            {/* Apple button removed */}                        </form>

                        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                            <button
                                onClick={toggleMode}
                                style={{
                                    color: 'var(--color-text)',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    textDecoration: 'underline',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                {isLogin ? t('auth.no_account') : t('auth.has_account')}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

