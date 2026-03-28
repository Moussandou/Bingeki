import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WorkEntry } from '../types/library';
import './EditWorkModal.css';

interface EditWorkModalProps {
    work: WorkEntry;
    onClose: () => void;
    onSave: (updatedWork: Partial<WorkEntry>) => Promise<boolean>;
}

const EditWorkModal: React.FC<EditWorkModalProps> = ({ work, onClose, onSave }) => {
    const { t } = useTranslation();
    const [title, setTitle] = useState(work.title || '');
    const [synopsis, setSynopsis] = useState(work.synopsis || '');
    const [type, setType] = useState<WorkEntry['type']>(work.type || 'manga');
    const [chapters, setChapters] = useState(work.chapters_total || 0);
    const [episodes, setEpisodes] = useState(work.episodes_total || 0);
    const [imageUrl, setImageUrl] = useState(work.image_url || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        const updatedData: Partial<WorkEntry> = {
            title,
            synopsis,
            type,
            chapters_total: chapters,
            episodes_total: episodes,
            image_url: imageUrl,
            updated_at: new Date().toISOString()
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
                            <select value={type} onChange={(e) => setType(e.target.value as WorkEntry['type'])}>
                                <option value="manga">MANGA</option>
                                <option value="anime">ANIME</option>
                            </select>
                        </div>

                        {type === 'manga' ? (
                            <div className="form-group">
                                <label>{t('work_details.edit_modal.label_chapters')}</label>
                                <input 
                                    type="number" 
                                    value={chapters} 
                                    onChange={(e) => setChapters(parseInt(e.target.value) || 0)} 
                                />
                            </div>
                        ) : (
                            <div className="form-group">
                                <label>{t('work_details.edit_modal.label_episodes')}</label>
                                <input 
                                    type="number" 
                                    value={episodes} 
                                    onChange={(e) => setEpisodes(parseInt(e.target.value) || 0)} 
                                />
                            </div>
                        )}
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
