import { createTab, activateTab, closeTab, getActiveTab, dom } from './tabs.js';
import { startTabDrag, didDrag } from './tab-view-dragdrop.js';
import { localize } from './tab-utility.js';
import { SCROLL_STEP, createScrollBtn, updateScrollArrows } from './tab-view-scroll.js';
import { getModuleIconMarkup, getLabelFromModuleItem } from './tab-backend.js';

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

    // seperate bar strip for tabs, plus & scroll arrows stay pinned
    const scroll = document.createElement('div');
    scroll.className = 'betabs-scroll';

    const scrollLeftBtn = createScrollBtn('actions-chevron-left', 'Tabs nach links', () => scroll.scrollBy({ left: -SCROLL_STEP, behavior: 'smooth' }));
    const scrollRightBtn = createScrollBtn('actions-chevron-right', 'Tabs nach rechts', () => scroll.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' }));

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-default btn-sm betabs-add';
    addBtn.title = localize('beTabs.newTab', 'Open new tab');
    addBtn.innerHTML = '<typo3-backend-icon identifier="actions-plus" size="small"></typo3-backend-icon>';
    addBtn.addEventListener('click', () => createTab(null, null, true));

    bar.append(scrollLeftBtn, scroll, scrollRightBtn, addBtn);

    // mutation observer to check if scroll arrows should be visible or hidden if tabs overflowing
    scroll.addEventListener('scroll', updateScrollArrows, { passive: true });
    new ResizeObserver(updateScrollArrows).observe(scroll);
    new MutationObserver(updateScrollArrows).observe(scroll, { childList: true });

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
    <p class="betabs-empty-title">${localize('beTabs.emptyTitle', "It's a little quiet in here.")}</p>
    <p class="betabs-empty-cta">${localize('beTabs.emptyCta', 'Start working now!')}</p>
  `;
    frames.appendChild(empty);

    wrap.append(bar, frames);
    contentSlot.appendChild(wrap);
    return { wrap, bar, scroll, scrollLeftBtn, scrollRightBtn, frames, addBtn, empty };
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

function resolveTabLabel(tab) {
    return tab.title || getLabelFromModuleItem(tab.module);
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
    label.textContent = resolveTabLabel(tab) || '…';

    const close = document.createElement('span');
    close.className = 'betabs-tab-close';
    close.title = localize('beTabs.closeTab', 'Close tab');
    close.innerHTML = '<typo3-backend-icon identifier="actions-close" size="small"></typo3-backend-icon>';
    close.addEventListener('click', (e) => { e.stopPropagation(); closeTab(tab); });

    el.append(icon, label, close);
    el.addEventListener('click', () => { if (!didDrag) activateTab(tab); });
    el.addEventListener('auxclick', (e) => { if (e.button === 1) { e.preventDefault(); closeTab(tab); } });
    el.addEventListener('pointerdown', (e) => startTabDrag(el, e));

    tab.iconEl = icon;
    tab.labelEl = label;
    return el;
}

export function updateTabLabel(tab) {
    if (tab.labelEl) tab.labelEl.textContent = resolveTabLabel(tab) || '…';
    if (tab.tabEl) tab.tabEl.title = resolveTabLabel(tab);
    if (tab.iconEl) tab.iconEl.innerHTML = getModuleIconMarkup(tab.module);
    updateScrollArrows();
}