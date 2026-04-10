/**
 * Edit Work Modal page
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type Work } from '@/store/libraryStore';
import './EditWorkModal.css';

interface EditWorkModalProps {
    work: Work;
    onClose: () => void;
    onSave: (updatedWork: Partial<Work>) => Promise<boolean>;
}

const EditWorkModal: React.FC<EditWorkModalProps> = ({ work, onClose, onSave }) => {
    const { t } = useTranslation();
    const [title, setTitle] = useState(work.title || '');
    const [synopsis, setSynopsis] = useState(work.synopsis || '');
    const [type, setType] = useState<Work['type']>(work.type || 'manga');
    const [totalUnits, setTotalUnits] = useState(work.totalChapters || 0);
    const [imageUrl, setImageUrl] = useState(work.image || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        const updatedData: Partial<Work> = {
            title,
            synopsis,
            type,
            totalChapters: totalUnits,
            image: imageUrl,
            lastUpdated: Date.now()
        };
        
        const success = await onSave(updatedData);
        if (success) {
            onClose();
        } else {
            setIsSaving(false);
        }
    };

    return (
        <div className="edit-work-modal-overlay" onClick={onClose}>
            <div className="edit-work-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="edit-work-modal-header">
                    <h2>{t('work_details.edit_modal.title')}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                
                <div className="edit-work-modal-body">
                    <div className="form-group">
                        <label>{t('work_details.edit_modal.label_title')}</label>
                        <input 
                            type="text" 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)} 
                        />
                    </div>

                    <div className="form-group">
                        <label>{t('work_details.edit_modal.label_synopsis')}</label>
                        <textarea 
                            value={synopsis} 
                            onChange={(e) => setSynopsis(e.target.value)} 
                            rows={5}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>{t('work_details.edit_modal.label_type')}</label>
                            <select value={type} onChange={(e) => setType(e.target.value as Work['type'])}>
                                <option value="manga">MANGA</option>
                                <option value="anime">ANIME</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>
                                {type === 'manga' 
                                    ? t('work_details.edit_modal.label_chapters') 
                                    : t('work_details.edit_modal.label_episodes')}
                            </label>
                            <input 
                                type="number" 
                                value={totalUnits} 
                                onChange={(e) => setTotalUnits(parseInt(e.target.value) || 0)} 
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>{t('work_details.edit_modal.label_image')}</label>
                        <input 
                            type="text" 
                            value={imageUrl} 
                            onChange={(e) => setImageUrl(e.target.value)} 
                            placeholder="https://..."
                        />
                        {imageUrl && (
                            <div className="image-preview">
                                <img src={imageUrl} alt="Preview" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="edit-work-modal-footer">
                    <button className="cancel-btn" onClick={onClose}>
                        {t('work_details.edit_modal.cancel')}
                    </button>
                    <button 
                        className="save-btn" 
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? t('common.loading') : t('work_details.edit_modal.save')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditWorkModal;

