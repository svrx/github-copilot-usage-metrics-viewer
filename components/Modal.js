/**
 * Reusable modal dialog component
 */
export class Modal {
    constructor(modalId) {
        this.modalId = modalId;
        this.modal = document.getElementById(modalId);
        
        if (!this.modal) {
            console.error(`Modal ${modalId} not found`);
            return;
        }

        this.setupEventListeners();
    }

    /**
     * Open the modal with optional content
     */
    open(content = null) {
        if (!this.modal) return;

        if (content) {
            const contentElement = this.modal.querySelector('.modal-body') || 
                                  this.modal.querySelector('.modal-content');
            if (contentElement) {
                contentElement.innerHTML = content;
            }
        }

        this.modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    /**
     * Close the modal
     */
    close() {
        if (!this.modal) return;
        
        this.modal.style.display = 'none';
        document.body.style.overflow = ''; // Restore scrolling
    }

    /**
     * Set modal title
     */
    setTitle(title) {
        if (!this.modal) return;
        
        const titleElement = this.modal.querySelector('.modal-title') ||
                            this.modal.querySelector('h2');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    /**
     * Set modal content
     */
    setContent(content) {
        if (!this.modal) return;
        
        const contentElement = this.modal.querySelector('.modal-body') ||
                              this.modal.querySelector('.modal-content');
        if (contentElement) {
            contentElement.innerHTML = content;
        }
    }

    /**
     * Setup event listeners for modal
     */
    setupEventListeners() {
        if (!this.modal) return;

        // Close button
        const closeBtn = this.modal.querySelector('.close, .modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'block') {
                this.close();
            }
        });
    }

    /**
     * Check if modal is open
     */
    isOpen() {
        return this.modal && this.modal.style.display === 'block';
    }
}

/**
 * Modal Manager for handling multiple modals
 */
export class ModalManager {
    constructor() {
        this.modals = new Map();
    }

    /**
     * Register a modal
     */
    register(modalId) {
        if (!this.modals.has(modalId)) {
            this.modals.set(modalId, new Modal(modalId));
        }
        return this.modals.get(modalId);
    }

    /**
     * Get a modal by ID
     */
    get(modalId) {
        return this.modals.get(modalId);
    }

    /**
     * Open a modal by ID
     */
    open(modalId, content = null) {
        const modal = this.modals.get(modalId);
        if (modal) {
            modal.open(content);
        }
    }

    /**
     * Close a modal by ID
     */
    close(modalId) {
        const modal = this.modals.get(modalId);
        if (modal) {
            modal.close();
        }
    }

    /**
     * Close all modals
     */
    closeAll() {
        this.modals.forEach(modal => modal.close());
    }
}
