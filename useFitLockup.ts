import { RefObject, useLayoutEffect } from 'react';

/**
 * Sizes every [data-fit] line (and the [data-fit-rule] divider) inside the lockup
 * to the exact width of its [data-fit-target] word, e.g. the word WISE.
 */
export const useFitLockup = (ref: RefObject<HTMLElement | null>) => {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const targetEl = el.querySelector('[data-fit-target]');
    if (!targetEl) return;
    const fit = () => {
      const target = targetEl.getBoundingClientRect().width;
      if (!target) return;
      const rule = el.querySelector<HTMLElement>('[data-fit-rule]');
      if (rule) rule.style.width = `${target}px`;
      el.querySelectorAll<HTMLElement>('[data-fit]').forEach(span => {
        const line = span.parentElement as HTMLElement;
        line.style.fontSize = '20px';
        const w = span.getBoundingClientRect().width;
        if (w) line.style.fontSize = `${(20 * target / w).toFixed(2)}px`;
      });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(targetEl);
    window.addEventListener('resize', fit);
    document.fonts?.ready.then(fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, [ref]);
};
