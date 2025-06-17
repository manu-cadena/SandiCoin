import crypto from 'crypto';

/**
 * Cryptography utilities for SandiCoin
 * Handles key generation, signing, and verification
 */

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

// Generate RSA key pair for digital signatures
export const generateKeyPair = (): KeyPair => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  return { publicKey, privateKey };
};

// Create digital signature using private key
export const signData = (data: any, privateKey: string): string => {
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(data))
    .digest();

  const signature = crypto.sign('SHA256', hash, privateKey);
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
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest();

    const verifyObject = crypto.createVerify('SHA256');
    verifyObject.update(hash);

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
