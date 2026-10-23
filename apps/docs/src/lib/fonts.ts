// Montserrat (OFL), self-hosted from static/fonts. Inlined in <head> rather
// than in custom.css: CSS url()s are copied by the bundler to a hashed path,
// which wouldn't match the preload and would download the font twice.
// The fallback is Arial adjusted to Montserrat's metrics; `optional` means the
// font never swaps in after first paint, so it can't shift the layout.
export const FONT_URL = '/fonts/montserrat-latin-wght-normal.woff2';

export const fontFaceCss = `@font-face{font-family: 'Montserrat';font-style: normal;font-weight: 100 900;font-display: optional;src: url('${FONT_URL}') format('woff2');unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;}@font-face{font-family: 'Montserrat Fallback';src: local('Arial');ascent-override: 85.79%;descent-override: 22.25%;line-gap-override: 0%;size-adjust: 112.83%;}`;
