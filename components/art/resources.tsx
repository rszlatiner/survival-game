import type { Resource } from "@/lib/questions/types";
import { PAL, Sprite } from "./pixel";
import { FOOD, STONE, WATER, WOOD } from "./sprites";
import type { ArtProps } from "./Svg";

/** Outline colour shared by the pixel art. */
export const INK = PAL.k;

export const WaterIcon = (p: ArtProps) => <Sprite s={WATER} {...p} />;
/** Fish and fruit. */
export const FoodIcon = (p: ArtProps) => <Sprite s={FOOD} {...p} />;
export const WoodIcon = (p: ArtProps) => <Sprite s={WOOD} {...p} />;
export const StoneIcon = (p: ArtProps) => <Sprite s={STONE} {...p} />;

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
