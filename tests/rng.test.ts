import { describe, it, expect } from "vitest";
import { makeRng } from "@/lib/rng";

const take = (seed: string, n: number) => {
  const r = makeRng(seed);
  return Array.from({ length: n }, () => r());
};

describe("makeRng", () => {
  it("same seed gives same first 5 values", () => {
    expect(take("island-1", 5)).toEqual(take("island-1", 5));
  });
  it("different seeds differ", () => {
    expect(take("island-1", 5)).not.toEqual(take("island-2", 5));
  });
  it("values are in [0,1)", () => {
    for (const v of take("range", 2000)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it("handles the empty seed", () => {
    expect(take("", 3)).toEqual(take("", 3));
  });
});
