/**
 * Username Selection Modal component (auth)
 */
import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';
import { updateUserProfile, searchUserByName } from '@/firebase/firestore';

export function UsernameSelectionModal() {
    const { t } = useTranslation();
    const { user, userProfile } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user && userProfile) {
            const currentName = userProfile.displayName;
            const isDefault = !currentName || 
                             currentName.toLowerCase() === 'anonyme' || 
                             currentName.toLowerCase() === 'hero' || 
                             currentName.toLowerCase() === 'héros' ||
                             currentName.toLowerCase() === 'chasseur';
            
            if (isDefault) {
                setIsOpen(true);
            } else {
                setIsOpen(false);
            }
        }
    }, [user, userProfile]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        setError(null);
        setLoading(true);

        const trimmedName = displayName.trim();
        if (trimmedName.length < 3) {
            setError(t('auth.error_pseudo_short', 'Le pseudo doit faire au moins 3 caractères'));
            setLoading(false);
            return;
        }

        try {
            // Check if name is taken
            const existingUser = await searchUserByName(trimmedName);
            if (existingUser && existingUser.uid !== user.uid) {
                setError(t('auth.error_pseudo_taken', 'Ce pseudo est déjà utilisé'));
                setLoading(false);
                return;
            }

            await updateUserProfile(user.uid, { displayName: trimmedName });
            setIsOpen(false);
        } catch (err) {
            console.error(err);
            setError(t('auth.error_generic'));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={() => {}} // User cannot close without choosing a pseudo
            title={t('auth.choose_pseudo_title', 'Choisissez votre Pseudo')}
            hideCloseButton
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    {t('auth.choose_pseudo_desc', 'Pour une meilleure expérience sur Bingeki, veuillez choisir un pseudo unique qui vous représentera dans la communauté.')}
                </p>

                {error && (
                    <div style={{ 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        border: '2px solid #ef4444', 
                        color: '#ef4444', 
                        padding: '0.75rem', 
                        fontSize: '0.875rem', 
                        fontWeight: 700 
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <Input
                        placeholder={t('auth.placeholder_pseudo')}
                        icon={<User size={18} />}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                        autoFocus
                    />
                    
                    <Button 
                        type="submit" 
                        variant="manga" 
                        isLoading={loading}
                        style={{ width: '100%', padding: '1rem' }}
                    >
                        {t('auth.save_pseudo', 'Confirmer mon Pseudo')}
                    </Button>
                </form>
            </div>
        </Modal>
    );
}
