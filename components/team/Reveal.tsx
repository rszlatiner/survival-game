import { Shell, StarIcon } from "@/components/art";
import { card, panel } from "@/components/ui/styles";
import type { PublicResult } from "@/lib/engine/public";

export function RevealView({ result }: { result: PublicResult | undefined }) {
  if (!result) return <p className={`${panel} text-center`}>No question for your team this round.</p>;
  return (
    <section aria-label="Reveal" className={`${panel} space-y-2`}>
      <p
        data-testid="reveal-banner"
        className={`flex items-center gap-2 rounded-2xl p-3 text-xl font-black text-white ${
          result.correct ? "celebrate bg-palm-700" : "gentle-wobble bg-coral-600"
        }`}
      >
        {result.correct ? <StarIcon size={36} className="animate-bob" /> : <Shell size={32} />}
        <span>{result.correct ? "Correct!" : result.answer === null ? "Not quite: no answer was submitted." : "Not quite."}</span>
      </p>
      {result.answer !== null && <p>Your team answered: <strong>{result.answer}</strong></p>}
      <p>Correct answer: <strong>{result.expected}</strong></p>
      <div className={card}>
        <h3 className="text-sm font-black uppercase text-ocean-800">Worked solution</h3>
        <p className="whitespace-pre-wrap">{result.solution}</p>
      </div>
    </section>
  );
}
