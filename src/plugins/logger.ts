import { Plugin, StateMirrorInstance, Patch } from '../types';

export interface LoggerPluginConfig {
  enabled?: boolean;
  level?: 'debug' | 'info' | 'warn' | 'error';
  includePatches?: boolean;
  includeState?: boolean;
  prefix?: string;
}

/**
 * Logger plugin for debugging state mirror operations
 */
export function pluginLogger(config: LoggerPluginConfig = {}): Plugin {
  const {
    enabled = true,
    level = 'info',
    includePatches = true,
    includeState = false,
    prefix = 'StateMirror'
  } = config;

  const log = (message: string, data?: any) => {
    if (!enabled) return;

    const logMessage = `[${prefix}] ${message}`;
    
    switch (level) {
      case 'debug':
        console.debug(logMessage, data);
        break;
      case 'info':
        console.info(logMessage, data);
        break;
      case 'warn':
        console.warn(logMessage, data);
        break;
      case 'error':
        console.error(logMessage, data);
        break;
    }
  };

  return {
    id: 'logger',
    name: 'StateMirror Logger',
    version: '1.0.0',

    onInit(instance: StateMirrorInstance) {
      log('Logger plugin initialized', {
        instanceId: instance.id,
        config: instance.config
      });
    },

    onSend(patch: Patch, instance: StateMirrorInstance) {
      log('Sending patch', {
        patchId: patch.id,
        operations: patch.operations.length,
        source: patch.source,
        target: patch.target,
        ...(includePatches && { patch }),
        ...(includeState && { state: instance.state })
      });
      return patch;
    },

    onReceive(patch: Patch, instance: StateMirrorInstance) {
      log('Receiving patch', {
        patchId: patch.id,
        operations: patch.operations.length,
        source: patch.source,
        target: patch.target,
        ...(includePatches && { patch }),
        ...(includeState && { state: instance.state })
      });
      return patch;
    },

    onApply(patch: Patch, instance: StateMirrorInstance) {
      log('Applying patch', {
        patchId: patch.id,
        operations: patch.operations.length,
        ...(includePatches && { patch }),
        ...(includeState && { state: instance.state })
      });
    },

    onConflict(local: Patch, incoming: Patch, instance: StateMirrorInstance) {
      log('Conflict detected', {
        localPatchId: local.id,
        incomingPatchId: incoming.id,
        localTimestamp: local.timestamp,
        incomingTimestamp: incoming.timestamp,
        ...(includePatches && { local, incoming }),
        ...(includeState && { state: instance.state })
      });
      return local; // Default to local
    },

    onFlush(patches: Patch[], instance: StateMirrorInstance) {
      log('Flushing queue', {
        patchCount: patches.length,
        patches: patches.map(p => ({ id: p.id, timestamp: p.timestamp })),
        ...(includeState && { state: instance.state })
      });
    },

    onDestroy(instance: StateMirrorInstance) {
      log('Logger plugin destroyed', {
        instanceId: instance.id
      });
    }
  };
}

/**
 * Create a logger plugin with custom configuration
 */
export function createLoggerPlugin(config: LoggerPluginConfig): Plugin {
  return pluginLogger(config);
}

/**
 * Default logger plugin
 */
export const defaultLogger = pluginLogger(); 