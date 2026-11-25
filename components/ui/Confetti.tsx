const COLORS = ["#ffc53d", "#f4623a", "#22c5c0", "#86d993", "#fff8e7", "#ffb199"];

/** CSS-only falling confetti for the winner screen. Hidden under prefers-reduced-motion. */
export function Confetti({ pieces = 36 }: { pieces?: number }) {
  return (
    <div aria-hidden="true" data-testid="confetti" className="confetti">
      {Array.from({ length: pieces }, (_, i) => (
        <span
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: COLORS[i % COLORS.length],
            animationDelay: `${((i * 0.29) % 4).toFixed(2)}s`,
            animationDuration: `${3.5 + ((i * 7) % 10) / 5}s`,
          }}
        />
      ))}
    </div>
  );
}
