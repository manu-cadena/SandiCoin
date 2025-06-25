import crypto from 'crypto';

/**
 * Cryptography utilities for SandiCoin
 * Handles key generation, signing, and verification
 */

export interface KeyPair {
  publicKey: string;           // Real PEM public key for crypto
  privateKey: string;
  bitcoinAddress: string;      // Bitcoin-style address for display
}

// Generate Bitcoin-style address from public key
export const createBitcoinStyleAddress = (publicKey: string): string => {
  // Create hash of public key
  const hash = crypto.createHash('sha256').update(publicKey).digest();
  const ripemd160 = crypto.createHash('ripemd160').update(hash).digest();
  
  // Add version byte (0x00 for mainnet)
  const versionedHash = Buffer.concat([Buffer.from([0x00]), ripemd160]);
  
  // Create checksum
  const checksum = crypto.createHash('sha256')
    .update(crypto.createHash('sha256').update(versionedHash).digest())
    .digest()
    .slice(0, 4);
  
  // Combine version + hash + checksum
  const address = Buffer.concat([versionedHash, checksum]);
  
  // Base58 encode (simplified - using base58 characters)
  return base58Encode(address);
};

// Simple Base58 encoding (Bitcoin-style)
const base58Encode = (buffer: Buffer): string => {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';
  
  // Convert to big integer
  let num = BigInt('0x' + buffer.toString('hex'));
  
  while (num > 0) {
    const remainder = num % 58n;
    result = alphabet[Number(remainder)] + result;
    num = num / 58n;
  }
  
  // Handle leading zeros
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
    result = '1' + result;
  }
  
  return result;
};

// Generate ECDSA key pair for Bitcoin-style addresses
export const generateKeyPair = (): KeyPair => {
  // Generate ECDSA key pair (secp256k1 curve like Bitcoin)
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp256k1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  // Create Bitcoin-style address from public key
  const bitcoinAddress = createBitcoinStyleAddress(publicKey);

  return { 
    publicKey,              // Real PEM public key for crypto operations
    privateKey,
    bitcoinAddress          // Bitcoin-style address for display/transactions
  };
};

// Create digital signature using private key
export const signData = (data: any, privateKey: string): string => {
  const dataString = JSON.stringify(data);

  const signObject = crypto.createSign('SHA256');
  signObject.update(dataString);
  
  const signature = signObject.sign(privateKey);
  return signature.toString('hex');
};

// Verify digital signature using public key
export const verifySignature = ({
  publicKey,
  data,
  signature,
}: {
  publicKey: string;
  data: any;
  signature: string;
}): boolean => {
  try {
    const dataString = JSON.stringify(data);

    const verifyObject = crypto.createVerify('SHA256');
    verifyObject.update(dataString);

    return verifyObject.verify(publicKey, signature, 'hex');
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
};

// Create hash
export const createHash = (...args: any[]): string => {
  return crypto
    .createHash('sha256')
    .update(
      args
        .map((arg) => JSON.stringify(arg))
        .sort()
        .join('')
    )
    .digest('hex');
};
