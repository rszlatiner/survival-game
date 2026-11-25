import type { Resource } from "@/lib/questions/types";
import { Svg, type ArtProps } from "./Svg";

/** Sticker-style outline shared by the small icons. */
export const INK = "#0b1a33";
const line = { stroke: INK, strokeWidth: 1.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

export function WaterIcon(p: ArtProps) {
  return (
    <Svg {...p}>
      <path d="M12 2.5C9 7 5.5 10.5 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10.5 15 7 12 2.5z" fill="#38bdf8" {...line} />
      <path d="M9 14.5a3 3 0 0 0 3 3" fill="none" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

/** Fish and fruit. */
export function FoodIcon(p: ArtProps) {
  return (
    <Svg {...p}>
      <path d="M2.5 10.5c2.5-3.5 8-3.5 10.5 0-2.5 3.5-8 3.5-10.5 0zM13 10.5l3-2.5v5z" fill="#ff8a65" {...line} />
      <circle cx="5.6" cy="10" r=".9" fill={INK} />
      <circle cx="16.5" cy="16.5" r="4.5" fill="#ffc53d" {...line} />
      <path d="M16.5 12c.4-1.4 1.4-2.2 2.8-2.4" fill="none" stroke="#1d6b35" strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function WoodIcon(p: ArtProps) {
  return (
    <Svg {...p}>
      <path d="M4 8.5h13v8H4a2.5 4 0 0 1 0-8z" fill="#9a6a3a" {...line} />
      <ellipse cx="17" cy="12.5" rx="3" ry="4" fill="#efc879" {...line} />
      <ellipse cx="17" cy="12.5" rx="1.2" ry="1.7" fill="none" stroke="#9a6a3a" strokeWidth={1.2} />
      <path d="M6 11h6M8 14h5" stroke="#5e3a1c" strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}

export function StoneIcon(p: ArtProps) {
  return (
    <Svg {...p}>
      <path d="M3.5 17.5l2-7 5-4 6 1.5 4 6-1.5 4.5z" fill="#94a3b8" {...line} />
      <path d="M10.5 6.5l1 5 7 2M11.5 11.5l-6 6" fill="none" stroke="#64748b" strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}

export const RESOURCE_ART: Record<Resource, (p: ArtProps) => React.ReactElement> = {
  water: WaterIcon,
  food: FoodIcon,
  wood: WoodIcon,
  stone: StoneIcon,
};

/** Icon for a resource; decorative unless a title is passed. */
export function ResourceIcon({ resource, ...p }: ArtProps & { resource: Resource }) {
  const Icon = RESOURCE_ART[resource];
  return <Icon {...p} />;
}
