/**
 * Blinking arcade "PRESS START" caption. Decoration only: aria-hidden, so the real
 * button label next to it stays the accessible name.
 */
export function PressStart({ onDark = false, className = "" }: { onDark?: boolean; className?: string }) {
  return (
    <p aria-hidden="true" data-testid="press-start" className={`animate-blink text-center text-sm font-black tracking-[0.3em] ${onDark ? "text-sunset-300" : "text-coral-600"} ${className}`}>
      &#9654; PRESS START
    </p>
  );
}
