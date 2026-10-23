# Fonts

## Inter

`apps/docs/static/fonts/inter-latin-wght-normal.woff2` is a trimmed copy of
Inter, made by [`make-inter.sh`](make-inter.sh). Licence: SIL OFL 1.1, kept
next to the font as `Inter-OFL.txt`. Inter declares no Reserved Font Name, so
the trimmed copy keeps the name.

- **Source:** `files/inter-latin-wght-normal.woff2` from
  `@fontsource-variable/inter` 5.3.0 (variable, Latin subset, 48 KB).
- **Weights kept:** 400–700 (still variable). The site uses 400, 500, 600 and
  700; other weights fall back to the nearest one.
- **Features kept:** `calt`, `ccmp`, `locl`, `kern`, `mark`, `mkmk`, `tnum`.
- **Dropped:** the `frac`, `numr`, `dnom` and `pnum` features, and hinting.
- **Characters:** unchanged (the same Latin range, 230 code points).
- **Result:** 32 KB. Trimmed because the full file cost one point of
  Lighthouse mobile on the home page (median of 5: 94 vs 95).

Tools: fonttools 4.67.0 (`varLib.instancer`, `pyftsubset`).

### Fallback metrics

`apps/docs/src/lib/fonts.ts` sizes the fallback (Arial, or the
metric-compatible Liberation Sans) to Inter so the page looks the same
before the font loads:

| Override | Value |
|---|---|
| `size-adjust` | 107.34% |
| `ascent-override` | 90.25% |
| `descent-override` | 22.47% |
| `line-gap-override` | 0% |

`size-adjust` is the ratio of the fonts' average widths for English text
(lowercase letters and space, weighted by letter frequency, at weight 400).
The ascent and descent overrides are Inter's typo ascender (1984) and
descender (494) over 2048 units per em, divided by `size-adjust`. Recompute
them if the font file changes.
