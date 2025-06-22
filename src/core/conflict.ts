import { Patch, StateMirrorInstance, ConflictResolver } from '../types';

export class ConflictEngine {
  private defaultConflictResolver: ConflictResolver;

  constructor() {
    this.defaultConflictResolver = this.lastWriteWinsResolver;
  }

  /**
   * Resolve conflicts between local and incoming patches
   */
  resolveConflict(
    local: Patch,
    incoming: Patch,
    instance: StateMirrorInstance,
    customResolver?: ConflictResolver
  ): Patch {
    const resolver = customResolver || instance.config.conflictResolver || this.defaultConflictResolver;
    
    try {
      return resolver(local, incoming, instance);
    } catch (error) {
      console.error('StateMirror: Error in conflict resolver:', error);
      // Fallback to last-write-wins
      return this.lastWriteWinsResolver(local, incoming, instance);
    }
  }

  /**
   * Default conflict resolver: last-write-wins
   */
  private lastWriteWinsResolver: ConflictResolver = (local: Patch, incoming: Patch): Patch => {
    return local.timestamp >= incoming.timestamp ? local : incoming;
  };

  /**
   * Timestamp-based conflict resolver with custom threshold
   */
  timestampResolver(threshold: number = 1000): ConflictResolver {
    return (local: Patch, incoming: Patch): Patch => {
      const timeDiff = Math.abs(local.timestamp - incoming.timestamp);
      
      if (timeDiff <= threshold) {
        // If timestamps are close, prefer the one with more operations
        return local.operations.length >= incoming.operations.length ? local : incoming;
      }
      
      // Otherwise, use last-write-wins
      return local.timestamp >= incoming.timestamp ? local : incoming;
    };
  }

  /**
   * Merge-based conflict resolver that combines operations
   */
  mergeResolver: ConflictResolver = (local: Patch, incoming: Patch, instance: StateMirrorInstance): Patch => {
    // Create a merged patch
    const mergedPatch: Patch = {
      id: `${local.id}-${incoming.id}-merged`,
      timestamp: Math.max(local.timestamp, incoming.timestamp),
      source: local.source,
      target: local.target,
      operations: [...local.operations, ...incoming.operations],
      version: Math.max(local.version, incoming.version) + 1,
      metadata: {
        ...local.metadata,
        ...incoming.metadata,
        merged: true,
        originalPatches: [local.id, incoming.id]
      }
    };

    return mergedPatch;
  };

  /**
   * Path-based conflict resolver that resolves conflicts per path
   */
  pathBasedResolver: ConflictResolver = (local: Patch, incoming: Patch, instance: StateMirrorInstance): Patch => {
    const localPaths = this.extractPaths(local.operations);
    const incomingPaths = this.extractPaths(incoming.operations);
    
    // Find conflicting paths
    const conflictingPaths = localPaths.filter(path => incomingPaths.includes(path));
    
    if (conflictingPaths.length === 0) {
      // No conflicts, merge patches
      return this.mergeResolver(local, incoming, instance);
    }

    // For conflicting paths, use last-write-wins based on patch timestamps
    const resolvedOperations = [...local.operations];
    
    for (const incomingOp of incoming.operations) {
      const incomingPath = this.getOperationPath(incomingOp);
      const hasConflict = conflictingPaths.includes(incomingPath);
      
      if (!hasConflict) {
        resolvedOperations.push(incomingOp);
      } else {
        // Check if local has a more recent operation for this path
        const localOp = local.operations.find(op => this.getOperationPath(op) === incomingPath);
        if (!localOp || incoming.timestamp > local.timestamp) {
          // Replace local operation with incoming
          const index = resolvedOperations.findIndex(op => this.getOperationPath(op) === incomingPath);
          if (index !== -1) {
            resolvedOperations[index] = incomingOp;
          } else {
            resolvedOperations.push(incomingOp);
          }
        }
      }
    }

    return {
      id: `${local.id}-${incoming.id}-path-resolved`,
      timestamp: Math.max(local.timestamp, incoming.timestamp),
      source: local.source,
      target: local.target,
      operations: resolvedOperations,
      version: Math.max(local.version, incoming.version) + 1,
      metadata: {
        ...local.metadata,
        pathResolved: true,
        conflictingPaths
      }
    };
  };

  /**
   * Extract paths from operations
   */
  private extractPaths(operations: any[]): string[] {
    return operations.map(op => this.getOperationPath(op));
  }

  /**
   * Get the path from an operation
   */
  private getOperationPath(operation: any): string {
    return operation.path || '';
  }

  /**
   * Check if two patches have conflicts
   */
  hasConflicts(local: Patch, incoming: Patch): boolean {
    const localPaths = this.extractPaths(local.operations);
    const incomingPaths = this.extractPaths(incoming.operations);
    
    return localPaths.some(path => incomingPaths.includes(path));
  }

  /**
   * Get conflicting paths between two patches
   */
  getConflictingPaths(local: Patch, incoming: Patch): string[] {
    const localPaths = this.extractPaths(local.operations);
    const incomingPaths = this.extractPaths(incoming.operations);
    
    return localPaths.filter(path => incomingPaths.includes(path));
  }

  /**
   * Create a custom conflict resolver
   */
  createCustomResolver(resolverFn: ConflictResolver): ConflictResolver {
    return resolverFn;
  }

  /**
   * Validate a patch for conflicts
   */
  validatePatch(patch: Patch): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!patch.id) {
      errors.push('Patch must have an id');
    }

    if (!patch.timestamp || typeof patch.timestamp !== 'number') {
      errors.push('Patch must have a valid timestamp');
    }

    if (!patch.source) {
      errors.push('Patch must have a source');
    }

    if (!patch.target) {
      errors.push('Patch must have a target');
    }

    if (!Array.isArray(patch.operations)) {
      errors.push('Patch must have operations array');
    }

    if (patch.version === undefined || typeof patch.version !== 'number') {
      errors.push('Patch must have a version number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 