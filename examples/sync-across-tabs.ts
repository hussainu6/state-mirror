import { stateMirror, watch } from '../src/index';
import { pluginLogger } from '../src/plugins/logger';
import { enableDevTools } from '../src/devtools';

// Example 1: Basic cross-tab synchronization
export function basicCrossTabSync() {
  // Create a state object
  const userState = {
    name: 'John Doe',
    email: 'john@example.com',
    preferences: {
      theme: 'light',
      notifications: true
    },
    lastUpdated: Date.now()
  };

  // Watch the state for changes
  const mirror = watch(userState, {
    id: 'user-profile',
    strategy: 'broadcast',
    debounce: 100,
    paths: ['name', 'email', 'preferences.theme'],
    conflictResolver: (local, incoming) => {
      // Use timestamp-based conflict resolution
      return local.timestamp > incoming.timestamp ? local : incoming;
    }
  });

  // Add logging plugin
  mirror.use(pluginLogger({
    level: 'info',
    includePatches: true
  }));

  // Enable DevTools
  enableDevTools(mirror, {
    position: 'top-right',
    theme: 'light',
    showPatches: true
  });

  // Listen for updates
  mirror.on('update', (data) => {
    console.log('State updated:', data);
  });

  mirror.on('sync', (data) => {
    console.log('State synced:', data);
  });

  // Example: Update the state
  setTimeout(() => {
    userState.name = 'Jane Doe';
    userState.preferences.theme = 'dark';
    userState.lastUpdated = Date.now();
    
    // Trigger sync
    mirror.sync();
  }, 2000);

  return mirror;
}

// Example 2: Advanced configuration with multiple plugins
export function advancedSyncExample() {
  const appState = {
    todos: [
      { id: 1, text: 'Learn StateMirror', completed: false },
      { id: 2, text: 'Build amazing app', completed: false }
    ],
    filters: {
      showCompleted: true,
      sortBy: 'date'
    },
    user: {
      id: 'user-123',
      name: 'Developer'
    }
  };

  const mirror = stateMirror().watch(appState, {
    id: 'todo-app',
    strategy: 'broadcast',
    debounce: 50,
    throttle: 500,
    paths: ['todos', 'filters'],
    enableDevTools: true
  });

  // Add multiple plugins
  mirror.use(pluginLogger({
    level: 'debug',
    includeState: true
  }));

  // Example: Add a todo
  setTimeout(() => {
    appState.todos.push({
      id: 3,
      text: 'Test cross-tab sync',
      completed: false
    });
    
    mirror.sync();
  }, 1000);

  return mirror;
}

// Example 3: React-like usage with manual updates
export function reactLikeExample() {
  const state = {
    counter: 0,
    user: {
      name: 'React User',
      settings: {
        autoSave: true
      }
    }
  };

  const mirror = watch(state, {
    id: 'react-app',
    strategy: 'broadcast',
    debounce: 0, // No debounce for immediate updates
    paths: ['counter', 'user.settings']
  });

  // Simulate React-like state updates
  const setState = (updates: Partial<typeof state>) => {
    Object.assign(state, updates);
    mirror.sync();
  };

  const incrementCounter = () => {
    setState({ counter: state.counter + 1 });
  };

  const toggleAutoSave = () => {
    setState({
      user: {
        ...state.user,
        settings: {
          ...state.user.settings,
          autoSave: !state.user.settings.autoSave
        }
      }
    });
  };

  // Example usage
  setTimeout(() => {
    incrementCounter();
  }, 1000);

  setTimeout(() => {
    toggleAutoSave();
  }, 2000);

  return { mirror, setState, incrementCounter, toggleAutoSave };
}

// Example 4: Offline queue demonstration
export function offlineQueueExample() {
  const state = {
    messages: [] as Array<{ id: number; text: string; timestamp: number }>,
    isOnline: navigator.onLine
  };

  const mirror = watch(state, {
    id: 'chat-app',
    strategy: 'broadcast',
    debounce: 100
  });

  // Listen for online/offline events
  window.addEventListener('online', () => {
    state.isOnline = true;
    mirror.sync();
    mirror.flushQueue(); // Flush any queued updates
  });

  window.addEventListener('offline', () => {
    state.isOnline = false;
    mirror.sync();
  });

  // Add a message (will be queued if offline)
  const addMessage = (text: string) => {
    state.messages.push({
      id: Date.now(),
      text,
      timestamp: Date.now()
    });
    mirror.sync();
  };

  // Example: Add messages
  setTimeout(() => {
    addMessage('Hello from tab 1!');
  }, 1000);

  return { mirror, addMessage };
}

// Example 5: Custom conflict resolution
export function customConflictResolution() {
  const state = {
    document: {
      content: 'Initial content',
      version: 1,
      lastModified: Date.now()
    }
  };

  const mirror = watch(state, {
    id: 'document-editor',
    strategy: 'broadcast',
    debounce: 200,
    conflictResolver: (local, incoming) => {
      // Custom merge strategy for document content
      const localContent = local.operations.find(op => op.path === '/document/content');
      const incomingContent = incoming.operations.find(op => op.path === '/document/content');
      
      if (localContent && incomingContent) {
        // Merge content by concatenating
        const mergedContent = localContent.value + '\n' + incomingContent.value;
        
        return {
          ...local,
          operations: [
            {
              op: 'replace',
              path: '/document/content',
              value: mergedContent
            },
            {
              op: 'replace',
              path: '/document/version',
              value: Math.max(local.operations.find(op => op.path === '/document/version')?.value || 0,
                            incoming.operations.find(op => op.path === '/document/version')?.value || 0) + 1
            }
          ]
        };
      }
      
      // Fallback to timestamp-based resolution
      return local.timestamp > incoming.timestamp ? local : incoming;
    }
  });

  // Update document content
  setTimeout(() => {
    state.document.content = 'Updated content from tab 1';
    state.document.version++;
    state.document.lastModified = Date.now();
    mirror.sync();
  }, 1000);

  return mirror;
}

// Run examples when this file is executed
if (typeof window !== 'undefined') {
  console.log('StateMirror Examples Loaded');
  
  // Uncomment to run specific examples:
  // basicCrossTabSync();
  // advancedSyncExample();
  // reactLikeExample();
  // offlineQueueExample();
  // customConflictResolution();
} 