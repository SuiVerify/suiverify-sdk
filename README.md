# SuiVerify SDK

A TypeScript SDK for verifying Nautilus enclave signatures on the Sui blockchain with real transaction support and gas fee management.

## Features

- **On-chain Signature Verification**: Execute real Sui transactions to verify enclave signatures
- **Gas Fee Management**: Protocols pay their own gas fees using their private keys
- **DID NFT Authentication**: Verify authenticity of DID NFTs with Nautilus enclave signatures
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
SUI_RPC_URL=https://fullnode.testnet.sui.io

# Optional: Custom package ID (defaults to deployed contract)
SUI_PACKAGE_ID=0x5b1c4450aeb62e2eb6718b8446091045760d5d9a1c2695fbe5a1c20b7d13006d
```

### 2. Basic Usage

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

// Verify a DID NFT on-chain (pays gas fees)
const result = await sdk.verifyEnclaveSignatureOnChain(
  enclaveId,
  intentScope,
  timestampMs,
  signedPayload,
  signature
);

console.log('Verification result:', result);
if (result.isValid) {
  console.log('Signature verified on-chain!');
  console.log('Transaction:', result.data?.transactionDigest);
  console.log('Gas used:', result.data?.gasUsed);
}
