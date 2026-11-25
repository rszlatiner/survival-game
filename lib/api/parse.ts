import { BUILDS, MAX_ANSWER_LENGTH, MAX_OVERRIDE, TIMER_MAX_SECONDS, TIMER_MIN_SECONDS } from "@/lib/config";
import { RESOURCES } from "@/lib/questions/types";
import type { Resource } from "@/lib/questions/types";
import type { BuildId, GameLength, Stock } from "@/lib/types";
import { ApiError } from "./errors";

/** Request shapes, checked at runtime because they arrive as untrusted JSON. */

export interface CreateBody {
  password: string;
  units: number[];
  length: GameLength;
  timerSeconds: number;
}

export interface JoinBody {
  teamName?: string;
  teamId?: string;
  deviceId: string;
}

export type HostAction =
  | { type: "start" | "next" | "reveal" | "skip" | "end" }
  | { type: "extend" | "shorten" | "setTimer"; seconds: number }
  | { type: "setCaptain"; teamId: string; deviceIndex: number }
  | { type: "rename"; teamId: string; name: string }
  | { type: "remove" | "resetDevices"; teamId: string }
  | { type: "override"; teamId: string; stock?: Partial<Stock>; sp?: number };

export type TeamAction =
  | { type: "submit" | "suggest"; answer: string }
  | { type: "build"; item: BuildId }
  | { type: "exchange"; give: Resource; get: Resource; amount: number }
  | { type: "contribute"; resource: Resource; amount: number };

const ID_MAX = 64;
const NAME_MAX = 100;
const PASSWORD_MAX = 200;

const bad = (what: string): never => {
  throw new ApiError(400, "BAD_REQUEST", what);
};

function obj(x: unknown): Record<string, unknown> {
  if (!x || typeof x !== "object" || Array.isArray(x)) bad("body");
  return x as Record<string, unknown>;
}

function str(o: Record<string, unknown>, k: string, max: number): string {
  const v = o[k];
  if (typeof v !== "string" || v.length === 0 || v.length > max) bad(k);
  return v as string;
}

const inRange = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;

function int(o: Record<string, unknown>, k: string, lo: number, hi: number): number {
  const v = o[k];
  if (!inRange(v, lo, hi)) bad(k);
  return v as number;
}

function oneOf<T extends string>(o: Record<string, unknown>, k: string, allowed: readonly T[]): T {
  const v = o[k];
  if (typeof v !== "string" || !(allowed as readonly string[]).includes(v)) bad(k);
  return v as T;
}

/** Join codes are matched case-insensitively; anything not code-shaped is simply not found. */
export function normalizeCode(code: string): string {
  const c = String(code ?? "").trim().toUpperCase();
  if (!/^[A-Z2-9]{6}$/.test(c)) throw new ApiError(404, "NOT_FOUND");
  return c;
}

export function parseCreateBody(x: unknown): CreateBody {
  const o = obj(x);
  const units = o.units;
  if (!Array.isArray(units) || units.length > 15 || !units.every((u) => typeof u === "number")) bad("units");
  return {
    password: typeof o.password === "string" && o.password.length <= PASSWORD_MAX ? o.password : bad("password"),
    units: [...(units as number[])],
    length: oneOf(o, "length", ["quick", "standard"] as const),
    timerSeconds: int(o, "timerSeconds", TIMER_MIN_SECONDS, TIMER_MAX_SECONDS),
  };
}

export function parseLoginBody(x: unknown): { password: string } {
  const o = obj(x);
  return { password: str(o, "password", PASSWORD_MAX) };
}

export function parseJoinBody(x: unknown): JoinBody {
  const o = obj(x);
  const deviceId = str(o, "deviceId", ID_MAX);
  const hasName = o.teamName !== undefined;
  const hasId = o.teamId !== undefined;
  if (hasName === hasId) bad("teamName or teamId");
  return hasId ? { teamId: str(o, "teamId", ID_MAX), deviceId } : { teamName: str(o, "teamName", NAME_MAX), deviceId };
}

function answer(o: Record<string, unknown>): string {
  const v = o.answer;
  if (typeof v !== "string" || v.length > MAX_ANSWER_LENGTH || v.trim() === "") bad("answer");
  return v as string;
}

export function parseHostAction(x: unknown): HostAction {
  const o = obj(x);
  const type = oneOf(o, "type", [
    "start", "next", "reveal", "skip", "end", "extend", "shorten", "setTimer", "setCaptain", "rename", "remove", "resetDevices", "override",
  ] as const);
  switch (type) {
    case "extend":
      return { type, seconds: int(o, "seconds", 1, TIMER_MAX_SECONDS) };
    case "shorten":
      return { type, seconds: int(o, "seconds", 1, TIMER_MAX_SECONDS) };
    case "setTimer":
      return { type, seconds: int(o, "seconds", TIMER_MIN_SECONDS, TIMER_MAX_SECONDS) };
    case "setCaptain":
      return { type, teamId: str(o, "teamId", ID_MAX), deviceIndex: int(o, "deviceIndex", 0, 100) };
    case "rename":
      return { type, teamId: str(o, "teamId", ID_MAX), name: str(o, "name", NAME_MAX) };
    case "remove":
    case "resetDevices":
      return { type, teamId: str(o, "teamId", ID_MAX) };
    case "override": {
      const out: HostAction = { type, teamId: str(o, "teamId", ID_MAX) };
      if (o.stock !== undefined) {
        const s = obj(o.stock);
        const stock: Partial<Stock> = {};
        for (const [k, v] of Object.entries(s)) {
          if (!(RESOURCES as readonly string[]).includes(k) || !inRange(v, 0, MAX_OVERRIDE)) bad("stock");
          stock[k as Resource] = v as number;
        }
        out.stock = stock;
      }
      if (o.sp !== undefined) out.sp = int(o, "sp", 0, MAX_OVERRIDE);
      return out;
    }
    default:
      return { type };
  }
}

export function parseTeamAction(x: unknown): TeamAction {
  const o = obj(x);
  const type = oneOf(o, "type", ["submit", "suggest", "build", "exchange", "contribute"] as const);
  switch (type) {
    case "submit":
    case "suggest":
      return { type, answer: answer(o) };
    case "build":
      return { type, item: oneOf(o, "item", Object.keys(BUILDS) as BuildId[]) };
    case "exchange":
      return {
        type,
        give: oneOf(o, "give", RESOURCES),
        get: oneOf(o, "get", RESOURCES),
        amount: int(o, "amount", 1, 1000),
      };
    case "contribute":
      return { type, resource: oneOf(o, "resource", RESOURCES), amount: int(o, "amount", 1, 1000) };
  }
}
