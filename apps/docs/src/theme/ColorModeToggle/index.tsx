import {useEffect, useState, type ReactNode} from 'react';
import clsx from 'clsx';
import type {Props} from '@theme/ColorModeToggle';
import IconLightMode from '@theme/Icon/LightMode';
import IconDarkMode from '@theme/Icon/DarkMode';
import styles from './styles.module.css';

/**
 * Two states only: light and dark. Until the reader picks one it follows the
 * system setting (Docusaurus's "system" choice); a click stores the other
 * mode. The icon shows the current mode, chosen by CSS from <html
 * data-theme>, which Docusaurus sets before first paint.
 */
export default function ColorModeToggle({className, buttonClassName, onChange}: Props): ReactNode {
  const [isDark, setIsDark] = useState(false);

  // Track the applied mode, including system changes while none is chosen.
  useEffect(() => {
    const html = document.documentElement;
    const read = () => {
      setIsDark(html.getAttribute('data-theme') === 'dark');
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(html, {attributes: true, attributeFilter: ['data-theme']});
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className={clsx(styles.toggle, className)}>
      <button
        type="button"
        className={clsx('clean-btn', styles.button, buttonClassName)}
        onClick={() => onChange(isDark ? 'light' : 'dark')}
        aria-label="Dark mode"
        aria-pressed={isDark}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
        <IconLightMode aria-hidden className={styles.light} />
        <IconDarkMode aria-hidden className={styles.dark} />
      </button>
    </div>
  );
}
