/**
 * Inline <head> script: until the app has hydrated, clicks on the search
 * trigger and the search shortcuts (Cmd/Ctrl+K, "/") would be lost. This
 * records them; Root opens search once it is ready (see src/theme/Root.tsx).
 * While one is pending, <html data-search-pending> shows the trigger pressed.
 */
export const SEARCH_TRIGGER_ATTR = 'data-search-trigger';

export const searchEarlyScript = `(function(){var w=window,d=document;function queue(e){if(w.__fxSearchReady)return;w.__fxSearchQueued=true;d.documentElement.setAttribute('data-search-pending','');e.preventDefault();}d.addEventListener('click',function(e){var t=e.target;if(t&&t.closest&&t.closest('[${SEARCH_TRIGGER_ATTR}]'))queue(e);},true);d.addEventListener('keydown',function(e){if(w.__fxSearchReady)return;var t=e.target||{},k=(e.key||'').toLowerCase(),typing=t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName||'');if((k==='k'&&(e.metaKey||e.ctrlKey))||(e.key==='/'&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!typing))queue(e);},true);})();`;

declare global {
  interface Window {
    __fxSearchReady?: boolean;
    __fxSearchQueued?: boolean;
  }
}
