const SMART_KEY = 'fx-docs-tree-smart';

/** Whether the smart index is on (the default), from localStorage. */
export function readSmartIndex(): boolean {
  try {
    return localStorage.getItem(SMART_KEY) !== '0';
  } catch {
    return true;
  }
}

export function writeSmartIndex(on: boolean): void {
  try {
    localStorage.setItem(SMART_KEY, on ? '1' : '0');
  } catch {
    // Storage unavailable: the choice lasts until the page is left.
  }
}
