
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

// Get the RPC endpoint for the current network
export const getEndpoint = (network = WalletAdapterNetwork.Devnet) => {
  console.log(`Using network: ${network}`);
  return clusterApiUrl(network);
};

// Create a connection to Solana
export const getConnection = (network = WalletAdapterNetwork.Devnet) => {
  const endpoint = getEndpoint(network);
  console.log(`Connecting to endpoint: ${endpoint}`);
  // Using 'confirmed' for better reliability
  return new Connection(endpoint, 'confirmed');
};

// Get the balance for a public key (in SOL)
export const getBalance = async (publicKey: PublicKey): Promise<number> => {
  const connection = getConnection();
  try {
    console.log(`Fetching balance for: ${publicKey.toBase58()}`);
    const balance = await connection.getBalance(publicKey, 'confirmed');
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
  if (isNaN(amount) || amount <= 0) {
    throw new Error(`Invalid transfer amount: ${amount} SOL`);
  }

  const connection = getConnection();
  const lamports = Math.round(amount * LAMPORTS_PER_SOL);
  
  console.log(`Creating transfer transaction: ${amount} SOL (${lamports} lamports)`);
  console.log(`From: ${fromPubkey.toBase58()}`);
  console.log(`To: ${toPubkey.toBase58()}`);
  
  // Create the instruction for transferring SOL
  const transferInstruction = SystemProgram.transfer({
    fromPubkey,
    toPubkey,
    lamports
  });
  
  // Create a new transaction and add the transfer instruction
  const transaction = new Transaction().add(transferInstruction);
  
  // Get the latest blockhash for transaction validity
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = fromPubkey;
  
  console.log("Transaction created with blockhash:", blockhash);
  console.log("Last valid block height:", lastValidBlockHeight);
  
  return transaction;
};

// For now, we'll use a simple escrow pattern before implementing a full program
export const ESCROW_PUBKEY = new PublicKey('HXtBm8XZbxaTt41uqaKhwUAa6Z1aPyvJdsZVENiWsetg');

// Helper function to format public key for display
export const shortenAddress = (address: string) => {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};
