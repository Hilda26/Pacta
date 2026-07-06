import { getEthereumProvider } from "@/lib/auth/wallet";
import type { ContractActionPayload } from "./actions";
import { assertPactaContractConfig, PACTA_GENLAYER_NETWORK, PACTA_GENLAYER_RPC_URL } from "./config";

type GenLayerClient = {
  readContract: (params: { address: string; functionName: string; args?: unknown[] }) => Promise<unknown>;
  writeContract: (params: {
    account?: unknown;
    address: string;
    functionName: string;
    args?: unknown[];
    value: bigint;
  }) => Promise<string>;
  waitForTransactionReceipt: (params: {
    hash: string;
    status: unknown;
    interval?: number;
    retries?: number;
  }) => Promise<unknown>;
  connect?: (network?: string) => Promise<void>;
};

type GenLayerChain = {
  id: number;
  name: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: { default: { http: readonly string[] } };
};

export async function createPactaGenLayerClient(): Promise<GenLayerClient> {
  const genlayer = (await import("genlayer-js")) as unknown as {
    createClient: (params: Record<string, unknown>) => GenLayerClient;
  };
  const chains = (await import("genlayer-js/chains")) as Record<string, unknown>;
  const chain = resolveChain(chains);

  return genlayer.createClient({
    chain,
    endpoint: PACTA_GENLAYER_RPC_URL
  });
}

export async function createPactaGenLayerWalletClient(walletAddress: string): Promise<GenLayerClient> {
  const genlayer = (await import("genlayer-js")) as unknown as {
    createClient: (params: Record<string, unknown>) => GenLayerClient;
  };
  const chains = (await import("genlayer-js/chains")) as Record<string, unknown>;
  const chain = resolveChain(chains);

  return genlayer.createClient({
    chain,
    endpoint: PACTA_GENLAYER_RPC_URL,
    account: walletAddress as `0x${string}`,
    provider: getEthereumProvider()
  });
}

export async function writePactaContract(input: {
  walletAddress: string;
  action: ContractActionPayload;
  waitFor?: "ACCEPTED" | "FINALIZED";
  onStatus?: (status: string) => void;
  onHash?: (txHash: string) => void;
}) {
  const { contractAddress } = assertPactaContractConfig();
  const { TransactionStatus } = (await import("genlayer-js/types")) as {
    TransactionStatus: Record<"ACCEPTED" | "FINALIZED", unknown>;
  };
  const client = await createPactaGenLayerWalletClient(input.walletAddress);

  input.onStatus?.("Switching wallet to StudioNet");
  await withTimeout(
    client.connect?.(PACTA_GENLAYER_NETWORK) ?? Promise.resolve(),
    30_000,
    "Wallet network switch to StudioNet did not complete. Disable duplicate wallet extensions, keep one EVM wallet active, refresh, and try again."
  );

  input.onStatus?.("Waiting for wallet approval");
  const txHash = await client.writeContract({
    address: contractAddress,
    functionName: input.action.functionName,
    args: input.action.args,
    value: BigInt(input.action.value ?? "0")
  });

  input.onHash?.(txHash);
  input.onStatus?.("Transaction submitted. Waiting for StudioNet acceptance");
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: TransactionStatus[input.waitFor ?? "ACCEPTED"],
    interval: 5_000,
    retries: 60
  });

  input.onStatus?.(`${input.waitFor ?? "ACCEPTED"}`);
  return { txHash, receipt };
}

export async function readPactaContract<T>(functionName: string, args: unknown[] = []): Promise<T> {
  const { contractAddress } = assertPactaContractConfig();
  const client = await createPactaGenLayerClient();
  const value = await client.readContract({
    address: contractAddress,
    functionName,
    args
  });

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  return value as T;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}
function resolveChain(chains: Record<string, unknown>): GenLayerChain {
  const sdkChain = chains[PACTA_GENLAYER_NETWORK] ?? chains.localnet;
  if (sdkChain) {
    return sdkChain as GenLayerChain;
  }

  return {
    id: 61999,
    name: PACTA_GENLAYER_NETWORK === "localnet" ? "GenLayer Localnet" : "GenLayer StudioNet",
    nativeCurrency: {
      name: "GEN",
      symbol: "GEN",
      decimals: 18
    },
    rpcUrls: {
      default: {
        http: [PACTA_GENLAYER_RPC_URL]
      }
    }
  };
}

