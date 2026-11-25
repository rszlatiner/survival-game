import { Svg, type ArtProps } from "./Svg";

/**
 * Tiny pixel-sprite engine. A sprite is a list of equal-length strings, one
 * character per pixel ("." is transparent), and a palette letter -> colour.
 * Rows are run-length merged into <rect>s once at module load, so each sprite
 * costs a handful of rects and every icon, scene and the island map share it.
 */

/** Limited 16-colour palette shared by every sprite. */
export const PAL: Record<string, string> = {
  k: "#050a14", // outline / void navy
  w: "#ffffff",
  l: "#4cc9ff", // light blue (water, sky glints)
  t: "#2ce0d0", // turquoise
  b: "#0fa3a8", // ocean
  B: "#0a6a6d", // deep ocean
  y: "#ffd23f", // sunny yellow
  o: "#f59e0b", // orange
  r: "#ff6b4a", // coral
  R: "#b3301a", // deep coral
  q: "#ffb199", // peach
  g: "#3bd16f", // palm green
  G: "#1d6b35", // deep green
  s: "#f4d79b", // sand
  n: "#7a4a24", // bark
  N: "#432914", // dark bark
  e: "#8b9bb4", // stone grey
  E: "#4b5a73", // dark grey
};

export interface SpriteData {
  w: number;
  h: number;
  rects: { x: number; y: number; w: number; c: string }[];
}

export function sprite(rows: string[], pal: Record<string, string> = PAL): SpriteData {
  const w = rows[0].length;
  if (rows.some((r) => r.length !== w)) throw new Error(`sprite rows must all be ${w} wide`);
  const rects: SpriteData["rects"] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      if (ch !== "." && ch !== " ") rects.push({ x, y, w: end - x, c: pal[ch] ?? PAL[ch] ?? "#ff00ff" });
      x = end;
    }
  });
  return { w, h: rows.length, rects };
}

/** Sprite pixels as a <g>, for placing inside a larger SVG (scenes, map). */
export function SpriteG({ s, x = 0, y = 0, flip = false, className }: { s: SpriteData; x?: number; y?: number; flip?: boolean; className?: string }) {
  const t = flip ? `translate(${x + s.w} ${y}) scale(-1 1)` : `translate(${x} ${y})`;
  return (
    <g transform={t} className={className}>
      {s.rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
    </g>
  );
}

/** A sprite as a standalone, crisp, decorative (unless titled) SVG. */
export function Sprite({ s, size = "1em", className, title, children }: ArtProps & { s: SpriteData; children?: React.ReactNode }) {
  const ratio = s.h / s.w;
  const height = typeof size === "number" ? Math.round(size * ratio) : size;
  return (
    <Svg viewBox={`0 0 ${s.w} ${s.h}`} width={size} height={height} className={className} title={title} crisp>
      <SpriteG s={s} />
      {children}
    </Svg>
  );
}
