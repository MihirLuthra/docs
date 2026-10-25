import type {Plugin} from '@docusaurus/types';
import {VERSIONS_DIR, loadVersions} from './versions-data';

/**
 * Publishes versions/ (components and tested combinations) as global data,
 * for <Version> and <SupportMatrix>, after validating it (see
 * versions-data.ts). Rebuilds when the files change in dev.
 */
export default function versionsPlugin(): Plugin {
  return {
    name: 'versions',
    getPathsToWatch: () => [`${VERSIONS_DIR}/*.json`],
    async contentLoaded({actions}) {
      actions.setGlobalData(loadVersions(true));
    },
  };
}
