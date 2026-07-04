import { createTab, activateTab, closeTab, getActiveTab, dom } from './tabs.js';

// setup tab navigation bar and content wrapper
// returns dom handles to get used by tabs.js
export function setupTabNavigation(contentSlot) {
    // content div is height:auto
    // if the orinal router is hidden it would collapse to 0
    // panel--content is height:100%, so pin the slot to it
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
    return { wrap, bar, frames, addBtn, empty };
}

// show placeholder content if nothing is loaded
export function updateEmptyState() {
    const active = getActiveTab();
    const isEmpty = !active || !active.url;
    if (dom.empty) dom.empty.hidden = !isEmpty;
    if (isEmpty) {
        try { top.TYPO3.Backend.NavigationContainer.hide(); } catch (e) { /* not ready yet */ }
    }
}

// get module icon from clicked element
function getModuleIconMarkup(module) {
    const iconEl = module && document.querySelector(`[data-modulemenu-identifier="${module}"] .modulemenu-icon`);
    return iconEl ? iconEl.innerHTML : '<typo3-backend-icon identifier="actions-browser" size="small"></typo3-backend-icon>';
}

export function createTabElement(tab) {
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

export function updateTabLabel(tab) {
    if (tab.labelEl) tab.labelEl.textContent = tab.title || tab.module || '…';
    if (tab.tabEl) tab.tabEl.title = tab.title || tab.module || '';
    if (tab.iconEl) tab.iconEl.innerHTML = getModuleIconMarkup(tab.module);
}
