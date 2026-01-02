// Application configuration settings
export const APP_CONFIG = {
    // Data processing
    chunkSize: 1000, // Number of rows to process at once
    maxChartDataPoints: 100, // Maximum data points to display in charts
    
    // Pagination
    rowsPerPage: 20,
    rowsPerPageOptions: [10, 20, 50, 100],
    
    // Caching
    cacheKey: 'copilot-analyzer-cache',
    cacheExpiry: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    
    // Dashboard
    dashboardConfigKey: 'copilot-dashboard-config',
    defaultTrendPeriod: 'week',
    
    // Charts
    topItemsCount: 10, // Number of top items to show in charts (top users, models, etc.)
    topModelsInTrends: 5, // Number of models to track in trend charts
    paginationMaxButtons: 5, // Maximum page buttons to show in pagination
    
    // Notification
    notificationDuration: 5000, // milliseconds
    
    // Sample data
    sampleDataUrl: 'data_example.csv',
    sampleQuotaUrl: 'data_quotes.csv'
};
