import { isAddress } from "viem";
import { badGateway, serviceUnavailable } from "./errors";
import { optionalEnv } from "./env";

type GenLayerClient = {
  readContract: (params: { address: string; functionName: string; args: unknown[] }) => Promise<unknown>;
};

type GenLayerChain = {
  id: number;
  name: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: { default: { http: readonly string[] } };
};

let clientPromise: Promise<GenLayerClient> | undefined;

export function getPublicGenLayerConfig() {
  return {
    network: network(),
    contractAddress: contractAddress(),
    rpcUrl: rpcUrlForNetwork(),
    rpcUrlConfigured: Boolean(process.env.GENLAYER_RPC_URL)
  };
}

export async function readJsonContractView(functionName: string, args: unknown[] = []) {
  const raw = await readContract(functionName, args);
  if (typeof raw !== "string") {
    throw badGateway(`Expected ${functionName} to return a JSON string.`);
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw badGateway(`Could not parse ${functionName} JSON response.`);
  }
}

async function readContract(functionName: string, args: unknown[] = []) {
  const client = await getClient();
  try {
    const value = await client.readContract({
      address: contractAddress(),
      functionName,
      args
    });
    return normalizeForJson(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw badGateway(`GenLayer read failed for ${functionName}: ${message}`);
  }
}

async function getClient() {
  if (!clientPromise) {
    clientPromise = createGenLayerClient();
  }
  return clientPromise;
}

async function createGenLayerClient() {
  const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<unknown>;
  const genlayer = (await dynamicImport("genlayer-js")) as {
    createAccount: () => unknown;
    createClient: (params: Record<string, unknown>) => GenLayerClient;
  };
  const chains = (await dynamicImport("genlayer-js/chains")) as Record<string, unknown>;

  return genlayer.createClient({
    chain: resolveChain(chains),
    endpoint: rpcUrlForNetwork(),
    account: genlayer.createAccount()
  });
}

function resolveChain(chains: Record<string, unknown>): GenLayerChain {
  const configuredNetwork = network();
  const sdkChain = chains[configuredNetwork] ?? chains.localnet;
  if (sdkChain) {
    return sdkChain as GenLayerChain;
  }

  throw serviceUnavailable(`Unsupported GenLayer network: ${configuredNetwork}`);
}

function network() {
  return optionalEnv("GENLAYER_NETWORK", optionalEnv("NEXT_PUBLIC_GENLAYER_NETWORK", "studionet"));
}

function contractAddress() {
  const address = optionalEnv(
    "GENLAYER_CONTRACT_ADDRESS",
    optionalEnv("NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS", "0x6a7d7807612a5485e83E53c776fcfe35fE685C59")
  );
  if (!isAddress(address)) {
    throw serviceUnavailable("GENLAYER_CONTRACT_ADDRESS is not a valid address.");
  }
  return address;
}

function rpcUrlForNetwork() {
  const configured = process.env.GENLAYER_RPC_URL ?? process.env.NEXT_PUBLIC_GENLAYER_RPC_URL;
  if (configured) {
    return configured;
  }

  if (network() === "localnet") {
    return "http://localhost:4000/api";
  }

  return "https://studio.genlayer.com/api";
}

function normalizeForJson(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeForJson(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, normalizeForJson(item)])
    );
  }

  return value;
}
