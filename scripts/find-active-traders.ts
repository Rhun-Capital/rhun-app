import { findActiveTraders } from '../utils/token-holders';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Example token addresses and symbols for popular memecoins
const tokenAddresses = [
  '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN', // Replace with actual token addresses
  '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump',
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  '2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump',
  'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC',
  'J3NKxxXZcnNiMjKw9hYb2K4LUxgwB6t1FtPtQVsv3KFr',
  'ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY',
  'CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump',
  'A8C3xuqscfmyLrte3VmTqrAq8kgMASius9AFNANwpump',
  '5UUH9RTDiSpq6HKS6bp4NdU9PNJpXRXuiw6ShBTBhgH2',
  'FtUEW73K6vEYHfbkfpdBZfWpxgQar2HipGdbutEhpump'
];

const tokenSymbols = [
  'TRUMP',
  'Fartcoin',
  '$WIF',
  'Pnut',
  'SPX',
  'MOODENG',
  'GOAT',
  'FWOG',
  'TROLL',
  'titcoin'

];

async function main() {
  // Check for API key
  if (!process.env.SOLSCAN_API_KEY) {
    console.error('Error: SOLSCAN_API_KEY environment variable is not set');
    console.log('Please set your Solscan API key in the .env file:');
    console.log('SOLSCAN_API_KEY=your_api_key_here');
    process.exit(1);
  }

  console.log('Finding active traders...');
  console.log('This may take a few minutes as we check each holder...\n');
  
  const activeTraders = await findActiveTraders(tokenAddresses, tokenSymbols);

  // Print results
  console.log('\nActive Traders:');
  console.log('==============');
  
  if (activeTraders.length === 0) {
    console.log('No active traders found in the last 24 hours.');
  } else {
    activeTraders.forEach(trader => {
      console.log(`\n${trader.tokenSymbol} WHALE (active trader)`);
      console.log(`Wallet: ${trader.walletAddress}`);
      console.log(`Last Activity: ${trader.lastActivity.toLocaleString()}`);
      console.log('----------------------------------------');
    });
  }
}

main().catch(error => {
  console.error('Error running script:', error);
  process.exit(1);
}); 