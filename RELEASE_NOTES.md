# SuiVerify SDK v1.2.1 Release Notes

## 🚀 Frontend-Ready Production Release

This release transforms the SuiVerify SDK into a **frontend-first**, **developer-friendly** solution for verifying Nautilus enclave signatures on Sui blockchain.

## ✨ Major Features

### 🎯 **One-Line Verification**
```typescript
// Before: Complex manual process with multiple steps
// After: Simple one-line verification
const result = await sdk.verifyDIDNFT('0xNFT_OBJECT_ID');
```

### 📱 **Frontend-Compatible Methods**
- **`verifyDIDNFT(objectId)`** - Dynamic metadata fetching and verification
- **`getUserDIDNFTs(address)`** - Discover user's DID NFTs with metadata
- **`batchVerifyNFTs(objectIds)`** - Parallel verification of multiple NFTs

### 🔄 **Complete User Workflow**
```typescript
// 1. Get user's NFTs
const nfts = await sdk.getUserDIDNFTs(userAddress);

// 2. Verify selected NFT
const result = await sdk.verifyDIDNFT(nfts[0].objectId);

// 3. Handle result
if (result.isValid) {
  console.log('🎉 DID verified on Sui blockchain!');
}
```

## 🧹 Cleanup & Improvements

### **Removed Outdated Files**
- ❌ `examples/basic-usage.ts` - Old complex approach
- ❌ `examples/verify-nft-signature.ts` - Manual payload reconstruction
- ✅ **Kept**: `examples/frontend-integration.ts` - Modern best practices

### **Simplified Commands**
- **Before**: `npm run example:basic`, `npm run example:verify`, `npm run example:frontend`
- **After**: `npm run example` (single, clear command)

### **Updated Documentation**
- 📚 **`docs/API.md`** - Complete rewrite with current methods
- 📋 **`examples/README.md`** - Updated for new structure
- 🎯 **Main README** - Frontend-focused integration guide

## 🔐 Production Features

### **Security & Gas Management**
- **Environment Variables**: Secure private key management
- **Gas Transparency**: ~0.001-0.005 SUI per verification
- **Transaction Receipts**: Full gas cost breakdown
- **Error Handling**: Comprehensive validation and messages

### **Real Blockchain Integration**
- **Actual Sui Transactions**: Real on-chain verification
- **Cryptographic Validation**: Ed25519 signature verification in Move
- **Payload Integrity**: Complete data authenticity checks
- **Transaction Tracking**: Digest and gas cost reporting

## 📦 Installation & Usage

```bash
# Install
npm install suiverify-sdk dotenv

# Setup environment
cp .env.example .env
# Add SUI_PRIVATE_KEY=your_private_key

# Run example
npm run example

# Use in your app
import { SuiVerifySDK } from 'suiverify-sdk';
const sdk = new SuiVerifySDK(config);
const result = await sdk.verifyDIDNFT(nftObjectId);
```

## 🌍 Integration Ready

Perfect for:
- **React/Vue/Angular** frontend applications
- **Express.js/Fastify** backend services
- **React Native** mobile applications
- **Electron** desktop applications
- **Any JavaScript/TypeScript** environment

## 🎯 Breaking Changes

- **Removed**: Old `VerificationOptions` parameter from `verifyDIDNFT()`
- **Changed**: Method signatures simplified for frontend use
- **Updated**: Return types include transaction details and gas costs

## 📊 Performance

- **Package Size**: 12.0 kB (43.7 kB unpacked)
- **Verification Speed**: ~2-3 seconds per NFT (including on-chain transaction)
- **Gas Cost**: ~0.001 SUI per verification
- **Parallel Processing**: Batch verification support

## 🔗 Links

- **npm Package**: https://www.npmjs.com/package/suiverify-sdk
- **GitHub Repository**: https://github.com/SuiVerify/suiverify-sdk
- **API Documentation**: [docs/API.md](docs/API.md)
- **Example Usage**: [examples/frontend-integration.ts](examples/frontend-integration.ts)

---

**Full Changelog**: https://github.com/SuiVerify/suiverify-sdk/compare/v1.1.0...v1.2.1
