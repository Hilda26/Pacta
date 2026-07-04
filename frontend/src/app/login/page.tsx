"use client";

import { WalletCards } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authApi } from "@/lib/api/pacta";
import { hasInjectedWallet, requestWalletAddress, signWalletMessage } from "@/lib/auth/wallet";
import { Button, Panel } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const login = useMutation({
    mutationFn: async () => {
      setError(null);
      const walletAddress = await requestWalletAddress();
      const nonce = await authApi.nonce(walletAddress);
      const signature = await signWalletMessage(walletAddress, nonce.message);
      return authApi.verify({ walletAddress, nonce: nonce.nonce, signature });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      router.replace("/dashboard");
    },
    onError: (caught) => setError(caught instanceof Error ? caught.message : "Wallet sign-in failed.")
  });

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Panel className="w-full max-w-md">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-md bg-stone-950 text-white">
            <WalletCards aria-hidden className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-stone-950">Sign in to Pacta</h1>
            <p className="mt-1 text-sm text-stone-600">Use your EVM wallet to create a secure session.</p>
          </div>
        </div>
        <Button className="mt-8 w-full" onClick={() => login.mutate()} disabled={login.isPending || !hasInjectedWallet()}>
          <WalletCards aria-hidden className="size-4" />
          {login.isPending ? "Waiting for signature" : "Connect wallet"}
        </Button>
        {!hasInjectedWallet() ? (
          <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm font-medium text-amber-950">
            Install or unlock an EVM wallet before continuing.
          </p>
        ) : null}
        {error ? <p className="mt-4 rounded-md bg-rose-50 p-3 text-sm font-medium text-rose-800">{error}</p> : null}
      </Panel>
    </main>
  );
}
