# StateMirror 🔄

A powerful TypeScript library for real-time, bi-directional synchronization of JavaScript/TypeScript objects across browser tabs, windows, and devices.

[![npm version](https://badge.fury.io/js/state-mirror.svg)](https://badge.fury.io/js/state-mirror)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🔄 **Cross-Tab & Cross-Window Sync** - Uses BroadcastChannel API with localStorage fallback
- 🌐 **Multi-Device Sync** - Optional Firebase integration for cross-device synchronization
- ⚡ **Performance Optimized** - Debounce & throttle controls, selective path watching
- 🧠 **Conflict Resolution** - Built-in conflict resolution with custom merge strategies
- 🔌 **Plugin System** - Extensible architecture with lifecycle hooks
- 📱 **Offline Support** - Queue updates when offline, flush when reconnected
- 🛠️ **DevTools** - Visual debugger overlay for development
- 🎯 **Framework Agnostic** - Works with any JavaScript framework or vanilla JS
- 🔒 **Encryption Support** - Optional encryption plugin for secure data

## 🚀 Quick Start

### Installation

```bash
npm install state-mirror
```

### Basic Usage

```typescript
import { stateMirror } from 'state-mirror';
import { pluginLogger } from 'state-mirror/plugins';

// Create a state object
const user = { 
  name: 'John Doe', 
  email: 'john@example.com',
  updatedAt: Date.now() 
};

// Watch the state for changes
const mirror = stateMirror().watch(user, {
  id: 'user-profile',
  strategy: 'broadcast',
  debounce: 100,
  paths: ['name', 'email'],
  conflictResolver: (local, incoming) =>
    local.updatedAt > incoming.updatedAt ? local : incoming,
});

// Add logging plugin
mirror.use(pluginLogger());

// Listen for updates
mirror.on('update', (patch) => {
  console.log('Synced patch:', patch);
});

// Update the state (automatically syncs across tabs)
user.name = 'Jane Doe';
mirror.sync();
```

## 📖 Documentation

### Core Concepts

#### StateMirror Instance

The main entry point for state synchronization:

```typescript
import { stateMirror, StateMirrorConfig } from 'state-mirror';

const config: StateMirrorConfig = {
  id: 'unique-instance-id',
  strategy: 'broadcast', // 'broadcast' | 'localStorage' | 'firebase'
  debounce: 100, // Debounce updates (ms)
  throttle: 1000, // Throttle updates (ms)
  paths: ['user.name', 'settings.theme'], // Only sync specific paths
  conflictResolver: (local, incoming) => {
    // Custom conflict resolution logic
    return local.timestamp > incoming.timestamp ? local : incoming;
  },
  enableDevTools: true, // Enable visual debugger
};

const mirror = stateMirror().watch(state, config);
```

#### Plugin System

Extend functionality with plugins:

```typescript
import { pluginLogger, pluginFirebase, pluginEncrypt } from 'state-mirror/plugins';

// Logger plugin for debugging
mirror.use(pluginLogger({
  level: 'info',
  includePatches: true
}));

// Firebase plugin for cross-device sync
mirror.use(pluginFirebase({
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
  path: 'state-mirror'
}));

// Encryption plugin for security
mirror.use(pluginEncrypt({
  key: 'your-secret-key',
  algorithm: 'AES-GCM'
}));
```

#### Conflict Resolution

Handle conflicts between simultaneous updates:

```typescript
// Timestamp-based resolution
const timestampResolver = (local, incoming) => {
  return local.timestamp >= incoming.timestamp ? local : incoming;
};

// Merge-based resolution
const mergeResolver = (local, incoming) => {
  return {
    ...local,
    operations: [...local.operations, ...incoming.operations],
    version: Math.max(local.version, incoming.version) + 1
  };
};

// Path-based resolution
const pathResolver = (local, incoming) => {
  // Resolve conflicts per path
  const resolvedOperations = [];
  // ... custom logic
  return { ...local, operations: resolvedOperations };
};
```

### API Reference

#### StateMirrorInstance

```typescript
interface StateMirrorInstance {
  // Core methods
  watch<T>(state: T, config: StateMirrorConfig): StateMirrorInstance;
  unwatch(): void;
  update(operations: Operation[]): void;
  sync(): Promise<void>;
  
  // Plugin system
  use(plugin: Plugin): StateMirrorInstance;
  removePlugin(pluginId: string): void;
  
  // Event system
  on(event: string, handler: EventHandler): void;
  off(event: string, handler: EventHandler): void;
  emit(event: string, data?: any): void;
  
  // DevTools
  enableDevTools(): void;
  disableDevTools(): void;
  
  // Queue management
  flushQueue(): Promise<void>;
  getQueueStatus(): Promise<QueueStatus>;
}
```

#### Events

```typescript
// Available events
mirror.on('update', (data) => {
  // State updated locally
});

mirror.on('sync', (data) => {
  // State synced with other tabs
});

mirror.on('conflict', (data) => {
  // Conflict detected and resolved
});

mirror.on('connect', () => {
  // Connected to other tabs
});

mirror.on('disconnect', () => {
  // Disconnected from other tabs
});

mirror.on('error', (error) => {
  // Error occurred
});
```

### Advanced Usage

#### Selective Path Watching

Only sync specific parts of your state:

```typescript
const state = {
  user: { name: 'John', email: 'john@example.com' },
  settings: { theme: 'dark', notifications: true },
  private: { secretKey: 'abc123' } // Won't be synced
};

const mirror = stateMirror().watch(state, {
  id: 'app-state',
  paths: ['user.name', 'user.email', 'settings.theme']
  // Only user.name, user.email, and settings.theme will be synced
});
```

#### Offline Queue Management

Handle offline scenarios:

```typescript
// Check queue status
const status = await mirror.getQueueStatus();
console.log('Pending updates:', status.pending);

// Manually flush queue
await mirror.flushQueue();

// Listen for online/offline events
window.addEventListener('online', () => {
  mirror.flushQueue(); // Flush queued updates
});
```

#### Custom Plugins

Create your own plugins:

```typescript
import { Plugin } from 'state-mirror';

const customPlugin: Plugin = {
  id: 'my-plugin',
  name: 'My Custom Plugin',
  version: '1.0.0',
  
  onInit(instance) {
    console.log('Plugin initialized');
  },
  
  onSend(patch, instance) {
    // Modify patch before sending
    return { ...patch, metadata: { ...patch.metadata, processed: true } };
  },
  
  onReceive(patch, instance) {
    // Process incoming patch
    return patch;
  },
  
  onApply(patch, instance) {
    // Handle applied patch
    console.log('Patch applied:', patch.id);
  },
  
  onDestroy(instance) {
    console.log('Plugin destroyed');
  }
};

mirror.use(customPlugin);
```

## 🛠️ DevTools

Enable the visual debugger:

```typescript
import { enableDevTools } from 'state-mirror/devtools';

const devTools = enableDevTools(mirror, {
  position: 'top-right', // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  theme: 'light', // 'light' | 'dark'
  autoHide: false,
  showPatches: true,
  showPlugins: true
});

// Control DevTools
devTools.show();
devTools.hide();
devTools.toggle();
devTools.destroy();
```

## 🔌 Available Plugins

### Logger Plugin

```typescript
import { pluginLogger } from 'state-mirror/plugins';

mirror.use(pluginLogger({
  enabled: true,
  level: 'info', // 'debug' | 'info' | 'warn' | 'error'
  includePatches: true,
  includeState: false,
  prefix: 'StateMirror'
}));
```

### Firebase Plugin

```typescript
import { pluginFirebase } from 'state-mirror/plugins';

mirror.use(pluginFirebase({
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
  databaseURL: 'https://your-project.firebaseio.com',
  path: 'state-mirror',
  auth: true,
  realtime: true
}));
```

### Encryption Plugin

```typescript
import { pluginEncrypt } from 'state-mirror/plugins';

mirror.use(pluginEncrypt({
  key: 'your-secret-key',
  algorithm: 'AES-GCM', // Default
  enabled: true
}));
```

## 📦 Examples

### React Integration

```typescript
import React, { useState, useEffect } from 'react';
import { stateMirror } from 'state-mirror';

function useStateMirror<T>(initialState: T, config: StateMirrorConfig) {
  const [state, setState] = useState(initialState);
  const [mirror, setMirror] = useState<any>(null);

  useEffect(() => {
    const m = stateMirror().watch(state, config);
    setMirror(m);

    return () => {
      m.unwatch();
    };
  }, []);

  const updateState = (updates: Partial<T>) => {
    setState(prev => ({ ...prev, ...updates }));
    mirror?.sync();
  };

  return [state, updateState, mirror] as const;
}

// Usage
function TodoApp() {
  const [todos, setTodos, mirror] = useStateMirror(
    { items: [] },
    { id: 'todos', strategy: 'broadcast' }
  );

  const addTodo = (text: string) => {
    setTodos({
      items: [...todos.items, { id: Date.now(), text, completed: false }]
    });
  };

  return (
    <div>
      {/* Your React components */}
    </div>
  );
}
```

### Vue Integration

```typescript
import { ref, watch } from 'vue';
import { stateMirror } from 'state-mirror';

export function useStateMirror(initialState: any, config: StateMirrorConfig) {
  const state = ref(initialState);
  const mirror = stateMirror().watch(state.value, config);

  watch(state, () => {
    mirror.sync();
  }, { deep: true });

  return { state, mirror };
}
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run CLI tools
npm run cli:test
npm run cli:inspect
```

## 📋 Browser Support

- Chrome 54+
- Firefox 38+
- Safari 10.1+
- Edge 79+

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [fast-json-patch](https://github.com/Starcounter-Jack/JSON-Patch) for efficient diffing
- [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API) for cross-tab communication
- [Firebase](https://firebase.google.com/) for cross-device synchronization

## 📞 Support

- 📧 Email: support@statemirror.dev
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/state-mirror/issues)
- 📖 Documentation: [docs.statemirror.dev](https://docs.statemirror.dev)
- 💬 Discord: [Join our community](https://discord.gg/statemirror) 