import {useEffect, type RefObject} from 'react';

/**
 * Sets --fx-footer-overlap on `ref`'s element to how much of the site footer is
 * on screen, so a sticky sidebar can end above it (max-height minus this)
 * instead of being pushed up by it, which would take its top (and the "Go
 * to page" filter) off screen. Updated at most once a frame while scrolling.
 */
export function useFooterOverlap(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    const footer = document.querySelector('.theme-layout-footer');
    if (!el || !footer) return undefined;
    let frame = 0;
    let last = -1;
    const update = () => {
      frame = 0;
      const overlap = Math.max(0, Math.round(window.innerHeight - footer.getBoundingClientRect().top));
      if (overlap === last) return;
      last = overlap;
      el.style.setProperty('--fx-footer-overlap', `${overlap}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, {passive: true});
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [ref]);
}
