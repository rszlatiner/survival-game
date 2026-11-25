import { Sprite, SpriteG } from "./pixel";
import { CROWN, DIGITS, HAZARD, MEDALS, RAIDER, STAR, STORM, TIMER, TROPHY } from "./sprites";
import type { ArtProps } from "./Svg";

export const HazardIcon = (p: ArtProps) => <Sprite s={HAZARD} {...p} />;
/** Raiders: a dark boat with a jagged sail. */
export const RaiderIcon = (p: ArtProps) => <Sprite s={RAIDER} {...p} />;
/** Storm cloud with lightning and rain. */
export const StormIcon = (p: ArtProps) => <Sprite s={STORM} {...p} />;
export const CrownIcon = (p: ArtProps) => <Sprite s={CROWN} {...p} />;
/** Stopwatch. */
export const TimerIcon = (p: ArtProps) => <Sprite s={TIMER} {...p} />;
export const TrophyIcon = (p: ArtProps) => <Sprite s={TROPHY} {...p} />;
/** Survival point star. */
export const StarIcon = (p: ArtProps) => <Sprite s={STAR} {...p} />;

/** Medal for 1st, 2nd or 3rd place, with a pixel digit. */
export function MedalIcon({ place, ...p }: ArtProps & { place: 1 | 2 | 3 }) {
  return (
    <Sprite s={MEDALS[place]} {...p}>
      <SpriteG s={DIGITS[place]} x={4} y={6} />
    </Sprite>
  );
}
