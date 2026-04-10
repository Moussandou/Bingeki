/**
 * Avatar Selection Modal component (auth)
 */
import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { UserCircle } from 'lucide-react';

export function AvatarSelectionModal() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, userProfile } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (user && userProfile) {
            const hasDicebearAvatar = userProfile.photoURL?.includes('dicebear.com');
            const isDismissed = localStorage.getItem('avatar_prompt_dismissed') === 'true';
            
            if (hasDicebearAvatar && !isDismissed) {
                // Show modal after a short delay to not overwhelm on login
                const timer = setTimeout(() => {
                    setIsOpen(true);
                }, 2000);
                return () => clearTimeout(timer);
            }
        }
    }, [user, userProfile]);

    const handleDismiss = () => {
        localStorage.setItem('avatar_prompt_dismissed', 'true');
        setIsOpen(false);
    };

    const handleGoToProfile = () => {
        setIsOpen(false);
        navigate('/profile');
        // We don't set dismissed to true here so they can be reminded later if they don't change it?
        // Actually, usually better to set it so we don't nag.
        localStorage.setItem('avatar_prompt_dismissed', 'true');
    };

    if (!isOpen || !userProfile) return null;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleDismiss}
            title={t('avatar_modal.title', 'CHANGER VOTRE AVATAR ?')}
        >
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                gap: '1.5rem',
                textAlign: 'center',
                padding: '1rem 0'
            }}>
                <div style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    border: '3px solid var(--color-accent)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--color-bg-secondary)',
                    boxShadow: '0 0 20px rgba(var(--color-accent-rgb), 0.3)'
                }}>
                    {userProfile.photoURL ? (
                        <img 
                            src={userProfile.photoURL} 
                            alt="Current Avatar" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <UserCircle size={60} color="var(--color-text-muted)" />
                    )}
                </div>

                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                    {t('avatar_modal.desc', 'Il semblerait que vous utilisiez un avatar généré par défaut. Vous pouvez le personnaliser dans votre profil !')}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                    <Button 
                        variant="manga" 
                        onClick={handleGoToProfile}
                        style={{ width: '100%', padding: '1rem' }}
                    >
                        {t('avatar_modal.cta_profile', 'PERSONNALISER')}
                    </Button>
                    
                    <Button 
                        variant="ghost" 
                        onClick={handleDismiss}
                        style={{ width: '100%', opacity: 0.7 }}
                    >
                        {t('avatar_modal.cta_later', 'PLUS TARD')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
