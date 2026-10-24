import {useEffect} from 'react';

const EVENT = 'fx:tree-reveal';

/**
 * Opens the sidebar tree down to the folder or page `key` (e.g. "2.0.1"),
 * scrolls it into view and focuses it ("Show in sidebar" in the path menus).
 */
export function revealInTree(key: string): void {
  window.dispatchEvent(new CustomEvent<string>(EVENT, {detail: key}));
}

export function useTreeReveal(onReveal: (key: string) => void): void {
  useEffect(() => {
    const listener = (e: Event) => onReveal((e as CustomEvent<string>).detail);
    window.addEventListener(EVENT, listener);
    return () => {
      window.removeEventListener(EVENT, listener);
    };
  }, [onReveal]);
}
