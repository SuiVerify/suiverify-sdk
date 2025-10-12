# SuiVerify SDK
A TypeScript SDK for verifying Nautilus enclave signatures on the Sui blockchain with real transaction support and gas fee management.

## Features

- **On-chain Signature Verification**: Execute real Sui transactions to verify enclave signatures
- **Gas Fee Management**: Protocols pay their own gas fees using their private keys
- **Multiple DID Types**: Support for age verification, citizenship verification, and more
- **Production Ready**: Full integration with Sui blockchain infrastructure
- **Type Safety**: Complete TypeScript support with proper type definitions

## Installation
```bash
npm install suiverify-sdk dotenv
```

## Quick Start

### 1. Environment Setup

Create a `.env` file (copy from `.env.example`):

```bash
# Required: Your Sui private key for transaction signing
SUI_PRIVATE_KEY=suiprivkey1your_private_key_here

# Optional: Custom RPC URL (defaults to testnet)

# Optional: Custom package ID (defaults to deployed contract)
SUI_PACKAGE_ID=0x5b1c4450aeb62e2eb6718b8446091045760d5d9a1c2695fbe5a1c20b7d13006d

### 2. Frontend Integration Patterns

### 1. Frontend Application Workflow

```typescript
// Complete frontend integration example
async function verifyUserDID(userWalletAddress: string) {
  const sdk = new SuiVerifySDK(config);
  
  // Step 1: Get user's DID NFTs
  const nfts = await sdk.getUserDIDNFTs(userWalletAddress);
  
  if (nfts.length === 0) {
    return { error: 'No DID NFTs found for this user' };
  }
  
  // Step 2: Let user select NFT (or auto-select first one)
  const selectedNFT = nfts[0]; // or let user choose
  
  // Step 3: Verify the selected NFT (one line!)
  const result = await sdk.verifyDIDNFT(selectedNFT.objectId);
  
  return {
    isValid: result.isValid,
    nftInfo: {
      id: selectedNFT.objectId,
      description: selectedNFT.fields.description,
      owner: selectedNFT.fields.owner
    },
    verification: {
      transactionDigest: result.data?.transactionDigest,
      gasUsed: result.data?.gasUsed
    }
  };
}
```

### 2. Real-time Verification** - just pass the NFT object ID:

```typescript
import { SuiVerifySDK } from 'suiverify-sdk';
import dotenv from 'dotenv';

dotenv.config();

const sdk = new SuiVerifySDK({
  rpcUrl: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io',
  packageId: process.env.SUI_PACKAGE_ID || '0x5b1c4450aeb62e2eb6718b8446091045760d5d9a1c2695fbe5a1c20b7d13006d',
  network: 'testnet',
  privateKey: process.env.SUI_PRIVATE_KEY // Required for gas payments
});

// ✨ Frontend-friendly: Just pass the NFT object ID!
const result = await sdk.verifyDIDNFT('0xYOUR_NFT_OBJECT_ID');

console.log('Verification result:', result);
if (result.isValid) {
  console.log('🎉 NFT verified on-chain!');
  console.log('Transaction:', result.data?.transactionDigest);
  console.log('Gas used:', result.data?.gasUsed);
}
```

### 3. Get User's DID NFTs

```typescript
// Get all DID NFTs owned by a user
const userNFTs = await sdk.getUserDIDNFTs('0xUSER_ADDRESS');

console.log(`Found ${userNFTs.length} DID NFTs:`);
userNFTs.forEach(nft => {
  console.log(`- ${nft.objectId}: ${nft.fields.description}`);
});
```

## 📋 Examples

Run the complete examples:

```bash
# Set up environment
cp .env.example .env
# Edit .env with your private key

# Run frontend integration example (recommended)
npm run example:frontend

# Run NFT signature verification example
npm run example:verify

# Run basic usage example  
npm run example:basic
```

## 🚀 Key Features

### ✨ **Frontend-First Design**
- **One-line verification**: `sdk.verifyDIDNFT(nftObjectId)`
- **Dynamic metadata fetching**: No manual payload reconstruction needed
- **User NFT discovery**: `sdk.getUserDIDNFTs(userAddress)`
- **Complete workflow examples**: Ready-to-use integration patterns

### 🔐 **Production Security**
- **Environment variable configuration**: Secure private key management
- **Gas fee transparency**: Full cost tracking and reporting
- **Error handling**: Comprehensive error messages and validation
- **Type safety**: Complete TypeScript definitions

### 🌐 **Real Blockchain Integration**
- **Actual Sui transactions**: Real on-chain verification with gas payment
- **Transaction receipts**: Full transaction details and gas costs
- **Cryptographic validation**: Ed25519 signature verification in Move contracts
- **Payload integrity**: Complete data authenticity verification

## 📄 License

MIT - See [LICENSE](LICENSE) file for details
