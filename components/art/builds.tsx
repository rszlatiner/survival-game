import type { BuildId } from "@/lib/types";
import { INK } from "./resources";
import { Svg, type ArtProps } from "./Svg";

const line = { stroke: INK, strokeWidth: 1.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** Leaf-roof hut on stilts. */
export function ShelterIcon(p: ArtProps) {
  return (
    <Svg {...p}>
      <path d="M6 12.5h12v7H6z" fill="#b98a57" {...line} />
      <path d="M10.5 19.5v-4h3v4" fill="#5e3a1c" {...line} />
      <path d="M2 13L12 4l10 9z" fill="#2f9e4f" {...line} />
      <path d="M7 10.5l2 2M11 7.5l2 2.5M15 9.5l2 2.5" stroke="#86d993" strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}

/** Campfire: crossed logs and a flame. */
export function FireIcon(p: ArtProps) {
  return (
    <Svg {...p}>
      <path d="M12 2.5c1 3 4.5 4.5 4.5 9a4.5 4.5 0 0 1-9 0c0-2 1-3.2 2-4 0 1.5.6 2.5 1.6 2.8C10.5 8 11 5 12 2.5z" fill="#f4623a" {...line} />
      <path d="M12 9.5c.8 1.5 2 2.2 2 4a2 2 0 0 1-4 0c0-1.2.8-2 2-4z" fill="#ffc53d" />
      <path d="M4 21l16-4M4 17l16 4" stroke="#7a4a24" strokeWidth={2.6} strokeLinecap="round" />
    </Svg>
  );
}

/** Clay water pot with a drop. */
export function WaterStoreIcon(p: ArtProps) {
  return (
    <Svg {...p}>
      <path d="M8 6h8l-1 2.5c3 1.2 4.5 3.7 4.5 6.5 0 3.5-3.4 6-7.5 6s-7.5-2.5-7.5-6c0-2.8 1.5-5.3 4.5-6.5z" fill="#c2410c" {...line} />
      <path d="M12 10.5c-1.2 1.8-2.2 3-2.2 4.2a2.2 2.2 0 0 0 4.4 0c0-1.2-1-2.4-2.2-4.2z" fill="#38bdf8" stroke="#fff" strokeWidth={1} />
      <path d="M7 6h10" {...line} fill="none" />
    </Svg>
  );
}

/** Lookout tower on stilts with a lamp roof. */
export function WatchtowerIcon(p: ArtProps) {
  return (
    <Svg {...p}>
      <path d="M8 21l2.5-11M16 21l-2.5-11M9 17h6M9.8 13.5h4.4" fill="none" stroke="#7a4a24" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M7 8h10v2.5H7z" fill="#b98a57" {...line} />
      <path d="M6 8l6-5.5L18 8z" fill="#f4623a" {...line} />
      <circle cx="12" cy="6.2" r="1.2" fill="#ffc53d" />
    </Svg>
  );
}

/** Raft in three stages: 1 logs, 2 adds a mast, 3 adds a sail and flag. */
export function RaftIcon({ stage = 3, ...p }: ArtProps & { stage?: 1 | 2 | 3 }) {
  return (
    <Svg {...p}>
      {stage >= 3 && (
        <>
          <path d="M12.5 4.5c4 1.5 5.5 5 5.5 10h-5.5z" fill="#fff8e7" {...line} />
          <path d="M11.5 3.5l-4 1.5 4 1.5z" fill="#f4623a" />
        </>
      )}
      {stage >= 2 && <path d="M12 3v13" stroke="#5e3a1c" strokeWidth={1.8} strokeLinecap="round" />}
      <path d="M3 16.5h18l-1.5 3h-15z" fill="#9a6a3a" {...line} />
      <path d="M7.5 16.5v3M12 16.5v3M16.5 16.5v3" stroke="#5e3a1c" strokeWidth={1.2} />
      <path d="M1.5 21.5c2-1 3-1 5 0s3 1 5 0 3-1 5 0 3 1 6 0" fill="none" stroke="#0fa3a8" strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

const BUILD_ART: Record<BuildId, (p: ArtProps) => React.ReactElement> = {
  shelter: ShelterIcon,
  fire: FireIcon,
  waterStore: WaterStoreIcon,
  watchtower: WatchtowerIcon,
  raft1: (p) => <RaftIcon stage={1} {...p} />,
  raft2: (p) => <RaftIcon stage={2} {...p} />,
  raft3: (p) => <RaftIcon stage={3} {...p} />,
};

export function BuildIcon({ id, ...p }: ArtProps & { id: BuildId }) {
  const Icon = BUILD_ART[id];
  return <Icon {...p} />;
}
