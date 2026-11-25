// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), notFound: vi.fn() }));

import { Fixtures } from "@/components/dev/Fixtures";
import { JoinScreen } from "@/components/team/JoinScreen";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(cleanup);

/** Every <svg> on the page is either aria-hidden or has an accessible name. */
function expectArtAccessible(root: HTMLElement) {
  const svgs = Array.from(root.querySelectorAll("svg"));
  expect(svgs.length).toBeGreaterThan(0);
  for (const s of svgs) expect(s.getAttribute("aria-hidden") === "true" || !!s.getAttribute("aria-label")).toBe(true);
}

describe("restyled screens keep their labels", () => {
  it("join screen: wordmark heading, PRESS START decoration, button name unchanged", () => {
    const { container } = render(<JoinScreen onJoined={() => {}} />);
    expect(screen.getByRole("heading", { name: "Desert Island Maths" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Find game" })).toBeTruthy();
    expect(screen.getByTestId("press-start").getAttribute("aria-hidden")).toBe("true");
    expectArtAccessible(container);
  });

  it("team question: zone banner, resource chips, timer and big tap targets", () => {
    const { container } = render(<Fixtures view="team-question" />);
    expect(screen.getByRole("heading", { name: "Beach" })).toBeTruthy();
    const res = screen.getByRole("list", { name: "Your resources" });
    expect(within(res).getByLabelText("Wood 9")).toBeTruthy();
    expect(screen.getByLabelText(/seconds left/)).toBeTruthy();
    for (const b of screen.getAllByRole("button")) expect(b.className).toMatch(/min-h-(1[1-6]|\[)/);
    expectArtAccessible(container);
  });

  it("team reveal: correct answer celebrates, build buttons keep their names", () => {
    render(<Fixtures view="team-reveal" />);
    expect(screen.getByTestId("reveal-banner").className).toContain("celebrate");
    expect(screen.getByRole("button", { name: "Build Shelter" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Build Raft 3" })).toBeTruthy();
  });

  it("team reveal: a wrong answer gets the gentle wobble instead", () => {
    render(<Fixtures view="team-wrong" />);
    const banner = screen.getByTestId("reveal-banner");
    expect(banner.className).toContain("gentle-wobble");
    expect(banner.textContent).toMatch(/not quite/i);
  });

  it("projector play: island map zones, one progress bar, readable sizes", () => {
    const { container } = render(<Fixtures view="projector-question" />);
    for (const z of ["beach", "forest", "cave", "hills", "lagoon"]) {
      expect(screen.getByTestId(`zone-${z}`).querySelector("h2")!.className).toMatch(/text-4xl/);
    }
    expect(screen.getAllByRole("progressbar")).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Raft progress" }).textContent).toMatch(/Raft 2 of 3/);
    expectArtAccessible(container);
  });

  it("projector finished: winner banner with confetti hidden from assistive tech", () => {
    render(<Fixtures view="projector-finished" />);
    expect(screen.getByTestId("winner").textContent).toBe("Winner: Shark Bait");
    expect(screen.getByTestId("confetti").getAttribute("aria-hidden")).toBe("true");
  });

  it("projector lobby: code on the sign, team names as flags", () => {
    render(<Fixtures view="projector-lobby" />);
    expect(screen.getByTestId("join-code").className).toContain("wood-sign");
    expect(screen.getByText("Lava Llamas").className).toContain("flag");
  });

  it("host lobby: start button keeps its name next to the PRESS START caption", () => {
    render(<Fixtures view="host-lobby" />);
    expect(screen.getByRole("button", { name: "Start game" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /host screen/i })).toBeTruthy();
  });
});
