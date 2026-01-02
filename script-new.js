import { DataService } from './services/DataService.js';
import { StorageService } from './services/StorageService.js';
import { ExportService } from './services/ExportService.js';
import { UsageDashboard } from './modules/UsageDashboard.js';
import { QuotaDashboard } from './modules/QuotaDashboard.js';
import { ComparisonDashboard } from './modules/ComparisonDashboard.js';
import { NotificationService, LoadingIndicator } from './components/NotificationService.js';
import { APP_CONFIG } from './config/appConfig.js';

/**
 * Main application class - Simplified and refactored
 */
class CopilotUsageAnalyzer {
    constructor() {
        // Initialize services
        this.dataService = new DataService();
        this.storageService = new StorageService();
        this.exportService = new ExportService();
        this.notificationService = new NotificationService();
        this.loadingIndicator = new LoadingIndicator();
        
        // Initialize dashboards
        this.usageDashboard = new UsageDashboard(this.dataService, this.exportService);
        this.quotaDashboard = new QuotaDashboard(this.dataService, this.exportService);
        this.comparisonDashboard = new ComparisonDashboard(this.dataService, this.exportService, this.storageService);
        
        // Application state
        this.rawData = [];
        this.currentTab = 'usage-dashboard';
        this.currentMonth = null;
        this.allMonthsData = {}; // Store all loaded months' data
        
        // Dashboard configuration
        this.dashboardConfig = this.storageService.loadDashboardConfig() || {
            darkMode: false
        };
        
        console.log('CopilotUsageAnalyzer initialized');
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.setupEventListeners();
        this.applyDarkMode();
        this.loadMonthsList();
        this.checkForSelectedMonth();
    }

    /**
     * Setup main event listeners
     */
    setupEventListeners() {
        // File upload
        document.getElementById('csvFileInput')?.addEventListener('change', (e) => this.handleFileUpload(e));
        document.getElementById('csvFileInputCompact')?.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Sample data
        document.getElementById('loadSampleData')?.addEventListener('click', () => this.loadSampleData());
        
        // Tab navigation
        this.setupTabNavigation();
        
        // Dark mode toggle
        document.getElementById('darkModeToggle')?.addEventListener('change', () => this.toggleDarkMode());
        
        // Date range selectors (now used for month selection)
        document.getElementById('dateRange')?.addEventListener('change', (e) => this.handleDateRangeChange(e));
        document.getElementById('quotaDateRange')?.addEventListener('change', (e) => this.handleDateRangeChange(e));
        
        // Clear month buttons
        document.getElementById('clearMonthBtn')?.addEventListener('click', () => this.handleClearMonth());
        document.getElementById('quotaClearMonthBtn')?.addEventListener('click', () => this.handleClearMonth());
    }

    /**
     * Setup tab navigation
     */
    setupTabNavigation() {
        document.querySelectorAll('.tab-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const tabId = e.target.dataset.tab;
                this.switchTab(tabId);
            });
        });
    }

    /**
     * Switch between tabs
     */
    switchTab(tabId) {
        // Update button states
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        // Update content visibility
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabId);
        });

        this.currentTab = tabId;
        
        // Load comparison data when switching to comparison tab
        if (tabId === 'comparison-dashboard') {
            this.comparisonDashboard.loadData();
        }
    }

    /**
     * Toggle dark mode
     */
    toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        this.dashboardConfig.darkMode = document.body.classList.contains('dark-mode');
        this.storageService.saveDashboardConfig(this.dashboardConfig);
        
        // Update chart themes
        this.usageDashboard.updateTheme();
        this.quotaDashboard.updateTheme();
        this.comparisonDashboard.updateTheme();
    }

    /**
     * Apply dark mode from saved settings
     */
    applyDarkMode() {
        if (this.dashboardConfig.darkMode) {
            document.body.classList.add('dark-mode');
            const toggle = document.getElementById('darkModeToggle');
            if (toggle) {
                toggle.checked = true;
            }
        }
    }

    /**
     * Check for cached data on load
     */
    checkForCachedData() {
        const cachedData = this.storageService.loadFromCache();
        if (cachedData && cachedData.length > 0) {
            console.log('Found cached data:', cachedData.length, 'records');
            this.notificationService.info('Loaded cached data. Upload new file to refresh.');
            this.processData(cachedData);
        }
    }

    /**
     * Load available months list
     */
    loadMonthsList() {
        const monthsList = this.storageService.getMonthsList();
        const dateRangeSelector = document.getElementById('dateRange');
        const quotaDateRangeSelector = document.getElementById('quotaDateRange');
        
        // Update both selectors
        [dateRangeSelector, quotaDateRangeSelector].forEach(sel => {
            if (!sel) return;
            
            // Clear existing options
            sel.innerHTML = '';
            
            // Add "All Time" option
            const allTimeOption = document.createElement('option');
            allTimeOption.value = 'all';
            allTimeOption.textContent = 'All Time (All Months)';
            sel.appendChild(allTimeOption);
            
            // Add individual months
            if (monthsList.length > 0) {
                monthsList.forEach(month => {
                    const option = document.createElement('option');
                    option.value = month.key;
                    option.textContent = month.label;
                    sel.appendChild(option);
                });
            }
        });
    }

    /**
     * Check for previously selected month
     */
    checkForSelectedMonth() {
        const monthsList = this.storageService.getMonthsList();
        
        if (monthsList.length > 0) {
            // Load all months data by default
            this.loadAllMonthsData();
        } else {
            // Check for legacy cached data
            this.checkForCachedData();
        }
    }

    /**
     * Handle date range change (now used for month selection)
     */
    handleDateRangeChange(event) {
        const value = event.target.value;
        
        // Sync both selectors
        const dateRangeSelector = document.getElementById('dateRange');
        const quotaDateRangeSelector = document.getElementById('quotaDateRange');
        if (dateRangeSelector) dateRangeSelector.value = value;
        if (quotaDateRangeSelector) quotaDateRangeSelector.value = value;
        
        // Update clear button visibility
        this.updateClearButtonVisibility(value);
        
        if (value === 'all') {
            // Load all months data
            this.loadAllMonthsData();
        } else {
            // Load specific month
            this.loadMonth(value);
        }
    }

    /**
     * Update clear button visibility
     */
    updateClearButtonVisibility(selectedValue) {
        const clearBtn = document.getElementById('clearMonthBtn');
        const quotaClearBtn = document.getElementById('quotaClearMonthBtn');
        
        // Show clear button only when a specific month is selected (not "all")
        const showButton = selectedValue !== 'all' && selectedValue !== '';
        if (clearBtn) clearBtn.style.display = showButton ? 'flex' : 'none';
        if (quotaClearBtn) quotaClearBtn.style.display = showButton ? 'flex' : 'none';
    }

    /**
     * Load all months data and combine them
     */
    loadAllMonthsData() {
        const monthsList = this.storageService.getMonthsList();
        
        if (monthsList.length === 0) {
            this.notificationService.warning('No data available');
            return;
        }
        
        let combinedData = [];
        this.allMonthsData = {};
        
        monthsList.forEach(month => {
            const data = this.storageService.loadMonthData(month.key);
            if (data && data.length > 0) {
                this.allMonthsData[month.key] = data;
                combinedData = combinedData.concat(data);
            }
        });
        
        this.currentMonth = 'all';
        this.storageService.setSelectedMonth('all');
        
        // Update selectors
        const dateRangeSelector = document.getElementById('dateRange');
        const quotaDateRangeSelector = document.getElementById('quotaDateRange');
        if (dateRangeSelector) dateRangeSelector.value = 'all';
        if (quotaDateRangeSelector) quotaDateRangeSelector.value = 'all';
        
        // Update clear button visibility
        this.updateClearButtonVisibility('all');
        
        // Process and display combined data
        this.processData(combinedData);
        
        const totalMonths = monthsList.length;
        this.notificationService.success(`Loaded all data from ${totalMonths} month${totalMonths > 1 ? 's' : ''} (${combinedData.length} records)`);
    }

    /**
     * Handle month change from selector
     */
    handleMonthChange(event) {
        const monthKey = event.target.value;
        if (monthKey) {
            this.loadMonth(monthKey);
        }
    }

    /**
     * Load data for a specific month
     */
    loadMonth(monthKey) {
        const data = this.storageService.loadMonthData(monthKey);
        
        if (!data || data.length === 0) {
            this.notificationService.warning(`No data found for selected month`);
            return;
        }
        
        this.currentMonth = monthKey;
        this.storageService.setSelectedMonth(monthKey);
        
        // Update both selectors to stay in sync
        const dateRangeSelector = document.getElementById('dateRange');
        const quotaDateRangeSelector = document.getElementById('quotaDateRange');
        if (dateRangeSelector) dateRangeSelector.value = monthKey;
        if (quotaDateRangeSelector) quotaDateRangeSelector.value = monthKey;
        
        // Update clear button visibility
        this.updateClearButtonVisibility(monthKey);
        
        // Process and display data
        this.processData(data);
        
        const monthsList = this.storageService.getMonthsList();
        const monthInfo = monthsList.find(m => m.key === monthKey);
        const label = monthInfo ? monthInfo.label : monthKey;
        
        this.notificationService.success(`Loaded ${label} data (${data.length} records)`);
    }

    /**
     * Handle delete month (now called clear month)
     */
    handleClearMonth() {
        if (!this.currentMonth || this.currentMonth === 'all') {
            this.notificationService.warning('No specific month selected to clear');
            return;
        }
        
        const monthsList = this.storageService.getMonthsList();
        const monthInfo = monthsList.find(m => m.key === this.currentMonth);
        const label = monthInfo ? monthInfo.label : this.currentMonth;
        
        if (!confirm(`Are you sure you want to delete data for ${label}?`)) {
            return;
        }
        
        this.storageService.deleteMonthData(this.currentMonth);
        this.notificationService.success(`Deleted ${label} data`);
        
        // Reload months list
        this.loadMonthsList();
        
        // Load all remaining months or clear dashboard
        const updatedMonthsList = this.storageService.getMonthsList();
        if (updatedMonthsList.length > 0) {
            this.loadAllMonthsData();
            // Refresh comparison dashboard if it's active
            if (this.currentTab === 'comparison-dashboard') {
                this.comparisonDashboard.loadData();
            }
        } else {
            this.currentMonth = null;
            document.getElementById('dashboard').style.display = 'none';
            document.querySelector('.upload-section')?.classList.remove('hidden');
        }
    }

    /**
     * Handle delete month (legacy method name for compatibility)
     */
    handleDeleteMonth() {
        this.handleClearMonth();
    }

    /**
     * Handle file upload
     */
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.loadingIndicator.show(`Reading file: ${file.name}`);
        console.log('Reading uploaded file:', file.name, 'size:', file.size);

        try {
            const csvText = await this.readFile(file);
            const data = await this.dataService.parseCSV(csvText, (percentage) => {
                this.loadingIndicator.updateProgress(percentage);
            });

            // Detect month from data
            const monthInfo = this.storageService.detectMonthFromData(data);
            
            if (!monthInfo) {
                this.notificationService.error('Could not detect month from data. Please ensure data has valid timestamps.');
                this.loadingIndicator.hide();
                return;
            }
            
            // Save with month key
            this.storageService.saveMonthData(monthInfo.key, data, monthInfo);
            this.storageService.saveToCache(data); // Legacy support
            
            this.loadingIndicator.hide();
            
            // Reload months list
            this.loadMonthsList();
            
            // Select the newly uploaded month
            const dateRangeSelector = document.getElementById('dateRange');
            const quotaDateRangeSelector = document.getElementById('quotaDateRange');
            if (dateRangeSelector) dateRangeSelector.value = monthInfo.key;
            if (quotaDateRangeSelector) quotaDateRangeSelector.value = monthInfo.key;
            
            // Load the new month
            this.loadMonth(monthInfo.key);
            
            // Refresh comparison dashboard if available
            if (this.storageService.getMonthsList().length >= 2) {
                this.comparisonDashboard.loadData();
            }
            
            this.notificationService.success(`Uploaded ${monthInfo.label} data (${data.length} records)`);
        } catch (error) {
            console.error('File upload error:', error);
            this.loadingIndicator.hide();
            this.notificationService.error('Failed to process file: ' + error.message);
        }
    }

    /**
     * Read file as text
     */
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Load sample data
     */
    async loadSampleData() {
        this.loadingIndicator.show('Loading sample data...');

        try {
            // Load usage data
            const usageResponse = await fetch(APP_CONFIG.sampleDataUrl);
            if (!usageResponse.ok) throw new Error('Failed to load sample data');
            
            const usageCsvText = await usageResponse.text();
            const data = await this.dataService.parseCSV(usageCsvText, (percentage) => {
                this.loadingIndicator.updateProgress(percentage);
            });

            // Detect month from data
            const monthInfo = this.storageService.detectMonthFromData(data);
            
            if (monthInfo) {
                // Save with month key
                this.storageService.saveMonthData(monthInfo.key, data, monthInfo);
                
                // Reload months list
                this.loadMonthsList();
                
                // Select the newly loaded sample month
                const dateRangeSelector = document.getElementById('dateRange');
                const quotaDateRangeSelector = document.getElementById('quotaDateRange');
                if (dateRangeSelector) dateRangeSelector.value = monthInfo.key;
                if (quotaDateRangeSelector) quotaDateRangeSelector.value = monthInfo.key;
                
                // Load the sample month
                this.loadMonth(monthInfo.key);
                
                this.notificationService.success(`Sample data loaded: ${monthInfo.label}`);
            } else {
                // Fallback to legacy method
                this.processData(data);
                this.notificationService.success('Sample data loaded successfully!');
            }

            this.loadingIndicator.hide();
        } catch (error) {
            console.error('Failed to load sample data:', error);
            this.loadingIndicator.hide();
            this.notificationService.error('Failed to load sample data. Please upload your own CSV file.');
        }
    }

    /**
     * Process and display data
     */
    processData(data) {
        if (!data || data.length === 0) {
            this.notificationService.warning('No data to process');
            return;
        }

        console.log('Processing data with', data.length, 'records');
        this.rawData = this.dataService.sortByTimestamp(data, true);

        // Calculate number of months in the data
        const numberOfMonths = this.calculateNumberOfMonths(data);

        // Load data into dashboards
        this.usageDashboard.loadData(this.rawData);
        this.quotaDashboard.loadData(this.rawData, numberOfMonths);

        // Show dashboard, hide upload section
        document.getElementById('dashboard').style.display = 'block';
        document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
        document.querySelector('.upload-section')?.classList.add('hidden');

        this.notificationService.success(`Loaded ${data.length} records successfully!`);
    }

    /**
     * Calculate number of distinct months in the data
     */
    calculateNumberOfMonths(data) {
        if (!data || data.length === 0) return 1;
        
        const months = new Set();
        data.forEach(row => {
            if (row.timestamp && row.timestamp instanceof Date) {
                const monthKey = `${row.timestamp.getFullYear()}-${String(row.timestamp.getMonth() + 1).padStart(2, '0')}`;
                months.add(monthKey);
            }
        });
        
        return Math.max(1, months.size);
    }
}

// Initialize the analyzer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CopilotUsageAnalyzer();
});
