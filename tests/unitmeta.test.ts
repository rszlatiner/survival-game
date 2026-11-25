import { describe, expect, it } from "vitest";
import { UNIT_CATEGORIES, UNIT_NAME } from "@/lib/unitMeta";

describe("unit categories", () => {
  it("cover units 1 to 15 exactly once", () => {
    const all = UNIT_CATEGORIES.flatMap((c) => c.units.map((u) => u.unit)).sort((a, b) => a - b);
    expect(all).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
  });
  it("names every unit", () => {
    for (let u = 1; u <= 15; u++) expect(UNIT_NAME[u]).toBeTruthy();
  });
});
