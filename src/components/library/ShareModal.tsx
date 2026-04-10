/**
 * Share Modal component (library)
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Link2, Globe, Users, Copy, Check } from 'lucide-react';
import { useShare } from '@/hooks/useShare';
import { useToast } from '@/context/ToastContext';
import styles from './ShareModal.module.css';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'folder' | 'library';
    shareUrl: string;
    name?: string;
    currentSharing?: {
        enabled: boolean;
        access: 'public' | 'friends';
    };
    onSave: (sharing: { enabled: boolean; access: 'public' | 'friends' }) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
    isOpen,
    onClose,
    type,
    shareUrl,
    name,
    currentSharing,
    onSave
}) => {
    const { t } = useTranslation();
    const { share } = useShare();
    const { addToast } = useToast();

    const [enabled, setEnabled] = useState(currentSharing?.enabled ?? false);
    const [access, setAccess] = useState<'public' | 'friends'>(currentSharing?.access ?? 'public');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setEnabled(currentSharing?.enabled ?? false);
            setAccess(currentSharing?.access ?? 'public');
            setCopied(false);
        }
    }, [isOpen, currentSharing]);

    const handleSave = () => {
        onSave({ enabled, access });
        addToast(t('share.sharing_updated'), 'success');
        onClose();
    };

    const handleCopyLink = async () => {
        const result = await share({
            url: shareUrl,
            title: `${name || (type === 'folder' ? t('share.share_folder') : t('share.share_library'))} - Bingeki`,
        });
        if (result === 'copied') {
            setCopied(true);
            addToast(t('share.link_copied'), 'success');
            setTimeout(() => setCopied(false), 2000);
        } else if (result === 'shared') {
            onClose();
        }
    };

    const title = type === 'folder'
        ? `${t('share.share_folder')}${name ? ` — ${name}` : ''}`
        : t('share.share_library');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} variant="manga" maxWidth="480px">
            <div className={styles.container}>
                {/* Toggle sharing */}
                <div className={styles.toggleRow} onClick={() => setEnabled(!enabled)}>
                    <div className={styles.toggleInfo}>
                        <Link2 size={20} />
                        <span className={styles.toggleLabel}>{t('share.enable_sharing')}</span>
                    </div>
                    <div className={`${styles.toggle} ${enabled ? styles.toggleActive : ''}`}>
                        <div className={styles.toggleDot} />
                    </div>
                </div>

                {/* Access options */}
                {enabled && (
                    <div className={styles.accessOptions}>
                        <button
                            className={`${styles.accessOption} ${access === 'public' ? styles.accessActive : ''}`}
                            onClick={() => setAccess('public')}
                        >
                            <Globe size={18} />
                            <span>{t('share.access_public')}</span>
                        </button>
                        <button
                            className={`${styles.accessOption} ${access === 'friends' ? styles.accessActive : ''}`}
                            onClick={() => setAccess('friends')}
                        >
                            <Users size={18} />
                            <span>{t('share.access_friends')}</span>
                        </button>
                    </div>
                )}

                {/* Link preview + copy */}
                {enabled && (
                    <div className={styles.linkSection}>
                        <div className={styles.linkPreview}>
                            <span className={styles.linkText}>{shareUrl}</span>
                        </div>
                        <Button
                            variant="primary"
                            onClick={handleCopyLink}
                            icon={copied ? <Check size={16} /> : <Copy size={16} />}
                        >
                            {copied ? '✓' : t('share.copy_link')}
                        </Button>
                    </div>
                )}

                {/* Actions */}
                <div className={styles.actions}>
                    <Button variant="ghost" onClick={onClose}>
                        {t('profile.back', 'Retour')}
                    </Button>
                    <Button variant="primary" onClick={handleSave}>
                        {t('profile.edit_modal.save', 'Sauvegarder')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
