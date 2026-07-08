import { ArrowRight, CheckCircle2, Code2, DatabaseZap, ExternalLink, FileText, Scale, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { PACTA_GENLAYER_CONTRACT_ADDRESS, PACTA_GENLAYER_EXPLORER_URL, PACTA_GENLAYER_NETWORK } from "@/lib/genlayer/config";

const demoSteps = [
  "Sign in with an EVM wallet.",
  "Create the mentorship covenant and publish it to StudioNet.",
  "Bond GEN as the covenant creator.",
  "Submit public evidence URLs and validator notes.",
  "Request evaluation so GenLayer validators fetch, assess, and settle the covenant."
];

const proofPoints = [
  "The Intelligent Contract fetches public evidence URLs inside a nondeterministic block.",
  "The LLM produces structured status, confidence, reasoning, bond distribution, and reputation impact.",
  "Validators independently rerun the fetch-and-assess workflow before accepting the leader result.",
  "Only the canonical consensus outcome mutates bond claim amounts and reputation state."
];

const evidenceExamples = [
  "Public GitHub repository or pull request showing mentorship work.",
  "Public session recap, calendar page, or published meeting notes.",
  "Public student testimonial or signed attestation page.",
  "Project artifact showing student progress after the sessions."
];

export default function SubmissionPage() {
  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 text-stone-950">
            <span className="inline-flex size-10 items-center justify-center rounded-md bg-stone-950 text-white">
              <ShieldCheck aria-hidden className="size-5" />
            </span>
            <span className="text-lg font-bold">Pacta</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Open app
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <div className="grid gap-6">
          <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold uppercase text-emerald-800">GenLayer submission</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-bold leading-tight text-stone-950 md:text-6xl">
              Bonded mentorship covenant verification.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-650">
              Pacta demonstrates how GenLayer can adjudicate ambiguous real-world evidence: a creator bonds GEN to a mentorship promise, submits public proof, and receives a validator consensus outcome for fulfillment, bond settlement, and reputation.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Test the app
                <ArrowRight aria-hidden className="size-4" />
              </Link>
              <a
                href="https://github.com/Hilda26/Pacta"
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-900 transition hover:bg-stone-50"
              >
                <Code2 aria-hidden className="size-4" />
                GitHub
              </a>
            </div>
          </div>

          <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Scale aria-hidden className="size-5 text-emerald-800" />
              <h2 className="text-2xl font-bold text-stone-950">Why this is GenLayer-native</h2>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {proofPoints.map((point) => (
                <div key={point} className="flex items-start gap-3 rounded-md border border-stone-200 bg-stone-50 p-4">
                  <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-emerald-700" />
                  <p className="text-sm leading-6 text-stone-750">{point}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <FileText aria-hidden className="size-5 text-emerald-800" />
              <h2 className="text-2xl font-bold text-stone-950">Demo covenant</h2>
            </div>
            <div className="mt-5 grid gap-4">
              <ReadBlock label="Promise" value="I will mentor five students over the next 90 days by holding weekly online mentoring sessions and reviewing their learning progress." />
              <ReadBlock label="Success criteria" value="At least five students receive mentoring, each student attends at least three sessions, and each student submits feedback confirming the mentoring was useful." />
              <ReadBlock label="Evidence package" value="Submit public proof URLs, student attestations, project artifacts, and validator notes. GenLayer fetches public URLs during evaluation and records source checks in contract state." />
            </div>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-stone-950">Manual review path</h2>
            <div className="mt-5 grid gap-3">
              {demoSteps.map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-md border border-stone-200 bg-stone-50 p-4">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-stone-950 text-sm font-bold text-white">{index + 1}</span>
                  <p className="text-sm font-semibold leading-6 text-stone-850">{step}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="grid h-fit gap-6">
          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <DatabaseZap aria-hidden className="size-5 text-indigo-700" />
              <h2 className="text-xl font-bold text-stone-950">Live contract</h2>
            </div>
            <dl className="mt-4 grid gap-4 text-sm">
              <div>
                <dt className="font-bold uppercase text-stone-500">Network</dt>
                <dd className="mt-1 font-semibold text-stone-950">{PACTA_GENLAYER_NETWORK}</dd>
              </div>
              <div>
                <dt className="font-bold uppercase text-stone-500">Address</dt>
                <dd className="mt-1 break-all font-mono text-stone-950">{PACTA_GENLAYER_CONTRACT_ADDRESS}</dd>
              </div>
            </dl>
            <a
              href={PACTA_GENLAYER_EXPLORER_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-900 transition hover:bg-stone-50"
            >
              GenLayer portal
              <ExternalLink aria-hidden className="size-4" />
            </a>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-stone-950">Best evidence URLs</h2>
            <div className="mt-4 grid gap-3">
              {evidenceExamples.map((example) => (
                <div key={example} className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm leading-6 text-stone-750">
                  {example}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-stone-950">Submission line</h2>
            <p className="mt-3 text-sm leading-6 text-stone-700">
              Pacta is a bonded mentorship covenant verifier powered by GenLayer web evidence fetching, LLM assessment, and validator consensus.
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}

function ReadBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
      <h3 className="text-sm font-bold uppercase text-stone-500">{label}</h3>
      <p className="mt-2 leading-7 text-stone-800">{value}</p>
    </div>
  );
}
