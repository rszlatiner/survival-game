import { Cloud, Palm, Sun, Waves } from "@/components/art";

/**
 * Sky, ocean and sand behind the page, with an animated wave band. Fixed and
 * decorative (aria-hidden); all text sits on solid panels above it.
 */
export function IslandBackdrop() {
  return (
    <div aria-hidden="true" className="island-sky pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <Sun size={120} spin className="absolute -right-6 top-4 opacity-90" />
      <Cloud size={110} className="absolute left-4 top-10 opacity-80" />
      <Cloud size={80} className="absolute right-24 top-40 opacity-60" />
      <div className="absolute inset-x-0 top-[44%] h-6 overflow-hidden opacity-70">
        <Waves />
      </div>
      <div className="absolute inset-x-0 top-[70%] h-5 overflow-hidden opacity-50">
        <Waves />
      </div>
      <Palm size={150} className="absolute -left-8 bottom-0 origin-bottom animate-sway" />
      <Palm size={110} className="absolute -right-6 bottom-0 origin-bottom -scale-x-100" />
    </div>
  );
}

/** Deep night-navy stage for the projector, with a single wave band at the foot. */
export function NightBackdrop() {
  return (
    <div aria-hidden="true" className="night-sky pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-x-0 bottom-0 h-10 overflow-hidden opacity-40">
        <Waves />
      </div>
    </div>
  );
}
