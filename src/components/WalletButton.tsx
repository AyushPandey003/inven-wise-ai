import { useWallet } from "@/context/WalletContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet, LogOut, ExternalLink, AlertTriangle, Loader2, Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export default function WalletButton() {
  const {
    address,
    isConnected,
    isCorrectNetwork,
    balance,
    chainId,
    isConnecting,
    error,
    connect,
    disconnect,
    switchToSepolia,
  } = useWallet();

  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // Not connected
  if (!isConnected) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-xs font-mono"
        onClick={connect}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Wallet className="h-3.5 w-3.5" />
        )}
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </Button>
    );
  }

  // Connected but wrong network
  if (!isCorrectNetwork) {
    return (
      <Button
        variant="destructive"
        size="sm"
        className="gap-2 text-xs font-mono"
        onClick={switchToSepolia}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Switch to Sepolia
      </Button>
    );
  }

  // Connected + correct network
  const shortAddr = `${address!.slice(0, 6)}...${address!.slice(-4)}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-xs font-mono">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          {shortAddr}
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {balance} ETH
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-xs text-muted-foreground">Connected to</p>
          <p className="text-xs font-mono font-medium">Ethereum Sepolia</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyAddress} className="text-xs gap-2 cursor-pointer">
          {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied!" : "Copy Address"}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://sepolia.etherscan.io/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs gap-2 cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View on Etherscan
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={disconnect} className="text-xs gap-2 cursor-pointer text-red-500">
          <LogOut className="h-3.5 w-3.5" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
