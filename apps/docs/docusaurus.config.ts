import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import stubNotice from './src/remark/stub-notice';

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

  headTags: [
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

  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexBlog: false,
        indexPages: false,
        docsRouteBasePath: '/',
        docsDir: '../../content',
        highlightSearchTermsOnTargetPage: false,
        searchBarShortcutHint: false,
      },
    ],
  ],

  themeConfig: {
    colorMode: {respectPrefersColorScheme: true},
    navbar: {
      title: '',
      style: 'dark',
      logo: {
        alt: 'Fortanix',
        src: 'img/fortanix-logo.svg',
        width: 120,
        height: 24,
      },
      items: [
        {type: 'search', position: 'right'},
      ],
    },
    footer: {
      style: 'dark',
      copyright: `© ${new Date().getFullYear()} Fortanix, Inc.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
