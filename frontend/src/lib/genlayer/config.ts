import { isAddress } from "viem";

export const PACTA_GENLAYER_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS ?? "0x6a7d7807612a5485e83E53c776fcfe35fE685C59";

export const PACTA_GENLAYER_NETWORK = process.env.NEXT_PUBLIC_GENLAYER_NETWORK ?? "studionet";

export const PACTA_GENLAYER_RPC_URL =
  process.env.NEXT_PUBLIC_GENLAYER_RPC_URL ??
  (PACTA_GENLAYER_NETWORK === "localnet" ? "http://localhost:4000/api" : "https://studio.genlayer.com/api");

export function assertPactaContractConfig() {
  if (!isAddress(PACTA_GENLAYER_CONTRACT_ADDRESS)) {
    throw new Error("NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS is not a valid address.");
  }

  return {
    network: PACTA_GENLAYER_NETWORK,
    contractAddress: PACTA_GENLAYER_CONTRACT_ADDRESS,
    rpcUrl: PACTA_GENLAYER_RPC_URL
  };
}
