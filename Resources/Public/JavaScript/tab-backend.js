/**
 * functions to integrate tab behaviour in TYPO3 backend modules
 */
import { navigateOrFocusTab, getActiveTab, createTab } from './tabs.js';
import { localize } from './tab-utility.js';
import { ModuleStateStorage } from '@typo3/backend/storage/module-state-storage.js';
import { ModuleUtility } from '@typo3/backend/module.js';

// identifies current tree mount, page tree is always 'web'
// other trees fall back to the module name prefix, e.g fileadmin tree
function getTreeMount(moduleName) {
    if (!moduleName) return null;
    const mod = ModuleUtility.getFromName(moduleName);
    if (mod.navigationComponentId === '@typo3/backend/tree/page-tree-element') return 'web';
    return moduleName.split('_')[0];
}

// snapshots current tabs tree state when navigating away
// restored when coming back
export function captureNavigationTree(tab) {
    const mount = getTreeMount(tab.module);
    if (mount) tab.treeState = ModuleStateStorage.current(mount);
}

// restore tabs tree state
export function restoreNavigationTree(tab) {
    const mount = getTreeMount(tab.module);
    const savedId = tab.treeState && tab.treeState.identifier;
    if (mount && savedId) ModuleStateStorage.update(mount, savedId);
}

// get module icon from clicked element
export function getModuleIconMarkup(module) {
    const iconEl = module && document.querySelector(`[data-modulemenu-identifier="${module}"] .modulemenu-icon`);
    return iconEl ? iconEl.innerHTML : '<typo3-backend-icon identifier="actions-browser" size="small"></typo3-backend-icon>';
}

// resolve the tab label module menu item, used if no doc title is given
export function getLabelFromModuleItem(module) {
    const nameEl = module && document.querySelector(`[data-modulemenu-identifier="${module}"] .modulemenu-name`);
    return (nameEl && nameEl.textContent.trim()) || '';
}

// hook into ContentContainer and route everything into iframe pool
export function overrideBackendContentContainer(cc) {
    const originalSetUrl = cc.setUrl.bind(cc);
    cc.setUrl = (url, request, module) => {
        if (self !== top) return originalSetUrl(url, request, module);
        if (url instanceof URL) url = url.toString();
        navigateOrFocusTab(module || null, url);
        return Promise.resolve();
    };
    cc.get = () => getActiveTab()?.iframe?.contentWindow;
    cc.getUrl = () => getActiveTab()?.url || '';
    cc.refresh = () => {
        const f = getActiveTab()?.iframe;
        if (f) f.contentWindow.location.reload();
        return Promise.resolve();
    };
}

// add middle / ctrl-click on module menu items to open them in a new tab
export function wireNewTabShortcut() {
    const handler = (e) => {
        const isMiddle = e.type === 'auxclick' && e.button === 1;
        const isModified = e.type === 'click' && (e.ctrlKey || e.metaKey);
        if (!isMiddle && !isModified) return;
        const link = e.target.closest('[data-moduleroute-identifier]');
        if (!link) return;
        e.preventDefault();
        e.stopPropagation();
        const module = link.dataset.modulerouteIdentifier;
        const url = link.getAttribute('href') || link.dataset.modulerouteUrl;
        console.debug('[be_tabs] new-tab gesture →', module, url);
        createTab(module, url, true);
    };
    document.addEventListener('click', handler, true);
    document.addEventListener('auxclick', handler, true);
}

// replace browsers native title tooltips on module menu items with custom tab hints
export function wireModuleTooltip() {
    const tooltip = document.createElement('div');
    tooltip.className = 'betabs-tooltip';
    tooltip.innerHTML = '<typo3-backend-icon identifier="actions-info" size="small"></typo3-backend-icon>'
        + `<span>${localize('beTabs.newTabHint', 'Try using CTRL + Mouse click to open in a new tab!')}</span>`;
    document.body.appendChild(tooltip);

    let current = null;
    const position = (target) => {
        const rect = target.getBoundingClientRect();
        tooltip.style.top = `${rect.top + rect.height / 2}px`;
        tooltip.style.left = `${rect.right + 12}px`;
    };

    document.addEventListener('mouseover', (e) => {
        const link = e.target.closest('[data-moduleroute-identifier]');
        if (!link || link === current) return;
        current = link;
        link.removeAttribute('title');
        position(link);
        tooltip.classList.add('betabs-tooltip--visible');
    }, true);

    document.addEventListener('mouseout', (e) => {
        if (!current || current !== e.target.closest('[data-moduleroute-identifier]')) return;
        if (e.relatedTarget && current.contains(e.relatedTarget)) return;
        current = null;
        tooltip.classList.remove('betabs-tooltip--visible');
    }, true);
}

export function dispatchModuleLoaded(tab) {
    const detail = { url: tab.url, title: tab.title, module: tab.module };
    document.dispatchEvent(new CustomEvent('typo3-module-load', { detail, bubbles: true, composed: true }));
    document.dispatchEvent(new CustomEvent('typo3-module-loaded', { detail, bubbles: true, composed: true }));
}
