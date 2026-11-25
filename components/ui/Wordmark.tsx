import { PAL, SpriteG } from "@/components/art/pixel";
import { PALM, SUN, WAVE_TILE } from "@/components/art/sprites";
import { Svg } from "@/components/art/Svg";

/**
 * "Desert Island Maths" logo lockup: real text (so it stays a heading and readable)
 * in chunky uppercase with a hard pixel shadow, beside an original pixel badge.
 */
export function Wordmark({ as: Tag = "h1", size = "md" }: { as?: "h1" | "p"; size?: "md" | "xl" }) {
  const big = size === "xl";
  return (
    <div className="flex items-center gap-3">
      <Svg viewBox="0 0 24 24" size={big ? 120 : 68} className="shrink-0" crisp>
        <rect width="24" height="24" fill={PAL.k} />
        <rect x="1" y="1" width="22" height="22" fill="#5cc8f0" />
        <SpriteG s={SUN} x={11} y={2} />
        <SpriteG s={WAVE_TILE} x={1} y={16} />
        <SpriteG s={WAVE_TILE} x={8} y={16} />
        <rect x="1" y="21" width="22" height="2" fill={PAL.s} />
        <SpriteG s={PALM} x={0} y={7} />
      </Svg>
      <Tag className={`font-black uppercase leading-none tracking-wider ${big ? "text-6xl" : "text-3xl"}`}>
        <span className="block text-sunset-400 [text-shadow:4px_4px_0_#000]">Desert Island</span>{" "}
        <span className={`mt-2 inline-block border-4 border-void bg-coral-600 px-3 py-1 text-white shadow-[4px_4px_0_#000] ${big ? "text-5xl" : "text-2xl"}`}>
          Maths
        </span>
      </Tag>
    </div>
  );
}
