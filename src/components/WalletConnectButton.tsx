
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Mock wallet data for the UI demo
interface WalletData {
  connected: boolean;
  publicKey: string | null;
  balance: number;
}

const WalletConnectButton = () => {
  const { toast } = useToast();
  const [wallet, setWallet] = useState<WalletData>({
    connected: false,
    publicKey: null,
    balance: 0
  });

  const connectWallet = () => {
    // In a real implementation, this would connect to the Phantom wallet
    // For now, we're simulating the connection with mock data
    
    // Mock successful connection
    setWallet({
      connected: true,
      publicKey: "Bz7n...3k4j",
      balance: 5.24
    });
    
    toast({
      title: "Wallet Connected",
      description: "Successfully connected to Phantom wallet",
    });
  };

  const disconnectWallet = () => {
    setWallet({
      connected: false,
      publicKey: null,
      balance: 0
    });
    
    toast({
      title: "Wallet Disconnected",
      description: "Wallet has been disconnected",
    });
  };

  if (wallet.connected) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-right">
            <p className="text-bichi-brown">{wallet.publicKey}</p>
            <p className="font-bold">{wallet.balance} SOL</p>
          </div>
          <Button 
            variant="outline" 
            className="border-bichi-orange text-bichi-brown hover:bg-bichi-light-orange"
            onClick={disconnectWallet}
          >
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button 
      className="bg-white text-bichi-brown border border-bichi-orange hover:bg-bichi-light-orange"
      onClick={connectWallet}
    >
      Connect Wallet
    </Button>
  );
};

export default WalletConnectButton;
