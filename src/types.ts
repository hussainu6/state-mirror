// Define Operation type locally
export type Operation = { op: string; path: string; value?: any; from?: string };

export interface StateMirrorConfig {
  id: string;
  strategy?: 'broadcast' | 'localStorage' | 'firebase';
  debounce?: number;
  throttle?: number;
  paths?: string[];
  conflictResolver?: ConflictResolver;
  plugins?: Plugin[];
  enableDevTools?: boolean;
  firebaseConfig?: FirebaseConfig;
}

export interface FirebaseConfig {
  apiKey: string;
  projectId: string;
  databaseURL?: string;
  authDomain?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export interface Patch {
  id: string;
  timestamp: number;
  source: string;
  target: string;
  operations: Operation[];
  version: number;
  metadata?: Record<string, any>;
}

export interface StateMirrorInstance {
  id: string;
  config: StateMirrorConfig;
  state: any;
  isConnected: boolean;
  isWatching: boolean;
  
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

export interface Plugin {
  id: string;
  name: string;
  version: string;
  
  // Lifecycle hooks
  onInit?(instance: StateMirrorInstance): void;
  onSend?(patch: Patch, instance: StateMirrorInstance): Patch | null;
  onReceive?(patch: Patch, instance: StateMirrorInstance): Patch | null;
  onApply?(patch: Patch, instance: StateMirrorInstance): void;
  onConflict?(local: Patch, incoming: Patch, instance: StateMirrorInstance): Patch;
  onFlush?(patches: Patch[], instance: StateMirrorInstance): void;
  onDestroy?(instance: StateMirrorInstance): void;
}

export interface ConflictResolver {
  (local: Patch, incoming: Patch, instance: StateMirrorInstance): Patch;
}

export interface EventHandler {
  (data?: any): void;
}

export interface QueueStatus {
  pending: number;
  processing: number;
  failed: number;
  lastFlush: number;
}

export interface DevToolsConfig {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  theme?: 'light' | 'dark';
  autoHide?: boolean;
  showPatches?: boolean;
  showPlugins?: boolean;
}

export interface BroadcastMessage {
  type: 'patch' | 'sync' | 'ping' | 'pong';
  data: any;
  source: string;
  timestamp: number;
}

export interface StorageAdapter {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface NetworkAdapter {
  connect(): Promise<void>;
  disconnect(): void;
  send(message: BroadcastMessage): Promise<void>;
  onMessage(handler: (message: BroadcastMessage) => void): void;
  isConnected(): boolean;
}

export interface DiffResult {
  operations: Operation[];
  hasChanges: boolean;
}

export interface ThrottleConfig {
  delay: number;
  leading?: boolean;
  trailing?: boolean;
}

export interface DebounceConfig {
  delay: number;
  leading?: boolean;
  trailing?: boolean;
}

// Event types
export type StateMirrorEvents = 
  | 'update'
  | 'sync'
  | 'conflict'
  | 'connect'
  | 'disconnect'
  | 'error'
  | 'queue-flush'
  | 'plugin-loaded'
  | 'plugin-error';

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type PathValue<T, P extends string> = P extends keyof T 
  ? T[P] 
  : P extends `${infer K}.${infer R}` 
    ? K extends keyof T 
      ? PathValue<T[K], R> 
      : never 
    : never; 