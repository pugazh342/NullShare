import CryptoJS from 'crypto-js';
import { generateIV } from './keygen'; // Import our SAFE generator

/**
 * Encrypts data using AES-256.
 * @param {string} data - The plaintext data.
 * @param {string} keyHex - The 64-char hex key.
 * @returns {object} - { encryptedData, iv }
 */
export const encryptData = (data, keyHex) => {
  try {
    const key = CryptoJS.enc.Hex.parse(keyHex);
    
    // 🛑 CRITICAL FIX: Use our safe 'keygen' to get the IV
    // Do NOT let CryptoJS generate it internally.
    const ivHex = generateIV(); 
    const iv = CryptoJS.enc.Hex.parse(ivHex);

    const encrypted = CryptoJS.AES.encrypt(data, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    return {
      encryptedData: encrypted.toString(), // Base64 ciphertext
      iv: ivHex                            // Return the Hex IV we generated
    };
  } catch (error) {
    console.error("Encryption Failed:", error);
    throw error;
  }
};

/**
 * Decrypts data using AES-256.
 */
export const decryptData = (encryptedData, keyHex, ivHex) => {
  try {
    const key = CryptoJS.enc.Hex.parse(keyHex);
    const iv = CryptoJS.enc.Hex.parse(ivHex);

    const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Decryption Failed:", error);
    return null;
  }
};