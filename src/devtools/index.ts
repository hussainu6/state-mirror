import { StateMirrorInstance, DevToolsConfig } from '../types';

export class StateMirrorDevTools {
  private instance: StateMirrorInstance;
  private config: DevToolsConfig;
  private overlay: HTMLElement | null = null;
  private isVisible = false;

  constructor(instance: StateMirrorInstance, config: DevToolsConfig = {}) {
    this.instance = instance;
    this.config = {
      position: 'top-right',
      theme: 'light',
      autoHide: false,
      showPatches: true,
      showPlugins: true,
      ...config
    };
  }

  /**
   * Initialize the DevTools overlay
   */
  init(): void {
    this.createOverlay();
    this.setupEventListeners();
    this.updateDisplay();
  }

  /**
   * Show the DevTools overlay
   */
  show(): void {
    if (this.overlay) {
      this.overlay.style.display = 'block';
      this.isVisible = true;
    }
  }

  /**
   * Hide the DevTools overlay
   */
  hide(): void {
    if (this.overlay) {
      this.overlay.style.display = 'none';
      this.isVisible = false;
    }
  }

  /**
   * Toggle the DevTools overlay
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Update the display with current state
   */
  updateDisplay(): void {
    if (!this.overlay) return;

    const content = this.generateContent();
    const contentElement = this.overlay.querySelector('.state-mirror-content');
    if (contentElement) {
      contentElement.innerHTML = content;
    }
  }

  private createOverlay(): void {
    // Remove existing overlay if any
    const existing = document.querySelector('.state-mirror-devtools');
    if (existing) {
      existing.remove();
    }

    // Create new overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'state-mirror-devtools';
    this.overlay.innerHTML = `
      <div class="state-mirror-header">
        <span class="state-mirror-title">StateMirror DevTools</span>
        <button class="state-mirror-toggle">−</button>
        <button class="state-mirror-close">×</button>
      </div>
      <div class="state-mirror-content">
        ${this.generateContent()}
      </div>
    `;

    // Apply styles
    this.applyStyles();

    // Add to document
    document.body.appendChild(this.overlay);

    // Set initial visibility
    if (this.config.autoHide) {
      this.hide();
    }
  }

  private generateContent(): string {
    const status = this.instance.isConnected ? 'Connected' : 'Disconnected';
    const watching = this.instance.isWatching ? 'Watching' : 'Not Watching';
    
    let content = `
      <div class="state-mirror-section">
        <h3>Status</h3>
        <div class="state-mirror-status">
          <div class="status-item">
            <span class="label">Connection:</span>
            <span class="value ${this.instance.isConnected ? 'connected' : 'disconnected'}">${status}</span>
          </div>
          <div class="status-item">
            <span class="label">Watching:</span>
            <span class="value">${watching}</span>
          </div>
          <div class="status-item">
            <span class="label">Instance ID:</span>
            <span class="value">${this.instance.id}</span>
          </div>
        </div>
      </div>
    `;

    if (this.config.showPatches) {
      content += `
        <div class="state-mirror-section">
          <h3>Recent Activity</h3>
          <div class="state-mirror-activity">
            <div class="activity-item">
              <span class="label">Last Update:</span>
              <span class="value">${new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      `;
    }

    if (this.config.showPlugins) {
      content += `
        <div class="state-mirror-section">
          <h3>Plugins</h3>
          <div class="state-mirror-plugins">
            <div class="plugin-item">
              <span class="label">Active Plugins:</span>
              <span class="value">0</span>
            </div>
          </div>
        </div>
      `;
    }

    return content;
  }

  private applyStyles(): void {
    if (!this.overlay) return;

    const position = this.config.position;
    const theme = this.config.theme;

    const styles = `
      .state-mirror-devtools {
        position: fixed;
        z-index: 9999;
        background: ${theme === 'dark' ? '#2d3748' : '#ffffff'};
        border: 1px solid ${theme === 'dark' ? '#4a5568' : '#e2e8f0'};
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        min-width: 300px;
        max-width: 400px;
        ${this.getPositionStyles(position)}
      }

      .state-mirror-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: ${theme === 'dark' ? '#1a202c' : '#f7fafc'};
        border-bottom: 1px solid ${theme === 'dark' ? '#4a5568' : '#e2e8f0'};
        border-radius: 8px 8px 0 0;
      }

      .state-mirror-title {
        font-weight: 600;
        color: ${theme === 'dark' ? '#e2e8f0' : '#2d3748'};
      }

      .state-mirror-toggle,
      .state-mirror-close {
        background: none;
        border: none;
        color: ${theme === 'dark' ? '#a0aec0' : '#718096'};
        cursor: pointer;
        font-size: 14px;
        padding: 2px 6px;
        border-radius: 4px;
      }

      .state-mirror-toggle:hover,
      .state-mirror-close:hover {
        background: ${theme === 'dark' ? '#4a5568' : '#edf2f7'};
      }

      .state-mirror-content {
        padding: 12px;
        color: ${theme === 'dark' ? '#e2e8f0' : '#2d3748'};
      }

      .state-mirror-section {
        margin-bottom: 16px;
      }

      .state-mirror-section h3 {
        margin: 0 0 8px 0;
        font-size: 14px;
        font-weight: 600;
        color: ${theme === 'dark' ? '#e2e8f0' : '#2d3748'};
      }

      .state-mirror-status,
      .state-mirror-activity,
      .state-mirror-plugins {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .status-item,
      .activity-item,
      .plugin-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .label {
        color: ${theme === 'dark' ? '#a0aec0' : '#718096'};
      }

      .value {
        font-weight: 500;
      }

      .value.connected {
        color: #48bb78;
      }

      .value.disconnected {
        color: #f56565;
      }
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }

  private getPositionStyles(position?: string): string {
    const pos = position || 'top-right';
    switch (pos) {
      case 'top-left':
        return 'top: 20px; left: 20px;';
      case 'top-right':
        return 'top: 20px; right: 20px;';
      case 'bottom-left':
        return 'bottom: 20px; left: 20px;';
      case 'bottom-right':
        return 'bottom: 20px; right: 20px;';
      default:
        return 'top: 20px; right: 20px;';
    }
  }

  private setupEventListeners(): void {
    if (!this.overlay) return;

    const toggleBtn = this.overlay.querySelector('.state-mirror-toggle');
    const closeBtn = this.overlay.querySelector('.state-mirror-close');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.toggle();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hide();
      });
    }

    // Listen to instance events
    this.instance.on('update', () => {
      this.updateDisplay();
    });

    this.instance.on('connect', () => {
      this.updateDisplay();
    });

    this.instance.on('disconnect', () => {
      this.updateDisplay();
    });
  }

  /**
   * Destroy the DevTools
   */
  destroy(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}

/**
 * Enable DevTools for a StateMirror instance
 */
export function enableDevTools(instance: StateMirrorInstance, config?: DevToolsConfig): StateMirrorDevTools {
  const devTools = new StateMirrorDevTools(instance, config);
  devTools.init();
  return devTools;
}

/**
 * Create DevTools with custom configuration
 */
export function createDevTools(instance: StateMirrorInstance, config: DevToolsConfig): StateMirrorDevTools {
  return new StateMirrorDevTools(instance, config);
} 