// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicGameState, PublicTeam } from "@/lib/engine/public";

const h = vi.hoisted(() => {
  class ClientApiError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string) {
      super(code);
      this.status = status;
      this.code = code;
    }
  }
  return { ClientApiError, useGameState: vi.fn(), createGame: vi.fn(), hostLogin: vi.fn(), postHost: vi.fn(), fetchState: vi.fn() };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/client/useGameState", () => ({ useGameState: h.useGameState }));
vi.mock("@/lib/client/api", () => ({
  ClientApiError: h.ClientApiError,
  createGame: h.createGame,
  hostLogin: h.hostLogin,
  postHost: h.postHost,
  fetchState: h.fetchState,
}));

import { CreateGame } from "@/components/host/CreateGame";
import { HostPlay } from "@/components/host/HostPlay";
import { ProjectorPlay } from "@/components/host/ProjectorPlay";
import { clearSession, loadSession, saveSession } from "@/lib/client/storage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const readiness = Array.from({ length: 15 }, (_, i) => ({ unit: i + 1, ready: i === 0, count: i === 0 ? 20 : 0 }));

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
    endsAt: Date.now() + 60_000,
    roll: 7,
    bonusResource: null,
    raider: false,
    hazard: false,
    questions: {
      t1: { templateId: "x", unit: 1, difficulty: 1, resource: "food", format: { kind: "integer" }, prompt: "Catch 12 fish 3 days?" },
    },
    submissions: { t1: { submitted: false }, t2: { submitted: true } },
    results: null,
  },
  ...over,
});

function setGame(s: PublicGameState | null, status: "live" | "polling" | "offline" = "live") {
  h.useGameState.mockReturnValue({ state: s, status });
}
const asHost = () => saveSession("ABCDEF", { token: "HOSTTOK", role: "host", deviceId: "dev" });

beforeEach(() => {
  clearSession("ABCDEF");
  vi.clearAllMocks();
  h.postHost.mockResolvedValue({});
  h.createGame.mockResolvedValue({ code: "ABCDEF" });
});
afterEach(cleanup);

describe("create game form", () => {
  it("warns about a not-ready unit and asks to confirm before creating", async () => {
    const user = userEvent.setup();
    render(<CreateGame readiness={readiness} />);
    await user.type(screen.getByLabelText(/teacher password/i), "pw");
    await user.click(screen.getByLabelText("Unit 2"));
    expect(screen.getByTestId("not-ready-warning").textContent).toMatch(/unit 2/i);
    await user.click(screen.getByRole("button", { name: /create game/i }));
    expect(h.createGame).not.toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: /yes, create anyway/i }));
    expect(h.createGame).toHaveBeenCalledWith({ password: "pw", units: [1, 2], length: "standard", timerSeconds: 90 });
    expect((await screen.findByTestId("join-code")).textContent).toBe("ABCDEF");
    expect(screen.getByRole("link", { name: /projector/i }).getAttribute("href")).toBe("/projector/ABCDEF");
  });

  it("creates directly when all selected units are ready", async () => {
    const user = userEvent.setup();
    render(<CreateGame readiness={readiness} />);
    await user.type(screen.getByLabelText(/teacher password/i), "pw");
    await user.click(screen.getByRole("button", { name: /create game/i }));
    expect(h.createGame).toHaveBeenCalledTimes(1);
  });

  it("All selects units 1 to 15 and None clears them", async () => {
    const user = userEvent.setup();
    render(<CreateGame readiness={readiness} />);
    await user.click(screen.getByRole("button", { name: "All" }));
    for (let u = 1; u <= 15; u++) expect((screen.getByLabelText(`Unit ${u}`) as HTMLInputElement).checked).toBe(true);
    await user.click(screen.getByRole("button", { name: "None" }));
    for (let u = 1; u <= 15; u++) expect((screen.getByLabelText(`Unit ${u}`) as HTMLInputElement).checked).toBe(false);
    await user.type(screen.getByLabelText(/teacher password/i), "pw");
    await user.click(screen.getByRole("button", { name: /create game/i }));
    expect(h.createGame).not.toHaveBeenCalled();
    expect((await screen.findByRole("alert")).textContent).toMatch(/at least one unit/i);
  });

  it("password is masked and over-long passwords are rejected client-side", async () => {
    const user = userEvent.setup();
    render(<CreateGame readiness={readiness} />);
    const pw = screen.getByLabelText(/teacher password/i) as HTMLInputElement;
    expect(pw.type).toBe("password");
    await user.click(pw);
    await user.paste("x".repeat(201));
    await user.click(screen.getByRole("button", { name: /create game/i }));
    expect(h.createGame).not.toHaveBeenCalled();
    expect((await screen.findByRole("alert")).textContent).toMatch(/too long/i);
  });

  it("shows the quick and standard round counts", () => {
    render(<CreateGame readiness={readiness} />);
    expect(screen.getByText(/Quick: 6 rounds/)).toBeTruthy();
    expect(screen.getByText(/Standard: 11 rounds/)).toBeTruthy();
  });

  it("maps a wrong password to friendly text", async () => {
    h.createGame.mockRejectedValue(new h.ClientApiError(401, "UNAUTHORIZED"));
    const user = userEvent.setup();
    render(<CreateGame readiness={readiness} />);
    await user.type(screen.getByLabelText(/teacher password/i), "bad");
    await user.click(screen.getByRole("button", { name: /create game/i }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/password was not accepted/i);
  });
});

describe("host screen", () => {
  it("Next round is disabled during the question phase; Reveal is enabled", async () => {
    asHost();
    setGame(state());
    render(<HostPlay code="ABCDEF" />);
    const next = (await screen.findByRole("button", { name: /next round/i })) as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    expect((screen.getByRole("button", { name: /reveal/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("Next round is enabled in reveal and posts next", async () => {
    asHost();
    setGame(state({ phase: "reveal" }));
    const user = userEvent.setup();
    render(<HostPlay code="ABCDEF" />);
    await user.click(await screen.findByRole("button", { name: /next round/i }));
    expect(h.postHost).toHaveBeenCalledWith("ABCDEF", { type: "next" });
  });

  it("host token persists across a reload", async () => {
    asHost();
    setGame(state());
    const first = render(<HostPlay code="ABCDEF" />);
    expect(await screen.findByRole("heading", { name: /host screen/i })).toBeTruthy();
    first.unmount();
    expect(loadSession("ABCDEF")?.token).toBe("HOSTTOK");
    render(<HostPlay code="ABCDEF" />);
    expect(await screen.findByRole("heading", { name: /host screen/i })).toBeTruthy();
  });

  it("without a host session it asks to sign in again", async () => {
    setGame(state());
    render(<HostPlay code="ABCDEF" />);
    expect(await screen.findByRole("heading", { name: /sign in again/i })).toBeTruthy();
  });

  it("a 401 from an action shows the sign in again prompt", async () => {
    asHost();
    setGame(state());
    h.postHost.mockRejectedValue(new h.ClientApiError(401, "UNAUTHORIZED"));
    const user = userEvent.setup();
    render(<HostPlay code="ABCDEF" />);
    await user.click(await screen.findByRole("button", { name: /reveal/i }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/sign in again/i);
  });

  it("shows the reconnecting banner only when offline", async () => {
    asHost();
    setGame(state(), "polling");
    const r = render(<HostPlay code="ABCDEF" />);
    await screen.findByRole("heading", { name: /host screen/i });
    expect(screen.queryByText(/reconnecting/i)).toBeNull();
    r.unmount();
    setGame(state(), "offline");
    render(<HostPlay code="ABCDEF" />);
    expect(await screen.findByText(/reconnecting/i)).toBeTruthy();
  });

  it("End game needs an inline confirmation", async () => {
    asHost();
    setGame(state());
    const user = userEvent.setup();
    render(<HostPlay code="ABCDEF" />);
    await user.click(await screen.findByRole("button", { name: /^end game$/i }));
    expect(h.postHost).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /yes, end the game/i }));
    expect(h.postHost).toHaveBeenCalledWith("ABCDEF", { type: "end" });
  });

  it("override rejects values above 9999 client-side and sends valid ones", async () => {
    asHost();
    setGame(state());
    const user = userEvent.setup();
    render(<HostPlay code="ABCDEF" />);
    await user.type(await screen.findByLabelText("Override Wood"), "10000");
    await user.click(screen.getByRole("button", { name: /apply override/i }));
    expect(h.postHost).not.toHaveBeenCalled();
    expect(screen.getByText(/0 to 9999/)).toBeTruthy();
    await user.clear(screen.getByLabelText("Override Wood"));
    await user.type(screen.getByLabelText("Override Wood"), "9999");
    await user.type(screen.getByLabelText("Override Survival points"), "4");
    await user.click(screen.getByRole("button", { name: /apply override/i }));
    expect(h.postHost).toHaveBeenCalledWith("ABCDEF", { type: "override", teamId: "t1", stock: { wood: 9999 }, sp: 4 });
  });

  it("extend timer posts the seconds and rejects out of range", async () => {
    asHost();
    setGame(state());
    const user = userEvent.setup();
    render(<HostPlay code="ABCDEF" />);
    const input = await screen.findByLabelText(/extra seconds/i);
    await user.clear(input);
    await user.type(input, "601");
    await user.click(screen.getByRole("button", { name: /extend timer/i }));
    expect(h.postHost).not.toHaveBeenCalled();
    await user.clear(input);
    await user.type(input, "45");
    await user.click(screen.getByRole("button", { name: /extend timer/i }));
    expect(h.postHost).toHaveBeenCalledWith("ABCDEF", { type: "extend", seconds: 45 });
  });

  it("tiebreak shows a Reveal button that posts reveal, and Next is disabled", async () => {
    asHost();
    setGame(state({ phase: "tiebreak", tiedIds: ["t1", "t2"] }));
    const user = userEvent.setup();
    render(<HostPlay code="ABCDEF" />);
    const reveal = await screen.findByRole("button", { name: /reveal/i });
    await user.click(reveal);
    expect(h.postHost).toHaveBeenCalledWith("ABCDEF", { type: "reveal" });
    expect((screen.getByRole("button", { name: /next round|start tiebreak/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("a pending tie in reveal labels Next as Start tiebreak", async () => {
    asHost();
    setGame(state({ phase: "reveal", tiedIds: ["t1", "t2"] }));
    render(<HostPlay code="ABCDEF" />);
    expect(((await screen.findByRole("button", { name: /start tiebreak/i })) as HTMLButtonElement).disabled).toBe(false);
  });

  it("lobby lists teams with rename, remove (confirmed) and start", async () => {
    asHost();
    setGame(state({ phase: "lobby", round: null }));
    const user = userEvent.setup();
    render(<HostPlay code="ABCDEF" />);
    await user.click(await screen.findByRole("button", { name: /start game/i }));
    expect(h.postHost).toHaveBeenLastCalledWith("ABCDEF", { type: "start" });
    const nameBox = screen.getByLabelText("New name for Crabs");
    await user.clear(nameBox);
    await user.type(nameBox, "Sharks");
    await user.click(screen.getAllByRole("button", { name: "Rename" })[0]);
    expect(h.postHost).toHaveBeenLastCalledWith("ABCDEF", { type: "rename", teamId: "t1", name: "Sharks" });
    await user.click(screen.getByRole("button", { name: "Remove Gulls" }));
    expect(h.postHost).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole("button", { name: /yes, remove gulls/i }));
    expect(h.postHost).toHaveBeenLastCalledWith("ABCDEF", { type: "remove", teamId: "t2" });
  });

  it("reassigns a captain", async () => {
    asHost();
    setGame(state());
    const user = userEvent.setup();
    render(<HostPlay code="ABCDEF" />);
    await user.selectOptions(await screen.findByLabelText("Captain device for Crabs"), "1");
    await user.click(screen.getByRole("button", { name: /set captain for crabs/i }));
    expect(h.postHost).toHaveBeenCalledWith("ABCDEF", { type: "setCaptain", teamId: "t1", deviceIndex: 1 });
  });
});

describe("host re-login", () => {
  it("logging in with the password restores the host screen and clears the field", async () => {
    setGame(state());
    h.hostLogin.mockImplementation(async (code: string) => {
      saveSession(code, { token: "NEW", role: "host", deviceId: "dev" });
    });
    const user = userEvent.setup();
    render(<HostPlay code="ABCDEF" />);
    const pw = (await screen.findByLabelText(/teacher password/i)) as HTMLInputElement;
    expect(pw.type).toBe("password");
    await user.type(pw, "secret");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(h.hostLogin).toHaveBeenCalledWith("ABCDEF", "secret");
    expect(await screen.findByRole("heading", { name: /host screen/i })).toBeTruthy();
  });

  it("a wrong password shows a friendly error and empties the field", async () => {
    setGame(state());
    h.hostLogin.mockRejectedValue(new h.ClientApiError(401, "UNAUTHORIZED"));
    const user = userEvent.setup();
    render(<HostPlay code="ABCDEF" />);
    const pw = (await screen.findByLabelText(/teacher password/i)) as HTMLInputElement;
    await user.type(pw, "bad");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/password was not accepted/i);
    expect((screen.getByLabelText(/teacher password/i) as HTMLInputElement).value).toBe("");
  });

  it("the lost-token prompt after a 401 also offers password sign in", async () => {
    asHost();
    setGame(state());
    h.postHost.mockRejectedValue(new h.ClientApiError(401, "UNAUTHORIZED"));
    h.hostLogin.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<HostPlay code="ABCDEF" />);
    await user.click(await screen.findByRole("button", { name: /reveal/i }));
    const pw = await screen.findByLabelText(/teacher password/i);
    await user.type(pw, "secret");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(h.hostLogin).toHaveBeenCalledWith("ABCDEF", "secret");
    await waitFor(() => expect(screen.queryByLabelText(/teacher password/i)).toBeNull());
    expect(screen.getByRole("heading", { name: /host screen/i })).toBeTruthy();
  });

  it("the old copy about creating a game to sign in is gone", async () => {
    setGame(state());
    render(<HostPlay code="ABCDEF" />);
    await screen.findByLabelText(/teacher password/i);
    expect(screen.queryByText(/sign in by creating a game/i)).toBeNull();
  });
});

describe("minor fixes", () => {
  it("End in reveal with a pending tie uses tiebreak wording", async () => {
    asHost();
    setGame(state({ phase: "reveal", tiedIds: ["t1", "t2"] }));
    const user = userEvent.setup();
    render(<HostPlay code="ABCDEF" />);
    await user.click(await screen.findByRole("button", { name: /^end game$/i }));
    const group = screen.getByRole("group", { name: /confirm end game/i });
    expect(group.textContent).toMatch(/tiebreak/i);
    expect(group.textContent).not.toMatch(/final/i);
  });

  it("clears the password after a successful create", async () => {
    const user = userEvent.setup();
    const { container } = render(<CreateGame readiness={readiness} />);
    await user.type(screen.getByLabelText(/teacher password/i), "pw");
    await user.click(screen.getByRole("button", { name: /create game/i }));
    await screen.findByTestId("join-code");
    expect(container.querySelector("input[type=password]")).toBeNull();
    expect(h.createGame).toHaveBeenCalled();
  });
});

describe("projector view", () => {
  const withResults = (phase: "question" | "reveal") => {
    const s = state({ phase });
    s.round!.results = { t1: { expected: "SECRET-36", solution: "12 x 3 = 36 SOLN", answer: "35", correct: false } };
    return s;
  };

  it("never shows answers before reveal, even if results were somehow present", () => {
    setGame(withResults("question"));
    const { container } = render(<ProjectorPlay code="ABCDEF" />);
    expect(container.textContent).not.toMatch(/SECRET-36|SOLN/);
  });

  it("shows answers in the reveal phase", () => {
    setGame(withResults("reveal"));
    const { container } = render(<ProjectorPlay code="ABCDEF" />);
    expect(container.textContent).toMatch(/SECRET-36/);
  });

  it("lobby shows the join code and team names prominently", () => {
    setGame(state({ phase: "lobby", round: null }));
    render(<ProjectorPlay code="ABCDEF" />);
    expect(screen.getByTestId("join-code").textContent).toBe("ABCDEF");
    expect(screen.getByText("Crabs")).toBeTruthy();
    expect(screen.getByText("Gulls")).toBeTruthy();
  });

  it("shows the roll, five zones, the fund and the timer in play", () => {
    setGame(state());
    render(<ProjectorPlay code="ABCDEF" />);
    expect(screen.getByTestId("roll").textContent).toMatch(/7/);
    for (const z of ["beach", "forest", "cave", "hills", "lagoon"]) expect(screen.getByTestId(`zone-${z}`)).toBeTruthy();
    expect(screen.getByRole("progressbar")).toBeTruthy();
    expect(screen.getByTestId("timer").textContent).toMatch(/\d+s/);
  });

  it("shows the reconnecting banner only when offline", () => {
    setGame(state(), "offline");
    render(<ProjectorPlay code="ABCDEF" />);
    expect(screen.getByText(/reconnecting/i)).toBeTruthy();
  });
});
