/**
 * Frontend Integration Example for SuiVerify SDK
 * 
 * This example shows how to integrate the SuiVerify SDK into a frontend application
 * where users can verify their DID NFTs by simply providing the NFT object ID.
 */

import { SuiVerifySDK } from '../src/sdk';
import { SuiVerifyConfig } from '../src/types';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Frontend-compatible configuration
const FRONTEND_CONFIG: SuiVerifyConfig = {
  rpcUrl: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io',
  packageId: process.env.SUI_PACKAGE_ID || '0x5b1c4450aeb62e2eb6718b8446091045760d5d9a1c2695fbe5a1c20b7d13006d',
  network: 'testnet',
  // Private key for gas payments - in production, this should be a backend service
  privateKey: process.env.SUI_PRIVATE_KEY
};

/**
 * Example: Verify a single DID NFT by object ID
 * This is what frontend applications would call
 */
async function verifyUserNFT(nftObjectId: string) {
  console.log('🚀 Frontend NFT Verification Example');
  console.log('=' .repeat(50));
  
  try {
    // Initialize SDK
    const sdk = new SuiVerifySDK(FRONTEND_CONFIG);
    
    console.log(`🔍 Verifying NFT: ${nftObjectId}`);
    
    // This single call handles everything:
    // 1. Fetches NFT metadata from Sui
    // 2. Validates it's a DID NFT
    // 3. Reconstructs the signed payload
    // 4. Decodes the signature
    // 5. Executes on-chain verification
    const result = await sdk.verifyDIDNFT(nftObjectId);
    
    console.log('\n✅ Verification Complete!');
    console.log('Result:', {
      isValid: result.isValid,
      message: result.message,
      transactionDigest: result.data?.transactionDigest,
      gasUsed: result.data?.gasUsed
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return {
      isValid: false,
      message: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Example: Get all DID NFTs for a user address
 * Useful for showing user's available NFTs in the UI
 */
async function getUserNFTs(userAddress: string) {
  console.log('🔍 Fetching User DID NFTs');
  console.log('=' .repeat(50));
  
  try {
    const sdk = new SuiVerifySDK(FRONTEND_CONFIG);
    
    console.log(`👤 User Address: ${userAddress}`);
    
    // Get all DID NFTs owned by the user
    const nfts = await sdk.getUserDIDNFTs(userAddress);
    
    console.log(`\n📋 Found ${nfts.length} DID NFTs:`);
    nfts.forEach((nft, index) => {
      console.log(`\n${index + 1}. NFT Object ID: ${nft.objectId}`);
      console.log(`   Description: ${nft.fields.description || 'N/A'}`);
      console.log(`   Owner: ${nft.fields.owner}`);
      console.log(`   Verified At: ${nft.fields.verified_at || 'N/A'}`);
    });
    
    return nfts;
    
  } catch (error) {
    console.error('❌ Failed to fetch NFTs:', error);
    return [];
  }
}

/**
 * Example: Complete frontend workflow
 * 1. Get user's NFTs
 * 2. Let user select one
 * 3. Verify the selected NFT
 */
async function completeWorkflow() {
  console.log('🌟 Complete Frontend Workflow Example');
  console.log('=' .repeat(60));
  
  // Example user address (in real app, this comes from wallet connection)
  const userAddress = '0xee43c129736d88e4d64cd571447e5fd298131347c9dc28bee3eebfdb0e332caa';
  
  try {
    // Step 1: Get user's DID NFTs
    console.log('\n📱 Step 1: Fetching user\'s DID NFTs...');
    const nfts = await getUserNFTs(userAddress);
    
    if (nfts.length === 0) {
      console.log('❌ No DID NFTs found for this user');
      return;
    }
    
    // Step 2: Select first NFT for verification (in real app, user selects)
    console.log('\n📱 Step 2: Selecting NFT for verification...');
    const selectedNFT = nfts[0];
    console.log(`Selected: ${selectedNFT.objectId}`);
    
    // Step 3: Verify the selected NFT
    console.log('\n📱 Step 3: Verifying selected NFT...');
    const verificationResult = await verifyUserNFT(selectedNFT.objectId);
    
    // Step 4: Show result to user
    console.log('\n📱 Step 4: Verification Result');
    if (verificationResult.isValid) {
      console.log('🎉 SUCCESS: Your DID NFT is verified and authentic!');
      console.log('✓ Signature verified on Sui blockchain');
      console.log('✓ Created by registered Nautilus enclave');
      console.log('✓ Payload integrity confirmed');
    } else {
      console.log('❌ FAILED: NFT verification failed');
      console.log('Reason:', verificationResult.message);
    }
    
  } catch (error) {
    console.error('❌ Workflow failed:', error);
  }
}

// Example usage for testing
async function main() {
  // Example 1: Verify a specific NFT (what frontend apps will do)
  await verifyUserNFT('0xb18a74a78b1b296e29d40d7215f79cde92f6c0ee79234dbd6a18b272ed760669');
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  // Example 2: Complete workflow
  await completeWorkflow();
}

// Run examples if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  verifyUserNFT,
  getUserNFTs,
  completeWorkflow
};
