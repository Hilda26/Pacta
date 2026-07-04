import { assertPactaContractConfig, PACTA_GENLAYER_NETWORK, PACTA_GENLAYER_RPC_URL } from "./config";

type GenLayerClient = {
  readContract: (params: { address: string; functionName: string; args: unknown[] }) => Promise<unknown>;
  writeContract?: (params: {
    account?: unknown;
    address: string;
    functionName: string;
    args: unknown[];
    value?: bigint;
  }) => Promise<string>;
  waitForTransactionReceipt?: (params: {
    hash: string;
    status: string;
    interval?: number;
    retries?: number;
  }) => Promise<unknown>;
};

type GenLayerChain = {
  id: number;
  name: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: { default: { http: readonly string[] } };
};

export async function createPactaGenLayerClient(): Promise<GenLayerClient> {
  const genlayer = (await import("genlayer-js")) as unknown as {
    createAccount: () => unknown;
    createClient: (params: Record<string, unknown>) => GenLayerClient;
  };
  const chains = (await import("genlayer-js/chains")) as Record<string, unknown>;
  const chain = resolveChain(chains);

  return genlayer.createClient({
    chain,
    endpoint: PACTA_GENLAYER_RPC_URL,
    account: genlayer.createAccount()
  });
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

function resolveChain(chains: Record<string, unknown>): GenLayerChain {
  const sdkChain = chains[PACTA_GENLAYER_NETWORK] ?? chains.simulator;
  if (PACTA_GENLAYER_NETWORK !== "studionet" && sdkChain) {
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
