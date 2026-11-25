import { INK } from "./resources";
import { Svg, type ArtProps } from "./Svg";

const line = { stroke: INK, strokeWidth: 1.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

export function HazardIcon(p: ArtProps) {
  return (
    <Svg {...p}>
      <path d="M12 2.5l10 18H2z" fill="#ffc53d" {...line} />
      <path d="M12 9v5.5" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
      <circle cx="12" cy="17.5" r="1.3" fill={INK} />
    </Svg>
  );
}

/** Raiders: a dark boat with a jagged sail. */
export function RaiderIcon(p: ArtProps) {
  return (
    <Svg {...p}>
      <path d="M11 3v13" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
      <path d="M11.5 4l7 3-2 1.5 2 2-2 1.5 2 2.5h-7z" fill="#c43d1c" {...line} />
      <path d="M2.5 16h19l-3 4.5h-13z" fill="#432914" {...line} />
      <circle cx="7.5" cy="18" r=".9" fill="#ffc53d" />
      <circle cx="12" cy="18" r=".9" fill="#ffc53d" />
      <circle cx="16.5" cy="18" r=".9" fill="#ffc53d" />
    </Svg>
  );
}

/** Storm cloud with lightning and rain. */
export function StormIcon(p: ArtProps) {
  return (
    <Svg {...p}>
      <path d="M6.5 15a4 4 0 0 1-.3-8 5.5 5.5 0 0 1 10.5 1.2A3.5 3.5 0 0 1 17.5 15z" fill="#64748b" {...line} />
      <path d="M12.5 13l-2.5 4h3l-2 4.5" fill="none" stroke="#ffc53d" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 17.5l-1 2.5M16.5 17.5l-1 2.5" stroke="#38bdf8" strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function CrownIcon(p: ArtProps) {
  return (
    <Svg {...p}>
      <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5z" fill="#ffc53d" {...line} />
      <path d="M5.5 18.5h13" {...line} />
      <circle cx="12" cy="13.5" r="1.4" fill="#f4623a" />
    </Svg>
  );
}

/** Stopwatch. */
export function TimerIcon(p: ArtProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="13.5" r="8" fill="#fff8e7" {...line} />
      <path d="M10 2.5h4M12 2.5v3M18.5 6.5l1.5-1.5" {...line} fill="none" />
      <path d="M12 13.5V9M12 13.5l3 2" stroke="#c43d1c" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

const MEDAL_FILL = { 1: "#ffc53d", 2: "#cbd5e1", 3: "#d58a4a" } as const;

/** Medal for 1st, 2nd or 3rd place. */
export function MedalIcon({ place, ...p }: ArtProps & { place: 1 | 2 | 3 }) {
  return (
    <Svg {...p}>
      <path d="M7 2.5h4l2 6h-4zM17 2.5h-4l-2 6h4z" fill="#0b7a7c" {...line} />
      <circle cx="12" cy="15" r="6.5" fill={MEDAL_FILL[place]} {...line} />
      <text x="12" y="18.2" textAnchor="middle" fontSize="9" fontWeight="800" fill={INK} fontFamily="system-ui, sans-serif">
        {place}
      </text>
    </Svg>
  );
}

export function TrophyIcon(p: ArtProps) {
  return (
    <Svg {...p}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" fill="#ffc53d" {...line} />
      <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" fill="none" {...line} />
      <path d="M12 14v3M8 21h8l-1-4H9z" fill="#b98a57" {...line} />
      <path d="M10 6.5l1 2" stroke="#fff" strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}

/** Survival point star. */
export function StarIcon(p: ArtProps) {
  return (
    <Svg {...p}>
      <path d="M12 2.5l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.7 6.2 20l1.4-6.4-4.9-4.4 6.5-.7z" fill="#ffc53d" {...line} />
    </Svg>
  );
}
