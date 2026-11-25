import type { BuildId } from "@/lib/types";
import { Sprite } from "./pixel";
import { FIRE, RAFT, SHELTER, WATCHTOWER, WATER_STORE } from "./sprites";
import type { ArtProps } from "./Svg";

/** Leaf-roof hut. */
export const ShelterIcon = (p: ArtProps) => <Sprite s={SHELTER} {...p} />;
/** Campfire on logs. */
export const FireIcon = (p: ArtProps) => <Sprite s={FIRE} {...p} />;
/** Clay water pot. */
export const WaterStoreIcon = (p: ArtProps) => <Sprite s={WATER_STORE} {...p} />;
/** Lookout tower on stilts with a lamp room. */
export const WatchtowerIcon = (p: ArtProps) => <Sprite s={WATCHTOWER} {...p} />;

/** Raft in three stages: 1 logs, 2 adds a mast, 3 adds a sail and flag. */
export function RaftIcon({ stage = 3, ...p }: ArtProps & { stage?: 1 | 2 | 3 }) {
  return <Sprite s={RAFT[stage - 1]} {...p} />;
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
