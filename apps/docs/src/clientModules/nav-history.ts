import type {ClientModule} from '@docusaurus/types';
import {recordTitle, recordVisit} from '../lib/nav-history';

// The page's own title, without the site name (" | Fortanix Documentation").
const pageTitle = () => document.title.replace(/\s*\|[^|]*$/, '').trim();

// Records each page this tab visits, for the header's back and forward lists
// (lib/nav-history.ts).
const clientModule: ClientModule = {
  onRouteDidUpdate({location}) {
    const key = (location as {key?: string}).key ?? `initial:${location.pathname}`;
    recordVisit(key, location.pathname + location.search + location.hash);
    // The title is set just after the route renders.
    window.setTimeout(() => recordTitle(key, pageTitle()), 100);
  },
};

export default clientModule;
