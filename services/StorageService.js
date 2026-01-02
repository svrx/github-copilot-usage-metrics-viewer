import { APP_CONFIG } from '../config/appConfig.js';

/**
 * Service for caching and retrieving data from localStorage
 */
export class StorageService {
    constructor() {
        this.cacheKey = APP_CONFIG.cacheKey;
        this.cacheExpiry = APP_CONFIG.cacheExpiry;
        this.dashboardConfigKey = APP_CONFIG.dashboardConfigKey;
        this.monthDataKeyPrefix = 'copilot-month-data-';
        this.monthsListKey = 'copilot-months-list';
        this.selectedMonthKey = 'copilot-selected-month';
    }

    /**
     * Detect year-month from data
     */
    detectMonthFromData(data) {
        if (!data || data.length === 0) return null;
        
        // Get the most recent timestamp
        const timestamps = data
            .filter(row => row.timestamp && row.timestamp instanceof Date)
            .map(row => row.timestamp);
        
        if (timestamps.length === 0) return null;
        
        // Use the latest date in the dataset
        const latestDate = new Date(Math.max(...timestamps));
        const year = latestDate.getFullYear();
        const month = latestDate.getMonth() + 1; // 0-indexed
        
        return {
            year,
            month,
            key: `${year}-${String(month).padStart(2, '0')}`,
            label: `${latestDate.toLocaleString('default', { month: 'long' })} ${year}`
        };
    }

    /**
     * Save data for a specific month
     */
    saveMonthData(monthKey, data, monthInfo) {
        try {
            const cacheData = {
                data: data,
                timestamp: Date.now(),
                monthInfo: monthInfo
            };
            
            const storageKey = this.monthDataKeyPrefix + monthKey;
            localStorage.setItem(storageKey, JSON.stringify(cacheData));
            
            // Update months list
            this.addToMonthsList(monthKey, monthInfo);
            
            console.log('Month data saved successfully:', monthKey);
            return true;
        } catch (error) {
            console.error('Failed to save month data:', error);
            if (error.name === 'QuotaExceededError') {
                console.warn('LocalStorage quota exceeded. Consider removing older months.');
            }
            return false;
        }
    }

    /**
     * Add month to the list of available months
     */
    addToMonthsList(monthKey, monthInfo) {
        const monthsList = this.getMonthsList();
        
        // Check if month already exists
        const existingIndex = monthsList.findIndex(m => m.key === monthKey);
        
        if (existingIndex >= 0) {
            // Update existing entry
            monthsList[existingIndex] = { key: monthKey, ...monthInfo, timestamp: Date.now() };
        } else {
            // Add new entry
            monthsList.push({ key: monthKey, ...monthInfo, timestamp: Date.now() });
        }
        
        // Sort by year-month descending (most recent first)
        monthsList.sort((a, b) => b.key.localeCompare(a.key));
        
        localStorage.setItem(this.monthsListKey, JSON.stringify(monthsList));
    }

    /**
     * Get list of all available months
     */
    getMonthsList() {
        try {
            const stored = localStorage.getItem(this.monthsListKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load months list:', error);
            return [];
        }
    }

    /**
     * Load data for a specific month
     */
    loadMonthData(monthKey) {
        try {
            const storageKey = this.monthDataKeyPrefix + monthKey;
            const cached = localStorage.getItem(storageKey);
            if (!cached) return null;

            const cacheData = JSON.parse(cached);
            
            // Reconstruct Date objects
            const data = cacheData.data.map(row => {
                if (row.timestamp && typeof row.timestamp === 'string') {
                    row.timestamp = new Date(row.timestamp);
                }
                if (row.lastActivity && typeof row.lastActivity === 'string') {
                    row.lastActivity = new Date(row.lastActivity);
                }
                return row;
            });
            
            console.log('Loaded month data:', monthKey, data.length, 'records');
            return data;
        } catch (error) {
            console.error('Failed to load month data:', error);
            return null;
        }
    }

    /**
     * Delete data for a specific month
     */
    deleteMonthData(monthKey) {
        try {
            const storageKey = this.monthDataKeyPrefix + monthKey;
            localStorage.removeItem(storageKey);
            
            // Remove from months list
            const monthsList = this.getMonthsList();
            const filtered = monthsList.filter(m => m.key !== monthKey);
            localStorage.setItem(this.monthsListKey, JSON.stringify(filtered));
            
            console.log('Deleted month data:', monthKey);
            return true;
        } catch (error) {
            console.error('Failed to delete month data:', error);
            return false;
        }
    }

    /**
     * Get currently selected month
     */
    getSelectedMonth() {
        try {
            const selected = localStorage.getItem(this.selectedMonthKey);
            return selected || null;
        } catch (error) {
            console.error('Failed to get selected month:', error);
            return null;
        }
    }

    /**
     * Set currently selected month
     */
    setSelectedMonth(monthKey) {
        try {
            localStorage.setItem(this.selectedMonthKey, monthKey);
        } catch (error) {
            console.error('Failed to set selected month:', error);
        }
    }

    /**
     * Save data to cache with expiry timestamp (legacy support)
     */
    saveToCache(data) {
        try {
            const cacheData = {
                data: data,
                timestamp: Date.now()
            };
            localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
            console.log('Data cached successfully');
            return true;
        } catch (error) {
            console.error('Failed to cache data:', error);
            // Handle quota exceeded error
            if (error.name === 'QuotaExceededError') {
                console.warn('LocalStorage quota exceeded. Clearing old data...');
                this.clearCache();
            }
            return false;
        }
    }

    /**
     * Load data from cache if not expired
     */
    loadFromCache() {
        try {
            const cached = localStorage.getItem(this.cacheKey);
            if (!cached) return null;

            const cacheData = JSON.parse(cached);
            const age = Date.now() - cacheData.timestamp;

            if (age > this.cacheExpiry) {
                console.log('Cache expired');
                this.clearCache();
                return null;
            }

            console.log('Loaded data from cache');
            
            // Reconstruct Date objects from cached data
            const data = cacheData.data.map(row => {
                if (row.timestamp && typeof row.timestamp === 'string') {
                    row.timestamp = new Date(row.timestamp);
                }
                if (row.lastActivity && typeof row.lastActivity === 'string') {
                    row.lastActivity = new Date(row.lastActivity);
                }
                return row;
            });
            
            return data;
        } catch (error) {
            console.error('Failed to load from cache:', error);
            return null;
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        try {
            localStorage.removeItem(this.cacheKey);
            console.log('Cache cleared');
        } catch (error) {
            console.error('Failed to clear cache:', error);
        }
    }

    /**
     * Save dashboard configuration
     */
    saveDashboardConfig(config) {
        try {
            localStorage.setItem(this.dashboardConfigKey, JSON.stringify(config));
        } catch (error) {
            console.error('Failed to save dashboard config:', error);
        }
    }

    /**
     * Load dashboard configuration
     */
    loadDashboardConfig() {
        try {
            const config = localStorage.getItem(this.dashboardConfigKey);
            return config ? JSON.parse(config) : {};
        } catch (error) {
            console.error('Failed to load dashboard config:', error);
            return {};
        }
    }
}
