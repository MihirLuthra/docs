// Inter (OFL, static/fonts/Inter-OFL.txt): variable, Latin subset, trimmed
// to weights 400-700 (see docs-meta/fonts/README.md), self-hosted from
// static/fonts. Inlined in <head> rather than in custom.css: CSS url()s are
// copied by the bundler to a hashed path, which wouldn't match the preload
// and would download the font twice.
// The fallback is Arial (or the metric-compatible Liberation Sans) adjusted to
// Inter's metrics; `optional` means the font never swaps in after first
// paint, so it can't shift the layout.
export const FONT_URL = '/fonts/inter-latin-wght-normal.woff2';

const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

export const fontFaceCss =
  `@font-face{font-family:'Inter';font-style:normal;font-weight:400 700;font-display:optional;src:url('${FONT_URL}') format('woff2');unicode-range:${LATIN}}` +
  // Overrides measured from the font files (letter-frequency-weighted widths).
  `@font-face{font-family:'Inter Fallback';src:local('Arial'),local('Liberation Sans');size-adjust:107.34%;ascent-override:90.25%;descent-override:22.47%;line-gap-override:0%}`;
