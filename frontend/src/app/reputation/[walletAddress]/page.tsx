"use client";

import { ArrowLeft, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Panel } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { reputationApi } from "@/lib/api/pacta";

export default function ReputationPage() {
  const params = useParams<{ walletAddress: string }>();
  const profile = useQuery({
    queryKey: ["reputation", params.walletAddress],
    queryFn: () => reputationApi.get(params.walletAddress),
    enabled: Boolean(params.walletAddress),
    retry: false
  });

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-6">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <ArrowLeft aria-hidden className="size-4" />
          Dashboard
        </Link>
        <Panel>
          <p className="text-sm font-semibold uppercase text-emerald-800">Public reputation</p>
          <h1 className="mt-2 break-all text-3xl font-bold text-stone-950">{params.walletAddress}</h1>
          {profile.data ? (
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <Metric label="Score" value={profile.data.score} icon={<ShieldCheck className="size-5" />} />
              <Metric label="Fulfilled" value={profile.data.stats.fulfilled} icon={<TrendingUp className="size-5" />} />
              <Metric label="Partial" value={profile.data.stats.partiallyFulfilled} icon={<ShieldCheck className="size-5" />} />
              <Metric label="Broken" value={profile.data.stats.broken} icon={<TrendingDown className="size-5" />} />
            </div>
          ) : null}
          {profile.isError ? (
            <p className="mt-6 rounded-md bg-amber-50 p-4 text-sm font-semibold text-amber-950">No reputation profile was found.</p>
          ) : null}
        </Panel>
        {profile.data ? (
          <Panel>
            <h2 className="text-xl font-bold text-stone-950">Public covenants</h2>
            <div className="mt-4 grid gap-3">
              {profile.data.publicCovenants.length === 0 ? <p className="text-sm text-stone-600">No public covenants.</p> : null}
              {profile.data.publicCovenants.map((covenant) => (
                <div key={covenant.id} className="rounded-md border border-stone-200 bg-stone-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-bold text-stone-950">{covenant.title}</h3>
                    <StatusBadge status={covenant.status} />
                  </div>
                  <p className="mt-2 text-sm text-stone-600">Deadline {new Date(covenant.deadlineAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}
      </div>
    </main>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
      <span className="inline-flex size-10 items-center justify-center rounded-md bg-stone-950 text-white">{icon}</span>
      <p className="mt-4 text-sm font-semibold text-stone-500">{label}</p>
      <p className="text-2xl font-bold text-stone-950">{value}</p>
    </div>
  );
}
