/**
 * Tracks client-side mount state
 * Prevents hydration mismatches with prerendered pages
 */
import { useEffect, useState } from 'react';

export function useMounted() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return mounted;
}
