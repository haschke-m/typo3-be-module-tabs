/**
 * scroll arrows for the tabbar, shown once the tabs overflow
 */
import { dom } from './tabs.js';

// jump with per scroll click in px
export const SCROLL_STEP = 200;

// pinned scroll-arrow button, hidden until the tabs overflow
export function createScrollBtn(icon, title, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-default btn-sm betabs-scroll-btn';
    btn.title = title;
    btn.hidden = true;
    btn.innerHTML = `<typo3-backend-icon identifier="${icon}" size="small"></typo3-backend-icon>`;
    btn.addEventListener('click', onClick);
    return btn;
}

// show scroll arrow if tabs overflow and:
// left if scrolled of start, right until end is reached
export function updateScrollArrows() {
    const s = dom.scroll;
    if (!s) return;
    const overflow = s.scrollWidth - s.clientWidth > 1;
    dom.scrollLeftBtn.hidden = !overflow || s.scrollLeft <= 1;
    dom.scrollRightBtn.hidden = !overflow || s.scrollLeft >= s.scrollWidth - s.clientWidth - 1;
}
