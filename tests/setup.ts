// Mock BroadcastChannel API for testing
class MockBroadcastChannel {
  private listeners: ((event: any) => void)[] = [];

  constructor(public name: string) {}

  postMessage(message: any) {
    // Simulate message broadcasting
    setTimeout(() => {
      this.listeners.forEach(listener => {
        listener({ data: message });
      });
    }, 0);
  }

  addEventListener(type: string, listener: (event: any) => void) {
    if (type === 'message') {
      this.listeners.push(listener);
    }
  }

  removeEventListener(type: string, listener: (event: any) => void) {
    if (type === 'message') {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    }
  }

  close() {
    this.listeners = [];
  }
}

// Mock localStorage
const mockLocalStorage = {
  data: {} as Record<string, string>,
  getItem(key: string) {
    return this.data[key] || null;
  },
  setItem(key: string, value: string) {
    this.data[key] = value;
  },
  removeItem(key: string) {
    delete this.data[key];
  },
  clear() {
    this.data = {};
  }
};

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn().mockReturnValue({
    result: {
      createObjectStore: jest.fn(),
      transaction: jest.fn().mockReturnValue({
        objectStore: jest.fn().mockReturnValue({
          put: jest.fn(),
          get: jest.fn(),
          getAll: jest.fn(),
          delete: jest.fn(),
          clear: jest.fn()
        })
      })
    },
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null
  })
};

// Setup global mocks
Object.defineProperty(window, 'BroadcastChannel', {
  value: MockBroadcastChannel,
  writable: true
});

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true
});

// Mock crypto API
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: jest.fn().mockReturnValue(new Uint8Array(12)),
    subtle: {
      importKey: jest.fn().mockResolvedValue({}),
      encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(16)),
      decrypt: jest.fn().mockResolvedValue(new ArrayBuffer(16))
    }
  },
  writable: true
});

// Mock TextEncoder/TextDecoder
global.TextEncoder = class {
  encode(text: string) {
    return new Uint8Array(Buffer.from(text, 'utf8'));
  }
} as any;

global.TextDecoder = class {
  decode(buffer: ArrayBuffer) {
    return Buffer.from(buffer).toString('utf8');
  }
} as any;

// Mock btoa/atob
global.btoa = jest.fn((str: string) => Buffer.from(str).toString('base64'));
global.atob = jest.fn((str: string) => Buffer.from(str, 'base64').toString());

// Mock timers
const originalSetTimeout = global.setTimeout;
const originalSetInterval = global.setInterval;

global.setTimeout = jest.fn((fn: Function, delay: number) => {
  return originalSetTimeout(fn, delay);
}) as any;

global.setInterval = jest.fn((fn: Function, delay: number) => {
  return originalSetInterval(fn, delay);
}) as any;

// Mock clearTimeout/clearInterval
global.clearTimeout = jest.fn();
global.clearInterval = jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}; 