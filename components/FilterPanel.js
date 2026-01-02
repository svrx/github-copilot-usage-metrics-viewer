/**
 * Filter panel component for managing data filters
 */
export class FilterPanel {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.filters = {
            dateRange: 'all',
            user: 'all',
            model: 'all',
            search: ''
        };
        this.onFilterChange = options.onFilterChange || (() => {});
    }

    /**
     * Populate filter options with data
     */
    populateFilters(data) {
        const users = [...new Set(data.map(row => row.user))].sort();
        const models = [...new Set(data.map(row => row.model))].sort();

        this.populateSelect('userFilter', users, 'All Users');
        this.populateSelect('modelFilter', models, 'All Models');
    }

    /**
     * Populate a select element with options
     */
    populateSelect(selectId, options, defaultLabel) {
        const select = document.getElementById(selectId);
        if (!select) return;

        select.innerHTML = `<option value="all">${defaultLabel}</option>`;
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
        });
    }

    /**
     * Setup event listeners for filter controls
     */
    setupEventListeners() {
        const dateRangeSelect = document.getElementById('dateRange');
        const userSelect = document.getElementById('userFilter');
        const modelSelect = document.getElementById('modelFilter');
        const searchInput = document.getElementById('searchInput');

        if (dateRangeSelect) {
            dateRangeSelect.addEventListener('change', () => {
                this.filters.dateRange = dateRangeSelect.value;
                this.onFilterChange(this.filters);
            });
        }

        if (userSelect) {
            userSelect.addEventListener('change', () => {
                this.filters.user = userSelect.value;
                this.onFilterChange(this.filters);
            });
        }

        if (modelSelect) {
            modelSelect.addEventListener('change', () => {
                this.filters.model = modelSelect.value;
                this.onFilterChange(this.filters);
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.filters.search = searchInput.value;
                this.onFilterChange(this.filters);
            });
        }
    }

    /**
     * Get current filter values
     */
    getFilters() {
        return { ...this.filters };
    }

    /**
     * Reset all filters
     */
    resetFilters() {
        this.filters = {
            dateRange: 'all',
            user: 'all',
            model: 'all',
            search: ''
        };

        // Reset UI
        const dateRangeSelect = document.getElementById('dateRange');
        const userSelect = document.getElementById('userFilter');
        const modelSelect = document.getElementById('modelFilter');
        const searchInput = document.getElementById('searchInput');

        if (dateRangeSelect) dateRangeSelect.value = 'all';
        if (userSelect) userSelect.value = 'all';
        if (modelSelect) modelSelect.value = 'all';
        if (searchInput) searchInput.value = '';

        this.onFilterChange(this.filters);
    }
}

/**
 * Quota-specific filter panel
 */
export class QuotaFilterPanel extends FilterPanel {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.filters = {
            dateRange: 'all',
            user: 'all',
            status: 'all',
            search: ''
        };
    }

    /**
     * Setup event listeners for quota filters
     */
    setupEventListeners() {
        const dateRangeSelect = document.getElementById('quotaDateRange');
        const userSelect = document.getElementById('quotaUserFilter');
        const statusSelect = document.getElementById('quotaStatusFilter');
        const searchInput = document.getElementById('quotaSearchInput');

        if (dateRangeSelect) {
            dateRangeSelect.addEventListener('change', () => {
                this.filters.dateRange = dateRangeSelect.value;
                this.onFilterChange(this.filters);
            });
        }

        if (userSelect) {
            userSelect.addEventListener('change', () => {
                this.filters.user = userSelect.value;
                this.onFilterChange(this.filters);
            });
        }

        if (statusSelect) {
            statusSelect.addEventListener('change', () => {
                this.filters.status = statusSelect.value;
                this.onFilterChange(this.filters);
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.filters.search = searchInput.value;
                this.onFilterChange(this.filters);
            });
        }
    }

    /**
     * Populate quota-specific filters
     */
    populateFilters(data) {
        const users = [...new Set(data.map(row => row.user))].sort();
        this.populateSelect('quotaUserFilter', users, 'All Users');
    }
}
