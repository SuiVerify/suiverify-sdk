# SuiVerify SDK Examples

This directory contains a complete example showing how to use the SuiVerify SDK for frontend integration.

## Available Example

### Frontend Integration (`frontend-integration.ts`)
- **Complete workflow**: User NFT discovery → selection → verification
- **One-line verification**: `sdk.verifyDIDNFT(objectId)`
- **Dynamic metadata fetching**: No manual payload reconstruction needed
- **Real transaction execution**: On-chain verification with gas payment
- **Production-ready patterns**: Error handling, gas management, type safety

## Running the Example

Make sure you have set up your environment first:

```bash
# Copy environment template
cp .env.example .env

# Run the verification example
npm run example:verify
```

### Configuration:

The script uses:
- **Contract Package**: `0x5b1c4450aeb62e2eb6718b8446091045760d5d9a1c2695fbe5a1c20b7d13006d`
- **Enclave ID**: From `config.json` - `0x7fad1c5d1032fcdc3f8990a4d7c25d89c023ec47d31fe2ac4e5a65e0a9b199bd`
- **Network**: Sui Testnet

### Sample NFT Data:

The script includes a hardcoded sample NFT with:
- **DID Type**: Age verification (18+)
- **Evidence**: Aadhar + face verification
- **Signature**: Ed25519 signature from Nautilus enclave
- **Timestamp**: When the verification was performed

### Expected Output:

```
🚀 Starting SuiVerify NFT Signature Verification
============================================================
📋 NFT Verification Data:
   NFT ID: 0xb18a74a78b1b296e29d40d7215f79cde92f6c0ee79234dbd6a18b272ed760669
   Owner: 0xee43c129736d88e4d64cd571447e5fd298131347c9dc28bee3eebfdb0e332caa
   DID Type: 1
   Description: Verify user is 18 years or older using Aadhar and face verification

🔐 Signature Information:
   Signature Length: 88 bytes
   Format check: ✅ Valid

📦 Reconstructed Payload:
{
  "blob_id": "gpKdsk4sEWJCwwebUkIwo08sXcsLqsCFcZlROn5jCBo",
  "description": "Verify user is 18 years or older using Aadhar and face verification",
  "did_type": 1,
  "evidence_hash": [...],
  "expiry_epoch": 1249,
  "name": "18+ Age Verification",
  "owner": "0xee43c129736d88e4d64cd571447e5fd298131347c9dc28bee3eebfdb0e332caa",
  "minted_at": 1760211020541
}

🔍 Calling on-chain verification...
   Contract: 0x5b1c4450aeb62e2eb6718b8446091045760d5d9a1c2695fbe5a1c20b7d13006d
   Enclave ID: 0x7fad1c5d1032fcdc3f8990a4d7c25d89c023ec47d31fe2ac4e5a65e0a9b199bd

✅ Verification Result:
   Valid: true/false
   Message: Enclave signature verified on-chain ✅

🎉 SUCCESS: The NFT signature is valid!
   ✓ Signature was created by the registered enclave
   ✓ Payload integrity verified
   ✓ Timestamp matches NFT data
```

### Understanding the Verification:

1. **Intent Message Structure**: The enclave signs an intent message containing:
   - `intent`: Scope identifier (1 for DID verification)
   - `timestamp_ms`: Unix timestamp in milliseconds
   - `payload`: The actual verification data

2. **BCS Encoding**: The intent message is BCS-encoded before signing

3. **Ed25519 Verification**: The signature is verified using the enclave's registered public key

4. **On-chain Validation**: The `verify_signature` function performs the complete verification process

This demonstrates the complete flow of verifying that a DID NFT was legitimately created by a registered Nautilus enclave.
