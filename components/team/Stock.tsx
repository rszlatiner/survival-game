import { ResourceIcon } from "@/components/art";
import { RESOURCES } from "@/lib/questions/types";
import type { Stock } from "@/lib/types";
import { RESOURCE_LABEL } from "./labels";

export function StockBar({ stock }: { stock: Stock }) {
  return (
    <ul aria-label="Your resources" className="grid grid-cols-4 gap-2">
      {RESOURCES.map((r) => (
        <li key={r} className="rounded-2xl border-4 border-white bg-sand-50 p-2 text-center text-night-900 shadow-[0_4px_0_rgb(11_26_51/0.18)]">
          <ResourceIcon resource={r} size={30} className="mx-auto" />
          <div className="text-xs font-bold">{RESOURCE_LABEL[r]}</div>
          <div className="text-2xl font-black" aria-label={`${RESOURCE_LABEL[r]} ${stock[r]}`}>{stock[r]}</div>
        </li>
      ))}
    </ul>
  );
}
