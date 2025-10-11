/**
 * SuiVerify NFT Signature Verification Example
 * 
 * This script demonstrates how to verify an enclave signature from a DID NFT
 * using the on-chain verify_signature function from enclave.move
 */

import { SuiVerifySDK } from '../src/sdk';
import { SuiVerifyConfig } from '../src/types';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Load configuration
const configPath = join(process.cwd(), 'config.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));

// Contract configuration from deployment
const CONTRACT_CONFIG: SuiVerifyConfig = {
  rpcUrl: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io',
  packageId: process.env.SUI_PACKAGE_ID || '0x5b1c4450aeb62e2eb6718b8446091045760d5d9a1c2695fbe5a1c20b7d13006d',
  network: 'testnet',
  // Private key for transaction signing (gas fees) - loaded from environment
  privateKey: process.env.SUI_PRIVATE_KEY
};

// Validate required environment variables
if (!CONTRACT_CONFIG.privateKey) {
  console.error('❌ Error: SUI_PRIVATE_KEY environment variable is required');
  console.error('💡 Please set your private key in .env file or environment');
  process.exit(1);
}

// Current registered enclave ID - the actual Enclave object (not Cap)
const CURRENT_ENCLAVE_ID = '0xb5c1b9dff79454429785285bea9efbf69a0e0a90e330b3a7d4f56c2586dee727';

// Sample NFT metadata from your example
const SAMPLE_NFT_DATA = {
  "objectId": "0xb18a74a78b1b296e29d40d7215f79cde92f6c0ee79234dbd6a18b272ed760669",
  "version": "610197785",
  "digest": "6bN3vioNVyTHNxjiYvz7n347xTFGhyxCiGWQbJJKj4Hc",
  "type": "0x6ec40d30e636afb906e621748ee60a9b72bc59a39325adda43deadd28dc89e09::did_registry::DIDSoulBoundNFT",
  "owner": {
    "AddressOwner": "0xee43c129736d88e4d64cd571447e5fd298131347c9dc28bee3eebfdb0e332caa"
  },
  "content": {
    "fields": {
      "blob_id": "gpKdsk4sEWJCwwebUkIwo08sXcsLqsCFcZlROn5jCBo",
      "description": "Verify user is 18 years or older using Aadhar and face verification",
      "did_type": 1,
      "evidence_hash": [
        81, 81, 67, 113, 90, 104, 100, 51, 116, 54, 66, 104, 99, 73, 84, 49, 99,
        109, 100, 114, 69, 114, 105, 111, 81, 82, 82, 85, 78, 74, 87, 120, 122, 87,
        104, 109, 49, 121, 75, 52, 76, 56, 119, 61
      ],
      "expiry_epoch": "1249",
      "id": {
        "id": "0xb18a74a78b1b296e29d40d7215f79cde92f6c0ee79234dbd6a18b272ed760669"
      },
      "image_url": "https://imgs.search.brave.com/yP61t4k8614JXcqslXHKA7c31dXau70lu0P4lx22PBA/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pbWcu/ZnJlZXBpay5jb20v/cHJlbWl1bS12ZWN0/b3IveWVhcnMtcHJv/aGliaXRpb24tc2ln/bi1hZHVsdHMtb25s/eS1udW1iZXItZWln/aHRlZW4tcmVkLWNy/b3NzZWQtY2lyY2xl/LXN5bWJvbHMtaXNv/bGF0ZWRfMTQ0OTIw/LTI3ODguanBnP3Nl/bXQ9YWlzX2h5YnJp/ZCZ3PTc0MCZxPTgw",
      "minted_at": "1760211020541",
      "name": "18+ Age Verification",
      "nautilus_signature": [
        81, 122, 77, 115, 113, 116, 119, 50, 54, 79, 117, 112, 55, 52, 76, 110, 57,
        74, 102, 51, 43, 108, 90, 103, 50, 113, 49, 56, 106, 74, 89, 52, 84, 71, 51,
        69, 81, 78, 111, 106, 51, 86, 118, 121, 68, 121, 114, 65, 104, 72, 120, 73,
        57, 50, 117, 79, 79, 89, 87, 53, 57, 86, 113, 49, 72, 121, 51, 89, 50, 80,
        86, 105, 68, 55, 57, 116, 107, 120, 122, 98, 102, 122, 86, 55, 66, 65, 61, 61
      ],
      "owner": "0xee43c129736d88e4d64cd571447e5fd298131347c9dc28bee3eebfdb0e332caa",
      "signature_timestamp_ms": "1760210827488"
    }
  }
};

/**
 * Reconstruct the original payload that was signed by the enclave
 * The enclave signs a simple colon-separated string: "user_wallet:did_id:result:evidence_hash:verified_at"
 */
function reconstructPayload(nftData: any): string {
  const fields = nftData.content.fields;
  
  // Convert evidence_hash from byte array to hex string
  const evidenceHashHex = fields.evidence_hash
    .map((b: number) => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Convert signature timestamp to ISO string (approximate)
  const signatureTimestamp = parseInt(fields.signature_timestamp_ms);
  const verifiedAt = new Date(signatureTimestamp).toISOString();
  
  // Reconstruct the original signed string
  const signedPayload = `${fields.owner}:${fields.did_type}:verified:${evidenceHashHex}:${verifiedAt}`;
  
  console.log('🔄 Reconstructed signed payload:', signedPayload);
  
  return signedPayload;
}

/**
 * Convert byte array to base64 string
 */
function bytesToBase64(bytes: number[]): string {
  const uint8Array = new Uint8Array(bytes);
  // Use btoa for browser compatibility or Buffer for Node.js
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(uint8Array).toString('base64');
  } else {
    // Browser fallback
    return btoa(String.fromCharCode(...uint8Array));
  }
}

/**
 * Convert byte array to hex string
 */
function bytesToHex(bytes: number[]): string {
  return '0x' + bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Decode base64 signature to proper byte array
 * The signature bytes in NFT are the UTF-8 bytes of a base64 string, not the raw signature
 */
function decodeSignature(signatureBytes: number[]): Uint8Array {
  // The signatureBytes are actually UTF-8 bytes of a base64 string
  // Convert them back to the base64 string first
  const base64String = String.fromCharCode(...signatureBytes);
  
  console.log('🔍 Signature decoding:');
  console.log('   Base64 string from NFT bytes:', base64String);
  
  // Now decode the base64 to get the actual Ed25519 signature
  let actualSignatureBytes: Uint8Array;
  if (typeof Buffer !== 'undefined') {
    actualSignatureBytes = Buffer.from(base64String, 'base64');
  } else {
    // Browser fallback
    const binaryString = atob(base64String);
    actualSignatureBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      actualSignatureBytes[i] = binaryString.charCodeAt(i);
    }
  }
  
  console.log('   Decoded signature length:', actualSignatureBytes.length);
  console.log('   First 10 bytes:', Array.from(actualSignatureBytes.slice(0, 10)));
  
  return actualSignatureBytes;
}

/**
 * Main verification function
 */
async function verifyNFTSignature() {
  console.log('🚀 Starting SuiVerify NFT Signature Verification');
  console.log('=' .repeat(60));
  
  try {
    // Initialize SDK
    const sdk = new SuiVerifySDK(CONTRACT_CONFIG);
  
  // Extract data from NFT
  const fields = SAMPLE_NFT_DATA.content.fields;
  const signedPayload = reconstructPayload(SAMPLE_NFT_DATA); // This returns the original signed string
  const signatureBytes = fields.nautilus_signature;
  const timestampMs = parseInt(fields.signature_timestamp_ms);
  
  // Decode the base64 encoded signature to get actual signature bytes
  const decodedSignature = decodeSignature(signatureBytes);
  const signatureBase64 = bytesToBase64(signatureBytes);
  const signatureHex = '0x' + Array.from(decodedSignature).map(b => b.toString(16).padStart(2, '0')).join('');
  
  console.log('📋 NFT Verification Data:');
  console.log(`   NFT ID: ${SAMPLE_NFT_DATA.objectId}`);
  console.log(`   Owner: ${fields.owner}`);
  console.log(`   Description: ${fields.description}`);
  console.log(`   Timestamp: ${timestampMs} (${new Date(timestampMs).toISOString()})`);
  console.log('');
  
  console.log('🔐 Signature Information:');
  console.log(`   Raw signature length: ${signatureBytes.length} bytes`);
  console.log(`   Base64: ${signatureBase64.substring(0, 50)}...`);
  console.log(`   Hex: ${signatureHex.substring(0, 50)}...`);
  console.log(`   Timestamp: ${timestampMs} (${new Date(timestampMs).toISOString()})`);
  console.log('');
  
  console.log('📦 Reconstructed Signed Payload:');
  console.log(`   "${signedPayload}"`);
  console.log('');
  
  // Call on-chain verification
  console.log('🔍 Executing on-chain signature verification...');
  const result = await sdk.verifyEnclaveSignatureOnChain(
    CURRENT_ENCLAVE_ID,
    1, // Intent scope for DID verification
    timestampMs,
    signedPayload, // Pass the reconstructed string payload
    decodedSignature // Pass the decoded signature bytes directly
  );
  
  console.log('✅ Verification Result:');
    console.log(`   Valid: ${result.isValid}`);
    console.log(`   Message: ${result.message}`);
    
    if (result.data) {
      console.log('   Transaction Effects:', result.data.transactionEffects?.status);
      console.log('   Function Called:', result.data.functionCall);
    }
    
    if (result.isValid) {
      console.log('');
      console.log('🎉 SUCCESS: The NFT signature is valid!');
      console.log('   ✓ Signature was created by the registered enclave');
      console.log('   ✓ Payload integrity verified');
      console.log('   ✓ Timestamp matches NFT data');
    } else {
      console.log('');
      console.log('❌ FAILURE: The NFT signature verification failed');
      console.log('   This could mean:');
      console.log('   - The signature was not created by the registered enclave');
      console.log('   - The payload has been tampered with');
      console.log('   - The enclave is not properly registered');
    }
    
  } catch (error) {
    console.error('💥 Error during verification:', error);
  }
  
  console.log('');
  console.log('=' .repeat(60));
  console.log('🏁 Verification Complete');
}

/**
 * Additional utility: Verify signature format
 */
function verifySignatureFormat() {
  console.log('🔍 Analyzing Signature Format:');
  
  const signatureBytes = SAMPLE_NFT_DATA.content.fields.nautilus_signature;
  const signatureBase64 = bytesToBase64(signatureBytes);
  
  console.log(`   Raw bytes length: ${signatureBytes.length}`);
  console.log(`   Expected Ed25519 signature length: 64 bytes`);
  console.log(`   Raw format check: ${signatureBytes.length === 64 ? '✅ Valid' : '❌ Invalid (likely base64 encoded)'}`);
  console.log(`   Base64 representation: ${signatureBase64}`);
  
  // Try to decode base64 to see if it contains the actual signature
  try {
    let decoded: Uint8Array;
    if (typeof Buffer !== 'undefined') {
      decoded = Buffer.from(signatureBase64, 'base64');
    } else {
      // Browser fallback
      const binaryString = atob(signatureBase64);
      decoded = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        decoded[i] = binaryString.charCodeAt(i);
      }
    }
    
    console.log(`   Decoded length: ${decoded.length} bytes`);
    
    if (decoded.length === 64) {
      console.log('   ✅ After base64 decode: Proper Ed25519 signature format');
      console.log(`   Decoded hex: ${Array.from(decoded).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 20)}...`);
    } else {
      console.log('   ⚠️  Decoded signature length unexpected');
    }
  } catch (e) {
    console.log('   ❌ Could not decode signature');
  }
  
  console.log('');
}

// Run the verification
async function main() {
  verifySignatureFormat();
  await verifyNFTSignature();
}

// Only run if this is the main module
if (typeof require !== 'undefined' && require.main === module) {
  main().catch(console.error);
}

export { verifyNFTSignature, reconstructPayload };
