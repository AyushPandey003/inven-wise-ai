import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { ethers } from "ethers";

// Ethereum Sepolia testnet chain config
const SEPOLIA_CHAIN = {
  chainId: "0xaa36a7", // 11155111
  chainName: "Ethereum Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://eth-sepolia.publicrpc.com"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  chainId: number | null;
  balance: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  isConnecting: boolean;
  error: string | null;
}

interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToSepolia: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isCorrectNetwork: false,
    chainId: null,
    balance: null,
    provider: null,
    signer: null,
    isConnecting: false,
    error: null,
  });

  const getEthereum = () => (window as any).ethereum;

  const updateState = useCallback(async (ethereum: any) => {
    try {
      const provider = new ethers.BrowserProvider(ethereum);
      const accounts = await provider.send("eth_accounts", []);
      if (accounts.length === 0) {
        setState((s) => ({
          ...s,
          address: null,
          isConnected: false,
          provider: null,
          signer: null,
          balance: null,
          chainId: null,
          isCorrectNetwork: false,
        }));
        return;
      }

      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      const balance = ethers.formatEther(await provider.getBalance(address));

      setState({
        address,
        isConnected: true,
        isCorrectNetwork: chainId === 11155111,
        chainId,
        balance: parseFloat(balance).toFixed(4),
        provider,
        signer,
        isConnecting: false,
        error: null,
      });
    } catch (err) {
      setState((s) => ({ ...s, error: (err as Error).message, isConnecting: false }));
    }
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    const ethereum = getEthereum();
    if (!ethereum) return;

    const handleAccountsChanged = () => updateState(ethereum);
    const handleChainChanged = () => updateState(ethereum);

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    // Check if already connected
    updateState(ethereum);

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [updateState]);

  const connect = async () => {
    const ethereum = getEthereum();
    if (!ethereum) {
      setState((s) => ({ ...s, error: "MetaMask not found. Please install it." }));
      return;
    }

    setState((s) => ({ ...s, isConnecting: true, error: null }));
    try {
      await ethereum.request({ method: "eth_requestAccounts" });
      await updateState(ethereum);
    } catch (err) {
      setState((s) => ({ ...s, error: (err as Error).message, isConnecting: false }));
    }
  };

  const disconnect = () => {
    setState({
      address: null,
      isConnected: false,
      isCorrectNetwork: false,
      chainId: null,
      balance: null,
      provider: null,
      signer: null,
      isConnecting: false,
      error: null,
    });
  };

  const switchToSepolia = async () => {
    const ethereum = getEthereum();
    if (!ethereum) return;

    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN.chainId }],
      });
    } catch (switchError: any) {
      // Chain not added yet — add it
      if (switchError.code === 4902) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [SEPOLIA_CHAIN],
        });
      } else {
        throw switchError;
      }
    }
  };

  return (
    <WalletContext.Provider
      value={{ ...state, connect, disconnect, switchToSepolia }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}
