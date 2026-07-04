import { ArrowRight, DatabaseZap, Scale, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { PACTA_GENLAYER_CONTRACT_ADDRESS } from "@/lib/genlayer/config";

const useCases = ["Freelancer delivery", "Mentorship commitments", "DAO contributor milestones", "Open-source pledges"];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto grid min-h-[92vh] w-full max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
            <ShieldCheck aria-hidden className="size-4" />
            Pacta
          </div>
          <h1 className="mt-6 max-w-3xl text-5xl font-bold leading-tight text-stone-950 md:text-7xl">
            Bond-backed covenants with AI-native adjudication.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-650">
            Create commitments, bond them with GEN, collect evidence, and sync final outcomes from the deployed GenLayer Intelligent Contract.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Open dashboard
              <ArrowRight aria-hidden className="size-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-900 transition hover:bg-stone-50"
            >
              Connect wallet
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <p className="text-sm font-semibold text-stone-500">StudioNet registry</p>
              <p className="mt-1 break-all font-mono text-sm text-stone-900">{PACTA_GENLAYER_CONTRACT_ADDRESS}</p>
            </div>
            <DatabaseZap aria-hidden className="size-8 text-indigo-700" />
          </div>
          <div className="mt-5 grid gap-3">
            {useCases.map((useCase, index) => (
              <div key={useCase} className="flex items-center gap-3 rounded-md border border-stone-200 bg-stone-50 p-3">
                <span className="inline-flex size-9 items-center justify-center rounded-md bg-stone-950 text-sm font-bold text-white">
                  {index + 1}
                </span>
                <span className="font-semibold text-stone-850">{useCase}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-md bg-amber-50 p-4 text-amber-950">
            <Scale aria-hidden className="mt-0.5 size-5" />
            <p className="text-sm leading-6">
              Contract outcomes are designed to capture validator status, confidence, reasoning, bond distribution, and reputation impact.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
