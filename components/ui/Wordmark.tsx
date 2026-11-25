import { Svg } from "@/components/art";
import { PalmG, SunG } from "@/components/art/scenery";

/**
 * "Desert Island Maths" logo lockup: the title is real text (so it stays a heading
 * and readable), with an original sun-and-palm badge beside it.
 */
export function Wordmark({ as: Tag = "h1", size = "md" }: { as?: "h1" | "p"; size?: "md" | "xl" }) {
  const big = size === "xl";
  return (
    <div className="flex items-center gap-3">
      <Svg viewBox="0 0 64 64" size={big ? 120 : 72} className="shrink-0 drop-shadow">
        <circle cx="32" cy="32" r="31" fill="#0b7a7c" stroke="#fff8e7" strokeWidth={2} />
        <SunG x={22} y={6} s={0.75} />
        <path d="M6 46q13-6 26 0t26 0v18H6z" fill="#22c5c0" />
        <path d="M14 50c10-6 26-6 36 0v4H14z" fill="#efc879" />
        <PalmG x={8} y={10} s={0.62} />
      </Svg>
      <Tag className={`font-black leading-none tracking-tight ${big ? "text-6xl" : "text-4xl"}`}>
        <span className="block text-sunset-400 [text-shadow:0_3px_0_#0b1a33]">Desert Island</span>{" "}
        <span className={`mt-1 inline-block -rotate-2 rounded-xl bg-coral-600 px-3 py-1 text-white ${big ? "text-5xl" : "text-3xl"}`}>
          Maths
        </span>
      </Tag>
    </div>
  );
}
