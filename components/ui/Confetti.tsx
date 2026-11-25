const COLORS = ["#ffd23f", "#ff6b4a", "#2ce0d0", "#3bd16f", "#fff4d6", "#4cc9ff"];

/** 8-bit confetti blocks for the winner screen (CSS only). Hidden under prefers-reduced-motion. */
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
