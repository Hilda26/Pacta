"use client";

import { Save } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, Panel, SelectField, TextAreaField, TextField } from "@/components/ui";
import { covenantsApi } from "@/lib/api/pacta";
import { useRequireSession } from "@/hooks/use-session";

export default function NewCovenantPage() {
  useRequireSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const defaultDeadline = useMemo(() => {
    const date = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90);
    return date.toISOString().slice(0, 10);
  }, []);
  const [error, setError] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: covenantsApi.create,
    onSuccess: async (covenant) => {
      await queryClient.invalidateQueries({ queryKey: ["covenants"] });
      router.push(`/covenants/${covenant.id}`);
    },
    onError: (caught) => setError(caught instanceof Error ? caught.message : "Could not create covenant.")
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload: Parameters<typeof covenantsApi.create>[0] = {
      title: String(form.get("title") ?? ""),
      promise: String(form.get("promise") ?? ""),
      successCriteria: String(form.get("successCriteria") ?? ""),
      evidenceRequirements: String(form.get("evidenceRequirements") ?? ""),
      deadlineAt: new Date(String(form.get("deadlineAt"))).toISOString(),
      requiredBondAmount: String(form.get("requiredBondAmount") ?? ""),
      privacy: String(form.get("privacy") ?? "PRIVATE") as "PRIVATE" | "UNLISTED" | "PUBLIC",
      metadata: {
        disputeWindowSeconds: 604800
      }
    };
    create.mutate(payload);
  }

  return (
    <AppShell>
      <div className="max-w-4xl">
        <p className="text-sm font-semibold uppercase text-emerald-800">New covenant</p>
        <h1 className="mt-2 text-3xl font-bold text-stone-950 md:text-4xl">Create a bonded commitment</h1>
        <Panel className="mt-6">
          <form className="grid gap-5" onSubmit={onSubmit}>
            <TextField name="title" label="Title" minLength={3} maxLength={120} required placeholder="Mentor five students in 90 days" />
            <TextAreaField name="promise" label="Promise" minLength={10} maxLength={5000} required />
            <TextAreaField name="successCriteria" label="Success criteria" minLength={10} maxLength={5000} required />
            <TextAreaField name="evidenceRequirements" label="Evidence requirements" minLength={10} maxLength={5000} required />
            <div className="grid gap-5 md:grid-cols-3">
              <TextField name="deadlineAt" label="Deadline" type="date" defaultValue={defaultDeadline} required />
              <TextField name="requiredBondAmount" label="Required GEN bond" defaultValue="10.0" pattern="^\d+(\.\d+)?$" required />
              <SelectField name="privacy" label="Privacy" defaultValue="PRIVATE">
                <option value="PRIVATE">Private</option>
                <option value="UNLISTED">Unlisted</option>
                <option value="PUBLIC">Public</option>
              </SelectField>
            </div>
            {error ? <p className="rounded-md bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p> : null}
            <div>
              <Button disabled={create.isPending}>
                <Save aria-hidden className="size-4" />
                {create.isPending ? "Creating" : "Create covenant"}
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
