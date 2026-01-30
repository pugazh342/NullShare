import * as Crypto from 'expo-crypto';

// Helper: Convert byte array to Hex String
const toHex = (byteArray) => {
  return Array.from(byteArray)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
};

// 1. Generate a random AES-256 Key (32 bytes) using Expo Native Crypto
export const generateKey = () => {
  const randomBytes = Crypto.getRandomBytes(32);
  return toHex(randomBytes);
};

// 2. Generate a random IV (16 bytes)
export const generateIV = () => {
  const randomBytes = Crypto.getRandomBytes(16);
  return toHex(randomBytes);
};