// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import * as Art from "@/components/art";
import { Confetti } from "@/components/ui/Confetti";
import { IslandBackdrop, NightBackdrop } from "@/components/ui/Backdrop";
import { Wordmark } from "@/components/ui/Wordmark";
import { PressStart } from "@/components/ui/PressStart";
import { btn } from "@/components/ui/styles";
import type { ZoneId } from "@/lib/questions/types";

afterEach(cleanup);

const ZONES: ZoneId[] = ["beach", "forest", "cave", "hills", "lagoon"];

const simple = {
  WaterIcon: Art.WaterIcon,
  FoodIcon: Art.FoodIcon,
  WoodIcon: Art.WoodIcon,
  StoneIcon: Art.StoneIcon,
  ShelterIcon: Art.ShelterIcon,
  FireIcon: Art.FireIcon,
  WaterStoreIcon: Art.WaterStoreIcon,
  WatchtowerIcon: Art.WatchtowerIcon,
  RaftIcon: Art.RaftIcon,
  HazardIcon: Art.HazardIcon,
  RaiderIcon: Art.RaiderIcon,
  StormIcon: Art.StormIcon,
  CrownIcon: Art.CrownIcon,
  TimerIcon: Art.TimerIcon,
  TrophyIcon: Art.TrophyIcon,
  StarIcon: Art.StarIcon,
  Palm: Art.Palm,
  Sun: Art.Sun,
  Waves: Art.Waves,
  Shell: Art.Shell,
  Crab: Art.Crab,
  Parrot: Art.Parrot,
  Cloud: Art.Cloud,
  Pufferfish: Art.Pufferfish,
} as const;

describe("art set", () => {
  for (const [name, Icon] of Object.entries(simple)) {
    it(`${name} renders a decorative, aria-hidden svg with size and className`, () => {
      const { container } = render(<Icon size={40} className="probe" />);
      const svg = container.querySelector("svg")!;
      expect(svg).toBeTruthy();
      expect(svg.getAttribute("aria-hidden")).toBe("true");
      expect(svg.getAttribute("class")).toContain("probe");
      if (name !== "Waves") expect(svg.getAttribute("width")).toBe("40");
      expect(svg.querySelectorAll("path,circle,ellipse,rect,polygon").length).toBeGreaterThan(0);
    });
  }

  it("a titled icon is exposed as an image with that name", () => {
    render(<Art.StarIcon title="Survival points" />);
    expect(screen.getByRole("img", { name: "Survival points" })).toBeTruthy();
  });

  it("renders every resource, build stage, medal and zone variant", () => {
    const { container } = render(
      <div>
        {(["water", "food", "wood", "stone"] as const).map((r) => <Art.ResourceIcon key={r} resource={r} />)}
        {(["shelter", "fire", "waterStore", "watchtower", "raft1", "raft2", "raft3"] as const).map((b) => <Art.BuildIcon key={b} id={b} />)}
        {([1, 2, 3] as const).map((p) => <Art.MedalIcon key={p} place={p} />)}
        {ZONES.map((z) => <Art.ZoneScene key={z} zone={z} />)}
        <Art.IslandMap />
      </div>,
    );
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(4 + 7 + 3 + 5 + 1);
    svgs.forEach((s) => expect(s.getAttribute("aria-hidden")).toBe("true"));
  });

  it("raft stages add parts", () => {
    const count = (stage: 1 | 2 | 3) => render(<Art.RaftIcon stage={stage} />).container.querySelectorAll("rect").length;
    expect(count(2)).toBeGreaterThan(count(1));
    expect(count(3)).toBeGreaterThan(count(2));
  });

  it("every zone has an AA-checked colour and a map anchor", () => {
    for (const z of ZONES) {
      expect(Art.ZONE_COLOR[z].bg).toMatch(/^bg-zone-/);
      expect(Art.ZONE_ANCHOR[z].left).toMatch(/%$/);
    }
  });

  it("treasure map border keeps its children readable on a solid panel", () => {
    render(<Art.TreasureMapBorder><p>Ahoy</p></Art.TreasureMapBorder>);
    const p = screen.getByText("Ahoy");
    expect(p.parentElement!.className).toContain("map-border");
  });

  it("backdrops and confetti are hidden from assistive tech", () => {
    const { container } = render(<><IslandBackdrop /><NightBackdrop /><Confetti pieces={5} /></>);
    for (const el of Array.from(container.children)) expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelectorAll(".confetti > span").length).toBe(5);
  });

  it("wordmark is a heading reading 'Desert Island Maths'", () => {
    render(<Wordmark />);
    expect(screen.getByRole("heading", { name: "Desert Island Maths" })).toBeTruthy();
  });

  it("button helper yields a tone and a 48px minimum height", () => {
    expect(btn("palm")).toContain("bg-palm-700");
    expect(btn()).toContain("min-h-12");
  });
});

describe("retro pixel style", () => {
  it("sprites render crisp, pixelated rects", () => {
    const { container } = render(<Art.CrownIcon size={48} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("shape-rendering")).toBe("crispEdges");
    expect(svg.querySelectorAll("rect").length).toBeGreaterThan(5);
  });

  it("sprite() rejects uneven rows and merges runs", () => {
    expect(() => Art.sprite(["ab", "abc"])).toThrow();
    expect(Art.sprite(["kkk."]).rects).toEqual([{ x: 0, y: 0, w: 3, c: Art.PAL.k }]);
  });

  it("PRESS START is decoration only", () => {
    const { container } = render(<PressStart />);
    expect(container.firstElementChild!.getAttribute("aria-hidden")).toBe("true");
  });

  it("scanlines live only in the projector backdrop, behind content", () => {
    const team = render(<IslandBackdrop />);
    expect(team.container.querySelector(".scanlines")).toBeNull();
    team.unmount();
    const proj = render(<NightBackdrop />);
    const lines = proj.container.querySelector(".scanlines")!;
    expect(lines.closest("[aria-hidden='true']")!.className).toContain("-z-10");
  });
});

describe("motion and theme CSS", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

  it("switches all animation off under prefers-reduced-motion", () => {
    const block = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(block).toMatch(/animation:\s*none\s*!important/);
    expect(block).toMatch(/\.confetti/);
    expect(block).toMatch(/\.celebrate::before/);
    expect(block).toMatch(/\.scanlines/);
  });

  it("uses stepped (8-bit) timing for the animations", () => {
    for (const name of ["wave-drift", "bob", "sun-spin", "pop-in", "blink"]) {
      expect(css).toMatch(new RegExp(`--animate-${name}:[^;]*steps\\(`));
    }
    expect(css).toMatch(/coin-pop[^;]*steps\(/);
    expect(css).toMatch(/confetti-fall[^;]*steps\(/);
  });

  it("defines the tropical palette and rounded font stack in the Tailwind theme", () => {
    for (const token of ["--color-void", "--color-ocean-300", "--color-sand-50", "--color-palm-700", "--color-coral-600", "--color-sunset-400", "--color-night-900", "--font-pixel"]) {
      expect(css).toContain(token);
    }
    expect(css).toMatch(/--font-pixel:\s*ui-monospace/);
    expect(css).not.toMatch(/@import\s+url\(|https?:\/\//);
  });
});
