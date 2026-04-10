/**
 * Clipboard-based share with legacy fallback
 */
import { useCallback } from 'react';

type ShareResult = 'shared' | 'copied' | 'failed';

interface ShareData {
    url: string;
    title: string;
    text?: string;
}

export function useShare() {
    const share = useCallback(async (data: ShareData): Promise<ShareResult> => {

        try {
            await navigator.clipboard.writeText(data.url);
            return 'copied';
        } catch {
            // Fallback: legacy execCommand
            try {
                const textArea = document.createElement('textarea');
                textArea.value = data.url;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return 'copied';
            } catch {
                return 'failed';
            }
        }
    }, []);

    return { share };
}
