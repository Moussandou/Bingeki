import { logger } from '@/utils/logger';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from './config';

/**
 * Uploads an image for a feedback ticket.
 * @param feedbackId The ID of the feedback/ticket
 * @param file The file to upload
 * @returns The download URL of the uploaded image
 */
export async function uploadFeedbackImage(feedbackId: string, file: File): Promise<string> {
    const timestamp = Date.now();
    const storageRef = ref(storage, `feedback-attachments/${feedbackId}/${timestamp}_${file.name}`);

    try {
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        logger.error('[Storage] Error uploading feedback image:', error);
        throw error;
    }
}

/**
 * Deletes all attachments associated with a feedback ID.
 * @param feedbackId The ID of the feedback/ticket
 */
export async function deleteFeedbackImages(feedbackId: string): Promise<void> {
    const folderRef = ref(storage, `feedback-attachments/${feedbackId}`);

    try {
        const res = await listAll(folderRef);
        const deletePromises = res.items.map((itemRef) => deleteObject(itemRef));
        await Promise.all(deletePromises);
        logger.log(`[Storage] Cleaned up attachments for feedback: ${feedbackId}`);
    } catch (error) {
        logger.error('[Storage] Error deleting feedback images:', error);
        throw error;
    }
}
