import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL, Connection, clusterApiUrl } from '@solana/web3.js';

const WalletConnectButton = () => {
  const { toast } = useToast();
  const { publicKey, connected, disconnect } = useWallet();
  const [balance, setBalance] = useState<number>(0);

  // Function to get the wallet balance
  useEffect(() => {
    let isMounted = true;
    
    const getBalance = async () => {
      if (publicKey) {
        try {
          const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
          const walletBalance = await connection.getBalance(publicKey);
          if (isMounted) {
            setBalance(walletBalance / LAMPORTS_PER_SOL);
          }
        } catch (error) {
          console.error('Failed to fetch balance:', error);
          toast({
            title: "Balance Error",
            description: "Failed to fetch wallet balance",
          });
        }
      }
    };

    if (connected) {
      getBalance();
      // Show toast for successful connection
      toast({
        title: "Wallet Connected",
        description: "Successfully connected to wallet",
      });
    } else {
      setBalance(0);
    }

    return () => {
      isMounted = false;
    };
  }, [publicKey, connected, toast]);

  // Custom disconnect handler to show toast
  const handleDisconnect = async () => {
    await disconnect();
    toast({
      title: "Wallet Disconnected",
      description: "Wallet has been disconnected",
    });
  };

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-right">
            <p className="text-bichi-brown">{publicKey.toString().slice(0, 4) + '...' + publicKey.toString().slice(-4)}</p>
            <p className="font-bold">{balance.toFixed(2)} SOL</p>
          </div>
          <Button 
            variant="outline" 
            className="border-bichi-orange text-bichi-brown hover:bg-bichi-light-orange"
            onClick={handleDisconnect}
          >
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

  // Use the styled button but keep our styling for consistency
  return (
    <div className="wallet-adapter-button-wrapper">
      <WalletMultiButton 
        className="bg-white text-bichi-brown border border-bichi-orange hover:bg-bichi-light-orange wallet-adapter-button"
      />
    </div>
  );
};

export default WalletConnectButton;
