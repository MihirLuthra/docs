import {createContext, useContext} from 'react';

export type Overlays = {
  /** Opens the search modal. */
  openSearch: () => void;
  /** Whether the Ask AI flag is on (customFields.askAI). */
  askAIEnabled: boolean;
  askAIOpen: boolean;
  /** Opens the Ask AI panel, optionally asking `question`. */
  openAskAI: (question?: string) => void;
  toggleAskAI: () => void;
};

export const OverlaysContext = createContext<Overlays | null>(null);

export function useOverlays(): Overlays {
  const value = useContext(OverlaysContext);
  if (!value) throw new Error('useOverlays outside <Root>');
  return value;
}
