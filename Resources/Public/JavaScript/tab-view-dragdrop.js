/**
 * drag & drop reordering of the tabs in the tabbar
 */
import { reorderTabsFromDom, dom } from './tabs.js';

// drag & drop reordering
const DRAG_THRESHOLD = 4; // px of movement before a mousedown counts as a drag
const EDGE_ZONE = 48; // px from the tabbar edge where auto-scrolling starts
const EDGE_SPEED = 12; // px for autoscroll

// set while a drag is in progress so the tab's click does not activate it
export let didDrag = false;

// reordering tabs by dragging with pointer events, the tab follows the pointer via transform to stay inside the tabbar
export function startTabDrag(el, event) {
    if (event.button !== 0 || event.target.closest('.betabs-tab-close')) return;

    const strip = dom.scroll;
    let originX = event.clientX; // pointer origin
    let pointerX = originX;
    let applied = 0; // transform currently on the element
    let dragging = false;
    let scrollFrame = null;
    let overlay = null;

    didDrag = false;
    el.setPointerCapture(event.pointerId);

    const shiftOrigin = (change) => {
        const before = el.getBoundingClientRect().left;
        change();
        originX += el.getBoundingClientRect().left - before;
    };

    // follow the pointer, but never leave the tabbar
    const applyTransform = () => {
        const stripBox = strip.getBoundingClientRect();
        const layoutLeft = el.getBoundingClientRect().left - applied;
        const contentLeft = stripBox.left - strip.scrollLeft;
        const minLeft = Math.max(stripBox.left, contentLeft);
        const maxLeft = Math.min(stripBox.right, contentLeft + strip.scrollWidth) - el.offsetWidth;
        const wanted = layoutLeft + (pointerX - originX);
        const clamped = Math.min(Math.max(wanted, minLeft), Math.max(minLeft, maxLeft));
        applied = clamped - layoutLeft;
        originX = pointerX - applied;
        el.style.transform = `translateX(${applied}px)`;
    };

    const reposition = () => {
        applyTransform();
        const target = getTabDropTarget(strip, el.getBoundingClientRect().left + el.offsetWidth / 2);
        if (target === el.nextElementSibling || (!target && el === strip.lastElementChild)) return;
        shiftOrigin(() => target ? strip.insertBefore(el, target) : strip.appendChild(el));
        applyTransform();
    };

    // keep scrolling while the pointer is near an edge of the strip
    const autoScroll = () => {
        if (scrollFrame) return;
        const step = () => {
            scrollFrame = null;
            if (!dragging) return;
            const box = strip.getBoundingClientRect();
            const direction = pointerX < box.left + EDGE_ZONE ? -1 : pointerX > box.right - EDGE_ZONE ? 1 : 0;
            if (!direction) return;
            const from = strip.scrollLeft;
            shiftOrigin(() => { strip.scrollLeft += direction * EDGE_SPEED; });
            if (strip.scrollLeft === from) return;   // hit the end
            reposition();
            scrollFrame = requestAnimationFrame(step);
        };
        scrollFrame = requestAnimationFrame(step);
    };

    const onMove = (e) => {
        pointerX = e.clientX;
        if (!dragging) {
            if (Math.abs(pointerX - originX) < DRAG_THRESHOLD) return;
            dragging = didDrag = true;
            el.classList.add('betabs-tab--dragging');
            // module iframes below tabbar are seperate documents, this would kill tracking the pointer when leaving the bar
            // therefore we place an invisible overlay until the cursor is released
            overlay = document.createElement('div');
            overlay.className = 'betabs-drag-overlay';
            document.body.appendChild(overlay);
        }
        reposition();
        autoScroll();
    };

    const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        overlay?.remove();
        overlay = null;
        if (scrollFrame) cancelAnimationFrame(scrollFrame);
        if (!dragging) return;
        dragging = false;
        el.classList.remove('betabs-tab--dragging');
        el.style.transform = '';
        reorderTabsFromDom();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
}

// first tab whose midpoint is right of the pointer, the dragged tab goes before
// it; null means the pointer is past the last tab, so it goes to the end
function getTabDropTarget(container, x) {
    const others = [...container.querySelectorAll('.betabs-tab:not(.betabs-tab--dragging)')];
    return others.find((el) => {
        const box = el.getBoundingClientRect();
        return x < box.left + box.width / 2;
    }) || null;
}
