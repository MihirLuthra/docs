import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import type {Options as DocsOptions} from '@docusaurus/plugin-content-docs';
import {products, productPath} from './src/data/products';

const docsPlugins = products.map((product) => [
  '@docusaurus/plugin-content-docs',
  {
    id: product.id,
    path: `../../content/${product.id}`,
    routeBasePath: product.id,
    sidebarPath: false,
  } satisfies DocsOptions,
]);

const config: Config = {
  title: 'Fortanix Documentation',
  tagline: 'Documentation for Fortanix products',
  favicon: 'img/favicon.svg',

  // TODO(verify): production URL not decided yet.
  url: 'https://docs.fortanix.com',
  baseUrl: '/',

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',
  markdown: {hooks: {onBrokenMarkdownLinks: 'throw'}},

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
        docs: false,
        blog: false,
        theme: {customCss: './src/css/custom.css'},
      } satisfies Preset.Options,
    ],
  ],

  plugins: docsPlugins,

  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexBlog: false,
        indexPages: false,
        docsRouteBasePath: products.map((p) => p.id),
        docsDir: products.map((p) => `../../content/${p.id}`),
        docsPluginIdForPreferredVersion: products[0].id,
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
        ...products.map((p) => ({
          to: productPath(p),
          label: p.shortName,
          position: 'left' as const,
          activeBasePath: p.id,
        })),
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
