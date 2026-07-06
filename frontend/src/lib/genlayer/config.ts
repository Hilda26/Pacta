import { isAddress } from "viem";

export const PACTA_GENLAYER_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS ?? "0xeBb262198DE067bf73cdAdF6d1C9f211cb1AF1a2";

export const PACTA_GENLAYER_NETWORK = process.env.NEXT_PUBLIC_GENLAYER_NETWORK ?? "studionet";

export const PACTA_GENLAYER_RPC_URL =
  process.env.NEXT_PUBLIC_GENLAYER_RPC_URL ??
  (PACTA_GENLAYER_NETWORK === "localnet" ? "http://localhost:4000/api" : "https://studio.genlayer.com/api");

export const PACTA_GENLAYER_EXPLORER_URL =
  process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL ?? "https://portal.genlayer.foundation";
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
