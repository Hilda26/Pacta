import { clsx } from "clsx";
import type { CovenantStatus } from "@/lib/api/types";

const statusClass: Record<CovenantStatus, string> = {
  DRAFT: "border-stone-300 bg-stone-100 text-stone-700",
  BONDED: "border-amber-300 bg-amber-100 text-amber-900",
  ACTIVE: "border-emerald-300 bg-emerald-100 text-emerald-900",
  EVIDENCE_SUBMITTED: "border-indigo-300 bg-indigo-100 text-indigo-900",
  EVALUATION_PENDING: "border-violet-300 bg-violet-100 text-violet-900",
  FULFILLED: "border-emerald-300 bg-emerald-100 text-emerald-900",
  PARTIALLY_FULFILLED: "border-amber-300 bg-amber-100 text-amber-900",
  BROKEN: "border-rose-300 bg-rose-100 text-rose-900",
  CANCELLED: "border-stone-300 bg-stone-100 text-stone-700"
};

export function StatusBadge({ status }: { status: CovenantStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex min-h-7 items-center rounded-md border px-2.5 text-xs font-semibold",
        statusClass[status]
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
