"use client";

import { ExternalLink, RefreshCw, Scale, Send, WalletCards } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button, IconButton, Panel, SelectField, TextAreaField, TextField } from "@/components/ui";
import { bondsApi, covenantsApi, evidenceApi, genlayerApi } from "@/lib/api/pacta";
import type { EvidenceType } from "@/lib/api/types";
import {
  buildBondCovenantAction,
  buildCreateCovenantAction,
  buildEvaluationAction,
  buildEvidenceAction,
  genToWei,
  metadataHash,
  type ContractActionPayload
} from "@/lib/genlayer/actions";
import { writePactaContract } from "@/lib/genlayer/client";
import { requestWalletAddress } from "@/lib/auth/wallet";
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
  const session = useRequireSession();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();
  const covenant = useQuery({ queryKey: ["covenant", id], queryFn: () => covenantsApi.get(id), enabled: Boolean(id) });
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [bondError, setBondError] = useState<string | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [contractError, setContractError] = useState<string | null>(null);
  const [activeTransaction, setActiveTransaction] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<Record<string, string>>({});
  const [transactionHashes, setTransactionHashes] = useState<Record<string, string>>({});
  const contractRead = useQuery({
    queryKey: ["contract-covenant", covenant.data?.contractCovenantId],
    queryFn: () => genlayerApi.covenant(covenant.data?.contractCovenantId ?? ""),
    enabled: Boolean(covenant.data?.contractCovenantId)
  });
  const createAction = useMemo(() => (covenant.data ? buildCreateCovenantAction(covenant.data) : null), [covenant.data]);
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


  async function runContractTransaction(label: string, action: ContractActionPayload) {
    const signedInWallet = session.data?.user.walletAddress;
    if (!signedInWallet) {
      throw new Error("Sign in before sending a StudioNet transaction.");
    }

    const connectedWallet = await requestWalletAddress();
    if (connectedWallet.toLowerCase() !== signedInWallet.toLowerCase()) {
      throw new Error("Connected wallet does not match the signed-in Pacta wallet.");
    }

    setContractError(null);
    setActiveTransaction(label);
    setTransactionStatus((current) => ({ ...current, [label]: "Preparing transaction" }));

    try {
      const result = await writePactaContract({
        walletAddress: signedInWallet,
        action,
        waitFor: "ACCEPTED",
        onStatus: (status) => setTransactionStatus((current) => ({ ...current, [label]: status }))
      });
      setTransactionHashes((current) => ({ ...current, [label]: result.txHash }));
      return result.txHash;
    } catch (caught) {
      setTransactionStatus((current) => ({ ...current, [label]: "Failed" }));
      throw caught;
    } finally {
      setActiveTransaction(null);
    }
  }

  async function createOnChain() {
    if (!covenant.data || !createAction) {
      return;
    }

    try {
      const txHash = await runContractTransaction("create", createAction);
      await covenantsApi.linkContract(covenant.data.id, {
        contractCovenantId: covenant.data.id,
        txHash,
        action: "create_covenant"
      });
      await queryClient.invalidateQueries({ queryKey: ["covenant", id] });
      await queryClient.invalidateQueries({ queryKey: ["covenants"] });
    } catch (caught) {
      setContractError(formatContractError(caught, "Could not create covenant on StudioNet."));
    }
  }

  async function submitEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!covenant.data?.contractCovenantId) {
      setEvidenceError("Create the covenant on StudioNet before submitting on-chain evidence.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const notes = String(form.get("notes") ?? "").trim();
    const type = String(form.get("type")) as EvidenceType;
    const contentHash = String(form.get("contentHash"));
    const sourceUrl = String(form.get("sourceUrl") || "");
    const storageUri = String(form.get("storageUri") || "");
    const uri = sourceUrl || storageUri || `pacta:evidence:${contentHash}`;
    const payload: Parameters<typeof evidenceApi.create>[1] = {
      type,
      contentHash
    };
    if (sourceUrl) {
      payload.sourceUrl = sourceUrl;
    }
    if (storageUri) {
      payload.storageUri = storageUri;
    }

    try {
      const txHash = await runContractTransaction(
        "evidence",
        buildEvidenceAction({
          covenantId: covenant.data.contractCovenantId,
          type,
          uri,
          contentHash,
          metadataHash: await metadataHash({ notes, type, uri, contentHash })
        })
      );
      payload.structuredMetadata = {
        notes,
        onChain: {
          txHash,
          submittedAt: new Date().toISOString()
        }
      };
      await evidence.mutateAsync(payload);
    } catch (caught) {
      setEvidenceError(formatContractError(caught, "Could not submit evidence on StudioNet."));
    }
  }

  async function submitBond(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!covenant.data?.contractCovenantId) {
      setBondError("Create the covenant on StudioNet before bonding GEN.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const amount = String(form.get("amount"));
    const role = String(form.get("role")) as "CREATOR" | "CO_STAKER" | "COUNTERPARTY";
    const contractCovenantId = covenant.data.contractCovenantId;

    try {
      const txHash = await runContractTransaction(
        "bond",
        buildBondCovenantAction(contractCovenantId, role, genToWei(amount))
      );
      await bond.mutateAsync({
        amount,
        txHash,
        role,
        contractCovenantId
      });
    } catch (caught) {
      setBondError(formatContractError(caught, "Could not bond GEN on StudioNet."));
    }
  }

  async function submitEvaluation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!covenant.data?.contractCovenantId) {
      setEvaluationError("Create the covenant on StudioNet before requesting evaluation.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const contractCovenantId = covenant.data.contractCovenantId;
    try {
      const txHash = await runContractTransaction("evaluation", buildEvaluationAction(contractCovenantId));
      const reason = String(form.get("reason") ?? "").trim();
      const payload: Parameters<typeof covenantsApi.submitEvaluation>[1] = {
        contractCovenantId,
        contractTxHash: txHash
      };
      if (reason) {
        payload.reason = reason;
      }
      await evaluation.mutateAsync(payload);
    } catch (caught) {
      setEvaluationError(formatContractError(caught, "Could not request evaluation on StudioNet."));
    }
  }

  return (
    <AppShell>
      {covenant.isLoading ? <p className="text-sm font-medium text-stone-600">Loading covenant.</p> : null}
      {covenant.data ? (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="grid min-w-0 gap-6">
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
                <TextAreaField name="notes" label="Notes for validators (optional)" placeholder="Summarize what this evidence proves." />
                {evidenceError ? <p className="rounded-md bg-rose-50 p-3 text-sm font-semibold text-rose-800">{evidenceError}</p> : null}
                <div>
                  <Button disabled={evidence.isPending || Boolean(activeTransaction)}>
                    <Send aria-hidden className="size-4" />
                    {activeTransaction === "evidence" ? "Sending to StudioNet" : "Submit evidence"}
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
                {bondError ? <p className="rounded-md bg-rose-50 p-3 text-sm font-semibold text-rose-800">{bondError}</p> : null}
                <div>
                  <Button disabled={bond.isPending || Boolean(activeTransaction)}>
                    <WalletCards aria-hidden className="size-4" />
                    {activeTransaction === "bond" ? "Bonding on StudioNet" : "Bond GEN"}
                  </Button>
                </div>
              </form>
            </Panel>

            <Panel>
              <h2 className="text-xl font-bold text-stone-950">Evaluation</h2>
              <form className="mt-5 grid gap-4" onSubmit={submitEvaluation}>
                <TextAreaField name="reason" label="Reason" placeholder="Evidence package is complete and ready for validator review." />
                {evaluationError ? <p className="rounded-md bg-rose-50 p-3 text-sm font-semibold text-rose-800">{evaluationError}</p> : null}
                <div>
                  <Button disabled={evaluation.isPending || Boolean(activeTransaction)}>
                    <Scale aria-hidden className="size-4" />
                    {activeTransaction === "evaluation" ? "Requesting on StudioNet" : "Request evaluation"}
                  </Button>
                </div>
              </form>
            </Panel>
          </div>

          <aside className="grid h-fit min-w-0 gap-6">
            <Panel>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-stone-950">Contract actions</h2>
              </div>
              {contractError ? <p className="mt-4 rounded-md bg-rose-50 p-3 text-sm font-semibold text-rose-800">{contractError}</p> : null}
              <div className="mt-4 grid gap-3">
                <ActionRow
                  label="Create"
                  actionLabel={covenant.data.contractCovenantId ? "Created" : activeTransaction === "create" ? "Creating" : "Create on StudioNet"}
                  onRun={createOnChain}
                  disabled={Boolean(covenant.data.contractCovenantId) || Boolean(activeTransaction) || !createAction}
                />
                <ActionRow label="Bond GEN" description="After the covenant is created on StudioNet, use the bond form below to stake GEN." />
                <ActionRow label="Request evaluation" description="After evidence and a bond are saved, request validator review from the evaluation form." />
              </div>
              <TransactionProgress statuses={transactionStatus} hashes={transactionHashes} />
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

function formatContractError(caught: unknown, fallback: string) {
  const message = extractErrorMessage(caught);
  if (!message || message === "[object Object]") {
    return "Wallet provider conflict detected. Disable duplicate wallet extensions, keep MetaMask or one EVM wallet active, refresh the page, then try Create on StudioNet again.";
  }
  if (/ethereum|provider|Cannot redefine property|Cannot set property/i.test(message)) {
    return "Wallet provider conflict detected. Disable duplicate wallet extensions, keep MetaMask or one EVM wallet active, refresh the page, then try Create on StudioNet again.";
  }
  if (/user rejected|rejected request|denied/i.test(message)) {
    return "Wallet approval was rejected. Open your wallet and approve the StudioNet transaction to continue.";
  }
  if (/insufficient|funds|balance/i.test(message)) {
    return "Your wallet may not have enough StudioNet GEN for this transaction.";
  }
  return message || fallback;
}

function extractErrorMessage(caught: unknown): string {
  if (caught instanceof Error) {
    return caught.message;
  }

  if (typeof caught === "string") {
    return caught;
  }

  if (caught && typeof caught === "object") {
    const record = caught as Record<string, unknown>;
    const candidates = [record.message, record.shortMessage, record.details, record.reason, record.cause, record.error];
    for (const candidate of candidates) {
      const message = extractErrorMessage(candidate);
      if (message && message !== "[object Object]") {
        return message;
      }
    }

    try {
      return JSON.stringify(record);
    } catch {
      return "";
    }
  }

  return caught == null ? "" : String(caught);
}

function ActionRow({
  label,
  description,
  onRun,
  actionLabel,
  disabled
}: {
  label: string;
  description?: string;
  onRun?: () => void;
  actionLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-md border border-stone-200 bg-stone-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="font-semibold text-stone-900">{label}</span>
          {description ? <p className="mt-1 text-sm leading-6 text-stone-600">{description}</p> : null}
        </div>
        {onRun ? (
          <Button type="button" onClick={onRun} disabled={disabled}>
            <WalletCards aria-hidden className="size-4" />
            {actionLabel ?? "Send"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function TransactionProgress({ statuses, hashes }: { statuses: Record<string, string>; hashes: Record<string, string> }) {
  const labels = ["create", "bond", "evidence", "evaluation"];
  const visible = labels.filter((label) => statuses[label] || hashes[label]);
  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 grid gap-2">
      {visible.map((label) => (
        <div key={label} className="rounded-md border border-stone-200 bg-white p-3 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold uppercase text-stone-500">{label}</span>
            <span className="font-semibold text-emerald-800">{statuses[label] ?? "Submitted"}</span>
          </div>
          {hashes[label] ? (
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded bg-stone-100 px-2 py-1 text-stone-800">{hashes[label]}</code>
              <a
                className="inline-flex size-8 items-center justify-center rounded-md border border-stone-300 text-stone-800 hover:bg-stone-50"
                href="https://genlayer-explorer.vercel.app"
                target="_blank"
                rel="noreferrer"
                title="Open GenLayer explorer"
              >
                <ExternalLink aria-hidden className="size-4" />
              </a>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
