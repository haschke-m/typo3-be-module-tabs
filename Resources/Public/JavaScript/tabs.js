/**
 * be_tabs — browser-like tabs for the TYPO3 v14 backend.
 *
 * Core problem: all classic (iframe) modules share ONE <typo3-iframe-module>
 * whose src is swapped on every switch → state is lost. And an <iframe> reloads
 * whenever it is reparented in the DOM. So: one permanent iframe per tab, never
 * moved, only shown/hidden. We take over the single navigation entry point
 * ContentContainer.setUrl and drive our own iframe pool. Menu highlight + page
 * tree stay in sync via the existing typo3-module-load(ed) events.
 */

const STORAGE_KEY = 't3-betabs-open';
const IFRAME_CLASSES = ['t3js-scaffold-content-module-iframe', 'scaffold-content-module-iframe'];

let initialized = false;
let tabs = [];            // {id, module, url, currentId, iframe, tabEl, labelEl, title}
let activeTabId = null;
let seq = 0;
let els = {};             // {wrap, bar, frames, addBtn}

function waitFor(getter, timeout = 15000) {
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

function getId(url) {
  try {
    return new URL(url, window.location.origin).searchParams.get('id');
  } catch (e) {
    return null;
  }
}

const getActiveTab = () => tabs.find((t) => t.id === activeTabId) || null;

function persist() {
  const data = tabs.map((t) => ({ module: t.module, url: t.url, active: t.id === activeTabId }));
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* quota */ }
}

function restore() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

// --- DOM ------------------------------------------------------------------

function buildChrome(contentSlot) {
  // The slotted content div is height:auto; once the in-flow router is hidden it
  // would collapse to 0. panel--content is height:100%, so pin the slot to it.
  contentSlot.style.position = 'relative';
  contentSlot.style.height = '100%';
  const wrap = document.createElement('div');
  wrap.className = 'betabs-wrap';

  const bar = document.createElement('div');
  bar.className = 'betabs-bar';
  bar.setAttribute('role', 'tablist');

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn btn-default btn-sm betabs-add';
  addBtn.title = 'Neuen Tab öffnen';
  addBtn.innerHTML = '<typo3-backend-icon identifier="actions-plus" size="small"></typo3-backend-icon>';
  addBtn.addEventListener('click', () => createTab(null, null, true));
  bar.appendChild(addBtn);

  const frames = document.createElement('div');
  frames.className = 'betabs-frames';

  const empty = document.createElement('div');
  empty.className = 'betabs-empty';
  empty.innerHTML = `
    <svg class="betabs-empty-icon" width="88" height="55" viewBox="0 0 64 40" fill="none" aria-hidden="true">
      <path d="M2 38 L2 10 Q2 4 8 4 L20 4 Q24 4 26 8 L28 12 L56 12 Q62 12 62 18 L62 38"
            stroke="currentColor" stroke-width="2" stroke-dasharray="4 4" stroke-linecap="round"/>
      <line x1="24" y1="24" x2="40" y2="24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <line x1="32" y1="16" x2="32" y2="32" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
    <p class="betabs-empty-title">It's a little quiet in here.</p>
    <p class="betabs-empty-cta">Start working now!</p>
  `;
  frames.appendChild(empty);

  wrap.append(bar, frames);
  contentSlot.appendChild(wrap);
  els = { wrap, bar, frames, addBtn, empty };
}

// Shows the placeholder whenever the ACTIVE tab has nothing loaded (a freshly
// opened "+" tab, or no tabs at all) and hides the page tree for it, since
// core's own module-load listener only reacts to a truthy module name.
function updateEmptyState() {
  const active = getActiveTab();
  const isEmpty = !active || !active.url;
  if (els.empty) els.empty.hidden = !isEmpty;
  if (isEmpty) {
    try { top.TYPO3.Backend.NavigationContainer.hide(); } catch (e) { /* not ready yet */ }
  }
}

// The module menu already renders each module's icon as inline SVG
// (core:icon alternativeMarkupIdentifier="inline") — clone that instead of
// re-resolving icon identifiers ourselves; fall back to a generic window/tab
// icon when a module has no menu entry to clone from.
function getModuleIconMarkup(module) {
  const iconEl = module && document.querySelector(`[data-modulemenu-identifier="${module}"] .modulemenu-icon`);
  return iconEl ? iconEl.innerHTML : '<typo3-backend-icon identifier="actions-browser" size="small"></typo3-backend-icon>';
}

function makeTabEl(tab) {
  const el = document.createElement('div');
  el.className = 'betabs-tab';
  el.setAttribute('role', 'tab');

  const icon = document.createElement('span');
  icon.className = 'betabs-tab-icon';
  icon.innerHTML = getModuleIconMarkup(tab.module);

  const label = document.createElement('span');
  label.className = 'betabs-tab-label';
  label.textContent = tab.title || tab.module || '…';

  const close = document.createElement('span');
  close.className = 'betabs-tab-close';
  close.title = 'Tab schließen';
  close.innerHTML = '<typo3-backend-icon identifier="actions-close" size="small"></typo3-backend-icon>';
  close.addEventListener('click', (e) => { e.stopPropagation(); closeTab(tab); });

  el.append(icon, label, close);
  el.addEventListener('click', () => activateTab(tab));
  el.addEventListener('auxclick', (e) => { if (e.button === 1) { e.preventDefault(); closeTab(tab); } });

  tab.iconEl = icon;
  tab.labelEl = label;
  return el;
}

function updateLabel(tab) {
  if (tab.labelEl) tab.labelEl.textContent = tab.title || tab.module || '…';
  if (tab.tabEl) tab.tabEl.title = tab.title || tab.module || '';
  if (tab.iconEl) tab.iconEl.innerHTML = getModuleIconMarkup(tab.module);
}

// --- tab lifecycle --------------------------------------------------------

// url may be null/omitted to open a blank tab (the "+" button) — its iframe
// is created lazily by loadTab() once a module actually gets loaded into it.
function createTab(module, url, activate = true) {
  const tab = { id: ++seq, module: module || null, url: null, currentId: null, iframe: null, tabEl: null, labelEl: null, title: null };

  tab.tabEl = makeTabEl(tab);
  els.bar.insertBefore(tab.tabEl, els.addBtn);
  tabs.push(tab);

  if (url) loadTab(tab, url, getId(url));
  if (activate) activateTab(tab);
  updateEmptyState();
  persist();
  return tab;
}

function loadTab(tab, url, idParam) {
  tab.url = url;
  tab.currentId = idParam;
  if (!tab.iframe) {
    const iframe = document.createElement('iframe');
    iframe.className = 'betabs-frame';
    iframe.setAttribute('hidden', '');
    iframe.addEventListener('load', () => onFrameLoad(tab));
    els.frames.appendChild(iframe);
    tab.iframe = iframe;
  }
  tab.iframe.setAttribute('src', url);
}

function activateTab(tab) {
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
      // ponytail: window.name is the browsing-context name target="list_frame"
      // actually resolves against — set it directly, attribute alone is unreliable.
      try { f.contentWindow.name = 'list_frame'; } catch (e) { /* pre-load / cross-origin */ }
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

function closeTab(tab) {
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

function onFrameLoad(tab) {
  let title = tab.module;
  let moduleName = tab.module;
  try {
    const doc = tab.iframe.contentDocument;
    if (doc) {
      // TYPO3's BackendModuleValidator redirects a module request to the full
      // backend scaffold ("main" route) whenever it sees Sec-Fetch-Dest: document
      // (its heuristic for "opened directly, not embedded"). Our dynamically
      // created iframes are legitimate embeds, but some loads still trip this —
      // unwrap by pulling the real module endpoint out of the nested scaffold's
      // router and loading that directly instead of the full chrome.
      const nestedRouter = doc.querySelector('typo3-backend-module-router');
      if (nestedRouter) {
        const realEndpoint = nestedRouter.getAttribute('endpoint');
        if (realEndpoint && realEndpoint !== tab.url) {
          console.debug('[be_tabs] unwrapping nested backend scaffold →', realEndpoint);
          loadTab(tab, realEndpoint, getId(realEndpoint));
          return;
        }
      }
      title = doc.title || title;
      const moduleEl = doc.body && doc.body.querySelector('.module[data-module-name]');
      if (moduleEl) moduleName = moduleEl.getAttribute('data-module-name');
      // keep url in sync with in-iframe navigation
      tab.url = tab.iframe.contentWindow.location.href;
      tab.currentId = getId(tab.url);
    }
  } catch (e) { /* cross-origin — not expected in backend */ }
  tab.title = title;
  if (moduleName) tab.module = moduleName;
  updateLabel(tab);
  if (tab.id === activeTabId) {
    document.title = title || document.title;
    try { tab.iframe.contentWindow.name = 'list_frame'; } catch (e) { /* noop */ }
    dispatchModuleLoaded(tab);
  }
  persist();
}

function dispatchModuleLoaded(tab) {
  const detail = { url: tab.url, title: tab.title, module: tab.module };
  document.dispatchEvent(new CustomEvent('typo3-module-load', { detail, bubbles: true, composed: true }));
  document.dispatchEvent(new CustomEvent('typo3-module-loaded', { detail, bubbles: true, composed: true }));
}

// --- navigation routing ---------------------------------------------------

// Normal click: navigate active tab; focus existing tab of same module,
// reload it only when the id param changed (page-tree navigation).
function navigateOrFocus(module, url) {
  if (!module) {
    // in-module navigation without module hint → keep it in the active tab
    const a = getActiveTab();
    if (a) { loadTab(a, url, getId(url)); activateTab(a); }
    else createTab(null, url, true);
    return;
  }
  const existing = tabs.find((t) => t.module === module);
  if (existing) {
    if (existing.currentId !== getId(url)) loadTab(existing, url, getId(url));
    activateTab(existing);
    return;
  }
  const active = getActiveTab();
  if (active) {
    active.module = module;
    loadTab(active, url, getId(url));
    activateTab(active);
    updateLabel(active);
  } else {
    createTab(module, url, true);
  }
}

// --- wiring ---------------------------------------------------------------

function overrideContentContainer(cc) {
  const originalSetUrl = cc.setUrl.bind(cc);
  cc.setUrl = (url, request, module) => {
    if (self !== top) return originalSetUrl(url, request, module);
    if (url instanceof URL) url = url.toString();
    navigateOrFocus(module || null, url);
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

// Middle-click / Ctrl(⌘)-click on a module menu item → open in a NEW tab.
// Bound on document (capture) so it works regardless of the menu container and
// runs before the core's own bubble-phase click delegate.
function wireNewTabGesture() {
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

    buildChrome(router.parentElement);

    // Neutralize the core router: drop its shared iframe and hide it so there is
    // no duplicate #typo3-contentIframe / name="list_frame" competing with ours.
    router.querySelectorAll('typo3-iframe-module').forEach((el) => el.remove());
    router.style.display = 'none';

    overrideContentContainer(cc);
    wireNewTabGesture();

    const saved = restore();
    if (saved && saved.length) {
      saved.forEach((s) => createTab(s.module, s.url, false));
      const active = tabs.find((t, i) => saved[i] && saved[i].active) || tabs[0];
      activateTab(active);
    } else if (startEndpoint) {
      createTab(startModule, startEndpoint, true);
    }

    // Handle for manual inspection: top.__beTabs
    top.__beTabs = { tabs, createTab, activateTab, closeTab, cc };
    console.debug('[be_tabs] ready — tabs:', tabs.length, 'start:', startModule);
  } catch (e) {
    console.error('[be_tabs] initialize failed:', e);
  }
}

console.debug('[be_tabs] module evaluated');

// Self-initialize on import (loaded as a side-effect module from PHP).
initialize();
