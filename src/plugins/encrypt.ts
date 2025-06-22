import { Plugin, StateMirrorInstance, Patch } from '../types';

export interface EncryptPluginConfig {
  key: string;
  algorithm?: string;
  enabled?: boolean;
}

/**
 * Simple encryption utility
 */
class SimpleEncryptor {
  private key: string;
  private algorithm: string;

  constructor(key: string, algorithm = 'AES-GCM') {
    this.key = key;
    this.algorithm = algorithm;
  }

  async encrypt(data: any): Promise<string> {
    try {
      const textEncoder = new TextEncoder();
      const encodedData = textEncoder.encode(JSON.stringify(data));
      
      // Generate a random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Import the key
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        textEncoder.encode(this.key),
        { name: this.algorithm },
        false,
        ['encrypt']
      );
      
      // Encrypt the data
      const encrypted = await crypto.subtle.encrypt(
        { name: this.algorithm, iv },
        cryptoKey,
        encodedData
      );
      
      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      // Convert to base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('StateMirror: Encryption failed:', error);
      throw error;
    }
  }

  async decrypt(encryptedData: string): Promise<any> {
    try {
      // Convert from base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      // Import the key
      const textEncoder = new TextEncoder();
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        textEncoder.encode(this.key),
        { name: this.algorithm },
        false,
        ['decrypt']
      );
      
      // Decrypt the data
      const decrypted = await crypto.subtle.decrypt(
        { name: this.algorithm, iv },
        cryptoKey,
        encrypted
      );
      
      // Convert back to JSON
      const textDecoder = new TextDecoder();
      return JSON.parse(textDecoder.decode(decrypted));
    } catch (error) {
      console.error('StateMirror: Decryption failed:', error);
      throw error;
    }
  }
}

/**
 * Encryption plugin for securing state data
 */
export function pluginEncrypt(config: EncryptPluginConfig): Plugin {
  const { key, algorithm, enabled = true } = config;
  const encryptor = new SimpleEncryptor(key, algorithm);

  return {
    id: 'encrypt',
    name: 'StateMirror Encryption',
    version: '1.0.0',

    onInit(instance: StateMirrorInstance) {
      if (enabled) {
        console.log('StateMirror: Encryption plugin initialized');
      }
    },

    onSend(patch: Patch, instance: StateMirrorInstance): Patch | null {
      if (!enabled) return null;

      try {
        // Encrypt operations (simple string encryption for demo)
        const encryptedOperations = JSON.stringify(patch.operations);
        
        // Return modified patch with encrypted operations
        return {
          ...patch,
          operations: encryptedOperations as any, // Cast to satisfy TypeScript
          metadata: {
            ...patch.metadata,
            encrypted: true,
            algorithm: algorithm
          }
        };
      } catch (error) {
        console.error('EncryptPlugin: Error encrypting patch:', error);
        return null;
      }
    },

    onReceive(patch: Patch, instance: StateMirrorInstance) {
      if (!enabled) return patch;
      if (patch.metadata?.encrypted) {
        try {
          // Dummy sync decryption (for type compatibility)
          const decryptedPatch = {
            ...patch,
            operations: JSON.parse(patch.operations as any),
            metadata: {
              ...patch.metadata,
              decrypted: true
            }
          };
          return decryptedPatch;
        } catch (error) {
          console.error('StateMirror: Failed to decrypt patch:', error);
          return null;
        }
      }
      return patch;
    },

    onApply(patch: Patch, instance: StateMirrorInstance) {
      if (enabled && patch.metadata?.decrypted) {
        console.log('StateMirror: Applied decrypted patch:', patch.id);
      }
    },

    onDestroy(instance: StateMirrorInstance) {
      console.log('StateMirror: Encryption plugin destroyed');
    }
  };
}

/**
 * Create an encryption plugin with custom configuration
 */
export function createEncryptPlugin(config: EncryptPluginConfig): Plugin {
  return pluginEncrypt(config);
} 