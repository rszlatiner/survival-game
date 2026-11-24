import type { PublicResult } from "@/lib/engine/public";

export function RevealView({ result }: { result: PublicResult | undefined }) {
  if (!result) return <p className="rounded-xl bg-slate-800 p-3 text-white">No question for your team this round.</p>;
  return (
    <section aria-label="Reveal" className="space-y-2 rounded-xl bg-slate-900 p-3 text-white">
      <p className={`rounded-lg p-3 text-xl font-bold ${result.correct ? "bg-emerald-700" : "bg-orange-700"}`}>
        {result.correct ? "Correct!" : result.answer === null ? "Not quite: no answer was submitted." : "Not quite."}
      </p>
      {result.answer !== null && <p>Your team answered: <strong>{result.answer}</strong></p>}
      <p>Correct answer: <strong>{result.expected}</strong></p>
      <h3 className="text-sm font-bold uppercase">Worked solution</h3>
      <p className="whitespace-pre-wrap">{result.solution}</p>
    </section>
  );
}
