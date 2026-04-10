/**
 * Image Upload component (feedback)
 */
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload } from 'lucide-react';
import { isValidImageSrc } from '@/utils/validation';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import styles from './ImageUpload.module.css';

interface ImageUploadProps {
    onImagesChange: (files: File[]) => void;
    maxImages?: number;
}

export const ImageUpload = ({ onImagesChange, maxImages = 3 }: ImageUploadProps) => {
    const { t } = useTranslation();
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = (files: File[]) => {
        const newFiles = [...selectedFiles, ...files].slice(0, maxImages);
        setSelectedFiles(newFiles);
        onImagesChange(newFiles);

        // Generate previews
        const newPreviews = newFiles.map(file => URL.createObjectURL(file));
        setPreviews(newPreviews);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        handleFiles(files);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) {
            handleFiles(files);
        }
    };

    const removeImage = (index: number) => {
        const newFiles = selectedFiles.filter((_, i) => i !== index);
        const newPreviews = previews.filter((_, i) => i !== index);

        // Revoke the URL to avoid memory leaks
        URL.revokeObjectURL(previews[index]);

        setSelectedFiles(newFiles);
        setPreviews(newPreviews);
        onImagesChange(newFiles);
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className={styles.container}>
            <label className={styles.label}>
                {t('feedback.attachments_label')}
            </label>

            <div
                className={`${styles.uploadGrid} ${isDragging ? styles.dragging : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {previews.map((preview, index) => (
                    <div key={index} className={styles.previewContainer}>
                        <OptimizedImage
                            src={isValidImageSrc(preview) ? preview : ''}
                            alt="Preview"
                            className={styles.preview}
                        />
                        <button
                            type="button"
                            className={styles.removeBtn}
                            onClick={() => removeImage(index)}
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}

                {selectedFiles.length < maxImages && (
                    <button
                        type="button"
                        className={styles.uploadPlaceholder}
                        onClick={triggerFileInput}
                    >
                        <Upload size={24} />
                        <span>{t('feedback.attachments_hint')}</span>
                    </button>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className={styles.hiddenInput}
                accept="image/*"
                multiple
            />
        </div>
    );
};
