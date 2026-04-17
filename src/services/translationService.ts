import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';

export interface TranslationData {
    input: string;
    translated?: {
        en?: string;
        fr?: string;
        es?: string;
        de?: string;
        [key: string]: string | undefined;
    };
    sourceId: string | number;
    sourceType: 'work' | 'character' | 'episode' | 'article';
    sourceField: string;
    createdAt: number;
}

/**
 * Sanitizes a string for use as a Firestore document ID
 */
function sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Gets a translation document ID
 */
export function getTranslationDocId(type: string, id: string | number, field: string): string {
    return `${type}_${sanitizeId(String(id))}_${field}`;
}

/**
 * Requests a translation if it doesn't exist
 */
export async function requestTranslation(
    text: string,
    sourceId: string | number,
    sourceType: TranslationData['sourceType'],
    sourceField: string
): Promise<string> {
    if (!text || text.trim().length === 0) return '';
    
    const docId = getTranslationDocId(sourceType, sourceId, sourceField);
    const docRef = doc(db, 'translations', docId);
    
    try {
        const snap = await getDoc(docRef);
        const data = snap.exists() ? snap.data() : null;
        
        // If it doesn't exist OR the input text has changed, update it
        if (!data || data.input !== text) {
            await setDoc(docRef, {
                input: text,
                sourceId,
                sourceType,
                sourceField,
                updatedAt: Date.now(),
                ...(data ? {} : { createdAt: Date.now() })
            }, { merge: true });
            logger.info(`[Translation] ${data ? 'Updated' : 'Requested'} translation for ${docId}`);
        }
        return docId;
    } catch (err) {
        logger.error(`[Translation] Error requesting translation for ${docId}:`, err);
        return docId;
    }
}

/**
 * Hook to get translated data reactively
 */
export function useTranslationData(
    text: string | undefined | null,
    sourceId: string | number | undefined,
    sourceType: TranslationData['sourceType'],
    sourceField: string,
    targetLang: string
) {
    const [translatedText, setTranslatedText] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const langCode = targetLang ? targetLang.split('-')[0].toLowerCase() : '';
        
        if (!text || !sourceId || !langCode || langCode === 'en') {
            setTranslatedText(null);
            return;
        }

        const docId = getTranslationDocId(sourceType, sourceId, sourceField);
        const docRef = doc(db, 'translations', docId);

        let unsubscribe: (() => void) | undefined;

        const init = async () => {
            setLoading(true);
            try {
                // First request the translation if missing
                await requestTranslation(text, sourceId, sourceType, sourceField);
                
                console.log(`%c[Translation] Subscribing to: ${docId}`, 'color: #3b82f6; font-weight: bold');
                
                unsubscribe = onSnapshot(docRef, (snap) => {
                    if (snap.exists()) {
                        const data = snap.data() as TranslationData;
                        const translated = data.translated?.[langCode];
                        
                        if (translated) {
                            console.log(`%c[Translation] Received "${langCode}" for ${docId}`, 'color: #10b981; font-weight: bold');
                            setTranslatedText(translated);
                            setLoading(false);
                        } else {
                            console.log(`%c[Translation] Waiting for "${langCode}" for ${docId}...`, 'color: #f59e0b; font-weight: bold');
                            // We stay in loading state as the document exists but the target language is not yet ready
                        }
                    } else {
                        console.log(`%c[Translation] Doc ${docId} not found, requesting translation...`, 'color: #ef4444');
                        // We stay in loading state while waiting for the extension to create and translate
                    }
                }, (err) => {
                    console.error(`[Translation] Snapshot error for ${docId}:`, err);
                    setLoading(false);
                });
            } catch (err) {
                logger.error(`[Translation] Error in useTranslationData for ${docId}:`, err);
                setLoading(false);
            }
        };

        init();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [text, sourceId, sourceType, sourceField, targetLang]);

    return { translatedText, loading };
}
