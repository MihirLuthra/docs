import type {ClientModule} from '@docusaurus/types';
import {addRecent} from '../lib/recents';

// Records visits to pages in the docs tree: those are the pages the sidebar
// marks as current (header pages such as Release notes aren't in the tree).
const clientModule: ClientModule = {
  onRouteDidUpdate({location}) {
    if (!document.querySelector('[role="tree"] [aria-current="page"]')) return;
    addRecent(location.pathname.replace(/\/+$/, '') || '/');
  },
};

export default clientModule;
