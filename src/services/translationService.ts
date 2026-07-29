import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { getAuth } from 'firebase/auth';

/**
 * A translation is filled in asynchronously server-side. If nothing lands within
 * this window (backend down, guest user who cannot enqueue a request, or a language
 * nobody has translated yet) we stop showing a spinner and fall back to the source
 * text instead of loading forever.
 */
const TRANSLATION_WAIT_MS = 8000;

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
    /** Server-written: the `input` the stored `translated` payload was produced from. */
    translatedInput?: string;
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
        const auth = getAuth();
        if (!auth.currentUser) return docId;

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
            setLoading(false);
            return;
        }

        const docId = getTranslationDocId(sourceType, sourceId, sourceField);
        const docRef = doc(db, 'translations', docId);

        setLoading(true);

        // Safety net: never leave the caller stuck on a spinner.
        const giveUpTimer = setTimeout(() => {
            logger.log(`[Translation] Gave up waiting for "${langCode}" on ${docId}, using source text`);
            setLoading(false);
        }, TRANSLATION_WAIT_MS);

        const unsubscribe = onSnapshot(docRef, async (snap) => {
            const data = snap.exists() ? (snap.data() as TranslationData) : null;

            if (!data || data.input !== text) {
                await requestTranslation(text, sourceId, sourceType, sourceField);
                return; // Let the next snapshot trigger the UI update
            }

            // Ignore a payload produced from an older `input` — the server is
            // already re-translating it, and showing it would mismatch the source.
            const isFresh = data.translatedInput === undefined || data.translatedInput === text;
            const translated = isFresh ? data.translated?.[langCode] : undefined;
            if (translated) {
                logger.log(`%c[Translation] Received "${langCode}" for ${docId}`, 'color: #10b981; font-weight: bold');
                setTranslatedText(translated);
            } else {
                // Request is queued but not fulfilled yet: show the source text now and
                // stay subscribed so a late translation still swaps in.
                logger.log(`%c[Translation] Waiting for "${langCode}" for ${docId}...`, 'color: #f59e0b; font-weight: bold');
            }
            clearTimeout(giveUpTimer);
            setLoading(false);
        }, (err) => {
            logger.error(`[Translation] Snapshot error for ${docId}:`, err);
            clearTimeout(giveUpTimer);
            setLoading(false);
        });

        return () => {
            clearTimeout(giveUpTimer);
            unsubscribe();
        };
    }, [text, sourceId, sourceType, sourceField, targetLang]);

    return { translatedText, loading };
}
