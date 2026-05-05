import { APP_CONFIG } from '../config/appConfig.js';

const DB_NAME = 'copilot-usage-db';
const DB_VERSION = 1;
const STORE_MONTH_DATA = 'monthData';
const STORE_SETTINGS = 'settings';

/**
 * Service for caching and retrieving data from IndexedDB
 */
export class StorageService {
    constructor() {
        this.dashboardConfigKey = APP_CONFIG.dashboardConfigKey;
        this.monthsListKey = 'copilot-months-list';
        this.selectedMonthKey = 'copilot-selected-month';
        this._dbPromise = this._openDB();
        this._monthsListCache = null; // In-memory cache for the lightweight months list
    }

    /**
     * Open (or create) the IndexedDB database
     */
    _openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_MONTH_DATA)) {
                    db.createObjectStore(STORE_MONTH_DATA);
                }
                if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
                    db.createObjectStore(STORE_SETTINGS);
                }
            };

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    /**
     * Run a transaction and return a promise for a single store operation
     */
    async _tx(storeName, mode, callback) {
        const db = await this._dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, mode);
            const store = tx.objectStore(storeName);
            const result = callback(store);

            if (result instanceof IDBRequest) {
                result.onsuccess = () => resolve(result.result);
                result.onerror = () => reject(result.error);
            } else {
                tx.oncomplete = () => resolve(result);
                tx.onerror = () => reject(tx.error);
            }
        });
    }

    /**
     * Reconstruct Date objects in data rows
     */
    _reconstructDates(data) {
        if (!data) return data;
        return data.map(row => {
            if (row.timestamp && typeof row.timestamp === 'string') {
                row.timestamp = new Date(row.timestamp);
            }
            if (row.lastActivity && typeof row.lastActivity === 'string') {
                row.lastActivity = new Date(row.lastActivity);
            }
            return row;
        });
    }

    /**
     * Detect year-month from data
     */
    detectMonthFromData(data) {
        if (!data || data.length === 0) return null;
        
        const timestamps = data
            .filter(row => row.timestamp && row.timestamp instanceof Date)
            .map(row => row.timestamp);
        
        if (timestamps.length === 0) return null;
        
        const latestDate = new Date(Math.max(...timestamps));
        const year = latestDate.getFullYear();
        const month = latestDate.getMonth() + 1;
        
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
    async saveMonthData(monthKey, data, monthInfo) {
        try {
            const cacheData = { data, timestamp: Date.now(), monthInfo };
            await this._tx(STORE_MONTH_DATA, 'readwrite', store => store.put(cacheData, monthKey));
            await this.addToMonthsList(monthKey, { ...monthInfo, recordCount: data.length });
            console.log('Month data saved successfully:', monthKey);
            return true;
        } catch (error) {
            console.error('Failed to save month data:', error);
            return false;
        }
    }

    /**
     * Add month to the list of available months
     */
    async addToMonthsList(monthKey, monthInfo) {
        const monthsList = await this.getMonthsList();
        const existingIndex = monthsList.findIndex(m => m.key === monthKey);
        
        if (existingIndex >= 0) {
            monthsList[existingIndex] = { key: monthKey, ...monthInfo, timestamp: Date.now() };
        } else {
            monthsList.push({ key: monthKey, ...monthInfo, timestamp: Date.now() });
        }
        
        monthsList.sort((a, b) => b.key.localeCompare(a.key));
        await this._tx(STORE_SETTINGS, 'readwrite', store => store.put(monthsList, this.monthsListKey));
        this._monthsListCache = monthsList;
    }

    /**
     * Get list of all available months (cached in memory after first read)
     */
    async getMonthsList() {
        if (this._monthsListCache) return this._monthsListCache;
        try {
            const stored = await this._tx(STORE_SETTINGS, 'readonly', store => store.get(this.monthsListKey));
            this._monthsListCache = stored || [];
            return this._monthsListCache;
        } catch (error) {
            console.error('Failed to load months list:', error);
            return [];
        }
    }

    /**
     * Load data for a specific month
     */
    async loadMonthData(monthKey) {
        try {
            const cacheData = await this._tx(STORE_MONTH_DATA, 'readonly', store => store.get(monthKey));
            if (!cacheData) return null;

            const data = this._reconstructDates(cacheData.data);
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
    async deleteMonthData(monthKey) {
        try {
            await this._tx(STORE_MONTH_DATA, 'readwrite', store => store.delete(monthKey));
            
            const monthsList = await this.getMonthsList();
            const filtered = monthsList.filter(m => m.key !== monthKey);
            await this._tx(STORE_SETTINGS, 'readwrite', store => store.put(filtered, this.monthsListKey));
            this._monthsListCache = filtered;
            
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
    async getSelectedMonth() {
        try {
            const selected = await this._tx(STORE_SETTINGS, 'readonly', store => store.get(this.selectedMonthKey));
            return selected || null;
        } catch (error) {
            console.error('Failed to get selected month:', error);
            return null;
        }
    }

    /**
     * Set currently selected month
     */
    async setSelectedMonth(monthKey) {
        try {
            await this._tx(STORE_SETTINGS, 'readwrite', store => store.put(monthKey, this.selectedMonthKey));
        } catch (error) {
            console.error('Failed to set selected month:', error);
        }
    }

    /**
     * Save dashboard configuration
     */
    async saveDashboardConfig(config) {
        try {
            await this._tx(STORE_SETTINGS, 'readwrite', store => store.put(config, this.dashboardConfigKey));
        } catch (error) {
            console.error('Failed to save dashboard config:', error);
        }
    }

    /**
     * Load dashboard configuration
     */
    async loadDashboardConfig() {
        try {
            const config = await this._tx(STORE_SETTINGS, 'readonly', store => store.get(this.dashboardConfigKey));
            return config || {};
        } catch (error) {
            console.error('Failed to load dashboard config:', error);
            return {};
        }
    }
}
