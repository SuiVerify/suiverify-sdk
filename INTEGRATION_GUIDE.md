# SuiVerify SDK Integration Guide

This guide shows how protocols can integrate the SuiVerify SDK to verify Nautilus enclave signatures on-chain.

## 🚀 Quick Start

### Installation

```bash
npm install suiverify-sdk
```

### Basic Setup

```typescript
import { SuiVerifySDK } from 'suiverify-sdk';

// Initialize SDK with your private key for gas payments
const sdk = new SuiVerifySDK({
  rpcUrl: 'https://fullnode.testnet.sui.io',
  packageId: '0x5b1c4450aeb62e2eb6718b8446091045760d5d9a1c2695fbe5a1c20b7d13006d',
  network: 'testnet',
  privateKey: process.env.SUI_PRIVATE_KEY // Your protocol's private key
});
```

## 🔑 Private Key Management

**IMPORTANT**: Your protocol is responsible for:
- **Gas Fees**: All verification transactions require gas payment
- **Private Key Security**: Store your private key securely (environment variables, secrets manager)
- **Key Rotation**: Implement proper key management practices

### Environment Setup

```bash
# .env file
SUI_PRIVATE_KEY=suiprivkey1your_private_key_here
SUI_RPC_URL=https://fullnode.testnet.sui.io
```

### Secure Configuration

```typescript
import dotenv from 'dotenv';
dotenv.config();

const sdk = new SuiVerifySDK({
  rpcUrl: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io',
  packageId: '0x5b1c4450aeb62e2eb6718b8446091045760d5d9a1c2695fbe5a1c20b7d13006d',
  network: 'testnet',
  privateKey: process.env.SUI_PRIVATE_KEY // ⚠️ REQUIRED for transactions
});
```

## 🔍 Verifying NFT Signatures

### Step 1: Extract NFT Data

```typescript
// Get NFT object from Sui
const nftObject = await suiClient.getObject({
  id: nftObjectId,
  options: { showContent: true }
});

const fields = nftObject.data.content.fields;
```

### Step 2: Reconstruct Payload

```typescript
// Reconstruct the exact payload that was signed by the enclave
const payload = {
  blob_id: fields.blob_id,
  description: fields.description,
  did_type: fields.did_type,
  evidence_hash: fields.evidence_hash,
  expiry_epoch: parseInt(fields.expiry_epoch),
  name: fields.name,
  owner: fields.owner,
  minted_at: parseInt(fields.minted_at)
};
```

### Step 3: Execute On-Chain Verification

```typescript
// Convert signature from byte array to hex
const signatureHex = '0x' + fields.nautilus_signature
  .map(b => b.toString(16).padStart(2, '0'))
  .join('');

// Call verify_signature function on-chain (pays gas fees)
const result = await sdk.verifyEnclaveSignatureOnChain(
  ENCLAVE_ID,                           // Registered enclave object ID
  1,                                    // Intent scope (1 for DID verification)
  parseInt(fields.signature_timestamp_ms), // Timestamp from NFT
  payload,                              // Reconstructed payload
  signatureHex                          // Signature in hex format
);

if (result.isValid) {
  console.log('✅ NFT signature verified on-chain!');
  console.log('Transaction:', result.data.transactionDigest);
  console.log('Gas used:', result.data.gasUsed);
} else {
  console.log('❌ Verification failed:', result.message);
}
```

## 💰 Gas Cost Considerations

### Typical Gas Costs
- **Signature Verification**: ~0.001-0.005 SUI per verification
- **Network Congestion**: Costs may vary based on network load
- **Batch Processing**: Consider batching multiple verifications

### Gas Management

```typescript
// Check balance before verification
const balance = await suiClient.getBalance({
  owner: signerAddress
});

if (parseInt(balance.totalBalance) < 1000000) { // 0.001 SUI in MIST
  throw new Error('Insufficient balance for gas fees');
}
```

## 🏗️ Integration Patterns

### 1. Real-time Verification

```typescript
// Verify individual NFTs as they're processed
async function verifyNFT(nftId: string) {
  try {
    const result = await sdk.verifyEnclaveSignatureOnChain(/*...*/);
    return result.isValid;
  } catch (error) {
    console.error('Verification failed:', error);
    return false;
  }
}
```

### 2. Batch Verification

```typescript
// Verify multiple NFTs in sequence
async function batchVerifyNFTs(nftIds: string[]) {
  const results = [];
  for (const nftId of nftIds) {
    const result = await verifyNFT(nftId);
    results.push({ nftId, isValid: result });
  }
  return results;
}
```

### 3. Verification Service

```typescript
// Express.js endpoint for verification
app.post('/verify-nft', async (req, res) => {
  try {
    const { nftId } = req.body;
    const result = await sdk.verifyEnclaveSignatureOnChain(/*...*/);
    
    res.json({
      success: result.isValid,
      transactionDigest: result.data?.transactionDigest,
      gasUsed: result.data?.gasUsed
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 🔧 Configuration Options

```typescript
interface SuiVerifyConfig {
  rpcUrl: string;           // Sui RPC endpoint
  packageId: string;        // SuiVerify contract package ID
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  privateKey?: string;      // Private key for signing transactions
}
```

## 📊 Response Format

```typescript
interface VerificationResult {
  isValid: boolean;         // Whether signature is valid
  message: string;          // Human-readable result
  data?: {
    transactionDigest: string;    // Sui transaction hash
    gasUsed: GasUsed;            // Gas consumption details
    events: Event[];             // Transaction events
    signerAddress: string;       // Address that paid gas
  };
}
```

## 🚨 Error Handling

```typescript
try {
  const result = await sdk.verifyEnclaveSignatureOnChain(/*...*/);
  
  if (!result.isValid) {
    // Handle verification failure
    if (result.message.includes('No private key')) {
      // Configuration error
    } else if (result.message.includes('insufficient gas')) {
      // Gas/balance error
    } else {
      // Signature verification failed
    }
  }
} catch (error) {
  // Handle network/RPC errors
  console.error('Network error:', error);
}
```

## 🔐 Security Best Practices

1. **Private Key Security**
   - Never commit private keys to version control
   - Use environment variables or secure key management
   - Rotate keys regularly

2. **Gas Management**
   - Monitor gas costs and balance
   - Implement gas price limits
   - Consider using gas stations for high-volume applications

3. **Verification Logic**
   - Always verify the complete payload structure
   - Check timestamp validity
   - Validate enclave registration status

4. **Error Handling**
   - Implement proper retry logic for network failures
   - Log verification attempts for audit trails
   - Handle edge cases gracefully

## 📚 Complete Example

See `examples/verify-nft-signature.ts` for a complete working example that demonstrates:
- SDK initialization with private key
- NFT data extraction and payload reconstruction
- On-chain signature verification with gas payment
- Comprehensive error handling and logging

## 🆘 Support

For integration support:
- Check the examples directory for working code
- Review the SDK source code for detailed implementation
- Ensure your enclave is properly registered on-chain
- Verify your private key has sufficient balance for gas fees
