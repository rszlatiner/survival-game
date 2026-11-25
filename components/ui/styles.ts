/**
 * Shared class names for the island look. Plain strings (not components) so the
 * existing buttons keep their own props, labels and handlers.
 * Every pairing here passes WCAG AA for normal text.
 */

/** Solid light panel: night text on warm sand. */
export const panel = "rounded-3xl border-4 border-white/80 bg-sand-50 p-4 text-night-900 shadow-[0_6px_0_rgb(11_26_51/0.18)]";
/** Solid white card inside a panel. */
export const card = "rounded-2xl border-2 border-sand-300 bg-white p-3 text-night-900";
/** Dark panel for the projector (white text on night navy). */
export const nightPanel = "rounded-3xl border-4 border-night-500 bg-night-800 p-5 text-white";

const btnBase =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-b-4 px-4 font-extrabold transition-transform active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:opacity-50";

export type Tone = "sunset" | "ocean" | "palm" | "coral" | "sand" | "night" | "danger";

const TONES: Record<Tone, string> = {
  sunset: "border-sunset-600 bg-sunset-400 text-night-900",
  ocean: "border-ocean-800 bg-ocean-600 text-white",
  palm: "border-palm-800 bg-palm-700 text-white",
  coral: "border-coral-700 bg-coral-600 text-white",
  sand: "border-sand-400 bg-sand-100 text-night-900",
  night: "border-night-900 bg-night-600 text-white",
  danger: "border-coral-700 bg-coral-700 text-white",
};

/** Chunky, friendly button classes. */
export function btn(tone: Tone = "sunset", extra = ""): string {
  return `${btnBase} ${TONES[tone]} ${extra}`.trim();
}

/** Text inputs and selects: white field, night text, thick ocean border. */
export const field = "min-h-12 w-full rounded-xl border-2 border-ocean-700 bg-white px-3 text-lg text-night-900";
/** Big answer / code inputs. */
export const bigField = "min-h-14 w-full rounded-2xl border-4 border-ocean-700 bg-white px-3 text-2xl text-night-900";
/** Small bold label above a field. */
export const label = "block text-sm font-extrabold text-night-900";
