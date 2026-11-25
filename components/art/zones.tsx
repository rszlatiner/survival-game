import { useId } from "react";
import type { ZoneId } from "@/lib/questions/types";
import { INK } from "./resources";
import { CloudG, CrabG, PalmG, ParrotG, ShellG, SunG } from "./scenery";
import { Svg, type ArtProps } from "./Svg";

/** Bold colour per zone; text colour on it passes WCAG AA. */
export const ZONE_COLOR: Record<ZoneId, { bg: string; text: string; hex: string }> = {
  beach: { bg: "bg-zone-beach", text: "text-night-900", hex: "#f2b705" },
  forest: { bg: "bg-zone-forest", text: "text-white", hex: "#1d6b35" },
  cave: { bg: "bg-zone-cave", text: "text-white", hex: "#5b3f8c" },
  hills: { bg: "bg-zone-hills", text: "text-white", hex: "#9a4a1f" },
  lagoon: { bg: "bg-zone-lagoon", text: "text-white", hex: "#0a6a6d" },
};

const SKY = "#8edcf5";
const SEA = "#0fa3a8";
const SAND = "#efc879";
const wave = (y: number) => `M0 ${y}q20-6 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0`;

function Beach() {
  return (
    <>
      <rect width="320" height="100" fill={SKY} />
      <SunG x={250} y={6} s={0.9} />
      <CloudG x={40} y={10} s={1.1} />
      <rect y="48" width="320" height="22" fill={SEA} />
      <path d={wave(52)} fill="none" stroke="#effcfb" strokeWidth={2} />
      <path d="M0 66c60-8 120 4 180-2s100-6 140 0v36H0z" fill={SAND} />
      <PalmG x={8} y={30} s={1.1} />
      <ShellG x={150} y={74} s={0.9} />
      <CrabG x={210} y={72} s={0.9} />
    </>
  );
}

function Forest() {
  return (
    <>
      <rect width="320" height="100" fill={SKY} />
      <CloudG x={200} y={6} />
      <path d="M0 60c30-24 60-24 90-6 30-24 70-26 100-4 30-22 80-22 130 0v50H0z" fill="#1f8a43" />
      <path d="M0 78c40-16 90-16 130-2 40-14 100-16 190 0v24H0z" fill="#155027" />
      <PalmG x={-6} y={22} s={1.2} />
      <PalmG x={110} y={30} s={1} flip />
      <PalmG x={250} y={26} s={1.1} />
      <ParrotG x={176} y={44} s={1.1} />
    </>
  );
}

function Cave() {
  return (
    <>
      <rect width="320" height="100" fill="#5cc8f0" />
      <path d="M40 100L70 30l50-18 70 6 60 22 40 60z" fill="#64748b" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M120 100c0-34 18-54 40-54s40 20 40 54z" fill="#1e293b" stroke={INK} strokeWidth={1.5} />
      <path d="M140 46l4 10 4-9M166 46l4 9 4-8" fill="#94a3b8" />
      <path d="M88 40l22 8M210 34l20 14" stroke="#94a3b8" strokeWidth={2} strokeLinecap="round" />
      <rect y="86" width="320" height="14" fill={SEA} />
      <path d={wave(88)} fill="none" stroke="#effcfb" strokeWidth={2} />
      <path d="M150 86c6 4 14 4 20 0" stroke="#38bdf8" strokeWidth={3} fill="none" strokeLinecap="round" />
    </>
  );
}

function Hills() {
  return (
    <>
      <rect width="320" height="100" fill={SKY} />
      <SunG x={20} y={8} s={0.8} />
      <CloudG x={230} y={12} />
      <path d="M90 100l60-80 30 34 24-26 60 72z" fill="#9a4a1f" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M150 20l-14 20 14-6 12 8z" fill="#fff8e7" />
      <path d="M0 78c50-22 110-22 160 0s110 20 160-4v26H0z" fill="#b98a57" />
      <path d="M40 80l10-8 12 2 4 8zM240 86l12-10 10 4 2 8z" fill="#94a3b8" stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
    </>
  );
}

function Lagoon() {
  return (
    <>
      <rect width="320" height="100" fill={SKY} />
      <CloudG x={30} y={8} s={0.9} />
      <SunG x={262} y={4} s={0.7} />
      <rect y="44" width="320" height="56" fill="#0a6a6d" />
      <ellipse cx="160" cy="74" rx="150" ry="22" fill="#22c5c0" />
      <ellipse cx="160" cy="74" rx="110" ry="14" fill="#5eead4" />
      <path d="M120 74c14-10 66-10 80 0z" fill={SAND} />
      <PalmG x={126} y={22} s={0.85} />
      <path d={wave(56)} fill="none" stroke="#effcfb" strokeWidth={2} />
      <path d="M30 86c6-4 12-4 18 0M270 84c6-4 12-4 18 0" fill="none" stroke="#effcfb" strokeWidth={2} strokeLinecap="round" />
    </>
  );
}

const SCENES: Record<ZoneId, () => React.ReactElement> = { beach: Beach, forest: Forest, cave: Cave, hills: Hills, lagoon: Lagoon };

/** Wide banner illustration for a zone (team screen header). Decorative. */
export function ZoneScene({ zone, className, title }: Omit<ArtProps, "size"> & { zone: ZoneId }) {
  const Scene = SCENES[zone];
  return (
    <Svg viewBox="0 0 320 100" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" className={className} title={title}>
      <Scene />
    </Svg>
  );
}

/** Island outline and the region wedges (in a 400x260 box). Wedges are clipped to the island. */
const ISLAND = "M40 140C30 80 90 30 170 28c80-8 170 12 198 72 24 50-8 120-88 132-80 13-170 8-210-22-25-18-26-45-30-70z";
const C = "205,138";
const WEDGES: Record<ZoneId, string> = {
  forest: `${C} 0,232 0,40 120,0`,
  hills: `${C} 120,0 290,0`,
  cave: `${C} 290,0 400,0 400,130`,
  lagoon: `${C} 400,130 400,260 300,260`,
  beach: `${C} 300,260 0,260 0,232`,
};

/** Where each zone's label sits on the map, as percentages of the map box. */
export const ZONE_ANCHOR: Record<ZoneId, { left: string; top: string }> = {
  forest: { left: "20%", top: "50%" },
  hills: { left: "47%", top: "24%" },
  cave: { left: "80%", top: "30%" },
  lagoon: { left: "79%", top: "71%" },
  beach: { left: "42%", top: "80%" },
};

/**
 * The whole island in one picture: five coloured zones inside one coastline, with
 * sea and waves around it. Decorative: the zone names and teams are laid over it as
 * HTML by the projector so they stay large and readable.
 */
export function IslandMap({ className }: { className?: string }) {
  const clip = `island-${useId().replace(/:/g, "")}`;
  return (
    <Svg viewBox="0 0 400 260" width="100%" height="100%" preserveAspectRatio="none" className={className}>
      <defs>
        <clipPath id={clip}>
          <path d={ISLAND} />
        </clipPath>
      </defs>
      <rect width="400" height="260" fill="#0b7a7c" />
      {[20, 60, 210, 245].map((y, i) => (
        <path key={y} d={`M${i % 2 ? 250 : 10} ${y}q10-5 20 0t20 0 20 0`} fill="none" stroke="#5eead4" strokeWidth={2} strokeLinecap="round" />
      ))}
      <path d={ISLAND} fill={SAND} stroke={SAND} strokeWidth={14} />
      <g clipPath={`url(#${clip})`}>
        {(Object.keys(WEDGES) as ZoneId[]).map((z) => (
          <polygon key={z} points={WEDGES[z]} fill={ZONE_COLOR[z].hex} />
        ))}
        <path d="M205 138L0 232M205 138L120 0M205 138L290 0M205 138L400 130M205 138L300 260" stroke="#fff8e7" strokeWidth={3} strokeDasharray="8 7" strokeLinecap="round" />
      </g>
      <path d={ISLAND} fill="none" stroke={INK} strokeWidth={2.5} />
      <PalmG x={38} y={150} s={0.7} />
      <PalmG x={330} y={196} s={0.5} flip />
      <circle cx="205" cy="138" r="9" fill="#c43d1c" stroke="#fff8e7" strokeWidth={3} />
    </Svg>
  );
}
