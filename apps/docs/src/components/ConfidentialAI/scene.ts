// Text helpers shared by the SVG scenes (DeploymentFlow, AttestationFlow).
// SVG text doesn't wrap or shrink by itself, so the scenes measure roughly.

/** About how wide text is at a font size; Inter averages a little over half an em. */
export const textWidth = (text: string, size: number, bold = false) => text.length * size * (bold ? 0.6 : 0.55);
export const charsFor = (avail: number, size: number) => Math.max(6, Math.floor(avail / (size * 0.55)));
/** Shrinks a line that would run past avail, so text never spills out of its card. */
export const fit = (text: string, size: number, avail: number, bold = false) =>
  textWidth(text, size, bold) > avail ? { textLength: Math.max(10, avail), lengthAdjust: "spacingAndGlyphs" as const } : {};

/** Splits text into lines of about n characters. */
export function wrap(text: string, n: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line && (line + " " + word).length > n) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}
