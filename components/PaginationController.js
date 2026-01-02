import { APP_CONFIG } from '../config/appConfig.js';

/**
 * Reusable pagination controller component
 */
export class PaginationController {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.currentPage = 1;
        this.rowsPerPage = options.rowsPerPage || APP_CONFIG.rowsPerPage;
        this.totalPages = 1;
        this.totalItems = 0;
        this.onPageChange = options.onPageChange || (() => {});
        this.onRowsPerPageChange = options.onRowsPerPageChange || (() => {});
    }

    /**
     * Set total items and recalculate pages
     */
    setTotalItems(total) {
        this.totalItems = total;
        this.totalPages = Math.ceil(total / this.rowsPerPage);
        
        // Adjust current page if it's out of bounds
        if (this.currentPage > this.totalPages) {
            this.currentPage = Math.max(1, this.totalPages);
        }
    }

    /**
     * Go to a specific page
     */
    goToPage(page) {
        if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
            this.currentPage = page;
            this.onPageChange(page);
            this.render();
        }
    }

    /**
     * Change rows per page
     */
    setRowsPerPage(rowsPerPage) {
        this.rowsPerPage = rowsPerPage;
        this.currentPage = 1;
        this.setTotalItems(this.totalItems);
        this.onRowsPerPageChange(rowsPerPage);
        this.render();
    }

    /**
     * Get pagination info for current page
     */
    getPaginationInfo() {
        const startIndex = (this.currentPage - 1) * this.rowsPerPage;
        const endIndex = Math.min(startIndex + this.rowsPerPage, this.totalItems);
        
        return {
            startIndex,
            endIndex,
            currentPage: this.currentPage,
            totalPages: this.totalPages,
            rowsPerPage: this.rowsPerPage
        };
    }

    /**
     * Render pagination controls
     */
    render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Pagination container ${this.containerId} not found`);
            return;
        }

        // Don't show pagination if only one page or no items
        if (this.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        const info = this.getPaginationInfo();
        
        let html = `
            <div class="pagination-controls">
                <div class="pagination-info">
                    Showing ${info.startIndex + 1} to ${info.endIndex} of ${this.totalItems} entries
                </div>
                <div class="pagination-buttons">
        `;

        // Previous button
        html += `
            <button class="pagination-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
                    data-page="${this.currentPage - 1}"
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                &laquo; Previous
            </button>
        `;

        // Page buttons
        const maxButtons = APP_CONFIG.paginationMaxButtons;
        const startPage = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
        const endPage = Math.min(this.totalPages, startPage + maxButtons - 1);

        // Show first page if not in range
        if (startPage > 1) {
            html += `<button class="pagination-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                html += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        // Page number buttons
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                        data-page="${i}">
                    ${i}
                </button>
            `;
        }

        // Show last page if not in range
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                html += `<span class="pagination-ellipsis">...</span>`;
            }
            html += `<button class="pagination-btn" data-page="${this.totalPages}">${this.totalPages}</button>`;
        }

        // Next button
        html += `
            <button class="pagination-btn ${this.currentPage === this.totalPages ? 'disabled' : ''}" 
                    data-page="${this.currentPage + 1}"
                    ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                Next &raquo;
            </button>
        `;

        html += `</div>`;

        // Rows per page selector
        html += `
            <div class="rows-per-page">
                <label for="${this.containerId}-rowsPerPage">Rows per page:</label>
                <select id="${this.containerId}-rowsPerPage" class="rows-per-page-select">
                    ${APP_CONFIG.rowsPerPageOptions.map(option => 
                        `<option value="${option}" ${option === this.rowsPerPage ? 'selected' : ''}>${option}</option>`
                    ).join('')}
                </select>
            </div>
        </div>
        `;

        container.innerHTML = html;

        // Add event listeners
        this.attachEventListeners();
    }

    /**
     * Attach event listeners to pagination controls
     */
    attachEventListeners() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Page button clicks
        container.querySelectorAll('.pagination-btn[data-page]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = parseInt(e.target.dataset.page);
                this.goToPage(page);
            });
        });

        // Rows per page selector
        const selector = container.querySelector('.rows-per-page-select');
        if (selector) {
            selector.addEventListener('change', (e) => {
                this.setRowsPerPage(parseInt(e.target.value));
            });
        }
    }

    /**
     * Reset to first page
     */
    reset() {
        this.currentPage = 1;
        this.render();
    }
}
