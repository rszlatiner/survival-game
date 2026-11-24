"use client";

import { useState } from "react";
import { BUILDS, MARKET } from "@/lib/config";
import { canAfford } from "@/lib/engine/build";
import type { PublicTeam } from "@/lib/engine/public";
import { RESOURCES, type Resource } from "@/lib/questions/types";
import type { TeamAction } from "@/lib/api/parse";
import type { BuildId } from "@/lib/types";
import { BUILD_LABEL, RESOURCE_LABEL } from "./labels";

const costText = (c: Partial<Record<Resource, number>>) =>
  RESOURCES.filter((r) => c[r]).map((r) => `${c[r]} ${RESOURCE_LABEL[r].toLowerCase()}`).join(", ");

export function marketCost(bonus: Resource | null, give: Resource, get: Resource): number {
  if (bonus === null) return MARKET.base;
  if (get === bonus) return MARKET.bonusGet;
  if (give === bonus) return MARKET.bonusGive;
  return MARKET.base;
}

interface Props {
  team: PublicTeam;
  bonus: Resource | null;
  busy: boolean;
  act: (a: TeamAction) => void;
}

export function BuildPanel({ team, busy, act }: Omit<Props, "bonus">) {
  return (
    <section aria-label="Build" className="space-y-2">
      <h2 className="text-lg font-bold text-white">Build</h2>
      <div className="grid gap-2">
        {(Object.keys(BUILDS) as BuildId[]).map((id) => {
          const def = BUILDS[id];
          const built = team.builds.includes(id);
          const locked = def.requires !== undefined && !team.builds.includes(def.requires);
          const disabled = busy || built || locked || !canAfford(team.stock, def.cost);
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              aria-label={`Build ${BUILD_LABEL[id]}`}
              onClick={() => act({ type: "build", item: id })}
              className="min-h-14 rounded-xl bg-emerald-600 px-3 text-left text-white disabled:bg-slate-700 disabled:text-slate-300"
            >
              <span className="block text-lg font-bold">{BUILD_LABEL[id]}{built ? " (built)" : ""}</span>
              <span className="block text-sm">
                {costText(def.cost)} for {def.sp} SP{locked && def.requires ? `, needs ${BUILD_LABEL[def.requires]}` : ""}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function MarketPanel({ team, bonus, busy, act }: Props) {
  const [give, setGive] = useState<Resource>("water");
  const [get, setGet] = useState<Resource>("stone");
  const [amount, setAmount] = useState("1");
  const n = Number(amount);
  const valid = Number.isInteger(n) && n > 0 && give !== get;
  const cost = marketCost(bonus, give, get) * (Number.isInteger(n) && n > 0 ? n : 0);
  const select = "min-h-12 w-full rounded-lg bg-white px-2 text-lg text-black";
  return (
    <section aria-label="Market" className="space-y-2 rounded-xl bg-slate-900 p-3 text-white">
      <h2 className="text-lg font-bold">Market</h2>
      <p className="text-sm">
        Base rate {MARKET.base} for 1. {bonus ? `Today ${RESOURCE_LABEL[bonus]} is a bonus: ${MARKET.bonusGet} to get it, ${MARKET.bonusGive} when giving it.` : ""}
      </p>
      <label className="block text-sm font-bold" htmlFor="m-give">Give</label>
      <select id="m-give" className={select} value={give} onChange={(e) => setGive(e.target.value as Resource)}>
        {RESOURCES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <label className="block text-sm font-bold" htmlFor="m-get">Get</label>
      <select id="m-get" className={select} value={get} onChange={(e) => setGet(e.target.value as Resource)}>
        {RESOURCES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <label className="block text-sm font-bold" htmlFor="m-amt">Amount to get</label>
      <input id="m-amt" inputMode="numeric" className={select} value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 3))} />
      <p data-testid="market-cost" className="font-bold">
        {give === get ? "Pick two different resources." : `Costs ${cost} ${give}`}
      </p>
      <button
        type="button"
        disabled={busy || !valid || team.stock[give] < cost}
        onClick={() => act({ type: "exchange", give, get, amount: n })}
        className="min-h-14 w-full rounded-xl bg-sky-500 text-lg font-bold text-black disabled:opacity-40"
      >
        Exchange
      </button>
    </section>
  );
}

export function FundPanel({ team, fund, hazard, busy, act }: {
  team: PublicTeam;
  fund: PublicTeam["stock"];
  hazard: boolean;
  busy: boolean;
  act: (a: TeamAction) => void;
}) {
  const [res, setRes] = useState<Resource>("water");
  const [amount, setAmount] = useState("");
  const n = Number(amount);
  const valid = Number.isInteger(n) && n > 0 && team.stock[res] >= n;
  const pooled = RESOURCES.reduce((s, r) => s + fund[r], 0);
  return (
    <section aria-label="Island fund" className="space-y-2 rounded-xl bg-slate-900 p-3 text-white">
      <h2 className="text-lg font-bold">Island fund</h2>
      <p className="text-sm">
        {hazard ? "A hazard hits this round. The whole class must pool resources to weaken it. " : "Pool resources for island hazards. "}
        Fund holds {pooled}. Your team gave {team.fundGiven}.
      </p>
      <label className="block text-sm font-bold" htmlFor="f-res">Contribute resource</label>
      <select id="f-res" className="min-h-12 w-full rounded-lg bg-white px-2 text-lg text-black" value={res} onChange={(e) => setRes(e.target.value as Resource)}>
        {RESOURCES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <label className="block text-sm font-bold" htmlFor="f-amt">Contribute amount</label>
      <input id="f-amt" inputMode="numeric" className="min-h-12 w-full rounded-lg bg-white px-2 text-lg text-black" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 3))} />
      <button
        type="button"
        disabled={busy || !valid}
        onClick={() => { act({ type: "contribute", resource: res, amount: n }); setAmount(""); }}
        className="min-h-14 w-full rounded-xl bg-violet-400 text-lg font-bold text-black disabled:opacity-40"
      >
        Contribute
      </button>
    </section>
  );
}
