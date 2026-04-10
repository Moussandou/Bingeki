/**
 * Install Instructions Modal component (pwa)
 */
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Smartphone, Share, PlusSquare, Menu } from 'lucide-react';
import { ChromeIcon } from '@/components/ui/BrandIcons';

interface InstallInstructionsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function InstallInstructionsModal({ isOpen, onClose }: InstallInstructionsModalProps) {
    const { t } = useTranslation();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('pwa.install_modal.title') || "INSTALLER L'APP"}
            variant="manga"
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <p style={{ fontSize: '1rem', lineHeight: '1.5', opacity: 0.9 }}>
                    {t('pwa.install_modal.description') || "Pour installer Bingeki sur votre appareil, suivez ces étapes simples :"}
                </p>

                {/* iOS Instructions */}
                <div style={{ background: 'var(--color-surface-hover)', padding: '1rem', border: '2px solid var(--color-border)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem' }}>
                        <Smartphone size={24} />
                        <h4 style={{ fontWeight: 900, fontFamily: 'var(--font-heading)' }}>iOS (Safari)</h4>
                    </div>
                    <ol style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: 0 }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>1. {t('pwa.install_modal.ios_step1') || "Appuyez sur le bouton Partager"}</span>
                            <Share size={16} />
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>2. {t('pwa.install_modal.ios_step2') || "Sélectionnez 'Sur l'écran d'accueil'"}</span>
                            <PlusSquare size={16} />
                        </li>
                    </ol>
                </div>

                {/* Android / Chrome Instructions */}
                <div style={{ background: 'var(--color-surface-hover)', padding: '1rem', border: '2px solid var(--color-border)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem' }}>
                        <ChromeIcon size={24} />
                        <h4 style={{ fontWeight: 900, fontFamily: 'var(--font-heading)' }}>Android / Chrome</h4>
                    </div>
                    <ol style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: 0 }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>1. {t('pwa.install_modal.android_step1') || "Ouvrez le menu du navigateur"}</span>
                            <Menu size={16} />
                        </li>
                        <li>2. {t('pwa.install_modal.android_step2') || "Appuyez sur 'Installer l'application'"}</li>
                    </ol>
                </div>
            </div>
        </Modal>
    );
}
