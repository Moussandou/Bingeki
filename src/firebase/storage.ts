/**
 * Firebase Storage helpers for feedback attachments and user cleanup
 */
import { logger } from '@/utils/logger';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from './config';


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

// Wipe all user storage on account deletion
export async function deleteUserStorage(userId: string): Promise<void> {
    const folders = [`avatars/${userId}`, `users/${userId}`];

    for (const folderPath of folders) {
        try {
            await deleteFolderRecursive(folderPath);
            logger.log(`[Storage] Cleaned up folder: ${folderPath}`);
        } catch (error) {
            // Folder might not exist, that's fine
            logger.warn(`[Storage] Skip/Error cleaning up folder ${folderPath}:`, error);
        }
    }
}

async function deleteFolderRecursive(folderPath: string): Promise<void> {
    const folderRef = ref(storage, folderPath);
    const res = await listAll(folderRef);


    const fileDeletions = res.items.map((itemRef) => deleteObject(itemRef));
    await Promise.all(fileDeletions);


    const folderDeletions = res.prefixes.map((prefixRef) => deleteFolderRecursive(prefixRef.fullPath));
    await Promise.all(folderDeletions);
}
