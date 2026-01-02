import { APP_CONFIG } from '../config/appConfig.js';
import { DATE_RANGES } from '../config/constants.js';
import * as DataAggregation from '../utils/dataAggregation.js';

/**
 * Service for parsing, filtering, and processing CSV data
 */
export class DataService {
    constructor() {
        this.chunkSize = APP_CONFIG.chunkSize;
    }

    /**
     * Parse CSV text into structured data
     */
    async parseCSV(csvText, progressCallback = null) {
        if (!csvText || csvText.trim() === '') {
            throw new Error('CSV text is empty');
        }

        console.log('Starting CSV parsing...');
        const lines = csvText.trim().split('\n');
        console.log('CSV lines count:', lines.length);

        if (lines.length < 2) {
            throw new Error('CSV file has insufficient data');
        }

        try {
            // Parse header
            const headers = this.parseCSVLine(lines[0]);
            console.log('CSV headers:', headers);

            // Process data in chunks
            return await this.processCSVChunks(lines, headers, progressCallback);
        } catch (error) {
            console.error('CSV parsing error:', error);
            throw error;
        }
    }

    /**
     * Process CSV data in chunks to avoid blocking UI
     */
    async processCSVChunks(lines, headers, progressCallback) {
        const data = [];
        const totalLines = lines.length - 1; // Exclude header
        let processedLines = 0;

        for (let startIndex = 1; startIndex < lines.length; startIndex += this.chunkSize) {
            const endIndex = Math.min(startIndex + this.chunkSize, lines.length);
            const chunk = lines.slice(startIndex, endIndex);

            // Process chunk
            chunk.forEach(line => {
                if (line.trim()) {
                    const values = this.parseCSVLine(line);
                    const row = this.createDataRow(headers, values);
                    if (row) {
                        data.push(row);
                    }
                }
            });

            processedLines += chunk.length;
            const percentage = Math.round((processedLines / totalLines) * 100);

            // Update progress
            if (progressCallback) {
                progressCallback(percentage);
            }

            // Allow UI to update
            if (endIndex < lines.length) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        console.log('Parsed', data.length, 'records');
        return data;
    }

    /**
     * Parse a single CSV line, handling quotes
     */
    parseCSVLine(line) {
        // Handle UTF-8 BOM
        if (line.charCodeAt(0) === 0xFEFF) {
            line = line.substring(1);
        }

        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());
        return result;
    }

    /**
     * Create a data row object from headers and values
     */
    createDataRow(headers, values) {
        if (headers.length !== values.length) {
            console.warn('Header/value mismatch:', headers.length, 'vs', values.length);
            return null;
        }

        const row = {};
        headers.forEach((header, index) => {
            row[header.toLowerCase().replace(/\s+/g, '_')] = values[index];
        });

        // Parse common fields
        if (row.date) {
            row.timestamp = new Date(row.date);
        }
        if (row.quantity) {
            row.requests = parseInt(row.quantity) || 0;
        }
        if (row.requests && typeof row.requests === 'string') {
            row.requests = parseInt(row.requests) || 0;
        }
        if (row.quota) {
            row.quota = parseInt(row.quota) || 0;
        }
        if (row.total_monthly_quota) {
            row.quota = parseInt(row.total_monthly_quota) || 1000;
        }

        // Rename fields for consistency
        if (row.username) row.user = row.username;
        if (row.editor_name) row.model = row.editor_name;
        
        // Ensure model field exists (it's already in the CSV)
        if (!row.model && row.model === undefined) {
            row.model = 'Unknown';
        }
        
        // Debug: log first row to verify parsing
        if (!this._loggedFirstRow) {
            console.log('First parsed row:', row);
            this._loggedFirstRow = true;
        }

        return row;
    }

    /**
     * Filter data based on multiple criteria
     */
    filterData(data, filters = {}) {
        let filtered = [...data];

        // Date range filter
        if (filters.dateRange && filters.dateRange !== 'all') {
            const days = DATE_RANGES[filters.dateRange.toUpperCase()] || parseInt(filters.dateRange);
            filtered = DataAggregation.filterByDateRange(filtered, days);
        }

        // User filter
        if (filters.user && filters.user !== 'all') {
            filtered = filtered.filter(row => row.user === filters.user);
        }

        // Model filter
        if (filters.model && filters.model !== 'all') {
            filtered = filtered.filter(row => row.model === filters.model);
        }

        // Search filter
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filtered = filtered.filter(row =>
                row.user?.toLowerCase().includes(searchTerm) ||
                row.model?.toLowerCase().includes(searchTerm)
            );
        }

        return filtered;
    }

    /**
     * Get unique users from data
     */
    getUniqueUsers(data) {
        return DataAggregation.getUniqueValues(data, row => row.user).sort();
    }

    /**
     * Get unique models from data
     */
    getUniqueModels(data) {
        return DataAggregation.getUniqueValues(data, row => row.model).sort();
    }

    /**
     * Sort data by timestamp
     */
    sortByTimestamp(data, ascending = true) {
        return [...data].sort((a, b) => {
            return ascending
                ? a.timestamp - b.timestamp
                : b.timestamp - a.timestamp;
        });
    }

    /**
     * Process quota data from usage data
     */
    processQuotaData(data, numberOfMonths = 1) {
        const userQuota = {};

        data.forEach(row => {
            if (!userQuota[row.user]) {
                userQuota[row.user] = {
                    user: row.user,
                    requests: 0,
                    quota: (row.quota || 1000) * numberOfMonths,
                    lastActivity: row.timestamp
                };
            }
            userQuota[row.user].requests += row.requests;
            if (row.timestamp > userQuota[row.user].lastActivity) {
                userQuota[row.user].lastActivity = row.timestamp;
            }
        });

        // Calculate usage percentages and status
        const quotaData = Object.values(userQuota).map(user => {
            const usagePercentage = (user.requests / user.quota) * 100;
            const remainingQuota = Math.max(0, user.quota - user.requests);
            const exceedsQuotaRequests = Math.max(0, user.requests - user.quota);
            
            let status = 'Normal';
            if (usagePercentage >= 100) {
                status = 'Over Quota';
            } else if (usagePercentage >= 80) {
                status = 'Near Quota';
            }

            return {
                ...user,
                usagePercentage,
                status,
                remainingQuota,
                exceedsQuotaRequests
            };
        });

        return quotaData.sort((a, b) => b.usagePercentage - a.usagePercentage);
    }

    /**
     * Paginate data
     */
    paginateData(data, page, rowsPerPage) {
        const startIndex = (page - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        return {
            data: data.slice(startIndex, endIndex),
            totalPages: Math.ceil(data.length / rowsPerPage),
            currentPage: page,
            totalItems: data.length
        };
    }
}
