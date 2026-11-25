/**
 * Shared class names for the retro arcade look. Plain strings (not components)
 * so the existing buttons keep their own props, labels and handlers.
 * Every pairing here passes WCAG AA for normal text.
 */

/** RPG-style dialog box: white text on deep navy, chunky white border, hard shadow. */
export const panel = "border-4 border-white bg-night-800 p-4 text-white shadow-[6px_6px_0_#000]";
/** Light inner card: void text on sand. */
export const card = "border-4 border-void bg-sand-50 p-3 text-void";
/** Projector panel: turquoise border on deep navy. */
export const nightPanel = "border-4 border-ocean-300 bg-night-800 p-5 text-white shadow-[8px_8px_0_#000]";

/** Chunky button: square, 4px border, hard shadow; pressing shifts it down-right 2px. */
const btnBase =
  "inline-flex min-h-12 items-center justify-center gap-2 border-4 border-void px-4 font-extrabold uppercase tracking-wide shadow-[4px_4px_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#000] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-none disabled:active:shadow-[4px_4px_0_#000]";

export type Tone = "sunset" | "ocean" | "palm" | "coral" | "sand" | "night" | "danger";

const TONES: Record<Tone, string> = {
  sunset: "bg-sunset-400 text-void",
  ocean: "bg-ocean-300 text-void",
  palm: "bg-palm-700 text-white",
  coral: "bg-coral-600 text-white",
  sand: "bg-sand-100 text-void",
  night: "bg-night-600 text-white",
  danger: "bg-coral-700 text-white",
};

/** Chunky, arcade button classes. */
export function btn(tone: Tone = "sunset", extra = ""): string {
  return `${btnBase} ${TONES[tone]} ${extra}`.trim();
}

/** Text inputs and selects: white field, void text, thick void border. */
export const field = "min-h-12 w-full border-4 border-void bg-white px-3 text-lg text-void";
/** Big answer / code inputs. */
export const bigField = "min-h-14 w-full border-4 border-void bg-white px-3 text-2xl text-void shadow-[inset_4px_4px_0_#c9d3e0]";
/** Small bold label above a field (on a dark panel). */
export const label = "block text-sm font-extrabold uppercase tracking-wide text-sand-50";
