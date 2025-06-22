import jsonpatch from 'fast-json-patch';
import { Operation } from '../types';
import { DiffResult } from '../types';

export class DiffEngine {
  private previousState: any = null;

  /**
   * Generate a patch between the previous state and the current state
   */
  generatePatch(currentState: any, paths?: string[]): DiffResult {
    if (this.previousState === null) {
      this.previousState = this.deepClone(currentState);
      return { operations: [], hasChanges: false };
    }

    let operations: Operation[];

    if (paths && paths.length > 0) {
      // Only diff specific paths
      operations = this.generatePathPatch(this.previousState, currentState, paths);
    } else {
      // Diff entire object
      operations = jsonpatch.compare(this.previousState, currentState);
    }

    this.previousState = this.deepClone(currentState);

    return {
      operations,
      hasChanges: operations.length > 0
    };
  }

  /**
   * Generate patch for specific paths only
   */
  private generatePathPatch(previousState: any, currentState: any, paths: string[]): Operation[] {
    const operations: Operation[] = [];

    for (const path of paths) {
      const previousValue = this.getPathValue(previousState, path);
      const currentValue = this.getPathValue(currentState, path);

      if (!this.isEqual(previousValue, currentValue)) {
        const pathOperations = jsonpatch.compare(
          { [path]: previousValue },
          { [path]: currentValue }
        );

        // Adjust paths to be relative to the root
        const adjustedOperations = pathOperations.map((op: Operation) => ({
          ...op,
          path: op.path === '' ? `/${path}` : `/${path}${op.path}`
        }));

        operations.push(...adjustedOperations);
      }
    }

    return operations;
  }

  /**
   * Get value at a specific path in an object
   */
  private getPathValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Deep equality check
   */
  private isEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object') return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!this.isEqual(a[key], b[key])) return false;
    }

    return true;
  }

  /**
   * Deep clone an object
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as any;
    if (obj instanceof Array) return obj.map(item => this.deepClone(item)) as any;
    if (typeof obj === 'object') {
      const clonedObj = {} as any;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
    return obj;
  }

  /**
   * Reset the diff engine state
   */
  reset(): void {
    this.previousState = null;
  }

  /**
   * Set the initial state for comparison
   */
  setInitialState(state: any): void {
    this.previousState = this.deepClone(state);
  }

  /**
   * Check if a path exists in the current state
   */
  hasPath(state: any, path: string): boolean {
    return this.getPathValue(state, path) !== undefined;
  }

  /**
   * Get all paths in an object (flattened)
   */
  getAllPaths(obj: any, prefix = ''): string[] {
    const paths: string[] = [];

    if (obj === null || typeof obj !== 'object') {
      return paths;
    }

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const currentPath = prefix ? `${prefix}.${key}` : key;
        paths.push(currentPath);

        if (typeof obj[key] === 'object' && obj[key] !== null) {
          paths.push(...this.getAllPaths(obj[key], currentPath));
        }
      }
    }

    return paths;
  }
} 