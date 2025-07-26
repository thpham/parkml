/**
 * WASM Crypto Module Loader
 * Initializes and manages WASM-based cryptographic operations for the ParkML platform
 */

// SEAL WASM bindings for homomorphic encryption
import SEAL from 'node-seal';
import { SEALLibrary } from 'node-seal/implementation/seal';
import { Context } from 'node-seal/implementation/context';
import { KeyGenerator } from 'node-seal/implementation/key-generator';
import { CKKSEncoder } from 'node-seal/implementation/ckks-encoder';
import { Evaluator } from 'node-seal/implementation/evaluator';
import { Encryptor } from 'node-seal/implementation/encryptor';
import { Decryptor } from 'node-seal/implementation/decryptor';
import { PublicKey } from 'node-seal/implementation/public-key';
import { SecretKey } from 'node-seal/implementation/secret-key';
import { RelinKeys } from 'node-seal/implementation/relin-keys';
import { GaloisKeys } from 'node-seal/implementation/galois-keys';

// TypeScript type aliases for SEAL WASM types
type SEALInstance = SEALLibrary;

// Properly typed interfaces using actual node-seal types
interface HomomorphicContext {
  seal: SEALInstance;
  context: Context;
  keyGenerator: KeyGenerator;
  encoder: CKKSEncoder;
  evaluator: Evaluator;
  decryptor: Decryptor | null;
  encryptor: Encryptor | null;
}

interface HomomorphicKeys {
  publicKey: string;
  secretKey: string;
  relinKeys: string;
  galoisKeys: string;
}

/**
 * WASM Crypto Module Manager
 * Handles initialization and lifecycle of WASM cryptographic modules
 */
export class WASMCryptoLoader {
  private static sealInstance: SEALInstance | null = null;
  private static isInitialized = false;
  private static initializationPromise: Promise<void> | null = null;

  /**
   * Initialize SEAL WASM module for homomorphic encryption
   */
  public static async initializeSEAL(): Promise<SEALInstance> {
    if (this.sealInstance && this.isInitialized) {
      return this.sealInstance;
    }

    // Prevent multiple concurrent initializations
    if (this.initializationPromise) {
      await this.initializationPromise;
      if (!this.sealInstance) {
        throw new Error('SEAL initialization failed');
      }
      return this.sealInstance;
    }

    this.initializationPromise = this._initializeSEAL();
    await this.initializationPromise;
    if (!this.sealInstance) {
      throw new Error('SEAL initialization failed');
    }
    return this.sealInstance;
  }

  /**
   * Internal SEAL initialization
   */
  private static async _initializeSEAL(): Promise<void> {
    try {
      console.log('🔐 Initializing SEAL WASM module for homomorphic encryption...');

      // Initialize SEAL with default security parameters
      this.sealInstance = await SEAL();

      // Verify SEAL is properly initialized
      if (!this.sealInstance) {
        throw new Error('Failed to initialize SEAL WASM module');
      }

      // Test basic SEAL functionality with secure, compatible parameters
      const schemeType = this.sealInstance.SchemeType.bfv;
      const securityLevel = this.sealInstance.SecurityLevel.tc128;
      const polyModulusDegree = 4096;

      const parms = this.sealInstance.EncryptionParameters(schemeType);
      parms.setPolyModulusDegree(polyModulusDegree);

      // Use SEAL's recommended parameters for BFV with security level 128
      parms.setCoeffModulus(this.sealInstance.CoeffModulus.BFVDefault(polyModulusDegree));
      parms.setPlainModulus(this.sealInstance.PlainModulus.Batching(polyModulusDegree, 20));

      // Verify parameters are valid
      const context = this.sealInstance.Context(parms, true, securityLevel);
      if (!context.parametersSet()) {
        throw new Error('SEAL encryption parameters are not valid');
      }

      this.isInitialized = true;
      console.log('✅ SEAL WASM module initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize SEAL WASM module:', error);
      this.sealInstance = null;
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Get the initialized SEAL instance
   */
  public static getSEAL(): SEALInstance {
    if (!this.isInitialized || !this.sealInstance) {
      throw new Error('SEAL WASM module not initialized. Call initializeSEAL() first.');
    }
    return this.sealInstance;
  }

  /**
   * Check if SEAL is initialized
   */
  public static isSEALInitialized(): boolean {
    return this.isInitialized && this.sealInstance !== null;
  }

  /**
   * Create SEAL encryption context for homomorphic operations
   */
  public static createHomomorphicContext(
    securityLevel: 'tc128' | 'tc192' | 'tc256' = 'tc128'
  ): HomomorphicContext {
    const seal = this.getSEAL();

    // Configure CKKS scheme for floating-point operations (medical analytics)
    const schemeType = seal.SchemeType.ckks;
    const polyModulusDegree = 8192;
    const security = seal.SecurityLevel[securityLevel];

    const parms = seal.EncryptionParameters(schemeType);
    parms.setPolyModulusDegree(polyModulusDegree);

    // Use SEAL's recommended parameters for CKKS with security level 128
    parms.setCoeffModulus(
      seal.CoeffModulus.Create(polyModulusDegree, new Int32Array([60, 40, 40, 60]))
    );

    const context = seal.Context(parms, true, security);

    if (!context.parametersSet()) {
      throw new Error('Failed to create valid SEAL context');
    }

    return {
      seal,
      context,
      keyGenerator: seal.KeyGenerator(context),
      encoder: seal.CKKSEncoder(context),
      evaluator: seal.Evaluator(context),
      decryptor: null, // Will be set when private key is available
      encryptor: null, // Will be set when public key is available
    };
  }

  /**
   * Generate homomorphic encryption keys
   */
  public static generateHomomorphicKeys(context: HomomorphicContext): HomomorphicKeys {
    const { keyGenerator } = context;

    const secretKey = keyGenerator.secretKey();
    const publicKey = keyGenerator.createPublicKey();
    const relinKeys = keyGenerator.createRelinKeys();
    const galoisKeys = keyGenerator.createGaloisKeys();

    return {
      publicKey: publicKey.save(),
      secretKey: secretKey.save(),
      relinKeys: relinKeys.save(),
      galoisKeys: galoisKeys.save(),
    };
  }

  /**
   * Cleanup and shutdown WASM modules
   */
  public static cleanup(): void {
    if (this.sealInstance) {
      // SEAL cleanup is handled automatically by the WASM module
      this.sealInstance = null;
    }
    this.isInitialized = false;
    this.initializationPromise = null;
    console.log('🧹 WASM crypto modules cleaned up');
  }
}

/**
 * Homomorphic Encryption Helper
 * Provides high-level interface for medical data analytics
 */
export class HomomorphicEncryption {
  private context: HomomorphicContext;
  private publicKey: PublicKey | null;
  private secretKey: SecretKey | null;
  private relinKeys: RelinKeys | null;
  private galoisKeys: GaloisKeys | null;

  constructor(
    publicKeyData?: string,
    secretKeyData?: string,
    relinKeysData?: string,
    galoisKeysData?: string
  ) {
    this.context = WASMCryptoLoader.createHomomorphicContext();
    this.publicKey = null;
    this.secretKey = null;
    this.relinKeys = null;
    this.galoisKeys = null;

    if (publicKeyData) {
      this.publicKey = this.context.seal.PublicKey();
      this.publicKey.load(this.context.context, publicKeyData);
      this.context.encryptor = this.context.seal.Encryptor(this.context.context, this.publicKey);
    }

    if (secretKeyData) {
      this.secretKey = this.context.seal.SecretKey();
      this.secretKey.load(this.context.context, secretKeyData);
      this.context.decryptor = this.context.seal.Decryptor(this.context.context, this.secretKey);
    }

    if (relinKeysData) {
      this.relinKeys = this.context.seal.RelinKeys();
      this.relinKeys.load(this.context.context, relinKeysData);
    }

    if (galoisKeysData) {
      this.galoisKeys = this.context.seal.GaloisKeys();
      this.galoisKeys.load(this.context.context, galoisKeysData);
    }
  }

  /**
   * Encrypt numerical data for homomorphic computation
   */
  public encryptNumbers(numbers: number[], scale: number = Math.pow(2, 40)): string {
    if (!this.context.encryptor) {
      throw new Error('Public key not available for encryption');
    }

    // Convert number[] to Float64Array as required by SEAL
    const float64Array = new Float64Array(numbers);

    const plaintext = this.context.seal.PlainText();
    this.context.encoder.encode(float64Array, scale, plaintext);

    const ciphertext = this.context.seal.CipherText();
    this.context.encryptor.encrypt(plaintext, ciphertext);

    return ciphertext.save();
  }

  /**
   * Decrypt numerical data from homomorphic computation
   */
  public decryptNumbers(ciphertextData: string): number[] {
    if (!this.context.decryptor) {
      throw new Error('Secret key not available for decryption');
    }

    const ciphertext = this.context.seal.CipherText();
    ciphertext.load(this.context.context, ciphertextData);

    const plaintext = this.context.seal.PlainText();
    this.context.decryptor.decrypt(ciphertext, plaintext);

    // SEAL's decode method returns Float64Array, convert to number[]
    const float64Result = this.context.encoder.decode(plaintext);
    return Array.from(float64Result);
  }

  /**
   * Perform homomorphic addition
   */
  public add(ciphertext1Data: string, ciphertext2Data: string): string {
    const ct1 = this.context.seal.CipherText();
    ct1.load(this.context.context, ciphertext1Data);

    const ct2 = this.context.seal.CipherText();
    ct2.load(this.context.context, ciphertext2Data);

    const result = this.context.seal.CipherText();
    this.context.evaluator.add(ct1, ct2, result);

    return result.save();
  }

  /**
   * Perform homomorphic multiplication
   */
  public multiply(ciphertext1Data: string, ciphertext2Data: string): string {
    if (!this.relinKeys) {
      throw new Error('Relinearization keys not available for multiplication');
    }

    const ct1 = this.context.seal.CipherText();
    ct1.load(this.context.context, ciphertext1Data);

    const ct2 = this.context.seal.CipherText();
    ct2.load(this.context.context, ciphertext2Data);

    const result = this.context.seal.CipherText();
    this.context.evaluator.multiply(ct1, ct2, result);
    this.context.evaluator.relinearize(result, this.relinKeys, result);

    return result.save();
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    // SEAL objects are automatically cleaned up
    this.publicKey = null;
    this.secretKey = null;
    this.relinKeys = null;
    this.galoisKeys = null;
  }
}

/**
 * Initialize all WASM crypto modules
 */
export async function initializeCryptoModules(): Promise<void> {
  console.log('🚀 Initializing WASM crypto modules...');

  try {
    await WASMCryptoLoader.initializeSEAL();
    console.log('✅ All WASM crypto modules initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize WASM crypto modules:', error);
    throw error;
  }
}

/**
 * Cleanup all WASM crypto modules
 */
export function cleanupCryptoModules(): void {
  WASMCryptoLoader.cleanup();
}
