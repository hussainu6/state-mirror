import { Patch, QueueStatus, StorageAdapter } from '../types';

export class OfflineQueue {
  private db: IDBDatabase | null = null;
  private dbName = 'state-mirror-queue';
  private storeName = 'patches';
  private version = 1;
  private isInitialized = false;
  private flushInProgress = false;

  constructor(private storageAdapter?: StorageAdapter) {}

  /**
   * Initialize the IndexedDB database
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (this.storageAdapter) {
        // Use custom storage adapter
        this.isInitialized = true;
        return;
      }

      // Use IndexedDB
      if (typeof indexedDB === 'undefined') {
        throw new Error('IndexedDB is not supported in this environment');
      }

      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.version);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          this.db = request.result;
          this.isInitialized = true;
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          if (!db.objectStoreNames.contains(this.storeName)) {
            const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('source', 'source', { unique: false });
          }
        };
      });
    } catch (error) {
      console.error('StateMirror: Failed to initialize offline queue:', error);
      throw error;
    }
  }

  /**
   * Add a patch to the offline queue
   */
  async enqueue(patch: Patch): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      if (this.storageAdapter) {
        await this.storageAdapter.set(`patch-${patch.id}`, patch);
        return;
      }

      if (!this.db) {
        throw new Error('Database not initialized');
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(patch);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('StateMirror: Failed to enqueue patch:', error);
      throw error;
    }
  }

  /**
   * Get all patches from the queue
   */
  async getAll(): Promise<Patch[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      if (this.storageAdapter) {
        // This is a simplified implementation - in practice you'd need to list all keys
        return [];
      }

      if (!this.db) {
        throw new Error('Database not initialized');
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
      });
    } catch (error) {
      console.error('StateMirror: Failed to get patches from queue:', error);
      return [];
    }
  }

  /**
   * Remove patches from the queue
   */
  async remove(patches: Patch[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      if (this.storageAdapter) {
        for (const patch of patches) {
          await this.storageAdapter.remove(`patch-${patch.id}`);
        }
        return;
      }

      if (!this.db) {
        throw new Error('Database not initialized');
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        let completed = 0;
        let hasError = false;

        patches.forEach(patch => {
          const request = store.delete(patch.id);
          
          request.onerror = () => {
            if (!hasError) {
              hasError = true;
              reject(request.error);
            }
          };
          
          request.onsuccess = () => {
            completed++;
            if (completed === patches.length && !hasError) {
              resolve();
            }
          };
        });
      });
    } catch (error) {
      console.error('StateMirror: Failed to remove patches from queue:', error);
      throw error;
    }
  }

  /**
   * Clear all patches from the queue
   */
  async clear(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      if (this.storageAdapter) {
        await this.storageAdapter.clear();
        return;
      }

      if (!this.db) {
        throw new Error('Database not initialized');
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('StateMirror: Failed to clear queue:', error);
      throw error;
    }
  }

  /**
   * Get queue status
   */
  async getStatus(): Promise<QueueStatus> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const patches = await this.getAll();
      
      return {
        pending: patches.length,
        processing: this.flushInProgress ? patches.length : 0,
        failed: 0, // This would need to be tracked separately
        lastFlush: Date.now() // This would need to be tracked separately
      };
    } catch (error) {
      console.error('StateMirror: Failed to get queue status:', error);
      return {
        pending: 0,
        processing: 0,
        failed: 0,
        lastFlush: 0
      };
    }
  }

  /**
   * Flush the queue by sending all patches
   */
  async flush(sendFunction: (patch: Patch) => Promise<void>): Promise<void> {
    if (this.flushInProgress) {
      console.warn('StateMirror: Flush already in progress');
      return;
    }

    this.flushInProgress = true;

    try {
      const patches = await this.getAll();
      
      if (patches.length === 0) {
        return;
      }

      console.log(`StateMirror: Flushing ${patches.length} patches from queue`);

      // Sort patches by timestamp
      patches.sort((a, b) => a.timestamp - b.timestamp);

      const successfulPatches: Patch[] = [];
      const failedPatches: Patch[] = [];

      for (const patch of patches) {
        try {
          await sendFunction(patch);
          successfulPatches.push(patch);
        } catch (error) {
          console.error('StateMirror: Failed to send patch from queue:', error);
          failedPatches.push(patch);
        }
      }

      // Remove successful patches from queue
      if (successfulPatches.length > 0) {
        await this.remove(successfulPatches);
      }

      console.log(`StateMirror: Flushed ${successfulPatches.length} patches, ${failedPatches.length} failed`);
    } catch (error) {
      console.error('StateMirror: Error during queue flush:', error);
      throw error;
    } finally {
      this.flushInProgress = false;
    }
  }

  /**
   * Check if the queue is empty
   */
  async isEmpty(): Promise<boolean> {
    const patches = await this.getAll();
    return patches.length === 0;
  }

  /**
   * Get the size of the queue
   */
  async size(): Promise<number> {
    const patches = await this.getAll();
    return patches.length;
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.isInitialized = false;
  }
} 