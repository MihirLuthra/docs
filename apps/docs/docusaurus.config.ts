import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import stubNotice from './src/remark/stub-notice';
import docsTree from './plugins/docs-tree';
import {recentsHeadScript} from './src/lib/recents';

// Edit links open GitHub's editor (D12).
const EDIT_BASE = 'https://github.com/mhrk0/docs/edit/main';

const config: Config = {
  title: 'Fortanix Documentation',
  tagline: 'Documentation for Fortanix products',
  favicon: 'img/favicon.svg',

  // TODO(verify): production URL not decided yet.
  url: 'https://docs.fortanix.com',
  baseUrl: '/',

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
    // Lets the home page reserve space for Recently viewed before hydration.
    {tagName: 'script', attributes: {}, innerHTML: recentsHeadScript},
    {
      tagName: 'link',
      attributes: {
        rel: 'preload',
        href: '/fonts/montserrat-latin-wght-normal.woff2',
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
          beforeDefaultRemarkPlugins: [stubNotice],
        },
        blog: false,
        theme: {customCss: './src/css/custom.css'},
      } satisfies Preset.Options,
    ],
  ],

  plugins: [docsTree],
  clientModules: ['./src/clientModules/recents.ts'],

  themeConfig: {
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
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
