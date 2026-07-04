/**
 * persistence function to save tabs in sessionStorage
 * and restore them on page reload
 */
import { tabs, activeTabId } from './tabs.js';

const STORAGE_KEY = 't3-betabs-open';

export function persist() {
    const data = tabs.map((t) => ({ module: t.module, url: t.url, active: t.id === activeTabId }));
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* quota */ }
}

export function restore() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}
