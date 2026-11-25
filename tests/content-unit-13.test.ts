import { describe, it, expect } from "vitest";
import { UNIT_13 } from "@/content/units/unit-13";
import { bankChecks, overlapChecks, coordinateChecks, eachQuestion, numsIn } from "./helpers/bank";
import { rankChecks, valueRankChecks } from "./helpers/rank";
import { coordRankChecks } from "./helpers/rank2";
import { sharedCoordChecks, nearMissChecks } from "./helpers/shared";

bankChecks(13, UNIT_13);
overlapChecks(UNIT_13);
coordinateChecks(UNIT_13);
rankChecks(UNIT_13);
valueRankChecks(UNIT_13);
coordRankChecks(
  UNIT_13,
  UNIT_13.filter((t) => t.format.kind === "choice" && t.id !== "u13-quadrant-01" && t.id !== "u13-find-rotation-01").map((t) => t.id),
);
sharedCoordChecks(UNIT_13, 6);
nearMissChecks(UNIT_13, ["u13-translate-point-01", "u13-reflect-vertex-01", "u13-rotate-90-01", "u13-reflect-line-01", "u13-enlarge-vertex-01", "u13-midpoint-neg-01", "u13-two-step-01", "u13-reverse-translation-01"]);

const get = (id: string) => UNIT_13.find((t) => t.id === id)!;
const MINUS = "−";
const fmt = (x: number, y: number) => `(${x < 0 ? MINUS + -x : x}, ${y < 0 ? MINUS + -y : y})`;
/** All "(a, b)" pairs in a string, with their letter prefix kept out. */
function pairs(s: string): [number, number][] {
  return [...s.replace(/−/g, "-").matchAll(/\((-?\d+), (-?\d+)\)/g)].map((m) => [Number(m[1]), Number(m[2])]);
}

describe("unit 13 independent recompute", () => {
  const run = (id: string, check: (prompt: string, expected: number | string, options: string[] | undefined, where: string) => void) =>
    eachQuestion(get(id), ({ publicQ, expected }, where) => check(publicQ.prompt, expected, publicQ.options, where));

  it("quadrant-01: exactly one option matches the signs", () =>
    run("u13-quadrant-01", (p, e, opts, where) => {
      const [[x, y]] = pairs(p);
      const fits = (o: string) => (o.startsWith("Right") ? x > 0 : x < 0) && (o.includes("above") ? y > 0 : y < 0);
      expect(opts!.filter(fits), where).toEqual([e]);
    }));
  it("fraction-length-01", () =>
    run("u13-fraction-length-01", (p, e) => {
      const [len, k] = numsIn(p.replace("1/", " ")).slice(0, 2);
      expect(Number(e) * k).toBe(len);
    }));
  it("rotate-90-01: the key is the only option equal to the rotated point (90 or 270)", () =>
    run("u13-rotate-90-01", (p, e, opts, where) => {
      const [[x, y]] = pairs(p);
      const angle = Number(/rotated (\d+)/.exec(p)![1]);
      const anti = p.includes("anticlockwise");
      const turns = (angle / 90) * (anti ? 1 : -1); // quarter turns anticlockwise
      let [u, v] = [x, y];
      for (let i = 0; i < (((turns % 4) + 4) % 4); i++) [u, v] = [-v, u];
      expect(opts!.filter((o) => o === fmt(u, v)), where).toEqual([e]);
    }));
  it("rotate-centre-01", () =>
    run("u13-rotate-centre-01", (p, e) => {
      const [[px, py], [cx, cy]] = pairs(p);
      const [dx, dy] = [px - cx, py - cy];
      const turn = /180/.test(p) ? [-dx, -dy] : p.includes("anticlockwise") ? [-dy, dx] : [dy, -dx];
      expect(Number(e)).toBe(/the y-coordinate/.test(p) ? cy + turn[1] : cx + turn[0]);
      expect(Number(e)).toBeGreaterThan(0);
    }));
  it("enlarge-centre-01", () =>
    run("u13-enlarge-centre-01", (p, e) => {
      const [[px, py], [cx, cy]] = pairs(p);
      const k = Number(/scale factor (\d+)/.exec(p)![1]);
      expect(Number(e)).toBe(/the y-coordinate/.test(p) ? cy + k * (py - cy) : cx + k * (px - cx));
      expect(Number(e)).toBeGreaterThan(0);
    }));
  it("enlarge-fraction-01: the image of P is whole and nearer to C", () =>
    run("u13-enlarge-fraction-01", (p, e) => {
      const [[px, py], [cx, cy]] = pairs(p);
      const k = Number(/scale factor 1\/(\d+)/.exec(p)![1]);
      expect(Math.abs((px - cx) % k)).toBe(0);
      expect(Math.abs((py - cy) % k)).toBe(0);
      expect(Number(e)).toBe(/the y-coordinate/.test(p) ? cy + (py - cy) / k : cx + (px - cx) / k);
    }));
  it("translate-point-01", () =>
    run("u13-translate-point-01", (p, e) => {
      const [[x, y]] = pairs(p);
      const m = /moved (\d+) units (left|right) and (\d+) units (up|down)/.exec(p)!;
      const nx = x + (m[2] === "right" ? 1 : -1) * Number(m[1]);
      const ny = y + (m[4] === "up" ? 1 : -1) * Number(m[3]);
      expect(e).toBe(fmt(nx, ny));
    }));
  it("bearing-turn-01", () =>
    run("u13-bearing-turn-01", (p, e) => {
      const [b, t] = numsIn(p.replace(/clockwise from north/, ""));
      expect(Number(e)).toBe(b + t);
    }));
  it("reflect-vertex-01", () =>
    run("u13-reflect-vertex-01", (p, e) => {
      const [A, B, C] = pairs(p);
      const v = /of ([ABC])', the image/.exec(p)![1];
      const P = { A, B, C }[v as "A" | "B" | "C"];
      const xAxis = /reflected in the x-axis/.test(p);
      expect(e).toBe(xAxis ? fmt(P[0], -P[1]) : fmt(-P[0], P[1]));
    }));
  it("enlarge-length-01", () =>
    run("u13-enlarge-length-01", (p, e) => {
      const [len, k] = numsIn(p);
      expect(Number(e)).toBe(len * k);
    }));
  it("translation-find-01: applying the key to A gives A'", () =>
    run("u13-translation-find-01", (p, e, opts, where) => {
      const [[ax, ay], [cx, cy]] = pairs(p);
      const m = /^(\d+) (left|right) and (\d+) (up|down)$/;
      const apply = (o: string) => {
        const g = m.exec(o)!;
        return [ax + (g[2] === "right" ? 1 : -1) * Number(g[1]), ay + (g[4] === "up" ? 1 : -1) * Number(g[3])];
      };
      expect(opts!.filter((o) => apply(o)[0] === cx && apply(o)[1] === cy), where).toEqual([e]);
    }));
  it("bearing-back-01", () =>
    run("u13-bearing-back-01", (p, e) => {
      const th = numsIn(p.replace(/clockwise from north/, ""))[0];
      expect(Number(e)).toBe((th + 180) % 360);
    }));
  it("reflect-line-01: image is the same distance from the line on the other side", () =>
    run("u13-reflect-line-01", (p, e, opts, where) => {
      const [[x, y]] = pairs(p);
      const m = Number(/line x = (\d+)/.exec(p)![1]);
      const [ix, iy] = pairs(e as string)[0];
      expect(iy, where).toBe(y);
      expect(ix - m, where).toBe(-(x - m));
      expect(opts!.filter((o) => o === e)).toHaveLength(1);
    }));
  it("enlarge-vertex-01", () =>
    run("u13-enlarge-vertex-01", (p, e) => {
      const [[x, y]] = pairs(p);
      const k = Number(/scale factor (\d+)/.exec(p)![1]);
      expect(e).toBe(fmt(x * k, y * k));
    }));
  it("midpoint-neg-01: the key is the midpoint, and the midpoint is two exact halves", () =>
    run("u13-midpoint-neg-01", (p, e) => {
      const [[x1, y1], [x2, y2]] = pairs(p);
      expect(Math.abs((x1 + x2) % 2)).toBe(0);
      expect(Math.abs((y1 + y2) % 2)).toBe(0);
      expect(e).toBe(fmt((x1 + x2) / 2 + 0, (y1 + y2) / 2 + 0));
    }));
  it("two-step-01", () =>
    run("u13-two-step-01", (p, e) => {
      const [[x, y]] = pairs(p);
      const [rx, ry] = /y-axis/.test(p.split("Its image")[0]) ? [-x, y] : [x, -y];
      const m = /moved (\d+) units (left|right) and (\d+) units (up|down)/.exec(p)!;
      expect(e).toBe(fmt(rx + (m[2] === "right" ? 1 : -1) * Number(m[1]), ry + (m[4] === "up" ? 1 : -1) * Number(m[3])));
    }));
  it("reverse-translation-01: moving the key by the stated move gives the final point", () =>
    run("u13-reverse-translation-01", (p, e) => {
      const [[fx, fy]] = pairs(p);
      const [[ox, oy]] = pairs(e as string);
      const m = /move it (\d+) units (left|right) and (\d+) units (up|down)/.exec(p)!;
      expect(ox + (m[2] === "right" ? 1 : -1) * Number(m[1])).toBe(fx);
      expect(oy + (m[4] === "up" ? 1 : -1) * Number(m[3])).toBe(fy);
    }));
  it("find-rotation-01: exactly one listed rule maps P to P'", () =>
    run("u13-find-rotation-01", (p, e, opts, where) => {
      const [[x, y], [c, d]] = pairs(p);
      const rules: Record<string, [number, number]> = {};
      for (const o of opts!) {
        rules[o] = o.startsWith("90° clockwise") ? [y, -x] : o.startsWith("90° anticlockwise") ? [-y, x] : o.startsWith("180") ? [-x, -y] : [y, x];
      }
      expect(opts!.filter((o) => rules[o][0] === c && rules[o][1] === d), where).toEqual([e]);
    }));
  it("bearing-chain-01: facing back is +180, then clockwise, and the result is below 360", () =>
    run("u13-bearing-chain-01", (p, e) => {
      const th = Number(/camp is (\d+)/.exec(p)![1]);
      const t = Number(/through (\d+)/.exec(p)![1]);
      let b = th + 180;
      b = (b + t) % 360;
      expect(Number(e)).toBe(b);
      expect(b).toBeGreaterThan(0);
    }));
  it("claim-translation-01: the key states each stake's own move and the right verdict", () =>
    run("u13-claim-translation-01", (p, e, opts, where) => {
      const [[p1, p2], [q1, q2], [P1, P2], [Q1, Q2]] = pairs(p);
      const mv = (dx: number, dy: number) => `${Math.abs(dx)} ${dx > 0 ? "right" : "left"} ${Math.abs(dy)} ${dy > 0 ? "up" : "down"}`;
      const pm = mv(P1 - p1, P2 - p2);
      const qm = mv(Q1 - q1, Q2 - q2);
      const want = pm === qm ? `Yes: both move ${pm}` : `No: P ${pm}, Q ${qm}`;
      expect(e, where).toBe(want);
      expect(opts).toContain(want);
    }));
});
