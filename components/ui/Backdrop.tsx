import { Cloud, Palm, Sun, Waves } from "@/components/art";

/**
 * Dithered night-navy page with a pixel sun, clouds, palms and a stepped wave band.
 * Fixed and decorative (aria-hidden); all text sits on solid panels above it.
 */
export function IslandBackdrop() {
  return (
    <div aria-hidden="true" className="dither-night pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <Sun size={96} spin className="absolute right-3 top-4" />
      <Cloud size={96} className="absolute left-3 top-10 opacity-70" />
      <Cloud size={64} className="absolute right-28 top-36 opacity-50" />
      <div className="absolute inset-x-0 bottom-0 h-14 overflow-hidden">
        <Waves />
      </div>
      <Palm size={128} className="absolute -left-4 bottom-6 animate-sway" />
      <Palm size={96} className="absolute -right-2 bottom-6 -scale-x-100" />
    </div>
  );
}

/** Projector stage: dithered void navy, CRT scanlines (behind panels only) and a wave band. */
export function NightBackdrop() {
  return (
    <div aria-hidden="true" className="dither-night pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div data-testid="scanlines" className="scanlines absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 h-12 overflow-hidden opacity-60">
        <Waves />
      </div>
    </div>
  );
}
