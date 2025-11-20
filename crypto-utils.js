// Encryption utilities using Web Crypto API
// This provides secure client-side encryption for API keys

const STORAGE_KEY = 'fortigate_encrypted_api_key';
const SALT_STORAGE_KEY = 'fortigate_encryption_salt';

// Generate a random salt
async function generateSalt() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return array;
}

// Derive encryption key from password using PBKDF2
async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        passwordKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

// Encrypt API key
async function encryptApiKey(apiKey, password) {
    try {
        // Generate salt
        const salt = await generateSalt();
        
        // Derive key from password
        const key = await deriveKey(password, salt);
        
        // Encrypt the API key
        const encoder = new TextEncoder();
        const data = encoder.encode(apiKey);
        const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
        
        const encrypted = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            data
        );
        
        // Store salt, IV, and encrypted data
        const saltArray = Array.from(salt);
        const ivArray = Array.from(iv);
        const encryptedArray = Array.from(new Uint8Array(encrypted));
        
        const storageData = {
            salt: saltArray,
            iv: ivArray,
            encrypted: encryptedArray
        };
        
        // Save to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
        localStorage.setItem(SALT_STORAGE_KEY, JSON.stringify(saltArray));
        
        return true;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt API key: ' + error.message);
    }
}

// Decrypt API key
async function decryptApiKey(password) {
    try {
        // Retrieve encrypted data from localStorage
        const storageDataStr = localStorage.getItem(STORAGE_KEY);
        if (!storageDataStr) {
            throw new Error('No encrypted API key found');
        }
        
        const storageData = JSON.parse(storageDataStr);
        const salt = new Uint8Array(storageData.salt);
        const iv = new Uint8Array(storageData.iv);
        const encrypted = new Uint8Array(storageData.encrypted);
        
        // Derive key from password
        const key = await deriveKey(password, salt);
        
        // Decrypt the API key
        const decrypted = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            encrypted
        );
        
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (error) {
        console.error('Decryption error:', error);
        if (error.message.includes('No encrypted API key')) {
            throw error;
        }
        throw new Error('Failed to decrypt API key. Wrong password?');
    }
}

// Check if encrypted API key exists
function hasEncryptedApiKey() {
    return localStorage.getItem(STORAGE_KEY) !== null;
}

// Clear encrypted API key
function clearEncryptedApiKey() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SALT_STORAGE_KEY);
}

// Functions are available globally for use in app.js
// No need to export in browser environment

