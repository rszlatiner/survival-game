import type { ReactNode } from "react";
import { Sprite, SpriteG } from "./pixel";
import { CLOUD, COMPASS, CRAB, PALM, PARROT, PUFFER, SHELL, SUN, WAVE_TILE, XMARK } from "./sprites";
import { Svg, type ArtProps } from "./Svg";

export const Palm = (p: ArtProps) => <Sprite s={PALM} {...p} />;
export const Shell = (p: ArtProps) => <Sprite s={SHELL} {...p} />;
export const Crab = (p: ArtProps) => <Sprite s={CRAB} {...p} />;
export const Parrot = (p: ArtProps) => <Sprite s={PARROT} {...p} />;
/** Original round spiky fish. */
export const Pufferfish = (p: ArtProps) => <Sprite s={PUFFER} {...p} />;
export const Cloud = (p: ArtProps) => <Sprite s={CLOUD} {...p} />;

/** Pixel sun; `spin` turns the whole sprite in stepped 45-degree jumps. */
export function Sun({ spin, className = "", ...p }: ArtProps & { spin?: boolean }) {
  return <Sprite s={SUN} className={`${spin ? "animate-sun-spin" : ""} ${className}`.trim()} {...p} />;
}

/**
 * Wave band: the 16px wave tile repeated across twice the width, so a stepped -50%
 * translate loops seamlessly. The SVG fills its (overflow-hidden) parent's height.
 */
export function Waves({ className, animated = true, ...p }: ArtProps & { animated?: boolean }) {
  const tiles = 16;
  return (
    <Svg viewBox={`0 0 ${WAVE_TILE.w * tiles} ${WAVE_TILE.h}`} preserveAspectRatio="none" width="200%" height="100%" className={className} crisp {...p}>
      <g className={animated ? "animate-wave-drift" : undefined}>
        {Array.from({ length: tiles }, (_, i) => (
          <SpriteG key={i} s={WAVE_TILE} x={i * WAVE_TILE.w} />
        ))}
      </g>
    </Svg>
  );
}

/**
 * Treasure-map border: a solid parchment panel (text stays readable) with a dashed
 * pixel trail edge, a compass in one corner and an X marking the spot in the other.
 */
export function TreasureMapBorder({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`map-border relative p-4 text-night-900 ${className}`}>
      <Sprite s={COMPASS} size={30} className="absolute -left-3 -top-3" />
      <Sprite s={XMARK} size={22} className="absolute -bottom-2 -right-2" />
      {children}
    </div>
  );
}
