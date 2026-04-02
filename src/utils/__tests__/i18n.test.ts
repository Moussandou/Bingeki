import { describe, it, expect } from 'vitest';
import i18n from '@/i18n';

describe('i18n translation consistency', () => {
    const frResources = (i18n.options.resources as any).fr.translation;
    const enResources = (i18n.options.resources as any).en.translation;

    const getAllKeys = (obj: any, prefix = ''): string[] => {
        return Object.keys(obj).reduce((res: string[], el: string) => {
            if (Array.isArray(obj[el])) {
                return [...res, prefix + el];
            } else if (typeof obj[el] === 'object' && obj[el] !== null) {
                return [...res, ...getAllKeys(obj[el], prefix + el + '.')];
            } else {
                return [...res, prefix + el];
            }
        }, []);
    };

    const frKeys = getAllKeys(frResources);
    const enKeys = getAllKeys(enResources);

    it('should have the same number of keys in French and English', () => {
        expect(frKeys.length).toBe(enKeys.length);
    });

    it('all French keys should exist in English', () => {
        frKeys.forEach(key => {
            expect(enKeys).toContain(key);
        });
    });

    it('all English keys should exist in French', () => {
        enKeys.forEach(key => {
            expect(frKeys).toContain(key);
        });
    });

    it('no translation value should be empty', () => {
        const checkEmpty = (obj: any, path = '') => {
            Object.keys(obj).forEach(key => {
                const currentPath = path ? `${path}.${key}` : key;
                const value = obj[key];
                if (typeof value === 'string') {
                    // Temporarily skip empty strings if they are intended, 
                    // but usually they are missing translations
                    expect(value.trim(), `Empty translation at ${currentPath}`).not.toBe('');
                } else if (typeof value === 'object' && value !== null) {
                    checkEmpty(value, currentPath);
                }
            });
        };
        checkEmpty(frResources, 'fr');
        checkEmpty(enResources, 'en');
    });
});
