import { errorText } from "@/components/team/labels";

/** Host-facing messages for server error codes (the server sends only a code). */
const HOST_ERRORS: Record<string, string> = {
  UNAUTHORIZED: "Your host session has expired. Sign in again.",
  NO_TEAMS: "No teams have joined yet.",
  WRONG_PHASE: "That is not possible at this stage of the game.",
  BAD_UNITS: "Pick at least one unit from 1 to 15.",
  NO_QUESTIONS: "There are no questions available for the chosen units.",
  BAD_AMOUNT: "Enter a whole number in the allowed range.",
  BAD_INDEX: "That device is not on the team.",
  EMPTY_NAME: "A team name cannot be empty.",
  NOT_FOUND: "That game or team was not found.",
  SAVE_FAILED: "The game could not be saved. Try again.",
  SERVER_MISCONFIGURED: "The server is not set up correctly. Check its settings.",
  CONFLICT: "The game changed at the same moment. Try again.",
};

export function hostErrorText(e: unknown): string {
  const code = e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "";
  return HOST_ERRORS[code] ?? errorText(e);
}

export function isAuthLost(e: unknown): boolean {
  return !!e && typeof e === "object" && (e as { status?: unknown }).status === 401;
}
