
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

// Get the RPC endpoint for the current network
export const getEndpoint = (network = WalletAdapterNetwork.Devnet) => {
  return clusterApiUrl(network);
};

// Create a connection to Solana
export const getConnection = (network = WalletAdapterNetwork.Devnet) => {
  // Using 'processed' instead of 'confirmed' for more up-to-date balance
  return new Connection(getEndpoint(network), 'processed');
};

// Get the balance for a public key (in SOL)
export const getBalance = async (publicKey: PublicKey): Promise<number> => {
  const connection = getConnection();
  try {
    // Using 'processed' commitment for more recent balance updates
    const balance = await connection.getBalance(publicKey, 'processed');
    console.log('Raw balance in lamports:', balance);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error getting balance:', error);
    throw error;
  }
};

// Create a simple transfer transaction
export const createTransferTransaction = async (
  fromPubkey: PublicKey, 
  toPubkey: PublicKey, 
  amount: number
): Promise<Transaction> => {
  const connection = getConnection();
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports: amount * LAMPORTS_PER_SOL
    })
  );
  
  // Get the latest blockhash
  const { blockhash } = await connection.getLatestBlockhash('processed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromPubkey;
  
  return transaction;
};

// For now, we'll use a simple escrow pattern before implementing a full program
export const ESCROW_PUBKEY = new PublicKey('HXtBm8XZbxaTt41uqaKhwUAa6Z1aPyvJdsZVENiWsetg');

// Helper function to format public key for display
export const shortenAddress = (address: string) => {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};
