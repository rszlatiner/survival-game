import type { ReactNode } from "react";
import { INK } from "./resources";
import { Svg, type ArtProps } from "./Svg";

/*
 * Scenery shapes. Each has a <g> form (…G) so the zone scenes and island map can
 * reuse the same few paths inside one SVG instead of repeating them.
 */

type GProps = { x?: number; y?: number; s?: number; flip?: boolean; className?: string };
const at = ({ x = 0, y = 0, s = 1, flip = false }: GProps) => `translate(${x} ${y}) scale(${flip ? -s : s} ${s})`;

/** Palm tree drawn in a 64x64 box, base at (32, 64). */
export function PalmG(g: GProps) {
  return (
    <g transform={at(g)} className={g.className}>
      <path d="M30 64c1-14 0-28 4-40l4 1c-3 12-2 26-2 39z" fill="#9a6a3a" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M31 50h5M31.5 40h5M32.5 31h4" stroke="#5e3a1c" strokeWidth={1.4} />
      <g fill="#2f9e4f" stroke={INK} strokeWidth={1.5} strokeLinejoin="round">
        <path d="M36 24C28 14 16 14 6 22c10-2 20-1 30 2z" />
        <path d="M36 24c8-10 20-10 28-2-10-2-19-1-28 2z" />
        <path d="M36 24C30 18 22 6 26 0c2 10 6 16 10 24z" />
        <path d="M36 24c4-8 12-16 20-16-8 4-13 9-20 16z" />
        <path d="M36 24c-8-2-18 4-22 14 6-7 13-11 22-14z" />
      </g>
      <circle cx="34" cy="26" r="2.6" fill="#7a4a24" stroke={INK} strokeWidth={1} />
      <circle cx="38.5" cy="26.5" r="2.6" fill="#7a4a24" stroke={INK} strokeWidth={1} />
    </g>
  );
}

export function Palm({ className, ...p }: ArtProps) {
  return (
    <Svg viewBox="0 0 64 64" className={className} {...p}>
      <PalmG />
    </Svg>
  );
}

/** Sun in a 48x48 box. */
export function SunG(g: GProps & { spin?: boolean }) {
  return (
    <g transform={at(g)}>
      <g className={g.spin ? "animate-sun-spin" : undefined} style={{ transformOrigin: "24px 24px", transformBox: "view-box" }}>
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M24 1l2.5 7h-5z" fill="#ffc53d" transform={`rotate(${i * 30} 24 24)`} />
        ))}
      </g>
      <circle cx="24" cy="24" r="12" fill="#ffd978" stroke="#f59e0b" strokeWidth={2} />
    </g>
  );
}

export function Sun({ spin, ...p }: ArtProps & { spin?: boolean }) {
  return (
    <Svg viewBox="0 0 48 48" {...p}>
      <SunG spin={spin} />
    </Svg>
  );
}

const WAVE = "M0 12c15 0 15-8 30-8s15 8 30 8 15-8 30-8 15 8 30 8";

/**
 * Wave band: two copies of a 120-wide wave side by side so a -50% translate loops seamlessly.
 * Stretch it with width/height; the animation lives in the "animate-wave-drift" class.
 */
export function Waves({ className, animated = true, ...p }: ArtProps & { animated?: boolean }) {
  return (
    <Svg viewBox="0 0 240 24" preserveAspectRatio="none" width="200%" height="100%" className={className} {...p}>
      <g className={animated ? "animate-wave-drift" : undefined}>
        {[0, 120].map((dx) => (
          <g key={dx} transform={`translate(${dx} 0)`}>
            <path d={`${WAVE}V24H0z`} fill="#22c5c0" />
            <path d={WAVE} fill="none" stroke="#effcfb" strokeWidth={2.5} strokeLinecap="round" />
          </g>
        ))}
      </g>
    </Svg>
  );
}

/** Scallop shell, 24x24. */
export function ShellG(g: GProps) {
  return (
    <g transform={at(g)}>
      <path d="M12 20L3 10a9 7 0 0 1 18 0z" fill="#ffb199" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M12 20L8 5M12 20V4M12 20l4-15M12 20L5 8M12 20l7-12" stroke="#c43d1c" strokeWidth={1} fill="none" />
      <path d="M10 20h4l-1 2h-2z" fill="#ffb199" stroke={INK} strokeWidth={1.2} />
    </g>
  );
}

export function Shell(p: ArtProps) {
  return (
    <Svg {...p}>
      <ShellG />
    </Svg>
  );
}

/** Friendly beach crab, 32x24. */
export function CrabG(g: GProps) {
  return (
    <g transform={at(g)} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round">
      <path d="M6 18l-4 3M8 19l-3 4M26 18l4 3M24 19l3 4" fill="none" />
      <path d="M8 8L4 4M24 8l4-4" fill="none" />
      <path d="M2 2.5a3 3 0 0 0 4 3.5l-1.5-3zM30 2.5a3 3 0 0 1-4 3.5l1.5-3z" fill="#f4623a" />
      <ellipse cx="16" cy="15" rx="10" ry="6.5" fill="#f4623a" />
      <path d="M13 9V6M19 9V6" fill="none" />
      <circle cx="13" cy="5" r="1.8" fill="#fff" />
      <circle cx="19" cy="5" r="1.8" fill="#fff" />
      <path d="M13 16.5c2 1.5 4 1.5 6 0" fill="none" />
    </g>
  );
}

export function Crab(p: ArtProps) {
  return (
    <Svg viewBox="0 0 32 24" {...p}>
      <CrabG />
    </Svg>
  );
}

/** Simple perched parrot, 24x32. */
export function ParrotG(g: GProps) {
  return (
    <g transform={at(g)} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round">
      <path d="M10 22l-2 9 4-3 2 3 0-9z" fill="#0fa3a8" />
      <path d="M9 7a6 6 0 0 1 10 3c1 6-1 11-6 13-4-1-6-5-6-10 0-2 .5-4.5 2-6z" fill="#1f8a43" />
      <path d="M13 12c2 1 3 4 2 8-2-1-3-4-2-8z" fill="#ffc53d" />
      <path d="M8.5 7.5a5 5 0 0 1 6-3.5c-1 1.5-3 3-6 3.5z" fill="#c43d1c" />
      <path d="M8 9c-3 0-4 3-2 5 0-2 1-3 3-3z" fill="#fff8e7" />
      <circle cx="12" cy="8.5" r="1.1" fill={INK} stroke="none" />
      <path d="M5 26h14" stroke="#7a4a24" strokeWidth={2.4} />
    </g>
  );
}

export function Parrot(p: ArtProps) {
  return (
    <Svg viewBox="0 0 24 32" {...p}>
      <ParrotG />
    </Svg>
  );
}

/** Puffy cloud, 48x24. */
export function CloudG(g: GProps & { fill?: string }) {
  return (
    <g transform={at(g)}>
      <path d="M8 22a7 7 0 0 1 1-14 10 10 0 0 1 18-3 8 8 0 0 1 13 6 6 6 0 0 1 0 11z" fill={g.fill ?? "#ffffff"} />
    </g>
  );
}

export function Cloud(p: ArtProps) {
  return (
    <Svg viewBox="0 0 48 24" {...p}>
      <CloudG />
    </Svg>
  );
}

/** Small compass rose for treasure-map corners. */
export function CompassG(g: GProps) {
  return (
    <g transform={at(g)}>
      <circle cx="12" cy="12" r="10" fill="#fff8e7" stroke="#7a4a24" strokeWidth={1.5} />
      <path d="M12 3l2.2 9L12 21l-2.2-9z" fill="#c43d1c" />
      <path d="M3 12l9-2.2 9 2.2-9 2.2z" fill="#7a4a24" />
    </g>
  );
}

/**
 * Treasure-map border: a parchment panel (solid background, so text stays readable)
 * with a compass and an X marking the spot in the corners.
 */
export function TreasureMapBorder({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`map-border relative rounded-2xl p-4 text-night-900 ${className}`}>
      <Svg viewBox="0 0 24 24" size={28} className="absolute -left-3 -top-3">
        <CompassG />
      </Svg>
      <Svg viewBox="0 0 24 24" size={22} className="absolute -bottom-2 -right-2">
        <path d="M5 5l14 14M19 5L5 19" stroke="#c43d1c" strokeWidth={4} strokeLinecap="round" />
      </Svg>
      {children}
    </div>
  );
}
