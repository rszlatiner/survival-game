import type { PublicQuestion, Resource, ZoneId } from "@/lib/questions/types";

export type GameLength = "quick" | "standard";
export type Phase = "lobby" | "question" | "reveal" | "tiebreak" | "finished";
export type BuildId =
  | "shelter"
  | "fire"
  | "waterStore"
  | "watchtower"
  | "raft1"
  | "raft2"
  | "raft3";

export type Stock = Record<Resource, number>;

export interface Team {
  id: string;
  name: string;
  zone: ZoneId;
  /** Device ids joined to this team. */
  devices: string[];
  /** Index into `devices` of the device that may submit answers. */
  captainIndex: number;
  stock: Stock;
  builds: BuildId[];
  /** Survival points. */
  sp: number;
  /** Total resources this team has contributed to the island fund. */
  fundGiven: number;
}

export interface RoundState {
  /** Round number (1-based). */
  n: number;
  /** Epoch ms. */
  startedAt: number;
  /** Epoch ms when the answer window closes. */
  endsAt: number;
  /** Dice roll for this round. */
  roll: number;
  /** Resource that pays a market bonus this round, if any. */
  bonusResource: Resource | null;
  raider: boolean;
  hazard: boolean;
  /** Keyed by team id; holds the private answer and solution. */
  questions: Record<
    string,
    { publicQ: PublicQuestion; expected: number | string; solution: string }
  >;
  /** Keyed by team id; the captain's submitted answer. */
  submissions: Record<
    string,
    { answer: string; deviceId: string; at: number; correct?: boolean }
  >;
  /** Keyed by team id; non-captain teammates' proposed answers. */
  suggestions: Record<string, { deviceId: string; answer: string }[]>;
}

export interface GameState {
  /** Join code. */
  code: string;
  /** Monotonic counter bumped on every state change. */
  version: number;
  /** Epoch ms. */
  createdAt: number;
  /** Curriculum units in play. */
  units: number[];
  length: GameLength;
  timerSeconds: number;
  /** Seed for deterministic question generation. */
  seed: string;
  phase: Phase;
  teams: Team[];
  round: RoundState | null;
  roundsPlayed: number;
  /** Shared island fund. */
  fund: Stock;
  winnerId: string | null;
  tiedIds: string[];
  log: string[];
}
