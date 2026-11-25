import type { ZoneId } from "@/lib/questions/types";
import { PAL, SpriteG } from "./pixel";
import { CLOUD, CRAB, PALM, PARROT, PUFFER, SHELL, STONE, SUN, WAVE_TILE } from "./sprites";
import { Svg, type ArtProps } from "./Svg";

/** Bold colour per zone; the text colour on it passes WCAG AA. */
export const ZONE_COLOR: Record<ZoneId, { bg: string; text: string; hex: string }> = {
  beach: { bg: "bg-zone-beach", text: "text-night-900", hex: "#ffd23f" },
  forest: { bg: "bg-zone-forest", text: "text-white", hex: "#1d6b35" },
  cave: { bg: "bg-zone-cave", text: "text-white", hex: "#5b3f8c" },
  hills: { bg: "bg-zone-hills", text: "text-white", hex: "#9a4a1f" },
  lagoon: { bg: "bg-zone-lagoon", text: "text-white", hex: "#0a6a6d" },
};

const SKY = "#5cc8f0";
type Row = [y: number, x: number, w: number, color: string];
/** Stepped rows of rects: the scenes' hills, rocks and shores. */
const Rows = ({ rows }: { rows: Row[] }) => (
  <>
    {rows.map(([y, x, w, c], i) => (
      <rect key={i} x={x} y={y} width={w} height={1} fill={c} />
    ))}
  </>
);
const band = (y: number, h: number, c: string) => <rect y={y} width={96} height={h} fill={c} />;
const waveRow = (y: number) =>
  Array.from({ length: 6 }, (_, i) => <SpriteG key={`w${y}${i}`} s={WAVE_TILE} x={i * 16} y={y} />);
/** Pyramid of rows centred on cx, widening by `step` each row. */
const mound = (cx: number, top: number, h: number, step: number, c: string): Row[] =>
  Array.from({ length: h }, (_, i) => [top + i, cx - (i + 1) * step, (i + 1) * step * 2, c]);

function Beach() {
  return (
    <>
      {band(0, 30, SKY)}
      <SpriteG s={SUN} x={80} y={1} />
      <SpriteG s={CLOUD} x={24} y={3} />
      {waveRow(12)}
      {band(18, 12, PAL.s)}
      <Rows rows={[[17, 30, 40, PAL.s], [16, 40, 20, PAL.s]]} />
      <SpriteG s={PALM} x={2} y={13} />
      <SpriteG s={SHELL} x={46} y={17} />
      <SpriteG s={CRAB} x={64} y={17} />
    </>
  );
}

function Forest() {
  return (
    <>
      {band(0, 30, SKY)}
      <SpriteG s={CLOUD} x={60} y={2} />
      <Rows rows={[...mound(20, 14, 16, 3, PAL.g), ...mound(70, 12, 18, 3, PAL.g)]} />
      {band(24, 6, PAL.G)}
      <SpriteG s={PALM} x={0} y={10} />
      <SpriteG s={PALM} x={30} y={13} flip />
      <SpriteG s={PALM} x={78} y={11} />
      <SpriteG s={PARROT} x={54} y={12} />
    </>
  );
}

function Cave() {
  return (
    <>
      {band(0, 30, SKY)}
      <Rows rows={mound(48, 2, 22, 2, PAL.e)} />
      <Rows rows={[...mound(48, 12, 12, 1, PAL.k), [8, 30, 4, PAL.E], [14, 58, 6, PAL.E], [18, 24, 5, PAL.E]]} />
      <Rows rows={[[12, 46, 1, PAL.w], [12, 50, 1, PAL.w], [13, 46, 1, PAL.w]]} />
      {waveRow(24)}
      <SpriteG s={PUFFER} x={6} y={18} />
    </>
  );
}

function Hills() {
  return (
    <>
      {band(0, 30, SKY)}
      <SpriteG s={SUN} x={4} y={2} />
      <SpriteG s={CLOUD} x={70} y={3} />
      <Rows rows={mound(50, 4, 22, 2, "#9a4a1f")} />
      <Rows rows={mound(50, 4, 4, 2, PAL.w)} />
      <Rows rows={mound(78, 12, 14, 2, "#7a3a18")} />
      {band(24, 6, "#c99a5b")}
      <SpriteG s={STONE} x={14} y={16} />
      <SpriteG s={STONE} x={84} y={18} />
    </>
  );
}

function Lagoon() {
  return (
    <>
      {band(0, 30, SKY)}
      <SpriteG s={CLOUD} x={6} y={2} />
      <SpriteG s={SUN} x={82} y={1} />
      {waveRow(12)}
      {band(17, 13, PAL.B)}
      <Rows rows={[[18, 8, 80, PAL.t], [19, 4, 88, PAL.t], [20, 2, 92, PAL.t], [21, 2, 92, PAL.t], [22, 4, 88, PAL.t], [23, 8, 80, PAL.t]]} />
      <Rows rows={[[19, 36, 24, PAL.s], [20, 34, 28, PAL.s], [21, 36, 24, PAL.s]]} />
      <SpriteG s={PALM} x={40} y={5} />
      <SpriteG s={PUFFER} x={74} y={20} />
    </>
  );
}

const SCENES: Record<ZoneId, () => React.ReactElement> = { beach: Beach, forest: Forest, cave: Cave, hills: Hills, lagoon: Lagoon };

/** Wide pixel banner for a zone (team screen header). Decorative. */
export function ZoneScene({ zone, className, title }: Omit<ArtProps, "size"> & { zone: ZoneId }) {
  const Scene = SCENES[zone];
  return (
    <Svg viewBox="0 0 96 30" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" className={className} title={title} crisp>
      <Scene />
    </Svg>
  );
}

/** Where each zone's label sits on the map, as percentages of the map box. */
export const ZONE_ANCHOR: Record<ZoneId, { left: string; top: string }> = {
  forest: { left: "21%", top: "50%" },
  hills: { left: "47%", top: "24%" },
  cave: { left: "79%", top: "31%" },
  lagoon: { left: "78%", top: "70%" },
  beach: { left: "43%", top: "79%" },
};

/* The island as one pixel picture: 100x65 cells, a wobbly ellipse split into five wedges. */
const MAP_W = 100;
const MAP_H = 65;
function zoneAt(deg: number): ZoneId {
  if (deg >= -125 && deg < -62) return "hills";
  if (deg >= -62 && deg < 0) return "cave";
  if (deg >= 0 && deg < 70) return "lagoon";
  if (deg >= 70 && deg < 150) return "beach";
  return "forest";
}
const ISLAND_RECTS: Row[] = (() => {
  const rows: Row[] = [];
  for (let y = 0; y < MAP_H; y++) {
    let run: { x: number; c: string } | null = null;
    const flush = (x: number) => {
      if (run) rows.push([y, run.x, x - run.x, run.c]);
      run = null;
    };
    for (let x = 0; x < MAP_W; x++) {
      const dx = x + 0.5 - 50;
      const dy = y + 0.5 - 33;
      const th = Math.atan2(dy, dx);
      const edge = 1 + 0.07 * Math.sin(3 * th) + 0.04 * Math.cos(5 * th + 1);
      const d = Math.hypot(dx / 45, dy / 28) / edge;
      let c: string | null = null;
      if (d < 0.86) c = ZONE_COLOR[zoneAt((th * 180) / Math.PI)].hex;
      else if (d < 0.92) c = (x + y) % 2 ? PAL.s : ZONE_COLOR[zoneAt((th * 180) / Math.PI)].hex; // dithered shore
      else if (d < 1) c = PAL.s;
      else if (d < 1.06) c = (x + y) % 2 ? PAL.t : PAL.b; // dithered shallows
      if (c === (run as { c: string } | null)?.c) continue;
      flush(x);
      if (c) run = { x, c };
    }
    flush(MAP_W);
  }
  return rows;
})();

/**
 * The whole island in one pixel picture: five coloured zones inside one coastline,
 * with sea and waves around it. Decorative: the projector lays the zone names and
 * teams over it as HTML so they stay large and readable.
 */
export function IslandMap({ className }: { className?: string }) {
  return (
    <Svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width="100%" height="100%" preserveAspectRatio="none" className={className} crisp>
      <rect width={MAP_W} height={MAP_H} fill={PAL.B} />
      {[[4, 3], [70, 2], [2, 58], [78, 60]].map(([x, y]) => (
        <SpriteG key={`${x}`} s={WAVE_TILE} x={x} y={y} />
      ))}
      <Rows rows={ISLAND_RECTS} />
      <SpriteG s={PALM} x={8} y={36} />
      <SpriteG s={PALM} x={78} y={44} flip />
      <rect x={48} y={31} width={4} height={4} fill={PAL.R} />
      <rect x={49} y={32} width={2} height={2} fill={PAL.w} />
    </Svg>
  );
}
