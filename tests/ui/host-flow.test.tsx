// @vitest-environment jsdom
import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { HostScreen } from "@/components/host/HostScreen";
import { createGameHandler, hostActionHandler, joinHandler, stateHandler, type HandlerEnv } from "@/lib/api/handlers";
import type { HostAction } from "@/lib/api/parse";
import type { PublicGameState } from "@/lib/engine/public";
import { memoryRepo } from "@/lib/repo/memory";

/**
 * Integration (fix wave C1): the real HostScreen drives the real handlers over
 * an in-memory repo. No mock decides what phase the game is in.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PASSWORD = "teacher-pass";
const env: HandlerEnv = {
  teacherPassword: PASSWORD,
  tokenSecret: "test-secret-0123456789-abcdefghijk",
  notifier: { notify: async () => true },
};

afterEach(cleanup);

describe("host flow against the real handlers", () => {
  it("lobby with one team: one press of Start shows round 1's question", async () => {
    const repo = memoryRepo();
    const now = Date.now();
    const { code, hostToken } = await createGameHandler(repo, env, { password: PASSWORD, units: [11], length: "quick", timerSeconds: 60 }, now);
    await joinHandler(repo, env, code, { teamName: "Crabs", deviceId: "dev-1" }, now);
    const initial = await stateHandler(repo, code, now);
    expect(initial.phase).toBe("lobby");

    function Harness() {
      const [s, set] = React.useState<PublicGameState>(initial);
      const send = async (a: HostAction) => {
        const next = await hostActionHandler(repo, env, code, hostToken, a, Date.now());
        set(next);
        return next;
      };
      return <HostScreen state={s} status="live" send={send} login={async () => {}} />;
    }

    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByTestId("phase").textContent).toMatch(/lobby/i);
    await user.click(screen.getByRole("button", { name: /start game/i }));

    expect((await screen.findByTestId("phase")).textContent).toMatch(/question, round 1 of 6/i);
    expect(screen.getByRole("region", { name: "Current question" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /reveal answers/i }).hasAttribute("disabled")).toBe(false);
    expect((await repo.get(code))!.phase).toBe("question");
    // No error toast from the start.
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
