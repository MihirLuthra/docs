import {useEffect} from 'react';

const EVENT = 'fx:nav-reset';

/**
 * Home row and header logo: besides going home, put the sidebar back to its
 * starting state (tree collapsed, "Go to page" cleared, scrolled to the top).
 */
export function resetNav(): void {
  window.dispatchEvent(new Event(EVENT));
}

export function useNavReset(onReset: () => void): void {
  useEffect(() => {
    window.addEventListener(EVENT, onReset);
    return () => {
      window.removeEventListener(EVENT, onReset);
    };
  }, [onReset]);
}
