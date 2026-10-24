/** Whether a key press is going into a text field (so it isn't a shortcut). */
export function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}

/**
 * Whether a single-letter shortcut ("t", "c") should act: no modifier keys,
 * not typing, and no modal open other than the navigation drawer (one
 * animating out is inert).
 */
export function isPlainShortcut(e: KeyboardEvent, key: string): boolean {
  if (e.key !== key || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return false;
  return !document.querySelector('[role="dialog"][aria-modal="true"]:not(#docs-drawer):not([inert] *)');
}
