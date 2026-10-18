import { createElement, lazy, type ComponentType } from 'react';

export function preloadablePage(load: () => Promise<{ default: ComponentType }>) {
    let loaded: ComponentType | undefined;
    let pending: ReturnType<typeof load> | undefined;
    const preload = () => pending ??= load().then(module => {
        loaded = module.default;
        return module;
    });
    const LazyPage = lazy(preload);
    return Object.assign(
        () => createElement(loaded ?? LazyPage),
        { preload },
    );
}
