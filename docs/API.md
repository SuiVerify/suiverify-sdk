# SuiVerify SDK API Documentation

## Classes

### SuiVerifySDK

Main SDK class for verifying Nautilus enclave signatures on Sui blockchain with real transaction execution and gas fee management.

#### Constructor

```typescript
constructor(config: SuiVerifyConfig)
```

**Parameters:**
- `config`: Configuration object containing network settings, package ID, and optional private key for gas payments

#### Methods

##### verifyDIDNFT() ⭐ **Primary Method**

**Frontend-friendly one-line verification** - dynamically fetches NFT metadata and verifies on-chain.

```typescript
async verifyDIDNFT(
  nftObjectId: string,
  enclaveObjectId?: string
): Promise<VerificationResult>
```

**Parameters:**
- `nftObjectId`: The Sui object ID of the DID NFT to verify
- `enclaveObjectId`: Optional enclave object ID (uses default if not provided)

**Returns:** Complete verification result with transaction details and gas costs

**Example:**
```typescript
const result = await sdk.verifyDIDNFT('0xYOUR_NFT_OBJECT_ID');
if (result.isValid) {
  console.log('✅ NFT verified on-chain!');
  console.log('Transaction:', result.data?.transactionDigest);
}
```

##### getUserDIDNFTs()

Gets all DID NFTs owned by a specific address with metadata.

```typescript
async getUserDIDNFTs(ownerAddress: string): Promise<Array<{
  objectId: string;
  type: string;
  fields: any;
}>>
```

**Parameters:**
- `ownerAddress`: Sui address to query for DID NFTs

**Returns:** Array of NFT objects with metadata

**Example:**
```typescript
const nfts = await sdk.getUserDIDNFTs('0xUSER_ADDRESS');
console.log(`Found ${nfts.length} DID NFTs`);
```

##### batchVerifyNFTs()

Verifies multiple DID NFTs in parallel.

```typescript
async batchVerifyNFTs(
  nftObjectIds: string[],
  enclaveObjectId?: string
): Promise<VerificationResult[]>
```

##### verifyEnclaveSignatureOnChain()

**Advanced method** for direct signature verification with custom parameters.

```typescript
async verifyEnclaveSignatureOnChain(
  enclaveObjectId: string,
  intentScope: number,
  timestampMs: number,
  payload: string,
  signature: string | Uint8Array
): Promise<VerificationResult>
```

## Types

### SuiVerifyConfig

```typescript
interface SuiVerifyConfig {
  rpcUrl: string;
  packageId: string;
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  privateKey?: string; // Required for on-chain verification (gas payments)
}
```

### VerificationResult

```typescript
interface VerificationResult {
  isValid: boolean;
  message: string;
  data?: {
    transactionDigest?: string;
    gasUsed?: {
      computationCost: string;
      storageCost: string;
      storageRebate: string;
      nonRefundableStorageFee: string;
    };
    transactionEffects?: any;
    functionCall?: string;
  };
}
```

## Frontend Integration Patterns

### Complete User Workflow

```typescript
// 1. Initialize SDK
const sdk = new SuiVerifySDK({
  rpcUrl: 'https://fullnode.testnet.sui.io',
  packageId: '0x5b1c4450aeb62e2eb6718b8446091045760d5d9a1c2695fbe5a1c20b7d13006d',
  network: 'testnet',
  privateKey: process.env.SUI_PRIVATE_KEY
});

// 2. Get user's DID NFTs
const nfts = await sdk.getUserDIDNFTs(userWalletAddress);

// 3. Verify selected NFT (one line!)
const result = await sdk.verifyDIDNFT(nfts[0].objectId);

// 4. Handle result
if (result.isValid) {
  console.log('🎉 DID verified on Sui blockchain!');
}
```

### Gas Fee Management

- **Cost**: ~0.001-0.005 SUI per verification
- **Payment**: Automatic via provided private key
- **Tracking**: Full gas cost breakdown in results
- **Security**: Private keys via environment variables

### Error Handling

```typescript
try {
  const result = await sdk.verifyDIDNFT(nftObjectId);
  return result.isValid;
} catch (error) {
  console.error('Verification failed:', error.message);
  return false;
}
```
