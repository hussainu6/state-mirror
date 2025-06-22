import { ThrottleConfig, DebounceConfig } from '../types';

export class ThrottleManager {
  private throttledFunctions = new Map<string, Function>();
  private debouncedFunctions = new Map<string, Function>();

  /**
   * Create a throttled function
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number,
    config: ThrottleConfig = { delay, leading: true, trailing: true }
  ): T {
    const key = `throttle-${func.toString()}-${delay}`;
    
    if (this.throttledFunctions.has(key)) {
      return this.throttledFunctions.get(key) as T;
    }

    let lastCall = 0;
    let timeoutId: number | null = null;
    let lastArgs: any[] | null = null;

    const throttled = ((...args: any[]) => {
      const now = Date.now();
      lastArgs = args;

      if (now - lastCall >= delay) {
        if (config.leading !== false) {
          lastCall = now;
          func.apply(this, args);
        }
      } else if (config.trailing !== false) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        timeoutId = window.setTimeout(() => {
          lastCall = Date.now();
          if (lastArgs) {
            func.apply(this, lastArgs);
            lastArgs = null;
          }
        }, delay - (now - lastCall));
      }
    }) as T;

    this.throttledFunctions.set(key, throttled);
    return throttled;
  }

  /**
   * Create a debounced function
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number,
    config: DebounceConfig = { delay, leading: false, trailing: true }
  ): T {
    const key = `debounce-${func.toString()}-${delay}`;
    
    if (this.debouncedFunctions.has(key)) {
      return this.debouncedFunctions.get(key) as T;
    }

    let timeoutId: number | null = null;
    let lastArgs: any[] | null = null;
    let hasCalled = false;

    const debounced = ((...args: any[]) => {
      lastArgs = args;

      if (config.leading && !hasCalled) {
        hasCalled = true;
        func.apply(this, args);
      }

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (config.trailing !== false) {
        timeoutId = window.setTimeout(() => {
          if (config.leading) {
            hasCalled = false;
          }
          if (lastArgs) {
            func.apply(this, lastArgs);
            lastArgs = null;
          }
        }, delay);
      }
    }) as T;

    this.debouncedFunctions.set(key, debounced);
    return debounced;
  }

  /**
   * Cancel a throttled function
   */
  cancelThrottle(func: Function): void {
    const key = Array.from(this.throttledFunctions.keys()).find(k => 
      k.includes(func.toString())
    );
    if (key) {
      this.throttledFunctions.delete(key);
    }
  }

  /**
   * Cancel a debounced function
   */
  cancelDebounce(func: Function): void {
    const key = Array.from(this.debouncedFunctions.keys()).find(k => 
      k.includes(func.toString())
    );
    if (key) {
      this.debouncedFunctions.delete(key);
    }
  }

  /**
   * Clear all throttled and debounced functions
   */
  clear(): void {
    this.throttledFunctions.clear();
    this.debouncedFunctions.clear();
  }

  /**
   * Get the number of active throttled functions
   */
  getThrottledCount(): number {
    return this.throttledFunctions.size;
  }

  /**
   * Get the number of active debounced functions
   */
  getDebouncedCount(): number {
    return this.debouncedFunctions.size;
  }
}

/**
 * Simple throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  leading = true,
  trailing = true
): T {
  let lastCall = 0;
  let timeoutId: number | null = null;
  let lastArgs: any[] | null = null;

  return ((...args: any[]) => {
    const now = Date.now();
    lastArgs = args;

    if (now - lastCall >= delay) {
      if (leading) {
        lastCall = now;
        func(...args);
      }
    } else if (trailing) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = window.setTimeout(() => {
        lastCall = Date.now();
        if (lastArgs) {
          func(...lastArgs);
          lastArgs = null;
        }
      }, delay - (now - lastCall));
    }
  }) as T;
}

/**
 * Simple debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  leading = false,
  trailing = true
): T {
  let timeoutId: number | null = null;
  let lastArgs: any[] | null = null;
  let hasCalled = false;

  return ((...args: any[]) => {
    lastArgs = args;

    if (leading && !hasCalled) {
      hasCalled = true;
      func(...args);
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (trailing) {
      timeoutId = window.setTimeout(() => {
        if (leading) {
          hasCalled = false;
        }
        if (lastArgs) {
          func(...lastArgs);
          lastArgs = null;
        }
      }, delay);
    }
  }) as T;
} 