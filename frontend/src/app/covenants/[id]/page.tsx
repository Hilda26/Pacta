"use client";

import { Clipboard, ExternalLink, RefreshCw, Scale, Send, WalletCards } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button, IconButton, Panel, SelectField, TextAreaField, TextField } from "@/components/ui";
import { bondsApi, covenantsApi, evidenceApi, genlayerApi } from "@/lib/api/pacta";
import type { EvidenceType } from "@/lib/api/types";
import { buildBondCovenantAction, buildCreateCovenantAction, buildEvaluationAction } from "@/lib/genlayer/actions";
import { useRequireSession } from "@/hooks/use-session";

const evidenceTypes: EvidenceType[] = [
  "DOCUMENT",
  "GITHUB_COMMIT",
  "PAYMENT_RECEIPT",
  "PHOTO",
  "VIDEO",
  "API_RESPONSE",
  "ATTESTATION",
  "IOT_DEVICE_DATA",
  "SOCIAL_PROOF",
  "URL",
  "STRUCTURED_METADATA"
];

export default function CovenantDetailPage() {
  useRequireSession();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();
  const covenant = useQuery({ queryKey: ["covenant", id], queryFn: () => covenantsApi.get(id), enabled: Boolean(id) });
  const [copied, setCopied] = useState<string | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [bondError, setBondError] = useState<string | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const contractRead = useQuery({
    queryKey: ["contract-covenant", covenant.data?.contractCovenantId],
    queryFn: () => genlayerApi.covenant(covenant.data?.contractCovenantId ?? ""),
    enabled: Boolean(covenant.data?.contractCovenantId)
  });
  const createAction = useMemo(() => (covenant.data ? buildCreateCovenantAction(covenant.data) : null), [covenant.data]);
  const bondAction = useMemo(
    () => (covenant.data ? buildBondCovenantAction(covenant.data.contractCovenantId ?? covenant.data.id, "CREATOR", "0") : null),
    [covenant.data]
  );
  const evaluationAction = useMemo(
    () => (covenant.data ? buildEvaluationAction(covenant.data.contractCovenantId ?? covenant.data.id) : null),
    [covenant.data]
  );
  const evidence = useMutation({
    mutationFn: (input: Parameters<typeof evidenceApi.create>[1]) => evidenceApi.create(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["covenant", id] });
      setEvidenceError(null);
    },
    onError: (caught) => setEvidenceError(caught instanceof Error ? caught.message : "Could not submit evidence.")
  });
  const bond = useMutation({
    mutationFn: (input: Parameters<typeof bondsApi.create>[1]) => bondsApi.create(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["covenant", id] });
      await queryClient.invalidateQueries({ queryKey: ["covenants"] });
      setBondError(null);
    },
    onError: (caught) => setBondError(caught instanceof Error ? caught.message : "Could not register bond.")
  });
  const evaluation = useMutation({
    mutationFn: (input: Parameters<typeof covenantsApi.submitEvaluation>[1]) => covenantsApi.submitEvaluation(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["covenant", id] });
      setEvaluationError(null);
    },
    onError: (caught) => setEvaluationError(caught instanceof Error ? caught.message : "Could not request evaluation.")
  });

  async function copy(label: string, value: unknown) {
    await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1800);
  }

  function submitEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    let structuredMetadata: Record<string, unknown> | undefined;
    try {
      const raw = String(form.get("structuredMetadata") ?? "").trim();
      structuredMetadata = raw ? (JSON.parse(raw) as Record<string, unknown>) : undefined;
    } catch {
      setEvidenceError("Evidence metadata must be valid JSON.");
      return;
    }
            const payload: Parameters<typeof evidenceApi.create>[1] = {
              type: String(form.get("type")) as EvidenceType,
              contentHash: String(form.get("contentHash"))
            };
            const sourceUrl = String(form.get("sourceUrl") || "");
            const storageUri = String(form.get("storageUri") || "");
            if (sourceUrl) {
              payload.sourceUrl = sourceUrl;
            }
            if (storageUri) {
              payload.storageUri = storageUri;
            }
            if (structuredMetadata) {
              payload.structuredMetadata = structuredMetadata;
            }
            evidence.mutate(payload);
          }

  function submitBond(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    bond.mutate({
      amount: String(form.get("amount")),
      txHash: String(form.get("txHash")),
      role: String(form.get("role")) as "CREATOR" | "CO_STAKER" | "COUNTERPARTY",
      contractCovenantId: String(form.get("contractCovenantId") || undefined)
    });
  }

  function submitEvaluation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    evaluation.mutate({
      reason: String(form.get("reason") || undefined),
      contractCovenantId: String(form.get("contractCovenantId") || undefined)
    });
  }

  return (
    <AppShell>
      {covenant.isLoading ? <p className="text-sm font-medium text-stone-600">Loading covenant.</p> : null}
      {covenant.data ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="grid gap-6">
            <Panel>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase text-emerald-800">Covenant</p>
                  <h1 className="mt-2 text-3xl font-bold text-stone-950">{covenant.data.title}</h1>
                </div>
                <StatusBadge status={covenant.data.status} />
              </div>
              <div className="mt-6 grid gap-5">
                <ReadBlock label="Promise" value={covenant.data.promise} />
                <ReadBlock label="Success criteria" value={covenant.data.successCriteria} />
                <ReadBlock label="Evidence requirements" value={covenant.data.evidenceRequirements} />
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-stone-950">Evidence</h2>
                <span className="text-sm font-semibold text-stone-500">{covenant.data.evidenceItems.length} submitted</span>
              </div>
              <form className="mt-5 grid gap-4" onSubmit={submitEvidence}>
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField name="type" label="Type">
                    {evidenceTypes.map((type) => (
                      <option key={type} value={type}>
                        {type.replaceAll("_", " ")}
                      </option>
                    ))}
                  </SelectField>
                  <TextField name="contentHash" label="Content hash" placeholder="sha256:..." required minLength={16} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField name="sourceUrl" label="Source URL" placeholder="https://..." />
                  <TextField name="storageUri" label="Storage URI" placeholder="r2://bucket/key" />
                </div>
                <TextAreaField name="structuredMetadata" label="Structured metadata JSON" placeholder='{"witness":"0x..."}' />
                {evidenceError ? <p className="rounded-md bg-rose-50 p-3 text-sm font-semibold text-rose-800">{evidenceError}</p> : null}
                <div>
                  <Button disabled={evidence.isPending}>
                    <Send aria-hidden className="size-4" />
                    Submit evidence
                  </Button>
                </div>
              </form>
            </Panel>

            <Panel>
              <h2 className="text-xl font-bold text-stone-950">Bond registration</h2>
              <form className="mt-5 grid gap-4" onSubmit={submitBond}>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField name="amount" label="GEN amount" defaultValue={String(covenant.data.requiredBondAmount)} required />
                  <SelectField name="role" label="Role" defaultValue="CREATOR">
                    <option value="CREATOR">Creator</option>
                    <option value="CO_STAKER">Co-staker</option>
                    <option value="COUNTERPARTY">Counterparty</option>
                  </SelectField>
                </div>
                <TextField name="txHash" label="StudioNet transaction hash" placeholder="0x..." required />
                <TextField name="contractCovenantId" label="Contract covenant id" defaultValue={covenant.data.contractCovenantId ?? covenant.data.id} />
                {bondError ? <p className="rounded-md bg-rose-50 p-3 text-sm font-semibold text-rose-800">{bondError}</p> : null}
                <div>
                  <Button disabled={bond.isPending}>
                    <WalletCards aria-hidden className="size-4" />
                    Register bond
                  </Button>
                </div>
              </form>
            </Panel>

            <Panel>
              <h2 className="text-xl font-bold text-stone-950">Evaluation</h2>
              <form className="mt-5 grid gap-4" onSubmit={submitEvaluation}>
                <TextAreaField name="reason" label="Reason" placeholder="Evidence package is complete and ready for validator review." />
                <TextField name="contractCovenantId" label="Contract covenant id" defaultValue={covenant.data.contractCovenantId ?? covenant.data.id} />
                {evaluationError ? <p className="rounded-md bg-rose-50 p-3 text-sm font-semibold text-rose-800">{evaluationError}</p> : null}
                <div>
                  <Button disabled={evaluation.isPending}>
                    <Scale aria-hidden className="size-4" />
                    Request evaluation
                  </Button>
                </div>
              </form>
            </Panel>
          </div>

          <aside className="grid h-fit gap-6">
            <Panel>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-stone-950">Contract actions</h2>
                {copied ? <span className="text-xs font-semibold text-emerald-800">{copied} copied</span> : null}
              </div>
              <div className="mt-4 grid gap-3">
                <ActionRow label="Create" value={createAction} onCopy={() => copy("Create", createAction)} />
                <ActionRow label="Bond" value={bondAction} onCopy={() => copy("Bond", bondAction)} />
                <ActionRow label="Evaluate" value={evaluationAction} onCopy={() => copy("Evaluate", evaluationAction)} />
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-stone-950">StudioNet state</h2>
                <IconButton title="Refresh contract state" onClick={() => contractRead.refetch()} disabled={!covenant.data.contractCovenantId}>
                  <RefreshCw aria-hidden className="size-4" />
                </IconButton>
              </div>
              {covenant.data.contractCovenantId ? (
                <pre className="mt-4 max-h-80 overflow-auto rounded-md bg-stone-950 p-4 text-xs leading-6 text-stone-50">
                  {JSON.stringify(contractRead.data ?? {}, null, 2)}
                </pre>
              ) : (
                <p className="mt-4 text-sm text-stone-600">No contract covenant id is linked yet.</p>
              )}
            </Panel>
          </aside>
        </div>
      ) : null}
    </AppShell>
  );
}

function ReadBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <h2 className="text-sm font-bold uppercase text-stone-500">{label}</h2>
      <p className="mt-2 whitespace-pre-wrap leading-7 text-stone-850">{value}</p>
    </div>
  );
}

function ActionRow({ label, value, onCopy }: { label: string; value: unknown; onCopy: () => void }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-stone-900">{label}</span>
        <button
          className="inline-flex size-9 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-800 hover:bg-stone-100"
          type="button"
          onClick={onCopy}
          title={`Copy ${label} action`}
        >
          <Clipboard aria-hidden className="size-4" />
        </button>
      </div>
      <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-white p-3 text-xs leading-5 text-stone-700">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
