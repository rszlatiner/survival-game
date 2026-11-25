"use client";

import { useState } from "react";
import { BUILDS, MARKET } from "@/lib/config";
import { canAfford } from "@/lib/engine/build";
import type { PublicTeam } from "@/lib/engine/public";
import { RESOURCES, type Resource } from "@/lib/questions/types";
import type { TeamAction } from "@/lib/api/parse";
import type { BuildId } from "@/lib/types";
import { BuildIcon, ResourceIcon, StarIcon, StormIcon, WaterIcon, StoneIcon } from "@/components/art";
import { btn, field, label, panel } from "@/components/ui/styles";
import { BUILD_LABEL, RESOURCE_LABEL } from "./labels";

/** Cost as text ("3 wood, 2 stone") with a resource icon before each part; the text itself is unchanged. */
const costText = (c: Partial<Record<Resource, number>>) =>
  RESOURCES.filter((r) => c[r]).map((r, i) => (
    <span key={r} className="whitespace-nowrap">
      {i > 0 ? ", " : ""}
      <ResourceIcon resource={r} size={18} className="mr-0.5 inline-block align-[-3px]" />
      {`${c[r]} ${RESOURCE_LABEL[r].toLowerCase()}`}
    </span>
  ));

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
    <section aria-label="Build" className={`${panel} space-y-2`}>
      <h2 className="text-lg font-black">Build</h2>
      <div className="grid gap-3 pr-1">
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
              className={`flex min-h-16 items-center gap-3 border-4 px-3 py-2 text-left shadow-[4px_4px_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#000] disabled:cursor-not-allowed ${
                built
                  ? "border-palm-700 bg-palm-200 text-night-900"
                  : "border-palm-800 bg-palm-700 text-white disabled:border-sand-300 disabled:bg-sand-100 disabled:text-sand-900"
              }`}
            >
              <span className="grid size-12 shrink-0 place-items-center border-4 border-void bg-sand-50">
                <BuildIcon id={id} size={34} />
              </span>
              <span>
                <span className="block text-lg font-black">{BUILD_LABEL[id]}{built ? " (built)" : ""}</span>
                <span className="block text-sm font-semibold">
                  {costText(def.cost)} for <StarIcon size={16} className="inline-block align-[-2px]" /> {def.sp} SP{locked && def.requires ? `, needs ${BUILD_LABEL[def.requires]}` : ""}
                </span>
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
  const select = field;
  return (
    <section aria-label="Market" className={`${panel} space-y-2`}>
      <h2 className="flex items-center gap-2 text-lg font-black">
        <WaterIcon size={24} />
        <StoneIcon size={24} />
        Market
      </h2>
      <p className="text-sm">
        Base rate {MARKET.base} for 1. {bonus ? `Today ${RESOURCE_LABEL[bonus]} is a bonus: ${MARKET.bonusGet} to get it, ${MARKET.bonusGive} when giving it.` : ""}
      </p>
      <label className={label} htmlFor="m-give">Give</label>
      <select id="m-give" className={select} value={give} onChange={(e) => setGive(e.target.value as Resource)}>
        {RESOURCES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <label className={label} htmlFor="m-get">Get</label>
      <select id="m-get" className={select} value={get} onChange={(e) => setGet(e.target.value as Resource)}>
        {RESOURCES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <label className={label} htmlFor="m-amt">Amount to get</label>
      <input id="m-amt" inputMode="numeric" className={select} value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 3))} />
      <p data-testid="market-cost" className="border-4 border-void bg-white px-3 py-2 font-black text-void">
        {give === get ? "Pick two different resources." : `Costs ${cost} ${give}`}
      </p>
      <button
        type="button"
        disabled={busy || !valid || team.stock[give] < cost}
        onClick={() => act({ type: "exchange", give, get, amount: n })}
        className={btn("ocean", "min-h-14 w-full text-lg")}
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
    <section aria-label="Island fund" className={`${panel} space-y-2`}>
      <h2 className="flex items-center gap-2 text-lg font-black">
        <StormIcon size={28} />
        Island fund
      </h2>
      <p className="text-sm">
        {hazard ? "A hazard hits this round. The whole class must pool resources to weaken it. " : "Pool resources for island hazards. "}
        Fund holds {pooled}. Your team gave {team.fundGiven}.
      </p>
      <label className={label} htmlFor="f-res">Contribute resource</label>
      <select id="f-res" className={field} value={res} onChange={(e) => setRes(e.target.value as Resource)}>
        {RESOURCES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <label className={label} htmlFor="f-amt">Contribute amount</label>
      <input id="f-amt" inputMode="numeric" className={field} value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 3))} />
      <button
        type="button"
        disabled={busy || !valid}
        onClick={() => { act({ type: "contribute", resource: res, amount: n }); setAmount(""); }}
        className={btn("night", "min-h-14 w-full text-lg")}
      >
        Contribute
      </button>
    </section>
  );
}
