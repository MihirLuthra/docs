import {createContext, useContext} from 'react';

export type Overlays = {
  /** Opens the search modal. */
  openSearch: () => void;
};

export const OverlaysContext = createContext<Overlays | null>(null);

export function useOverlays(): Overlays {
  const value = useContext(OverlaysContext);
  if (!value) throw new Error('useOverlays outside <Root>');
  return value;
}
