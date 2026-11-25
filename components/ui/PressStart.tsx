/**
 * Arcade "PRESS START" button. It is the real, working action button (not decoration):
 * it blinks to draw the eye, but stays solid while hovered/focused/disabled, and its
 * accessible name comes from `label` so screen readers hear what it actually does.
 */
export function PressStart({
  label,
  onClick,
  type = "button",
  disabled = false,
  busyText,
  onDark = false,
  className = "",
}: {
  label: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  busyText?: string;
  onDark?: boolean;
  className?: string;
}) {
  const tone = onDark
    ? "border-sunset-300 bg-void text-sunset-300"
    : "border-coral-600 bg-white text-coral-600";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      data-testid="press-start"
      className={`min-h-14 w-full border-4 px-4 text-lg font-black tracking-[0.3em] hover:animate-none focus-visible:animate-none disabled:animate-none disabled:opacity-50 ${disabled ? "" : "animate-blink"} ${tone} ${className}`}
    >
      {busyText ?? "▶ PRESS START"}
    </button>
  );
}
