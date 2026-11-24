import { RESOURCES } from "@/lib/questions/types";
import type { Stock } from "@/lib/types";
import { RESOURCE_ICON, RESOURCE_LABEL } from "./labels";

export function StockBar({ stock }: { stock: Stock }) {
  return (
    <ul aria-label="Your resources" className="grid grid-cols-4 gap-2">
      {RESOURCES.map((r) => (
        <li key={r} className="rounded-xl bg-slate-800 p-2 text-center text-white">
          <div aria-hidden="true" className="text-xl">{RESOURCE_ICON[r]}</div>
          <div className="text-xs">{RESOURCE_LABEL[r]}</div>
          <div className="text-xl font-bold" aria-label={`${RESOURCE_LABEL[r]} ${stock[r]}`}>{stock[r]}</div>
        </li>
      ))}
    </ul>
  );
}
