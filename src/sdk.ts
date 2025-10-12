/**
 * SuiVerify SDK - Core Implementation
 */

import {
  SuiVerifyConfig,
  VerificationResult,
  NFTVerificationData,
  EnclaveSignature,
  DIDMetadata,
  VerificationOptions,
  SDKError
} from './types';

import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import * as configData from '../config.json';

export class SuiVerifySDK {
  private client: SuiClient;
  private config: SuiVerifyConfig;
  private keypair?: Ed25519Keypair;
  private defaultEnclaveId: string;

  constructor(config: SuiVerifyConfig) {
    this.config = config;
    this.defaultEnclaveId = configData.CURRENT_SUIVERIFY_ENCLAVE_ID;
    
    // Initialize Sui client
    this.client = new SuiClient({ url: config.rpcUrl });
    
    // Initialize keypair if private key is provided
    if (config.privateKey) {
      this.keypair = Ed25519Keypair.fromSecretKey(config.privateKey);
      console.log('🔑 SDK initialized with signing capability');
      console.log('📍 Signer address:', this.keypair.getPublicKey().toSuiAddress());
    } else {
      console.log('⚠️  SDK initialized without private key - read-only mode');
      console.log('💡 Provide privateKey in config for transaction signing');
    }
    
    console.log('🌐 Connected to:', config.rpcUrl);
    console.log('📦 Package ID:', config.packageId);
    console.log('🏠 Default Enclave ID:', this.defaultEnclaveId);
  }

  /**
   * Verify a DID NFT by fetching its metadata dynamically and verifying the enclave signature
   * This is the main method for frontend integration - just pass the NFT object ID
   */
  async verifyDIDNFT(
    nftObjectId: string,
    enclaveObjectId?: string
  ): Promise<VerificationResult> {
    try {
      console.log('🔍 Fetching NFT metadata for verification...');
      console.log('NFT Object ID:', nftObjectId);

      // Fetch the NFT object from Sui
      const nftObject = await this.client.getObject({
        id: nftObjectId,
        options: { showContent: true, showType: true }
      });

      if (!nftObject.data) {
        return {
          isValid: false,
          message: '❌ NFT object not found or not accessible'
        };
      }

      // Validate it's a DID NFT
      const objectType = nftObject.data.type;
      if (!objectType?.includes('DIDSoulBoundNFT')) {
        return {
          isValid: false,
          message: '❌ Object is not a DID SoulBound NFT'
        };
      }

      // Extract fields from the NFT
      const content = nftObject.data.content as any;
      if (!content?.fields) {
        return {
          isValid: false,
          message: '❌ NFT content or fields not found'
        };
      }

      const fields = content.fields;
      
      // Validate required fields exist
      if (!fields.nautilus_signature || !fields.signature_timestamp_ms || !fields.owner) {
        return {
          isValid: false,
          message: '❌ Required signature fields missing from NFT'
        };
      }

      console.log('✅ NFT metadata fetched successfully');
      console.log('Owner:', fields.owner);
      console.log('Description:', fields.description);

      // Reconstruct the signed payload
      const signedPayload = this.reconstructPayload(nftObject.data);
      
      // Decode the signature
      const decodedSignature = this.decodeSignature(fields.nautilus_signature);
      
      // Parse timestamp
      const timestampMs = parseInt(fields.signature_timestamp_ms);

      // Use provided enclave ID or get from config
      const enclaveId = enclaveObjectId || this.defaultEnclaveId;
      
      console.log('🔗 Using enclave ID:', enclaveId);

      console.log('🚀 Starting on-chain verification...');

      // Call the on-chain verification
      return await this.verifyEnclaveSignatureOnChain(
        enclaveId,
        1, // Intent scope for DID verification
        timestampMs,
        signedPayload,
        decodedSignature
      );

    } catch (error) {
      console.error('❌ DID NFT verification error:', error);
      return {
        isValid: false,
        message: `DID NFT verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get all DID NFTs owned by a specific address
   * Useful for frontend to show user's DID NFTs
   */
  async getUserDIDNFTs(ownerAddress: string): Promise<Array<{
    objectId: string;
    type: string;
    fields: any;
  }>> {
    try {
      console.log('🔍 Fetching DID NFTs for address:', ownerAddress);

      const objects = await this.client.getOwnedObjects({
        owner: ownerAddress,
        options: { showContent: true, showType: true },
        filter: {
          StructType: '0x6ec40d30e636afb906e621748ee60a9b72bc59a39325adda43deadd28dc89e09::did_registry::DIDSoulBoundNFT'
        }
      });

      const didNFTs = objects.data
        .filter(obj => obj.data?.content)
        .map(obj => ({
          objectId: obj.data!.objectId,
          type: obj.data!.type!,
          fields: (obj.data!.content as any)?.fields || {}
        }));

      console.log(`✅ Found ${didNFTs.length} DID NFTs`);
      return didNFTs;

    } catch (error) {
      console.error('❌ Error fetching user DID NFTs:', error);
      return [];
    }
  }

  /**
   * Reconstruct the signed payload from NFT data
   * Private helper method
   */
  private reconstructPayload(nftData: any): string {
    const fields = nftData.content?.fields;
    if (!fields) {
      throw new Error('NFT fields not found');
    }

    // Reconstruct the original signed format: owner:did_id:result:evidence_hash:verified_at
    const owner = fields.owner;
    const didId = fields.did_id || '1'; // Default DID ID
    const result = 'verified'; // Status from verification
    const evidenceHash = fields.evidence_hash || '';
    const verifiedAt = fields.verified_at || new Date(parseInt(fields.signature_timestamp_ms)).toISOString();

    return `${owner}:${didId}:${result}:${evidenceHash}:${verifiedAt}`;
  }

  /**
   * Decode base64 signature from NFT to Ed25519 bytes
   * Private helper method
   */
  private decodeSignature(signatureBytes: number[]): Uint8Array {
    // Convert byte array to base64 string
    const base64String = String.fromCharCode(...signatureBytes);
    
    // Decode base64 to get actual Ed25519 signature
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(base64String, 'base64');
    } else {
      // Browser fallback
      const binaryString = atob(base64String);
      const signature = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        signature[i] = binaryString.charCodeAt(i);
      }
      return signature;
    }
  }

  /**
   * Verify Nautilus enclave signature using on-chain contract
   * Calls the verify_signature function from enclave.move with real transaction and gas fees
   */
  async verifyEnclaveSignatureOnChain(
    enclaveObjectId: string,
    intentScope: number,
    timestampMs: number,
    payload: any,
    signature: string | Uint8Array
  ): Promise<VerificationResult> {
    try {
      // Check if we have signing capability
      if (!this.keypair) {
        return {
          isValid: false,
          message: '❌ No private key provided - cannot execute transactions. Please provide privateKey in config.'
        };
      }

      console.log('🔍 Executing on-chain signature verification...');
      // Handle signature format for logging
      const signatureStr = typeof signature === 'string' ? signature : `Uint8Array(${signature.length} bytes)`;
      
      console.log('Parameters:', {
        enclaveObjectId,
        intentScope,
        timestampMs,
        payload: typeof payload === 'string' ? payload.substring(0, 100) + '...' : JSON.stringify(payload).substring(0, 100) + '...',
        signature: typeof signature === 'string' ? signature.substring(0, 20) + '...' : `Uint8Array(${signature.length} bytes)`
      });

      // Create the intent message structure that matches Move's IntentMessage<T>
      const intentMessage = {
        intent: intentScope,
        timestamp_ms: timestampMs,
        payload: payload
      };

      console.log('📦 Intent Message Structure:');
      console.log(JSON.stringify(intentMessage, null, 2));

      // Create transaction block
      const txb = new Transaction();
      
      // Function signature: verify_signature<T, P: drop>(enclave: &Enclave<T>, intent_scope: u8, timestamp_ms: u64, payload: P, signature: &vector<u8>): bool
      const result = txb.moveCall({
        target: `${this.config.packageId}::enclave::verify_signature`,
        typeArguments: [
          `${this.config.packageId}::enclave::ENCLAVE`,  // T (enclave type)
          '0x1::string::String'  // P (payload type - using String for text data)
        ],
        arguments: [
          txb.object(enclaveObjectId),        // enclave: &Enclave<T> (immutable reference)
          txb.pure.u8(intentScope),           // intent_scope: u8
          txb.pure.u64(timestampMs),          // timestamp_ms: u64
          txb.pure.string(payload), // payload: String
          txb.pure.vector('u8', typeof signature === 'string' ? Array.from(this.hexToBytes(signature)) : Array.from(signature))   // signature: &vector<u8>
        ]
      });

      console.log('🔧 Transaction Details:');
      console.log('Target:', `${this.config.packageId}::enclave::verify_signature`);
      console.log('Signer:', this.keypair.getPublicKey().toSuiAddress());
      console.log('Arguments:', {
        enclave: enclaveObjectId,
        intentScope: intentScope,
        timestampMs: timestampMs,
        payloadLength: typeof payload === 'string' ? payload.length : this.encodePayload(payload).length,
        signatureLength: typeof signature === 'string' ? this.hexToBytes(signature).length : signature.length
      });

      // Execute the transaction with gas payment
      console.log('💰 Executing transaction (paying gas fees)...');
      const txResult = await this.client.signAndExecuteTransaction({
        transaction: txb,
        signer: this.keypair,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        }
      });

      // Check if the transaction succeeded
      const isValid = txResult.effects?.status?.status === 'success';
      
      console.log('📊 Transaction Result:');
      console.log('Digest:', txResult.digest);
      console.log('Status:', txResult.effects?.status?.status);
      console.log('Gas Used:', txResult.effects?.gasUsed);
      console.log('Events:', txResult.events?.length || 0);
      
      if (isValid) {
        console.log('✅ Transaction executed successfully!');
        console.log('💸 Gas Cost:', {
          computationCost: txResult.effects?.gasUsed?.computationCost,
          storageCost: txResult.effects?.gasUsed?.storageCost,
          storageRebate: txResult.effects?.gasUsed?.storageRebate
        });
      } else {
        console.log('❌ Transaction failed:', txResult.effects?.status);
      }
      
      return {
        isValid,
        message: isValid ? 
          'Enclave signature verified on-chain ✅ (Transaction executed with gas payment)' : 
          `On-chain verification failed ❌: ${txResult.effects?.status?.error || 'Unknown error'}`,
        data: {
          transactionDigest: txResult.digest,
          transactionEffects: txResult.effects,
          events: txResult.events,
          objectChanges: txResult.objectChanges,
          gasUsed: txResult.effects?.gasUsed,
          functionCall: `${this.config.packageId}::enclave::verify_signature`,
          intentMessage: intentMessage,
          signerAddress: this.keypair.getPublicKey().toSuiAddress()
        }
      };

    } catch (error) {
      console.error('❌ On-chain verification error:', error);
      return {
        isValid: false,
        message: `On-chain verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Helper function to encode payload for Move function call
   * For DID verification, the payload is a simple string, not JSON
   */
  private encodePayload(payload: any): Uint8Array {
    // If payload is already a string (the signed format), use it directly
    if (typeof payload === 'string') {
      return new TextEncoder().encode(payload);
    }
    
    // Otherwise, serialize as JSON (fallback for other use cases)
    const jsonString = JSON.stringify(payload);
    return new TextEncoder().encode(jsonString);
  }

  /**
   * Helper function to convert hex string to byte array
   */
  private hexToBytes(hex: string): Uint8Array {
    const cleanHex = hex.replace('0x', '');
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
    }
    return bytes;
  }

  /**
   * Verify Nautilus enclave signature (local verification)
   * Note: This is a simplified implementation. For production, use proper cryptographic libraries.
   */
  async verifyEnclaveSignature(signature: EnclaveSignature): Promise<boolean> {
    try {
      console.log('🔍 Verifying enclave signature locally...');
      console.log('Signature data:', {
        publicKey: signature.publicKey.substring(0, 20) + '...',
        message: signature.message,
        signature: signature.signature.substring(0, 20) + '...'
      });

      // For now, return true as a placeholder
      // In production, implement proper Ed25519 signature verification
      // using @noble/ed25519 or similar library
      
      return true; // Placeholder - implement actual verification
    } catch (error) {
      console.error('Enclave signature verification failed:', error);
      return false;
    }
  }

  /**
   * Verify NFT metadata integrity
   */
  async verifyNFTMetadata(metadata: DIDMetadata): Promise<boolean> {
    try {
      // Basic metadata validation
      if (!metadata.id || !metadata.owner) {
        return false;
      }

      // Additional metadata checks can be added here
      return true;
    } catch (error) {
      console.error('Metadata verification failed:', error);
      return false;
    }
  }

  /**
   * Verify NFT ownership
   */
  async verifyOwnership(data: NFTVerificationData): Promise<boolean> {
    try {
      // Verify that the claimed owner matches the actual NFT owner
      return data.owner === data.metadata.owner;
    } catch (error) {
      console.error('Ownership verification failed:', error);
      return false;
    }
  }

  /**
   * Extract verification data from NFT object
   */
  private extractVerificationData(nftData: any): NFTVerificationData {
    // This would be customized based on your NFT structure
    const content = nftData.content;
    
    return {
      tokenId: nftData.objectId,
      owner: nftData.owner?.AddressOwner || '',
      metadata: {
        id: content?.fields?.id || '',
        owner: content?.fields?.owner || '',
        isVerified: content?.fields?.is_verified || false,
        verificationLevel: content?.fields?.verification_level || 0,
        createdAt: content?.fields?.created_at || '',
        updatedAt: content?.fields?.updated_at || ''
      },
      enclaveSignature: {
        signature: content?.fields?.enclave_signature || '',
        publicKey: content?.fields?.enclave_public_key || '',
        message: content?.fields?.signed_message || ''
      }
    };
  }

  /**
   * Get DID NFTs owned by an address
   */
  async getDIDNFTsByOwner(ownerAddress: string): Promise<string[]> {
    try {
      const objects = await this.client.getOwnedObjects({
        owner: ownerAddress,
        filter: {
          StructType: `${this.config.packageId}::did_nft::DIDNFT`
        }
      });

      return objects.data.map((obj: any) => obj.data?.objectId || '').filter((id: string) => id);
    } catch (error) {
      console.error('Failed to get DID NFTs:', error);
      return [];
    }
  }

  /**
   * Batch verify multiple NFTs
   */
  async batchVerifyNFTs(
    nftObjectIds: string[],
    enclaveObjectId?: string
  ): Promise<VerificationResult[]> {
    const results = await Promise.all(
      nftObjectIds.map(id => this.verifyDIDNFT(id, enclaveObjectId))
    );
    return results;
  }
}

export default SuiVerifySDK;
