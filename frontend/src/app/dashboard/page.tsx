"use client";

import { FilePlus2, RefreshCw, ShieldCheck, Timer, WalletCards } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button, IconButton, Panel } from "@/components/ui";
import { covenantsApi, genlayerApi } from "@/lib/api/pacta";
import { useRequireSession } from "@/hooks/use-session";

export default function DashboardPage() {
  const session = useRequireSession();
  const covenants = useQuery({ queryKey: ["covenants"], queryFn: covenantsApi.list, enabled: Boolean(session.data) });
  const genlayer = useQuery({ queryKey: ["genlayer-config"], queryFn: genlayerApi.config, enabled: Boolean(session.data) });
  const covenantList = covenants.data ?? [];
  const activeCount = covenantList.filter((item) => ["BONDED", "ACTIVE", "EVIDENCE_SUBMITTED"].includes(item.status)).length;
  const pendingCount = covenantList.filter((item) => item.status === "EVALUATION_PENDING").length;
  const fulfilledCount = covenantList.filter((item) => item.status === "FULFILLED").length;

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-emerald-800">Covenant registry</p>
            <h1 className="mt-2 text-3xl font-bold text-stone-950 md:text-4xl">Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <IconButton title="Refresh covenants" onClick={() => covenants.refetch()} disabled={covenants.isFetching}>
              <RefreshCw aria-hidden className="size-4" />
            </IconButton>
            <Link href="/covenants/new">
              <Button>
                <FilePlus2 aria-hidden className="size-4" />
                New covenant
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Metric icon={<ShieldCheck className="size-5" />} label="Total" value={covenantList.length} tone="stone" />
          <Metric icon={<WalletCards className="size-5" />} label="Active" value={activeCount} tone="emerald" />
          <Metric icon={<Timer className="size-5" />} label="Pending review" value={pendingCount} tone="indigo" />
          <Metric icon={<ShieldCheck className="size-5" />} label="Fulfilled" value={fulfilledCount} tone="amber" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Panel>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-stone-950">Covenants</h2>
              {covenants.isFetching ? <span className="text-sm font-medium text-stone-500">Refreshing</span> : null}
            </div>
            <div className="mt-4 grid gap-3">
              {covenants.isLoading ? <p className="text-sm text-stone-600">Loading covenants.</p> : null}
              {!covenants.isLoading && covenantList.length === 0 ? (
                <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-6">
                  <p className="font-semibold text-stone-900">No covenants yet.</p>
                  <Link href="/covenants/new" className="mt-4 inline-flex text-sm font-semibold text-emerald-800">
                    Create the first covenant
                  </Link>
                </div>
              ) : null}
              {covenantList.map((covenant) => (
                <a
                  key={covenant.id}
                  href={`/covenants/${covenant.id}`}
                  className="rounded-lg border border-stone-200 bg-stone-50 p-4 transition hover:border-emerald-300 hover:bg-white"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-stone-950">{covenant.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-stone-600">{covenant.promise}</p>
                    </div>
                    <StatusBadge status={covenant.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-stone-500">
                    <span>GEN {String(covenant.requiredBondAmount)}</span>
                    <span>Due {new Date(covenant.deadlineAt).toLocaleDateString()}</span>
                    <span>{covenant.privacy}</span>
                  </div>
                </a>
              ))}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-xl font-bold text-stone-950">Contract</h2>
            {genlayer.data ? (
              <div className="mt-4 grid gap-3 text-sm">
                <div>
                  <p className="font-semibold text-stone-500">Network</p>
                  <p className="mt-1 text-stone-950">{genlayer.data.network}</p>
                </div>
                <div>
                  <p className="font-semibold text-stone-500">Address</p>
                  <p className="mt-1 break-all font-mono text-xs text-stone-950">{genlayer.data.contractAddress}</p>
                </div>
                <div>
                  <p className="font-semibold text-stone-500">RPC</p>
                  <p className="mt-1 break-all font-mono text-xs text-stone-950">{genlayer.data.rpcUrl}</p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-stone-600">Loading contract configuration.</p>
            )}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

function Metric({
  icon,
  label,
  value,
  tone
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "stone" | "emerald" | "indigo" | "amber";
}) {
  const toneClass = {
    stone: "bg-stone-950 text-white",
    emerald: "bg-emerald-700 text-white",
    indigo: "bg-indigo-700 text-white",
    amber: "bg-amber-500 text-stone-950"
  }[tone];
  return (
    <Panel className="flex items-center gap-4">
      <span className={`inline-flex size-11 items-center justify-center rounded-md ${toneClass}`}>{icon}</span>
      <div>
        <p className="text-sm font-semibold text-stone-500">{label}</p>
        <p className="text-2xl font-bold text-stone-950">{value}</p>
      </div>
    </Panel>
  );
}
