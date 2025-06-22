import { StateMirrorWatcher } from './core/watcher';
import { StateMirrorConfig, StateMirrorInstance } from './types';

/**
 * Create a new StateMirror instance
 */
export function stateMirror(): StateMirrorWatcher {
  return new StateMirrorWatcher();
}

/**
 * Watch a state object with the given configuration
 */
export function watch<T>(state: T, config: StateMirrorConfig): StateMirrorInstance {
  const mirror = stateMirror();
  return mirror.watch(state, config);
}

// Export types
export type {
  StateMirrorConfig,
  StateMirrorInstance,
  Patch,
  Plugin,
  ConflictResolver,
  EventHandler,
  QueueStatus,
  DevToolsConfig,
  BroadcastMessage,
  StorageAdapter,
  NetworkAdapter,
  DiffResult,
  ThrottleConfig,
  DebounceConfig,
  FirebaseConfig,
  StateMirrorEvents,
  DeepPartial,
  PathValue
} from './types';

// Export core classes for advanced usage
export { StateMirrorWatcher } from './core/watcher';
export { DiffEngine } from './core/diffEngine';
export { Broadcaster } from './core/broadcaster';
export { ConflictEngine } from './core/conflict';
export { ThrottleManager } from './core/throttle';
export { OfflineQueue } from './core/queue';

// Export utility functions
export { throttle, debounce } from './core/throttle';

// Default export
export default stateMirror; 