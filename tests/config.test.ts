import { describe, expect, it } from "vitest";
import { BUILDS, MARKET, ROUNDS, ZONES } from "@/lib/config";
import { RESOURCES, ZONE_IDS } from "@/lib/questions/types";
import type { BuildId } from "@/lib/types";

const buildIds = Object.keys(BUILDS) as BuildId[];

describe("BUILDS", () => {
  it("every requires points at an existing build", () => {
    for (const id of buildIds) {
      const req = BUILDS[id].requires;
      if (req) expect(BUILDS[req], `${id} requires ${req}`).toBeDefined();
    }
  });

  it("every cost key is a valid resource with a positive amount", () => {
    for (const id of buildIds) {
      for (const [k, v] of Object.entries(BUILDS[id].cost)) {
        expect(RESOURCES).toContain(k);
        expect(v).toBeGreaterThan(0);
      }
    }
  });

  it("every SP is a positive integer", () => {
    for (const id of buildIds) {
      expect(Number.isInteger(BUILDS[id].sp)).toBe(true);
      expect(BUILDS[id].sp).toBeGreaterThan(0);
    }
  });

  it("raft chain is raft1 -> raft2 -> raft3 with no cycle", () => {
    expect(BUILDS.raft1.requires).toBeUndefined();
    expect(BUILDS.raft2.requires).toBe("raft1");
    expect(BUILDS.raft3.requires).toBe("raft2");
    const requiredBy = buildIds.filter((id) => BUILDS[id].requires === "raft3");
    expect(requiredBy).toEqual([]);
    // No build's requires chain loops.
    for (const id of buildIds) {
      const seen = new Set<BuildId>([id]);
      let cur = BUILDS[id].requires;
      while (cur) {
        expect(seen.has(cur), `cycle at ${id}`).toBe(false);
        seen.add(cur);
        cur = BUILDS[cur].requires;
      }
    }
    // raft3 is reachable only through raft2 then raft1.
    expect(buildIds.filter((id) => BUILDS[id].requires === "raft2")).toEqual(["raft3"]);
    expect(buildIds.filter((id) => BUILDS[id].requires === "raft1")).toEqual(["raft2"]);
  });
});

describe("ZONES", () => {
  it("has exactly the five zone ids", () => {
    expect(Object.keys(ZONES).sort()).toEqual([...ZONE_IDS].sort());
    expect(Object.keys(ZONES)).toHaveLength(5);
  });

  it("every resource is easy in at least one zone", () => {
    for (const r of RESOURCES) {
      expect(ZONE_IDS.some((z) => ZONES[z].easy.includes(r)), r).toBe(true);
    }
  });

  it("every zone has easy resources and valid resource names", () => {
    for (const z of ZONE_IDS) {
      expect(ZONES[z].easy.length).toBeGreaterThan(0);
      for (const r of [...ZONES[z].easy, ...ZONES[z].short]) expect(RESOURCES).toContain(r);
    }
  });
});

describe("ROUNDS and MARKET", () => {
  it("quick is shorter than standard", () => {
    expect(ROUNDS.quick).toBeLessThan(ROUNDS.standard);
  });

  it("market values satisfy bonusGive < base < bonusGet", () => {
    expect(MARKET.bonusGive).toBeLessThan(MARKET.base);
    expect(MARKET.base).toBeLessThan(MARKET.bonusGet);
  });
});
