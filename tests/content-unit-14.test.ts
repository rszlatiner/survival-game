import { describe, it, expect } from "vitest";
import { UNIT_14 } from "@/content/units/unit-14";
import { bankChecks, overlapChecks, coordinateChecks } from "./helpers/bank";
import { rankChecks, valueRankChecks } from "./helpers/rank";

bankChecks(14, UNIT_14);
overlapChecks(UNIT_14);
coordinateChecks(UNIT_14);
rankChecks(UNIT_14);
valueRankChecks(UNIT_14);

import { eachQuestion, numsIn } from "./helpers/bank";
const get = (id: string) => UNIT_14.find((t) => t.id === id)!;
const SOLIDS: Record<string, [number, number, number]> = {
  cuboid: [6, 12, 8],
  "triangular prism": [5, 9, 6],
  "square-based pyramid": [5, 8, 5],
  "triangular pyramid": [4, 6, 4],
  "pentagonal prism": [7, 15, 10],
  "pentagonal pyramid": [6, 10, 6],
  "hexagonal prism": [8, 18, 12],
  "hexagonal pyramid": [7, 12, 7],
};
// Faces, edges and vertices worked out from the base polygon, not read from a table.
function counts(name: string): [number, number, number] {
  const sides = { triangular: 3, square: 4, pentagonal: 5, hexagonal: 6, cuboid: 4 }[name.split(/[ -]/)[0] as "triangular"];
  if (name === "cuboid") return [6, 12, 8];
  return name.endsWith("prism") ? [sides + 2, 3 * sides, 2 * sides] : [sides + 1, 2 * sides, sides + 1];
}

describe("unit 14 independent recompute", () => {
  const run = (id: string, check: (prompt: string, expected: number | string, options: string[] | undefined, where: string) => void) =>
    eachQuestion(get(id), ({ publicQ, expected }, where) => check(publicQ.prompt, expected, publicQ.options, where));
  const nums = (p: string) => numsIn(p.replace(/cm³|cm²/g, "cm"));

  it("cuboid-vol-01", () => run("u14-cuboid-vol-01", (p, e) => { const [l, w, h] = nums(p); expect(Number(e)).toBe(l * w * h); }));
  it("cube-surface-01", () => run("u14-cube-surface-01", (p, e) => { const [a] = nums(p); expect(Number(e)).toBe(6 * a * a); }));
  it("polygon-lines-01", () => run("u14-polygon-lines-01", (p, e) => { expect(Number(e)).toBe(Number(/with (\d+) equal sides/.exec(p)![1])); }));
  it("solid-identify-01: exactly one listed solid has the stated counts", () =>
    run("u14-solid-identify-01", (p, e, opts, where) => {
      const [f, ed, v] = nums(p);
      expect(f - ed + v, where).toBe(2); // Euler's formula holds for the stated counts
      expect(opts!.filter((o) => counts(o).join() === [f, ed, v].join()), where).toEqual([e]);
      for (const o of opts!) expect(SOLIDS[o]).toEqual(counts(o));
    }));
  it("cube-edge-01", () => run("u14-cube-edge-01", (p, e) => { const [v] = nums(p); expect(Number(e) ** 3).toBe(v); }));
  it("prism-vol-01", () => run("u14-prism-vol-01", (p, e) => { const [a, l] = nums(p); expect(Number(e)).toBe(a * l); }));
  it("cuboid-surface-01", () =>
    run("u14-cuboid-surface-01", (p, e) => {
      const [l, w, h] = nums(p);
      expect(Number(e)).toBe(2 * l * w + 2 * l * h + 2 * w * h);
    }));
  it("triangle-prism-01", () => run("u14-triangle-prism-01", (p, e) => { const [b, h, l] = nums(p); expect(Number(e) * 2).toBe(b * h * l); }));
  it("litres-01", () => run("u14-litres-01", (p, e) => { const [l, w, h] = nums(p); expect(Number(e) * 1000).toBe(l * w * h); }));
  it("turn-angle-01", () => run("u14-turn-angle-01", (p, e) => { const n = Number(/order (\d+)/.exec(p)![1]); expect(Number(e) * n).toBe(360); }));
  it("missing-edge-01", () => run("u14-missing-edge-01", (p, e) => { const [v, l, w] = nums(p); expect(Number(e) * l * w).toBe(v); }));
  it("cut-block-01", () =>
    run("u14-cut-block-01", (p, e) => {
      const [L, W, H, l, w, h] = nums(p);
      expect(l).toBeLessThan(L);
      expect(w).toBeLessThan(W);
      expect(h).toBeLessThan(H);
      expect(Number(e)).toBe(L * W * H - l * w * h);
    }));
  it("open-box-01", () =>
    run("u14-open-box-01", (p, e) => {
      const [l, w, h] = nums(p);
      // five faces: six faces of the closed box minus the lid
      expect(Number(e)).toBe(2 * (l * w + l * h + w * h) - l * w);
    }));
  it("shape-sym-01: the key matches the table of shapes", () =>
    run("u14-shape-sym-01", (p, e, opts, where) => {
      const table: [RegExp, string][] = [
        [/shape of a rectangle/, "2 lines, order 2"], [/shape of a rhombus/, "2 lines, order 2"], [/equilateral/, "3 lines, order 3"], [/shape of a square,/, "4 lines, order 4"],
        [/pentagon/, "5 lines, order 5"], [/hexagon/, "6 lines, order 6"], [/shape of a parallelogram/, "0 lines, order 2"], [/trapezium/, "1 line, order 1"], [/kite/, "1 line, order 1"],
      ];
      const hits = table.filter(([re]) => re.test(p));
      expect(hits, where).toHaveLength(1);
      expect(e).toBe(hits[0][1]);
      expect(opts!.filter((o) => o === e)).toHaveLength(1);
    }));
  it("l-prism-01", () => run("u14-l-prism-01", (p, e) => { const [len, W, H, w, h] = nums(p); expect(Number(e)).toBe((W * H - w * h) * len); }));
  it("tank-height-01: height times base area equals the volume", () =>
    run("u14-tank-height-01", (p, e) => {
      const [bl, bw, litres] = nums(p);
      expect(Number(e) * bl * bw).toBe(litres * 1000);
    }));
  it("scale-edges-01", () => run("u14-scale-edges-01", (p, e) => { const [v, k] = nums(p); expect(Number(e)).toBe(v * k ** 3); }));
  it("box-compare-01", () =>
    run("u14-box-compare-01", (p, e, opts, where) => {
      const [l1, w1, h1, l2, w2, h2] = nums(p);
      const va = l1 * w1 * h1;
      const vb = l2 * w2 * h2;
      expect(e).toBe(`Box ${va > vb ? "A" : "B"}, by ${Math.abs(va - vb)}`);
      // no distractor says the same box with the same difference
      expect(opts!.filter((o) => o === e), where).toHaveLength(1);
    }));
  it("tri-prism-surface-01: the triangle is right-angled and the surface area adds up", () =>
    run("u14-tri-prism-surface-01", (p, e) => {
      const [len, a, b, c] = nums(p);
      expect(a * a + b * b).toBe(c * c);
      const faces = [a * b / 2, a * b / 2, a * len, b * len, c * len];
      expect(Number(e)).toBe(faces.reduce((x, y) => x + y, 0));
    }));
  it("reverse-edges-01: Euler's formula holds for the prism found", () =>
    run("u14-reverse-edges-01", (p, e) => {
      const E = Number(/You use (\d+) lengths/.exec(p)![1]);
      const F = Number(e);
      const V = (2 * E) / 3;
      expect(F + V - E).toBe(2);
    }));
});
