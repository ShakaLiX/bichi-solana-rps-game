
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { getBalance, shortenAddress } from '@/lib/solana';
import { useConnection } from '@solana/wallet-adapter-react';

const WalletConnectButton = () => {
  const { toast } = useToast();
  const { publicKey, connected, disconnect } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [network, setNetwork] = useState<string>("Unknown");

  // Check which network we're connected to
  useEffect(() => {
    const checkNetwork = async () => {
      if (connection) {
        try {
          const genesisHash = await connection.getGenesisHash();
          console.log("Genesis hash:", genesisHash);
          
          // Determine network from genesis hash
          if (genesisHash === "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG") {
            setNetwork("Devnet");
          } else if (genesisHash === "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d") {
            setNetwork("Mainnet");
          } else {
            setNetwork("Unknown network");
          }
          
          console.log("Connected to network:", network);
        } catch (error) {
          console.error("Error getting network:", error);
          setNetwork("Error detecting network");
        }
      }
    };
    
    if (connected) {
      checkNetwork();
    }
  }, [connected, connection]);

  // Function to get the wallet balance
  useEffect(() => {
    let isMounted = true;
    
    const fetchBalance = async () => {
      if (publicKey) {
        console.log("Attempting to fetch balance for wallet:", publicKey.toString());
        setIsLoading(true);
        try {
          // Direct method to get balance as a backup
          const rawLamports = await connection.getBalance(publicKey);
          console.log("Raw lamports from direct connection:", rawLamports);
          
          // Using our utility function
          const walletBalance = await getBalance(publicKey);
          console.log("Processed balance from getBalance utility:", walletBalance);
          
          if (isMounted) {
            setBalance(walletBalance);
          }
        } catch (error) {
          console.error('Failed to fetch balance:', error);
          toast({
            title: "Balance Error",
            description: `Failed to fetch wallet balance: ${error.message}`,
          });
          if (isMounted) {
            setBalance(null);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }
    };

    if (connected && publicKey) {
      fetchBalance();
      // Show toast for successful connection
      toast({
        title: "Wallet Connected",
        description: `Successfully connected to ${shortenAddress(publicKey.toString())} on ${network}`,
      });
    } else {
      setBalance(null);
    }

    return () => {
      isMounted = false;
    };
  }, [publicKey, connected, toast, connection, network]);

  // Custom disconnect handler to show toast
  const handleDisconnect = async () => {
    await disconnect();
    toast({
      title: "Wallet Disconnected",
      description: "Wallet has been disconnected",
    });
  };

  const refreshBalance = async () => {
    if (publicKey) {
      setIsLoading(true);
      try {
        // Try direct method for debugging
        const rawLamports = await connection.getBalance(publicKey);
        console.log("Raw lamports on refresh:", rawLamports);
        
        const walletBalance = await getBalance(publicKey);
        console.log("Refreshed balance:", walletBalance);
        setBalance(walletBalance);
        toast({
          title: "Balance Updated",
          description: "Your wallet balance has been refreshed",
        });
      } catch (error) {
        console.error('Failed to refresh balance:', error);
        toast({
          title: "Balance Error",
          description: `Failed to refresh wallet balance: ${error.message}`,
        });
        setBalance(null);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-right">
            <p className="text-bichi-brown">
              {shortenAddress(publicKey.toString())} 
              <span className="text-xs ml-1">({network})</span>
            </p>
            <div className="flex items-center gap-1">
              {isLoading ? (
                <p className="font-bold">Loading...</p>
              ) : balance !== null ? (
                <p className="font-bold">{balance.toFixed(4)} SOL</p>
              ) : (
                <p className="font-bold text-red-500">Error</p>
              )}
              <Button 
                variant="ghost" 
                size="icon"
                className="h-4 w-4 p-0"
                onClick={refreshBalance}
                disabled={isLoading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                  <path d="M21 3v5h-5"></path>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                  <path d="M8 16H3v5"></path>
                </svg>
              </Button>
            </div>
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
