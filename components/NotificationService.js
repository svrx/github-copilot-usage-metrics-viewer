import { APP_CONFIG } from '../config/appConfig.js';

/**
 * Notification service for displaying messages to users
 */
export class NotificationService {
    constructor() {
        this.duration = APP_CONFIG.notificationDuration;
        this.notificationElement = null;
    }

    /**
     * Show a notification message
     */
    show(message, type = 'info') {
        // Create notification element if it doesn't exist
        if (!this.notificationElement) {
            this.createNotificationElement();
        }

        const notification = this.notificationElement;
        notification.textContent = message;
        notification.className = `notification notification-${type}`;
        notification.style.display = 'block';

        // Auto-hide after duration
        setTimeout(() => {
            this.hide();
        }, this.duration);
    }

    /**
     * Create notification DOM element
     */
    createNotificationElement() {
        this.notificationElement = document.createElement('div');
        this.notificationElement.id = 'notification';
        this.notificationElement.className = 'notification';
        document.body.appendChild(this.notificationElement);
    }

    /**
     * Hide notification
     */
    hide() {
        if (this.notificationElement) {
            this.notificationElement.style.display = 'none';
        }
    }

    /**
     * Show success notification
     */
    success(message) {
        this.show(message, 'success');
    }

    /**
     * Show error notification
     */
    error(message) {
        this.show(message, 'error');
    }

    /**
     * Show warning notification
     */
    warning(message) {
        this.show(message, 'warning');
    }

    /**
     * Show info notification
     */
    info(message) {
        this.show(message, 'info');
    }
}

/**
 * Loading indicator service
 */
export class LoadingIndicator {
    constructor() {
        this.overlayElement = null;
    }

    /**
     * Show loading indicator with message
     */
    show(message = 'Loading...') {
        if (!this.overlayElement) {
            this.createOverlayElement();
        }

        const messageElement = this.overlayElement.querySelector('.loading-message');
        if (messageElement) {
            messageElement.textContent = message;
        }

        this.overlayElement.style.display = 'flex';
    }

    /**
     * Create loading overlay DOM element
     */
    createOverlayElement() {
        this.overlayElement = document.createElement('div');
        this.overlayElement.id = 'loading-overlay';
        this.overlayElement.className = 'loading-overlay';
        this.overlayElement.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-message">Loading...</div>
                <div class="loading-progress">
                    <div class="loading-progress-bar" style="width: 0%"></div>
                </div>
                <div class="loading-percentage">0%</div>
            </div>
        `;
        document.body.appendChild(this.overlayElement);
    }

    /**
     * Update progress
     */
    updateProgress(percentage) {
        if (!this.overlayElement) return;

        const progressBar = this.overlayElement.querySelector('.loading-progress-bar');
        const percentageText = this.overlayElement.querySelector('.loading-percentage');
        
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
        if (percentageText) {
            percentageText.textContent = `${percentage}%`;
        }
    }

    /**
     * Hide loading indicator
     */
    hide() {
        if (this.overlayElement) {
            this.overlayElement.style.display = 'none';
        }
    }
}
