type EthereumProvider = {
  request<T = unknown>(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<T>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export async function requestWalletAddress() {
  const provider = getEthereumProvider();
  const accounts = await provider.request<string[]>({ method: "eth_requestAccounts" });
  const walletAddress = accounts[0];
  if (!walletAddress) {
    throw new Error("No wallet account was returned.");
  }
  return walletAddress;
}

export async function signWalletMessage(walletAddress: string, message: string) {
  const provider = getEthereumProvider();
  return provider.request<string>({
    method: "personal_sign",
    params: [message, walletAddress]
  });
}

export function hasInjectedWallet() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

function getEthereumProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No EVM wallet detected.");
  }
  return window.ethereum;
}
