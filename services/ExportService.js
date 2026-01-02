/**
 * Service for exporting data to various formats
 */
export class ExportService {
    /**
     * Export data to CSV format
     */
    exportToCSV(data, filename, headers = null) {
        if (!data || data.length === 0) {
            console.warn('No data to export');
            return;
        }

        try {
            // Generate CSV content
            let csvContent = '';

            // Use custom headers or derive from data
            const csvHeaders = headers || Object.keys(data[0]);
            csvContent += csvHeaders.join(',') + '\n';

            // Add data rows
            data.forEach(row => {
                const values = csvHeaders.map(header => {
                    let value = row[header];
                    
                    // Handle special cases
                    if (value instanceof Date) {
                        value = value.toISOString();
                    } else if (typeof value === 'string' && value.includes(',')) {
                        value = `"${value}"`;
                    }
                    
                    return value ?? '';
                });
                csvContent += values.join(',') + '\n';
            });

            // Create and download file
            this.downloadFile(csvContent, filename, 'text/csv');
            console.log(`Exported ${data.length} rows to ${filename}`);
        } catch (error) {
            console.error('Failed to export CSV:', error);
            throw new Error('Export failed');
        }
    }

    /**
     * Export filtered data with formatted dates
     */
    exportFilteredData(filteredData, filename = 'copilot-usage-data.csv') {
        const exportData = filteredData.map(row => ({
            Date: row.timestamp.toLocaleDateString(),
            User: row.user,
            Model: row.model,
            Requests: row.requests
        }));

        this.exportToCSV(exportData, filename);
    }

    /**
     * Export quota data
     */
    exportQuotaData(quotaData, filename = 'copilot-quota-data.csv') {
        const exportData = quotaData.map(row => ({
            User: row.user,
            Requests: row.requests,
            Quota: row.quota,
            'Usage %': row.usagePercentage.toFixed(1),
            Status: row.status
        }));

        this.exportToCSV(exportData, filename);
    }

    /**
     * Download file helper
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Export chart data as JSON
     */
    exportChartDataAsJSON(chartData, filename = 'chart-data.json') {
        const jsonContent = JSON.stringify(chartData, null, 2);
        this.downloadFile(jsonContent, filename, 'application/json');
    }
}
