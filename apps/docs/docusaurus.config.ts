import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import stubNotice from './src/remark/stub-notice';
import versionReferences from './src/remark/versions';
import docsTree from './plugins/docs-tree';
import contributors from './plugins/contributors';
import versions from './plugins/versions';
import prismTheme from './src/lib/prism-theme';
import {recentsHeadScript} from './src/lib/recents';
import {fontFaceCss, fontUrl} from './src/lib/fonts';
import {searchEarlyScript} from './src/lib/search-early';

const GITHUB_REPO = 'MihirLuthra/docs';
// The branch the site is published from (.github/workflows/pages.yml).
const GITHUB_BRANCH = 'mihir/initial-setup';

// Where the site is served. The GitHub Pages workflow sets both
// (.github/workflows/pages.yml); local builds serve from the root.
const BASE_URL = process.env.DOCS_BASE_URL ?? '/';

// Edit links open GitHub's editor (D12).
const EDIT_BASE = `https://github.com/${GITHUB_REPO}/edit/${GITHUB_BRANCH}`;

const config: Config = {
  title: 'Fortanix Documentation',
  tagline: 'Documentation for Fortanix products',
  favicon: 'img/favicon.svg',

  // TODO(verify): production URL not decided yet.
  url: process.env.DOCS_URL ?? 'https://docs.fortanix.com',
  baseUrl: BASE_URL,

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',
  markdown: {format: 'detect', hooks: {onBrokenMarkdownLinks: 'throw'}},

  future: {
    v4: true,
    faster: true,
  },

  i18n: {defaultLocale: 'en', locales: ['en']},

  customFields: {
    // Ask AI panel (D9): off unless built with DOCS_ASK_AI=1. There is no
    // backend yet, so with it on the panel only lists related pages.
    askAI: process.env.DOCS_ASK_AI === '1',
  },

  headTags: [
    {tagName: 'style', attributes: {}, innerHTML: fontFaceCss(BASE_URL)},
    // Keeps search clicks/shortcuts made before hydration (lib/search-early.ts).
    {tagName: 'script', attributes: {}, innerHTML: searchEarlyScript},
    // Lets the home page reserve space for Recently viewed before hydration.
    {tagName: 'script', attributes: {}, innerHTML: recentsHeadScript},
    {
      tagName: 'link',
      attributes: {
        rel: 'preload',
        href: fontUrl(BASE_URL),
        as: 'font',
        type: 'font/woff2',
        crossorigin: 'anonymous',
      },
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          path: '../../content',
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          // Root-level pages are header links, not part of the tree.
          sidebarItemsGenerator: async ({defaultSidebarItemsGenerator, ...args}) =>
            (await defaultSidebarItemsGenerator(args)).filter(
              (item) => item.type !== 'doc',
            ),
          editUrl: ({docPath}) => `${EDIT_BASE}/content/${docPath}`,
          beforeDefaultRemarkPlugins: [stubNotice, versionReferences],
        },
        blog: false,
        theme: {customCss: './src/css/custom.css'},
      } satisfies Preset.Options,
    ],
  ],

  plugins: [docsTree, versions, [contributors, {repo: GITHUB_REPO, branch: GITHUB_BRANCH}]],
  clientModules: ['./src/clientModules/recents.ts', './src/clientModules/nav-history.ts'],

  themeConfig: {
    // Default for pages without their own description (stubs); pages that
    // have one replace it.
    metadata: [{name: 'description', content: 'Documentation for Fortanix products.'}],
    colorMode: {respectPrefersColorScheme: true},
    // Read by the custom header (src/theme/Navbar); not part of the tree.
    navbar: {
      items: [
        {label: 'Release notes', to: '/release-notes'},
        {label: 'Advisories', to: '/advisories'},
        {label: 'Downloads', to: '/downloads'},
      ],
    },
    footer: {
      copyright: `© ${new Date().getFullYear()} Fortanix, Inc.`,
    },
    // One theme made of CSS tokens; light and dark come from custom.css.
    prism: {
      theme: prismTheme,
      darkTheme: prismTheme,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
