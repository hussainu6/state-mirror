import { v4 as uuidv4 } from 'uuid';
import jsonpatch from 'fast-json-patch';
import { 
  StateMirrorConfig, 
  StateMirrorInstance, 
  Patch, 
  Plugin, 
  EventHandler, 
  QueueStatus,
  BroadcastMessage 
} from '../types';
import { DiffEngine } from './diffEngine';
import { Broadcaster } from './broadcaster';
import { ConflictEngine } from './conflict';
import { ThrottleManager } from './throttle';
import { OfflineQueue } from './queue';

export class StateMirrorWatcher implements StateMirrorInstance {
  public id!: string;
  public config!: StateMirrorConfig;
  public state: any;
  public isConnected = false;
  public isWatching = false;

  private diffEngine: DiffEngine;
  private broadcaster: Broadcaster;
  private conflictEngine: ConflictEngine;
  private throttleManager: ThrottleManager;
  private offlineQueue: OfflineQueue;
  private plugins: Map<string, Plugin> = new Map();
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private sourceId: string;
  private version = 0;
  private debouncedSync: Function;
  private throttledSync: Function;

  constructor() {
    this.sourceId = uuidv4();
    this.diffEngine = new DiffEngine();
    this.broadcaster = new Broadcaster(this.sourceId);
    this.conflictEngine = new ConflictEngine();
    this.throttleManager = new ThrottleManager();
    this.offlineQueue = new OfflineQueue();
    
    // Set up throttled and debounced sync functions
    this.debouncedSync = this.throttleManager.debounce(
      this.performSync.bind(this),
      100
    );
    this.throttledSync = this.throttleManager.throttle(
      this.performSync.bind(this),
      1000
    );
  }

  /**
   * Start watching a state object
   */
  watch<T>(state: T, config: StateMirrorConfig): StateMirrorInstance {
    this.state = state;
    this.config = {
      strategy: 'broadcast',
      debounce: 100,
      throttle: 1000,
      ...config
    };
    this.id = config.id;

    // Initialize components
    this.diffEngine.setInitialState(state);
    this.initializePlugins();
    this.connect();

    this.isWatching = true;
    this.emit('update', { type: 'watch-started', state });

    return this;
  }

  /**
   * Stop watching the state
   */
  unwatch(): void {
    this.isWatching = false;
    this.disconnect();
    this.diffEngine.reset();
    this.throttleManager.clear();
    this.emit('update', { type: 'watch-stopped' });
  }

  /**
   * Update the state with operations
   */
  update(operations: any[]): void {
    if (!this.isWatching) return;

    try {
      // Apply operations to state
      (jsonpatch as any).applyPatch(this.state, operations).newDocument;

      // Generate patch for broadcasting
      const patch: Patch = {
        id: uuidv4(),
        timestamp: Date.now(),
        source: this.sourceId,
        target: this.id,
        operations,
        version: ++this.version,
        metadata: {
          applied: true
        }
      };

      // Process through plugins
      let processedPatch = this.processPlugins('onSend', patch);
      if (processedPatch) {
        this.broadcastPatch(processedPatch);
      }

      this.emit('update', { type: 'state-updated', patch, operations });
    } catch (error) {
      console.error('StateMirror: Error applying operations:', error);
      this.emit('error', { type: 'apply-error', error, operations });
    }
  }

  /**
   * Sync the current state
   */
  async sync(): Promise<void> {
    if (!this.isWatching) return;

    const diffResult = this.diffEngine.generatePatch(this.state, this.config.paths);
    
    if (diffResult.hasChanges) {
      const patch: Patch = {
        id: uuidv4(),
        timestamp: Date.now(),
        source: this.sourceId,
        target: this.id,
        operations: diffResult.operations,
        version: ++this.version
      };

      await this.broadcastPatch(patch);
    }
  }

  /**
   * Use a plugin
   */
  use(plugin: Plugin): StateMirrorInstance {
    if (this.plugins.has(plugin.id)) {
      console.warn(`StateMirror: Plugin ${plugin.id} already registered`);
      return this;
    }

    this.plugins.set(plugin.id, plugin);
    
    if (plugin.onInit) {
      try {
        plugin.onInit(this);
      } catch (error) {
        console.error(`StateMirror: Error initializing plugin ${plugin.id}:`, error);
        this.emit('plugin-error', { pluginId: plugin.id, error });
      }
    }

    this.emit('plugin-loaded', { plugin });
    return this;
  }

  /**
   * Remove a plugin
   */
  removePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin && plugin.onDestroy) {
      try {
        plugin.onDestroy(this);
      } catch (error) {
        console.error(`StateMirror: Error destroying plugin ${pluginId}:`, error);
      }
    }

    this.plugins.delete(pluginId);
  }

  /**
   * Add event listener
   */
  on(event: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Remove event listener
   */
  off(event: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event
   */
  emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`StateMirror: Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Enable DevTools
   */
  enableDevTools(): void {
    // This will be implemented in the devtools module
    console.log('StateMirror: DevTools enabled');
  }

  /**
   * Disable DevTools
   */
  disableDevTools(): void {
    // This will be implemented in the devtools module
    console.log('StateMirror: DevTools disabled');
  }

  /**
   * Flush the offline queue
   */
  async flushQueue(): Promise<void> {
    await this.offlineQueue.flush(this.broadcastPatch.bind(this));
  }

  /**
   * Get queue status
   */
  async getQueueStatus(): Promise<QueueStatus> {
    return await this.offlineQueue.getStatus();
  }

  private async connect(): Promise<void> {
    try {
      await this.broadcaster.connect();
      this.broadcaster.onMessage(this.handleMessage.bind(this));
      this.isConnected = true;
      this.emit('connect');
      
      // Flush any queued patches
      await this.flushQueue();
    } catch (error) {
      console.error('StateMirror: Failed to connect:', error);
      this.emit('error', { type: 'connection-error', error });
    }
  }

  private disconnect(): void {
    this.broadcaster.disconnect();
    this.isConnected = false;
    this.emit('disconnect');
  }

  private async broadcastPatch(patch: Patch): Promise<void> {
    if (!this.isConnected) {
      // Queue for later if offline
      await this.offlineQueue.enqueue(patch);
      return;
    }

    try {
      const message: BroadcastMessage = {
        type: 'patch',
        data: patch,
        source: this.sourceId,
        timestamp: Date.now()
      };

      await this.broadcaster.send(message);
    } catch (error) {
      console.error('StateMirror: Failed to broadcast patch:', error);
      // Queue for retry
      await this.offlineQueue.enqueue(patch);
    }
  }

  private handleMessage(message: BroadcastMessage): void {
    if (message.type === 'patch' && message.data) {
      this.handlePatch(message.data as Patch);
    }
  }

  private handlePatch(patch: Patch): void {
    // Ignore our own patches
    if (patch.source === this.sourceId) return;

    // Process through plugins
    let processedPatch = this.processPlugins('onReceive', patch);
    if (!processedPatch) return;

    // Check for conflicts
    const currentPatch = this.getCurrentPatch();
    if (currentPatch && this.conflictEngine.hasConflicts(currentPatch, processedPatch)) {
      processedPatch = this.conflictEngine.resolveConflict(currentPatch, processedPatch, this);
      this.emit('conflict', { local: currentPatch, incoming: patch, resolved: processedPatch });
    }

    // Apply the patch
    this.applyPatch(processedPatch);
  }

  private applyPatch(patch: Patch): void {
    try {
      const result = (jsonpatch as any).applyPatch(this.state, patch.operations).newDocument;
      
      // Process through plugins
      this.processPlugins('onApply', patch);

      this.emit('sync', { type: 'patch-applied', patch, result });
    } catch (error) {
      console.error('StateMirror: Error applying patch:', error);
      this.emit('error', { type: 'patch-error', error, patch });
    }
  }

  private processPlugins(hook: keyof Plugin, data: any): any {
    let processedData = data;

    for (const plugin of this.plugins.values()) {
      const hookFn = plugin[hook] as any;
      if (typeof hookFn === 'function') {
        try {
          const result = hookFn(processedData, this);
          if (result !== undefined) {
            processedData = result;
          }
        } catch (error) {
          console.error(`StateMirror: Error in plugin ${plugin.id} hook ${hook}:`, error);
          this.emit('plugin-error', { pluginId: plugin.id, hook, error });
        }
      }
    }

    return processedData;
  }

  private initializePlugins(): void {
    if (this.config.plugins) {
      this.config.plugins.forEach(plugin => this.use(plugin));
    }
  }

  private getCurrentPatch(): Patch | null {
    // This would return the current patch being processed
    // For now, return null
    return null;
  }

  private async performSync(): Promise<void> {
    await this.sync();
  }
} 