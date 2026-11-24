// @vitest-environment jsdom
import { act } from "react";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicGameState, PublicTeam } from "@/lib/engine/public";

const h = vi.hoisted(() => {
  class ClientApiError extends Error {
    status: number;
    code: string;
    state?: unknown;
    constructor(status: number, code: string, state?: unknown) {
      super(code);
      this.status = status;
      this.code = code;
      this.state = state;
    }
  }
  return {
    ClientApiError,
    useGameState: vi.fn(),
    joinGame: vi.fn(),
    postTeam: vi.fn(),
    getSuggestions: vi.fn(),
    fetchState: vi.fn(),
  };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/client/useGameState", () => ({ useGameState: h.useGameState }));
vi.mock("@/lib/client/api", () => ({
  ClientApiError: h.ClientApiError,
  joinGame: h.joinGame,
  postTeam: h.postTeam,
  getSuggestions: h.getSuggestions,
  fetchState: h.fetchState,
}));

import { TeamPlay } from "@/components/team/TeamPlay";
import { JoinScreen } from "@/components/team/JoinScreen";
import { clearSession, loadSession, saveSession } from "@/lib/client/storage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const team = (over: Partial<PublicTeam> = {}): PublicTeam => ({
  id: "t1",
  name: "Crabs",
  zone: "beach",
  deviceCount: 2,
  captainIndex: 0,
  stock: { water: 5, food: 5, wood: 5, stone: 5 },
  builds: [],
  sp: 0,
  fundGiven: 0,
  ...over,
});

const state = (over: Partial<PublicGameState> = {}): PublicGameState => ({
  code: "ABCDEF",
  version: 1,
  phase: "question",
  units: [1],
  length: "quick",
  timerSeconds: 90,
  roundsPlayed: 0,
  totalRounds: 6,
  teams: [team(), team({ id: "t2", name: "Gulls", zone: "forest", sp: 3 })],
  fund: { water: 0, food: 0, wood: 0, stone: 0 },
  winnerId: null,
  tiedIds: [],
  serverNow: Date.now(),
  round: {
    n: 1,
    startedAt: Date.now(),
    endsAt: Date.now() + 10 * 60_000,
    roll: 7,
    bonusResource: null,
    raider: false,
    hazard: false,
    questions: {
      t1: {
        templateId: "x",
        unit: 1,
        difficulty: 1,
        resource: "food",
        format: { kind: "integer" },
        prompt: "You catch 12 fish a day for 3 days. How many fish?",
      },
    },
    submissions: { t1: { submitted: false } },
    results: null,
  },
  ...over,
});

const reveal = (correct: boolean): PublicGameState => {
  const s = state({ phase: "reveal" });
  s.round!.results = { t1: { expected: "36", solution: "12 x 3 = 36", answer: "35", correct } };
  return s;
};

function setGame(s: PublicGameState | null, status: "live" | "polling" | "offline" = "live") {
  h.useGameState.mockReturnValue({ state: s, status });
}
function asDevice(deviceIndex: number) {
  saveSession("ABCDEF", { token: "TOK", role: "team", deviceId: "dev", teamId: "t1", deviceIndex });
}

beforeEach(() => {
  clearSession("ABCDEF");
  vi.clearAllMocks();
  h.joinGame.mockImplementation(async () => ({ teamId: "t1", deviceIndex: 0 }));
  h.postTeam.mockResolvedValue({});
  h.getSuggestions.mockResolvedValue({ suggestions: [] });
});
afterEach(cleanup);

describe("team screen", () => {
  it("non-captain sees Suggest and no Submit", async () => {
    asDevice(1);
    setGame(state());
    render(<TeamPlay code="ABCDEF" />);
    expect(await screen.findByRole("button", { name: /suggest/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /submit/i })).toBeNull();
  });

  it("captain sees Submit, a badge, and submits the typed answer", async () => {
    asDevice(0);
    setGame(state());
    const user = userEvent.setup();
    render(<TeamPlay code="ABCDEF" />);
    expect(await screen.findByText(/captain/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /suggest/i })).toBeNull();
    await user.type(screen.getByLabelText(/your answer/i), "36");
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(h.postTeam).toHaveBeenCalledWith("ABCDEF", { type: "submit", answer: "36" });
  });

  it("non-captain suggest posts a suggest action", async () => {
    asDevice(1);
    setGame(state());
    const user = userEvent.setup();
    render(<TeamPlay code="ABCDEF" />);
    await user.type(await screen.findByLabelText(/your answer/i), "35");
    await user.click(screen.getByRole("button", { name: /suggest/i }));
    expect(h.postTeam).toHaveBeenCalledWith("ABCDEF", { type: "suggest", answer: "35" });
  });

  it("numeric input filters letters and caps at 40 chars", async () => {
    asDevice(0);
    setGame(state());
    const user = userEvent.setup();
    render(<TeamPlay code="ABCDEF" />);
    const input = (await screen.findByLabelText(/your answer/i)) as HTMLInputElement;
    expect(input.getAttribute("inputmode")).toBe("decimal");
    await user.type(input, "1a2b" + "9".repeat(60));
    expect(input.value.startsWith("12")).toBe(true);
    expect(input.value).not.toMatch(/[a-z]/);
    expect(input.value.length).toBeLessThanOrEqual(40);
  });

  it("choice questions render option buttons that fill the answer", async () => {
    asDevice(0);
    const s = state();
    s.round!.questions.t1 = {
      ...s.round!.questions.t1,
      format: { kind: "choice", options: ["Spend now", "Gamble"] },
      options: ["Spend now", "Gamble"],
    };
    setGame(s);
    const user = userEvent.setup();
    render(<TeamPlay code="ABCDEF" />);
    await user.click(await screen.findByRole("button", { name: "Gamble" }));
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(h.postTeam).toHaveBeenCalledWith("ABCDEF", { type: "submit", answer: "Gamble" });
  });

  it("captain sees teammates' suggestions", async () => {
    asDevice(0);
    setGame(state());
    h.getSuggestions.mockResolvedValue({ suggestions: [{ answer: "42" }] });
    render(<TeamPlay code="ABCDEF" />);
    expect(await screen.findByText("42")).toBeTruthy();
  });

  it("shows zone and story", async () => {
    asDevice(1);
    setGame(state());
    render(<TeamPlay code="ABCDEF" />);
    expect((await screen.findByRole("heading", { name: "Beach" })).textContent).toBe("Beach");
    expect(screen.getByTestId("story").textContent!.length).toBeGreaterThan(10);
  });

  it("build is disabled when stock is short and enabled when affordable", async () => {
    asDevice(0);
    const s = reveal(true);
    s.teams[0].stock = { water: 0, food: 0, wood: 3, stone: 1 };
    setGame(s);
    const user = userEvent.setup();
    render(<TeamPlay code="ABCDEF" />);
    const shelter = await screen.findByRole("button", { name: /build shelter/i });
    expect((shelter as HTMLButtonElement).disabled).toBe(true); // needs 3 wood + 2 stone
    const fire = screen.getByRole("button", { name: /build fire/i });
    expect((fire as HTMLButtonElement).disabled).toBe(false); // 2 wood + 1 stone
    expect((screen.getByRole("button", { name: /build raft 2/i }) as HTMLButtonElement).disabled).toBe(true); // needs raft1
    await user.click(fire);
    expect(h.postTeam).toHaveBeenCalledWith("ABCDEF", { type: "build", item: "fire" });
  });

  it("market form uses MARKET rates and posts an exchange", async () => {
    asDevice(0);
    const s = reveal(true);
    s.round!.bonusResource = "stone";
    setGame(s);
    const user = userEvent.setup();
    render(<TeamPlay code="ABCDEF" />);
    await user.selectOptions(await screen.findByLabelText(/^give/i), "water");
    await user.selectOptions(screen.getByLabelText(/^get/i), "stone");
    await user.clear(screen.getByLabelText(/amount to get/i));
    await user.type(screen.getByLabelText(/amount to get/i), "1");
    expect(screen.getByTestId("market-cost").textContent).toMatch(/4 water/); // bonusGet
    await user.click(screen.getByRole("button", { name: /exchange/i }));
    expect(h.postTeam).toHaveBeenCalledWith("ABCDEF", { type: "exchange", give: "water", get: "stone", amount: 1 });
  });

  it("fund contribution posts a contribute action", async () => {
    asDevice(0);
    setGame(reveal(true));
    const user = userEvent.setup();
    render(<TeamPlay code="ABCDEF" />);
    await user.selectOptions(await screen.findByLabelText(/contribute resource/i), "food");
    await user.type(screen.getByLabelText(/contribute amount/i), "2");
    await user.click(screen.getByRole("button", { name: /contribute/i }));
    expect(h.postTeam).toHaveBeenCalledWith("ABCDEF", { type: "contribute", resource: "food", amount: 2 });
  });

  it("reveal shows the worked solution and whether the team was right", async () => {
    asDevice(1);
    setGame(reveal(false));
    render(<TeamPlay code="ABCDEF" />);
    expect(await screen.findByText(/12 x 3 = 36/)).toBeTruthy();
    expect(screen.getByText(/not quite/i)).toBeTruthy();
  });

  it("reveal marks a correct team", async () => {
    asDevice(1);
    setGame(reveal(true));
    render(<TeamPlay code="ABCDEF" />);
    expect(await screen.findByText(/^correct!/i)).toBeTruthy();
  });

  it("question phase never shows solution text", async () => {
    asDevice(1);
    setGame(state());
    render(<TeamPlay code="ABCDEF" />);
    await screen.findByText(/how many fish/i);
    expect(screen.queryByText(/worked solution/i)).toBeNull();
  });

  it("scoreboard lists teams compactly", async () => {
    asDevice(1);
    setGame(state());
    render(<TeamPlay code="ABCDEF" />);
    const sb = await screen.findByRole("region", { name: /scoreboard/i });
    expect(within(sb).getByText("Gulls")).toBeTruthy();
  });

  it("offline shows a reconnecting banner; polling shows none", async () => {
    asDevice(1);
    setGame(state(), "offline");
    const { unmount } = render(<TeamPlay code="ABCDEF" />);
    expect(await screen.findByText(/reconnecting/i)).toBeTruthy();
    unmount();
    setGame(state(), "polling");
    render(<TeamPlay code="ABCDEF" />);
    await screen.findByText(/how many fish/i);
    expect(screen.queryByText(/reconnecting/i)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("server errors show in a non-blocking message without tokens", async () => {
    asDevice(0);
    setGame(state());
    h.postTeam.mockRejectedValue(new h.ClientApiError(400, "ALREADY_SUBMITTED"));
    const user = userEvent.setup();
    render(<TeamPlay code="ABCDEF" />);
    await user.type(await screen.findByLabelText(/your answer/i), "3");
    await user.click(screen.getByRole("button", { name: /submit/i }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/already/i);
    expect(document.body.textContent).not.toContain("TOK");
  });

  it("finished state shows winner and own rank", async () => {
    asDevice(1);
    setGame(state({ phase: "finished", winnerId: "t2", round: null }));
    render(<TeamPlay code="ABCDEF" />);
    expect((await screen.findByTestId("winner")).textContent).toMatch(/gulls/i);
    expect(screen.getByTestId("own-rank").textContent).toMatch(/2/);
  });

  it("tiebreak: non-captain sees no Suggest and no Submit; captain submits and does not poll suggestions", async () => {
    asDevice(1);
    setGame(state({ phase: "tiebreak" }));
    const { unmount } = render(<TeamPlay code="ABCDEF" />);
    await screen.findByText(/how many fish/i);
    expect(screen.queryByRole("button", { name: /suggest/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /submit/i })).toBeNull();
    expect(screen.getByText(/wait for your captain/i)).toBeTruthy();
    unmount();
    cleanup();
    asDevice(0);
    h.getSuggestions.mockClear();
    render(<TeamPlay code="ABCDEF" />);
    expect(await screen.findByRole("button", { name: /submit/i })).toBeTruthy();
    expect(h.getSuggestions).not.toHaveBeenCalled();
  });

  it("after the timer expires a non-captain can Submit the typed answer", async () => {
    asDevice(1);
    const s = state();
    s.round!.endsAt = Date.now() - 5_000;
    setGame(s);
    const user = userEvent.setup();
    render(<TeamPlay code="ABCDEF" />);
    await user.type(await screen.findByLabelText(/your answer/i), "36");
    expect(screen.queryByRole("button", { name: /suggest/i })).toBeNull();
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(h.postTeam).toHaveBeenCalledWith("ABCDEF", { type: "submit", answer: "36" });
  });

  it("uses the server clock offset: expired by server time even if the local clock says otherwise", async () => {
    asDevice(1);
    const s = state();
    s.serverNow = Date.now() + 3_600_000; // server one hour ahead
    s.round!.endsAt = Date.now() + 1_800_000; // future locally, past by server time
    setGame(s);
    render(<TeamPlay code="ABCDEF" />);
    expect(await screen.findByRole("button", { name: /submit/i })).toBeTruthy();
  });

  it("captain who has submitted sees the submitted message instead of the form", async () => {
    asDevice(0);
    const s = state();
    s.round!.submissions.t1 = { submitted: true };
    setGame(s);
    render(<TeamPlay code="ABCDEF" />);
    expect(await screen.findByText(/answer submitted/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /submit/i })).toBeNull();
  });

  it("a transient 409 on rejoin keeps the session; 404 clears it", async () => {
    asDevice(1);
    setGame(state());
    h.joinGame.mockRejectedValue(new h.ClientApiError(409, "CONFLICT"));
    const { unmount } = render(<TeamPlay code="ABCDEF" />);
    await screen.findByText(/how many fish/i);
    expect(loadSession("ABCDEF")).not.toBeNull();
    unmount();
    h.joinGame.mockRejectedValue(new h.ClientApiError(404, "NOT_FOUND"));
    render(<TeamPlay code="ABCDEF" />);
    await screen.findByRole("button", { name: /find game/i });
    expect(loadSession("ABCDEF")).toBeNull();
  });

  it("answer input resets when the round changes even if the prompt repeats", async () => {
    asDevice(0);
    const user = userEvent.setup();
    setGame(state());
    const { rerender } = render(<TeamPlay code="ABCDEF" />);
    const input = (await screen.findByLabelText(/your answer/i)) as HTMLInputElement;
    await user.type(input, "7");
    const s2 = state({ version: 2 });
    s2.round!.n = 2;
    setGame(s2);
    rerender(<TeamPlay code="ABCDEF" />);
    await waitFor(() => expect((screen.getByLabelText(/your answer/i) as HTMLInputElement).value).toBe(""));
  });

  it("a stored session auto-rejoins on reload using teamId and shows the screen", async () => {
    asDevice(1);
    setGame(state());
    render(<TeamPlay code="ABCDEF" />);
    await screen.findByText(/how many fish/i);
    expect(h.joinGame).toHaveBeenCalledWith("ABCDEF", { teamId: "t1" });
  });

  it("falls back to the join screen when there is no session or rejoin is refused", async () => {
    setGame(state());
    const { unmount } = render(<TeamPlay code="ABCDEF" />);
    expect(await screen.findByRole("button", { name: /find game/i })).toBeTruthy();
    unmount();
    asDevice(1);
    h.joinGame.mockRejectedValue(new h.ClientApiError(401, "UNAUTHORIZED"));
    render(<TeamPlay code="ABCDEF" />);
    await waitFor(() => expect(screen.queryByText(/how many fish/i)).toBeNull());
    expect(await screen.findByRole("button", { name: /find game/i })).toBeTruthy();
    expect(loadSession("ABCDEF")).toBeNull();
  });
});

describe("join screen", () => {
  it("uppercases the typed code before looking the game up", async () => {
    h.fetchState.mockResolvedValue(state({ phase: "lobby", round: null }));
    const user = userEvent.setup();
    render(<JoinScreen onJoined={() => {}} />);
    await user.type(screen.getByLabelText(/game code/i), "abcd23");
    await user.click(screen.getByRole("button", { name: /find game/i }));
    expect(h.fetchState).toHaveBeenCalledWith("ABCD23");
  });

  it("creates a team by name, or picks an existing team", async () => {
    h.fetchState.mockResolvedValue(state({ phase: "lobby", round: null }));
    const onJoined = vi.fn();
    const user = userEvent.setup();
    render(<JoinScreen initialCode="ABCDEF" onJoined={onJoined} />);
    await user.click(await screen.findByRole("button", { name: /find game/i }));
    await user.click(await screen.findByRole("button", { name: /join gulls/i }));
    expect(h.joinGame).toHaveBeenCalledWith("ABCDEF", { teamId: "t2" });
    await waitFor(() => expect(onJoined).toHaveBeenCalledWith("ABCDEF"));
    await act(async () => {});
    await user.type(screen.getByLabelText(/new team name/i), "Owls");
    await user.click(screen.getByRole("button", { name: /create team/i }));
    expect(h.joinGame).toHaveBeenCalledWith("ABCDEF", { teamName: "Owls" });
  });
});
