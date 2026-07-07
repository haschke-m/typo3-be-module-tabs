/**
 * generic helper functions
 */

export function waitFor(getter, timeout = 15000) {
    return new Promise((resolve) => {
        const start = performance.now();
        const tick = () => {
            const v = getter();
            if (v) return resolve(v);
            if (performance.now() - start > timeout) return resolve(null);
            setTimeout(tick, 50);
        };
        tick();
    });
}

export function getPageId(url) {
    try {
        return new URL(url, window.location.origin).searchParams.get('id');
    } catch (e) {
        return null;
    }
}

export function localize(key, fallback) {
    return top.TYPO3?.lang?.[key] || fallback;
}
