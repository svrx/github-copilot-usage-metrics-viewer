/**
 * Table renderer component for displaying data tables
 */
export class TableRenderer {
    constructor(tableId, options = {}) {
        this.tableId = tableId;
        this.columns = options.columns || [];
        this.onRowClick = options.onRowClick || null;
    }

    /**
     * Render table with data
     */
    render(data) {
        const tbody = document.getElementById(this.tableId);
        if (!tbody) {
            console.error(`Table ${this.tableId} not found`);
            return;
        }

        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="100%" style="text-align: center;">No data available</td></tr>';
            return;
        }

        data.forEach((row, index) => {
            const tr = document.createElement('tr');
            
            if (this.onRowClick) {
                tr.style.cursor = 'pointer';
                tr.addEventListener('click', () => this.onRowClick(row, index));
            }

            this.columns.forEach(column => {
                const td = document.createElement('td');
                td.innerHTML = this.formatCell(row, column);
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });
    }

    /**
     * Format cell value based on column configuration
     */
    formatCell(row, column) {
        let value = row[column.field];

        // Apply custom formatter if provided
        if (column.formatter) {
            return column.formatter(value, row);
        }

        // Handle null/undefined values
        if (value === null || value === undefined) {
            return '';
        }

        // Default formatters by type
        if (column.type === 'date') {
            return value instanceof Date ? value.toLocaleDateString() : value;
        } else if (column.type === 'number') {
            return typeof value === 'number' ? value.toLocaleString() : (value || '0');
        } else if (column.type === 'percentage') {
            return typeof value === 'number' ? `${value.toFixed(1)}%` : value;
        }

        return value;
    }

    /**
     * Update table columns
     */
    setColumns(columns) {
        this.columns = columns;
    }

    /**
     * Clear table
     */
    clear() {
        const tbody = document.getElementById(this.tableId);
        if (tbody) {
            tbody.innerHTML = '';
        }
    }
}

/**
 * Usage table renderer (specific implementation)
 */
export class UsageTableRenderer extends TableRenderer {
    constructor(tableId) {
        super(tableId, {
            columns: [
                { field: 'timestamp', label: 'Date', type: 'date' },
                { field: 'user', label: 'User' },
                { field: 'model', label: 'Model' },
                { field: 'requests', label: 'Requests', type: 'number' },
                { 
                    field: 'exceeds_quota', 
                    label: 'Exceeds Quota',
                    formatter: (value) => value === 'True' || value === true ? 'Yes' : 'No'
                },
                { field: 'quota', label: 'Quota', type: 'number' }
            ]
        });
    }
}

/**
 * Quota table renderer (specific implementation)
 */
export class QuotaTableRenderer extends TableRenderer {
    constructor(tableId) {
        super(tableId, {
            columns: [
                { field: 'user', label: 'User' },
                { field: 'requests', label: 'Requests', type: 'number' },
                { field: 'quota', label: 'Quota', type: 'number' },
                { 
                    field: 'usagePercentage', 
                    label: 'Usage %', 
                    formatter: (value) => `${value.toFixed(1)}%`
                },
                { 
                    field: 'status', 
                    label: 'Status'
                },
                { field: 'exceedsQuotaRequests', label: 'Exceeds Quota', type: 'number' },
                { field: 'remainingQuota', label: 'Remaining Quota', type: 'number' }
            ]
        });
    }
    
    /**
     * Render table with cell styling
     */
    render(data) {
        const tbody = document.getElementById(this.tableId);
        if (!tbody) {
            console.error(`Table ${this.tableId} not found`);
            return;
        }

        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="100%" style="text-align: center;">No data available</td></tr>';
            return;
        }

        data.forEach((row, index) => {
            const tr = document.createElement('tr');
            
            if (this.onRowClick) {
                tr.style.cursor = 'pointer';
                tr.addEventListener('click', () => this.onRowClick(row, index));
            }

            this.columns.forEach(column => {
                const td = document.createElement('td');
                
                // Apply CSS class for quota columns
                if (column.field === 'usagePercentage' || column.field === 'status') {
                    let cssClass = 'quota-normal';
                    if (row.usagePercentage >= 100) {
                        cssClass = 'quota-exceeded';
                    } else if (row.usagePercentage >= 80) {
                        cssClass = 'quota-near';
                    }
                    td.className = cssClass;
                }
                
                td.innerHTML = this.formatCell(row, column);
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });
    }
}
