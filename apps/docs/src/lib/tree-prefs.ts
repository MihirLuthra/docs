const HOVER_KEY = 'fx-docs-tree-hover';

/** Whether sections open on hover (the default), from localStorage. */
export function readHoverOpen(): boolean {
  try {
    return localStorage.getItem(HOVER_KEY) !== '0';
  } catch {
    return true;
  }
}

export function writeHoverOpen(on: boolean): void {
  try {
    localStorage.setItem(HOVER_KEY, on ? '1' : '0');
  } catch {
    // Storage unavailable: the choice lasts until the page is left.
  }
}
