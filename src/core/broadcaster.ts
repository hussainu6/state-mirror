import { BroadcastMessage, NetworkAdapter } from '../types';

export class Broadcaster implements NetworkAdapter {
  private channel: BroadcastChannel | null = null;
  private messageHandlers: ((message: BroadcastMessage) => void)[] = [];
  private storageKey: string;
  private _isConnected = false;
  private sourceId: string;
  private fallbackInterval: number | null = null;

  constructor(sourceId: string, storageKey = 'state-mirror-broadcast') {
    this.sourceId = sourceId;
    this.storageKey = storageKey;
  }

  async connect(): Promise<void> {
    try {
      // Try to use BroadcastChannel API
      if (typeof BroadcastChannel !== 'undefined') {
        this.channel = new BroadcastChannel(this.storageKey);
        this.channel.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        this._isConnected = true;
        console.log('StateMirror: Connected via BroadcastChannel');
      } else {
        // Fallback to localStorage
        this.setupLocalStorageFallback();
        this._isConnected = true;
        console.log('StateMirror: Connected via localStorage fallback');
      }
    } catch (error) {
      console.error('StateMirror: Failed to connect broadcaster:', error);
      throw error;
    }
  }

  disconnect(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }

    this._isConnected = false;
    this.messageHandlers = [];
  }

  async send(message: BroadcastMessage): Promise<void> {
    if (!this._isConnected) {
      throw new Error('Broadcaster is not connected');
    }

    // Add source and timestamp if not present
    const enrichedMessage: BroadcastMessage = {
      ...message,
      source: message.source || this.sourceId,
      timestamp: message.timestamp || Date.now()
    };

    if (this.channel) {
      // Use BroadcastChannel
      this.channel.postMessage(enrichedMessage);
    } else {
      // Use localStorage fallback
      await this.sendViaLocalStorage(enrichedMessage);
    }
  }

  onMessage(handler: (message: BroadcastMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  isConnected(): boolean {
    return this._isConnected;
  }

  private handleMessage(message: BroadcastMessage): void {
    // Ignore messages from self
    if (message.source === this.sourceId) {
      return;
    }

    // Validate message structure
    if (!this.isValidMessage(message)) {
      console.warn('StateMirror: Received invalid message:', message);
      return;
    }

    // Notify all handlers
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('StateMirror: Error in message handler:', error);
      }
    });
  }

  private setupLocalStorageFallback(): void {
    // Poll localStorage for new messages
    this.fallbackInterval = window.setInterval(() => {
      this.checkLocalStorageMessages();
    }, 100); // Check every 100ms

    // Listen for storage events
    window.addEventListener('storage', (event) => {
      if (event.key === this.storageKey && event.newValue) {
        try {
          const message = JSON.parse(event.newValue);
          this.handleMessage(message);
        } catch (error) {
          console.error('StateMirror: Error parsing localStorage message:', error);
        }
      }
    });
  }

  private async sendViaLocalStorage(message: BroadcastMessage): Promise<void> {
    try {
      const messageStr = JSON.stringify(message);
      localStorage.setItem(this.storageKey, messageStr);
      
      // Trigger storage event for other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: this.storageKey,
        newValue: messageStr,
        oldValue: null,
        storageArea: localStorage
      }));
    } catch (error) {
      console.error('StateMirror: Error sending via localStorage:', error);
      throw error;
    }
  }

  private checkLocalStorageMessages(): void {
    try {
      const messageStr = localStorage.getItem(this.storageKey);
      if (messageStr) {
        const message = JSON.parse(messageStr);
        
        // Only process if it's a recent message (within last 5 seconds)
        const messageAge = Date.now() - message.timestamp;
        if (messageAge < 5000) {
          this.handleMessage(message);
        }
        
        // Clean up old message
        localStorage.removeItem(this.storageKey);
      }
    } catch (error) {
      console.error('StateMirror: Error checking localStorage messages:', error);
    }
  }

  private isValidMessage(message: any): message is BroadcastMessage {
    return (
      message &&
      typeof message === 'object' &&
      typeof message.type === 'string' &&
      typeof message.source === 'string' &&
      typeof message.timestamp === 'number' &&
      message.data !== undefined
    );
  }

  /**
   * Send a ping message to test connectivity
   */
  async ping(): Promise<void> {
    await this.send({
      type: 'ping',
      data: { timestamp: Date.now() },
      source: this.sourceId,
      timestamp: Date.now()
    });
  }

  /**
   * Get connected tabs count (approximate)
   */
  async getConnectedTabsCount(): Promise<number> {
    if (!this._isConnected) return 0;

    const pingId = `ping-${Date.now()}`;
    const responses = new Set<string>();

    // Send ping and collect responses
    const pingHandler = (message: BroadcastMessage) => {
      if (message.type === 'pong' && message.data?.pingId === pingId) {
        responses.add(message.source);
      }
    };

    this.onMessage(pingHandler);

    await this.send({
      type: 'ping',
      data: { pingId, timestamp: Date.now() },
      source: this.sourceId,
      timestamp: Date.now()
    });

    // Wait for responses
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Clean up
    this.messageHandlers = this.messageHandlers.filter(h => h !== pingHandler);

    return responses.size;
  }
}