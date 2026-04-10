/**
 * Applies theme and accent color CSS variables to document root
 */
import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { isBot } from '@/utils/isBot';

export function useThemeManager() {
    const theme = useSettingsStore(s => s.theme);
    const accentColor = useSettingsStore(s => s.accentColor);

    useEffect(() => {
        const finalTheme = isBot() ? 'dark' : theme;
        document.documentElement.setAttribute('data-theme', finalTheme);
        
        if (isBot()) {
            document.body.classList.add('is-bot');
        }
    }, [theme]);

    useEffect(() => {
        document.documentElement.style.setProperty('--color-primary', accentColor);
        
        const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
        }
        
        const rgb = hexToRgb(accentColor);
        if (rgb) {
            document.documentElement.style.setProperty('--color-primary-glow', `rgba(${rgb}, 0.5)`);
        }
    }, [accentColor]);
}
