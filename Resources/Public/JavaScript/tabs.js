/**
 * This module owns the shared tab state and lifecycle, and orchestrates init.
 *   tab-view.js     — tab bar UI / DOM
 *   tab-backend.js  — TYPO3 integration (ContentContainer, gestures, events)
 *   tab-storage.js  — session persistence
 *   tab-utility.js  — generic helpers
 */

import { waitFor, getPageId } from './tab-utility.js';
import { persist, restore } from './tab-storage.js';
import { setupTabNavigation, createTabElement, updateTabLabel, updateEmptyState, getLabelFromModuleItem } from './tab-view.js';
import { overrideBackendContentContainer, wireNewTabShortcut, wireModuleTooltip, dispatchModuleLoaded } from './tab-backend.js';

const IFRAME_CLASSES = ['t3js-scaffold-content-module-iframe', 'scaffold-content-module-iframe'];

let initialized = false;
export let tabs = []; // {id, module, url, pageId, iframe, tabEl, labelEl, title}
export let activeTabId = null;
let tabIdSeq = 0;
export let dom = {}; // {wrap, bar, frames, addBtn, empty} — see tab-view.js::setupTabNavigation()

export const getActiveTab = () => tabs.find((t) => t.id === activeTabId) || null;

// creates a new tab, whether with a module loaded directly or in empty state
export function createTab(module, url, activate = true) {
  const tab = { id: ++tabIdSeq, module: module || null, url: null, pageId: null, iframe: null, tabEl: null, labelEl: null, title: null };

  tab.tabEl = createTabElement(tab);
  dom.bar.insertBefore(tab.tabEl, dom.addBtn);
  tabs.push(tab);

  if (url) loadTab(tab, url, getPageId(url));
  if (activate) activateTab(tab);
  updateEmptyState();
  persist();
  return tab;
}

function loadTab(tab, url, pageId) {
  tab.url = url;
  tab.pageId = pageId;
  if (!tab.iframe) {
    const iframe = document.createElement('iframe');
    iframe.className = 'betabs-frame';
    iframe.setAttribute('hidden', '');
    iframe.addEventListener('load', () => onTabFrameLoad(tab));
    dom.frames.appendChild(iframe);
    tab.iframe = iframe;
  }
  tab.iframe.setAttribute('src', url);
}

export function activateTab(tab) {
  if (!tab) return;
  activeTabId = tab.id;
  tabs.forEach((t) => {
    const active = t.id === activeTabId;
    t.tabEl?.classList.toggle('betabs-tab--active', active);
    const f = t.iframe;
    if (!f) return;
    if (active) {
      f.removeAttribute('hidden');
      f.setAttribute('name', 'list_frame');
      f.id = 'typo3-contentIframe';
      f.classList.add(...IFRAME_CLASSES);
      // actually resolves against — set it directly, attribute alone is unreliable.
      try { f.contentWindow.name = 'list_frame'; } catch (e) { /* should never be called */ }
    } else {
      f.setAttribute('hidden', '');
      if (f.getAttribute('name') === 'list_frame') f.removeAttribute('name');
      if (f.id === 'typo3-contentIframe') f.removeAttribute('id');
      f.classList.remove(...IFRAME_CLASSES);
    }
  });
  if (tab.title) document.title = tab.title;
  dispatchModuleLoaded(tab);
  updateEmptyState();
  persist();
}

export function closeTab(tab) {
  const idx = tabs.indexOf(tab);
  if (idx === -1) return;
  tab.iframe?.remove();
  tab.tabEl.remove();
  tabs.splice(idx, 1);
  if (activeTabId === tab.id) {
    activeTabId = null;
    const next = tabs[idx] || tabs[idx - 1] || null;
    if (next) activateTab(next);
  }
  updateEmptyState();
  persist();
}

function onTabFrameLoad(tab) {
  let moduleName = tab.module;
  let doc;
  try {
    doc = tab.iframe.contentDocument;
    if (doc) {
      // typo3 backend renders full backend scaffold if Sec-Fetch-Dest: document on page reload (and tab restoring)
      // this pulls the real module endpoints and reloads it into the iframe since the typo3 backend don't know about module tabs
      const nestedRouter = doc.querySelector('typo3-backend-module-router');
      if (nestedRouter) {
        const realEndpoint = nestedRouter.getAttribute('endpoint');
        if (realEndpoint && realEndpoint !== tab.url) {
          console.debug('[be_tabs] unwrapping nested backend scaffold →', realEndpoint);
          loadTab(tab, realEndpoint, getPageId(realEndpoint));
          return;
        }
      }
      const moduleEl = doc.body && doc.body.querySelector('.module[data-module-name]');
      if (moduleEl) moduleName = moduleEl.getAttribute('data-module-name');
      // keep url in sync with in-iframe navigation
      tab.url = tab.iframe.contentWindow.location.href;
      tab.pageId = getPageId(tab.url);
    }
  } catch (e) { /* cross-origin — not expected in backend */ }
  if (moduleName) tab.module = moduleName;
  tab.title = doc.title || getLabelFromModuleItem(tab.module);
  updateTabLabel(tab);
  if (tab.id === activeTabId) {
    document.title = tab.title || document.title;
    try { tab.iframe.contentWindow.name = 'list_frame'; } catch (e) { /* noop */ }
    dispatchModuleLoaded(tab);
  }
  persist();
}

// navigate active tab or focus existing tab of same module
// reload it only when the id param changed (page-tree navigation)
export function navigateOrFocusTab(module, url) {
  if (!module) {
    // in-module navigation without module hint → keep it in the active tab
    const a = getActiveTab();
    if (a) { loadTab(a, url, getPageId(url)); activateTab(a); }
    else createTab(null, url, true);
    return;
  }
  const existing = tabs.find((t) => t.module === module);
  if (existing) {
    if (existing.pageId !== getPageId(url)) loadTab(existing, url, getPageId(url));
    activateTab(existing);
    return;
  }
  const active = getActiveTab();
  if (active) {
    active.module = module;
    loadTab(active, url, getPageId(url));
    activateTab(active);
    updateTabLabel(active);
  } else {
    createTab(module, url, true);
  }
}

export async function initialize() {
  if (initialized || self !== top) return;
  try {
    console.debug('[be_tabs] initialize()…');
    const router = await waitFor(() => document.querySelector('typo3-backend-module-router'));
    const cc = await waitFor(() => top.TYPO3?.Backend?.ContentContainer);
    if (!router || !cc) {
      console.warn('[be_tabs] backend not ready — router:', !!router, 'ContentContainer:', !!cc);
      return;
    }
    initialized = true;

    const startModule = router.getAttribute('module');
    const startEndpoint = router.getAttribute('endpoint');

    dom = setupTabNavigation(router.parentElement);

    // drop shared core router iframe and hide it
    router.querySelectorAll('typo3-iframe-module').forEach((el) => el.remove());
    router.style.display = 'none';

    overrideBackendContentContainer(cc);
    wireNewTabShortcut();
    wireModuleTooltip();

    const saved = restore();
    if (saved && saved.length) {
      saved.forEach((s) => createTab(s.module, s.url, false));
      const active = tabs.find((t, i) => saved[i] && saved[i].active) || tabs[0];
      activateTab(active);
    } else if (startEndpoint) {
      createTab(startModule, startEndpoint, true);
    }

    // handle for manual inspection: top.__beTabs
    top.__beTabs = { tabs, createTab, activateTab, closeTab, cc };
    console.debug('[be_tabs] ready — tabs:', tabs.length, 'start:', startModule);
  } catch (e) {
    console.error('[be_tabs] initialize failed:', e);
  }
}

console.debug('[be_tabs] module evaluated');

initialize();
