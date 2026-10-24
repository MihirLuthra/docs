import {useEffect, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject} from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

export {styles as menuStyles};

// Kept at least this far from the viewport's right edge.
const VIEWPORT_MARGIN = 16;

/**
 * A small dropdown list (role="menu") under its trigger, shared by the Back
 * and Forward lists and the path menus. Its parent must be position: relative.
 * Keyboard: ↑ ↓ Home End move, Esc closes and returns to the trigger, Tab
 * leaves. A click outside `rootRef` (trigger and menu) closes it. Items are
 * elements with role="menuitem" and tabIndex={-1}; the first is focused on
 * open and whenever `view` changes (e.g. after moving into a sub-folder).
 */
export default function Menu({
  label,
  rootRef,
  triggerRef,
  onClose,
  view,
  className,
  onKeyDown,
  children,
}: {
  label: string;
  rootRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  view?: string;
  className?: string;
  /** Extra keys (e.g. ← → in the path menus); called first. */
  onKeyDown?: (e: KeyboardEvent) => void;
  children: ReactNode;
}): ReactNode {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [rootRef, onClose]);

  // Opens to the right of its trigger; moved left if it would leave the screen.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    menu.style.translate = '';
    const over = menu.getBoundingClientRect().right - (document.documentElement.clientWidth - VIEWPORT_MARGIN);
    if (over > 0) menu.style.translate = `${-over}px 0`;
  }, [view]);

  useEffect(() => {
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [view]);

  const handleKeyDown = (e: KeyboardEvent) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    const move = (i: number) => items[(i + items.length) % items.length]?.focus();
    if (e.key === 'ArrowDown') move(at + 1);
    else if (e.key === 'ArrowUp') move(at - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(items.length - 1);
    else if (e.key === 'Escape') {
      onClose();
      triggerRef.current?.focus();
    } else if (e.key === 'Tab') {
      onClose();
      return;
    } else return;
    e.preventDefault();
  };

  return (
    <div ref={menuRef} className={clsx(styles.menu, className)} role="menu" aria-label={label} onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
}
