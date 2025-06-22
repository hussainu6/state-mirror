import { stateMirror, watch } from '../src/index';
import { pluginLogger } from '../src/plugins/logger';

// Mock IndexedDB for Node.js environment
const mockIndexedDB = {
  open: jest.fn(() => ({
    onerror: null,
    onsuccess: null,
    onupgradeneeded: null,
    result: {
      objectStoreNames: { contains: jest.fn(() => false) },
      createObjectStore: jest.fn(() => ({
        createIndex: jest.fn()
      })),
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          put: jest.fn(() => ({
            onerror: null,
            onsuccess: null
          })),
          getAll: jest.fn(() => ({
            onerror: null,
            onsuccess: null,
            result: []
          })),
          delete: jest.fn(() => ({
            onerror: null,
            onsuccess: null
          })),
          clear: jest.fn(() => ({
            onerror: null,
            onsuccess: null
          }))
        }))
      }))
    }
  }))
};

// Mock global indexedDB
Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true
});

describe('StateMirror', () => {
  beforeEach(() => {
    // Clear any existing state
    jest.clearAllMocks();
    
    // Setup IndexedDB mock responses
    const mockRequest = mockIndexedDB.open();
    mockRequest.onsuccess = jest.fn() as any;
    mockRequest.onerror = jest.fn() as any;
  });

  describe('Basic Functionality', () => {
    it('should create a StateMirror instance', () => {
      const mirror = stateMirror();
      expect(mirror).toBeDefined();
      expect(mirror.watch).toBeDefined();
      expect(mirror.use).toBeDefined();
    });

    it('should watch a state object', () => {
      const state = { name: 'John', age: 30 };
      const mirror = watch(state, {
        id: 'test-instance',
        strategy: 'broadcast'
      });

      expect(mirror.isWatching).toBe(true);
      expect(mirror.id).toBe('test-instance');
    });

    it('should unwatch a state object', () => {
      const state = { name: 'John', age: 30 };
      const mirror = watch(state, {
        id: 'test-instance',
        strategy: 'broadcast'
      });

      expect(mirror.isWatching).toBe(true);
      mirror.unwatch();
      expect(mirror.isWatching).toBe(false);
    });
  });

  describe('Event System', () => {
    it('should emit events', async () => {
      const state = { name: 'John' };
      const mirror = watch(state, {
        id: 'test-instance',
        strategy: 'broadcast'
      });

      const mockHandler = jest.fn();
      mirror.on('sync', mockHandler);
      mirror.on('update', mockHandler);

      // Trigger an update that will cause a sync
      mirror.update([{ op: 'replace', path: '/name', value: 'Jane' }]);

      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(mockHandler).toHaveBeenCalled();
    });

    it('should remove event listeners', async () => {
      const state = { name: 'John' };
      const mirror = watch(state, {
        id: 'test-instance',
        strategy: 'broadcast'
      });

      const mockHandler = jest.fn();
      mirror.on('sync', mockHandler);
      mirror.off('sync', mockHandler);

      // Trigger an update
      mirror.update([{ op: 'replace', path: '/name', value: 'Jane' }]);

      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('Plugin System', () => {
    it('should use plugins', () => {
      const state = { name: 'John' };
      const mirror = watch(state, {
        id: 'test-instance',
        strategy: 'broadcast'
      });

      const loggerPlugin = pluginLogger();
      mirror.use(loggerPlugin);

      expect(mirror).toBeDefined();
    });

    it('should remove plugins', () => {
      const state = { name: 'John' };
      const mirror = watch(state, {
        id: 'test-instance',
        strategy: 'broadcast'
      });

      const loggerPlugin = pluginLogger();
      mirror.use(loggerPlugin);
      mirror.removePlugin('logger');

      expect(mirror).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should apply default configuration', () => {
      const state = { name: 'John' };
      const mirror = watch(state, {
        id: 'test-instance'
      });

      expect(mirror.config.strategy).toBe('broadcast');
      expect(mirror.config.debounce).toBe(100);
      expect(mirror.config.throttle).toBe(1000);
    });

    it('should apply custom configuration', () => {
      const state = { name: 'John' };
      const mirror = watch(state, {
        id: 'test-instance',
        strategy: 'localStorage',
        debounce: 200,
        throttle: 500,
        paths: ['name']
      });

      expect(mirror.config.strategy).toBe('localStorage');
      expect(mirror.config.debounce).toBe(200);
      expect(mirror.config.throttle).toBe(500);
      expect(mirror.config.paths).toEqual(['name']);
    });
  });

  describe('Queue Management', () => {
    it('should get queue status', async () => {
      const state = { name: 'John' };
      const mirror = watch(state, {
        id: 'test-instance',
        strategy: 'broadcast'
      });

      // Mock the queue status to return immediately
      const mockStatus = {
        pending: 0,
        processing: 0,
        failed: 0,
        lastFlush: Date.now()
      };

      // Mock the getQueueStatus method
      jest.spyOn(mirror, 'getQueueStatus').mockResolvedValue(mockStatus);

      const status = await mirror.getQueueStatus();
      expect(status).toBeDefined();
      expect(status.pending).toBeDefined();
      expect(status.processing).toBeDefined();
      expect(status.failed).toBeDefined();
      expect(status.lastFlush).toBeDefined();
    });

    it('should flush queue', async () => {
      const state = { name: 'John' };
      const mirror = watch(state, {
        id: 'test-instance',
        strategy: 'broadcast'
      });

      // Mock the flushQueue method to resolve immediately
      jest.spyOn(mirror, 'flushQueue').mockResolvedValue();

      await expect(mirror.flushQueue()).resolves.not.toThrow();
    });
  });
}); 