# Architecture Documentation

## Overview

The GitHub Copilot Usage Metrics Viewer has been refactored from a monolithic 3,500-line file into a clean, modular architecture following SOLID principles and modern JavaScript best practices.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   index.html (UI)                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              script-new.js (Main App)                   │
│  - Initializes services                                 │
│  - Coordinates dashboards                               │
│  - Handles file uploads                                 │
│  - Manages app state                                    │
└─┬───────────────┬───────────────┬───────────────┬───────┘
  │               │               │               │
  ▼               ▼               ▼               ▼
┌─────────┐ ┌─────────┐ ┌──────────────┐ ┌──────────────┐
│ Data    │ │ Storage │ │ Export       │ │ Notification │
│ Service │ │ Service │ │ Service      │ │ Service      │
└─────────┘ └─────────┘ └──────────────┘ └──────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────────┐
│                  Dashboard Modules                       │
├──────────────────────────┬───────────────────────────────┤
│   UsageDashboard         │   QuotaDashboard              │
│   - Usage charts         │   - Quota charts              │
│   - Usage table          │   - Quota table               │
│   - Stats cards          │   - Stats cards               │
└────┬─────────────────────┴───────────────────────┬───────┘
     │                                             │
     ▼                                             ▼
┌────────────────────────────────────────────────────────┐
│              Shared Components & Services              │
├───────────────┬────────────────┬────────────────┬──────┤
│ ChartService  │ Pagination     │ FilterPanel    │ Modal│
│ TableRenderer │ Loading        │                │      │
└───────────────┴────────────────┴────────────────┴──────┘
     │
     ▼
┌────────────────────────────────────────────────────────┐
│          Configuration & Utilities                     │
├───────────────┬────────────────┬──────────────────────┤
│ appConfig.js  │ chartConfig.js │ dataAggregation.js   │
│ constants.js  │                │                      │
└───────────────┴────────────────┴──────────────────────┘
```

## Module Descriptions

### Core Services

#### DataService
**Purpose**: Handle all data operations
- Parse CSV files
- Filter data by multiple criteria
- Process quota data
- Sort and paginate data
- Extract unique values

**Key Methods**:
- `parseCSV(csvText, progressCallback)` - Parse CSV with progress
- `filterData(data, filters)` - Apply multiple filters
- `processQuotaData(data)` - Calculate quota statistics
- `getUniqueUsers(data)` - Extract unique user list
- `paginateData(data, page, rowsPerPage)` - Paginate results

#### ChartService
**Purpose**: Create and manage Chart.js charts
- Centralized chart creation
- Consistent theming
- Chart lifecycle management
- Theme updates

**Key Methods**:
- `createLineChart(canvasId, data, options)`
- `createBarChart(canvasId, data, options)`
- `createDoughnutChart(canvasId, data, options)`
- `createScatterChart(canvasId, data, options)`
- `createMiniTrendChart(canvasId, data, color)`
- `updateAllChartThemes()` - Update all charts for dark/light mode
- `destroyAllCharts()` - Clean up memory

#### StorageService
**Purpose**: Handle localStorage caching
- Cache parsed data
- Save/load dashboard config
- Handle quota exceeded errors
- Automatic cache expiry

**Key Methods**:
- `saveToCache(data)` - Cache data with timestamp
- `loadFromCache()` - Load if not expired
- `clearCache()` - Remove cached data
- `saveDashboardConfig(config)` - Persist settings
- `loadDashboardConfig()` - Load saved settings

#### ExportService
**Purpose**: Export data to various formats
- CSV export
- JSON export
- Formatted data output
- Download handling

**Key Methods**:
- `exportToCSV(data, filename, headers)`
- `exportFilteredData(filteredData, filename)`
- `exportQuotaData(quotaData, filename)`
- `downloadFile(content, filename, mimeType)`

### Dashboard Modules

#### UsageDashboard
**Purpose**: Manage usage analytics tab
- Coordinates 11 different charts
- Manages usage table
- Handles stat cards
- Processes filters

**Charts Managed**:
1. Timeline chart (requests over time)
2. Model distribution (doughnut)
3. Model bar chart
4. User bar chart
5. Model trends (line)
6. Day of week (bar)
7. User distribution (bar)
8. Cumulative growth (line)
9. Request size (doughnut)
10. User efficiency (bar)
11. Model performance (scatter)

**Key Methods**:
- `loadData(data)` - Initialize with data
- `updateDashboard()` - Refresh all components
- `updateStatCards()` - Calculate and display stats
- `updateCharts()` - Recreate all charts
- `updateTable()` - Display paginated table

#### QuotaDashboard
**Purpose**: Manage quota analytics tab
- Coordinates 4 quota-specific charts
- Manages quota table
- Tracks quota usage
- Identifies users near/over limits

**Charts Managed**:
1. Quota usage (bar)
2. Quota distribution (doughnut)
3. Quota breakdown (bar)
4. Quota timeline (line)

**Key Methods**:
- `loadData(usageData)` - Process quota from usage data
- `updateDashboard()` - Refresh all components
- `updateStatCards()` - Show quota statistics
- `showQuotaDistributionDetails(category)` - Modal details

### UI Components

#### PaginationController
**Purpose**: Reusable pagination component
- Works with any data set
- Configurable rows per page
- Page navigation
- Callbacks for events

**Usage**:
```javascript
const pagination = new PaginationController('container-id', {
    rowsPerPage: 20,
    onPageChange: (page) => { /* handle page change */ },
    onRowsPerPageChange: (rows) => { /* handle rows change */ }
});
pagination.setTotalItems(1000);
pagination.render();
```

#### FilterPanel / QuotaFilterPanel
**Purpose**: Filter UI management
- Populate dropdowns
- Handle filter changes
- Get current filter state
- Reset filters

**Usage**:
```javascript
const filterPanel = new FilterPanel('filters', {
    onFilterChange: (filters) => { /* handle filter change */ }
});
filterPanel.populateFilters(data);
filterPanel.setupEventListeners();
```

#### Modal / ModalManager
**Purpose**: Modal dialog system
- Open/close modals
- Set title and content
- Handle escape key
- Click outside to close
- Manage multiple modals

**Usage**:
```javascript
const modalManager = new ModalManager();
modalManager.register('my-modal');
modalManager.open('my-modal', '<p>Modal content</p>');
```

#### TableRenderer
**Purpose**: Render data tables
- Column configuration
- Custom formatters
- Row click handlers
- Empty state handling

**Usage**:
```javascript
const tableRenderer = new UsageTableRenderer('tableBody');
tableRenderer.render(data);
```

#### NotificationService / LoadingIndicator
**Purpose**: User feedback
- Success/error/warning/info notifications
- Loading overlay
- Progress tracking
- Auto-dismiss

**Usage**:
```javascript
const notification = new NotificationService();
notification.success('Data loaded!');

const loading = new LoadingIndicator();
loading.show('Processing...');
loading.updateProgress(50);
loading.hide();
```

### Utilities

#### dataAggregation.js
**Purpose**: Reusable data processing functions

**Functions**:
- `groupBy(data, keyFn)` - Group data by key
- `topN(groupedData, n)` - Get top N items
- `getUniqueValues(data, keyFn)` - Extract unique values
- `calculateStats(numbers)` - Min, max, mean, median, stdDev
- `groupByDate(data)` - Group by date string
- `calculateCumulative(dailyData)` - Cumulative sum
- `filterByDateRange(data, days)` - Time-based filter
- `calculateRequestsPerUser(data)` - User totals
- `calculateUserEfficiency(data)` - Requests per active day
- `calculateModelStats(data)` - Model metrics
- `calculateDailyTimeSeriesData(data, days)` - Time series
- `groupByDayOfWeek(data)` - Day of week aggregation
- `categorizeRequestSize(data, categories)` - Size bucketing

### Configuration

#### appConfig.js
**Purpose**: Application settings

```javascript
export const APP_CONFIG = {
    chunkSize: 1000,              // CSV processing chunk size
    rowsPerPage: 20,              // Default pagination
    cacheExpiry: 24 * 60 * 60 * 1000,  // 24 hours
    topItemsCount: 10,            // Top N items in charts
    topModelsInTrends: 5,         // Models in trend charts
    paginationMaxButtons: 5,      // Max page buttons
    notificationDuration: 5000,   // Notification timeout
    sampleDataUrl: 'data_example.csv'
};
```

#### chartConfig.js
**Purpose**: Chart.js defaults

**Functions**:
- `getThemeColors()` - Dark/light mode colors
- `getLineChartDefaults(hideLegend)`
- `getBarChartDefaults(horizontal, hideLegend)`
- `getDoughnutChartDefaults(legendPosition)`
- `getScatterChartDefaults()`
- `getMiniTrendChartDefaults()`

#### constants.js
**Purpose**: Application constants

```javascript
export const DATE_RANGES = { WEEK: 7, MONTH: 30, ... };
export const REQUEST_SIZE_CATEGORIES = { SMALL: {...}, ... };
export const USER_DISTRIBUTION_BRACKETS = [...];
export const QUOTA_THRESHOLDS = { NORMAL: 0.8, ... };
export const DAY_NAMES = ['Sunday', ...];
export const COLOR_PALETTES = { primary: '#667eea', ... };
```

## Data Flow

### File Upload Flow
```
User selects file
    ↓
script-new.js handles upload
    ↓
DataService.parseCSV() (with progress)
    ↓
StorageService.saveToCache()
    ↓
UsageDashboard.loadData()
    ↓
QuotaDashboard.loadData()
    ↓
Charts & tables rendered
```

### Filter Change Flow
```
User changes filter
    ↓
FilterPanel captures change
    ↓
Calls onFilterChange callback
    ↓
Dashboard.applyFilters()
    ↓
DataService.filterData()
    ↓
Dashboard.updateDashboard()
    ↓
Charts, stats, and table update
```

### Dark Mode Toggle Flow
```
User toggles dark mode
    ↓
script-new.js toggleDarkMode()
    ↓
StorageService.saveDashboardConfig()
    ↓
UsageDashboard.updateTheme()
    ↓
QuotaDashboard.updateTheme()
    ↓
ChartService.updateAllChartThemes()
    ↓
All charts update colors
```

## Benefits of New Architecture

### 1. Maintainability
- **Single Responsibility**: Each module does one thing well
- **Easy to Find**: Clear naming and organization
- **Safe to Change**: Changes are isolated
- **Easy to Test**: Each service can be tested independently

### 2. Reusability
- **ChartService**: Used 20+ times across both dashboards
- **PaginationController**: Reused for usage and quota tables
- **FilterPanel**: Base class for both filter types
- **DataAggregation**: Functions used throughout

### 3. Scalability
- **Add New Dashboard**: Create new module, import services
- **Add New Chart**: Call ChartService with data
- **Add New Filter**: Extend FilterPanel
- **Add New Export**: Add method to ExportService

### 4. Developer Experience
- **Clear Entry Point**: script-new.js shows all initialization
- **Dependency Injection**: Services passed to constructors
- **Modern JavaScript**: ES6 modules, classes, async/await
- **No Global State**: Everything scoped properly

## Performance Improvements

1. **Modular Loading**: Browser only loads needed modules
2. **Code Splitting**: Separate files can be cached
3. **Memory Management**: Charts properly destroyed
4. **Efficient Updates**: Only affected components rerender

## Future Enhancements

### Possible Additions
1. **Unit Tests**: Test each service independently
2. **TypeScript**: Add type safety
3. **Web Workers**: Parse CSV in background thread
4. **Virtual Scrolling**: For very large datasets
5. **Chart Export**: Export charts as images
6. **Data Comparison**: Compare different time periods
7. **Custom Dashboards**: User-defined chart layouts
8. **Real-time Updates**: WebSocket support

### Easy to Implement
- New chart type? Add method to ChartService
- New data transformation? Add function to dataAggregation
- New dashboard? Create new module
- New theme? Update chartConfig

## Migration Path

### From Old to New
1. ✅ New code in `script-new.js`
2. ✅ Old code preserved in `script.js`
3. ✅ index.html uses modules with fallback
4. ✅ All features maintained
5. ⏳ Test thoroughly
6. ⏳ Remove `script.js` when confident

### Testing Checklist
- [x] Upload CSV file
- [x] Load sample data
- [x] View usage dashboard
- [x] View quota dashboard
- [x] Apply filters
- [x] Change pagination
- [x] Toggle dark mode
- [x] Export data
- [x] Check caching
- [x] Verify all charts render
- [x] Test search functionality
- [x] Switch between tabs

## Conclusion

The refactoring reduces the main file by 94% (3,500 → 215 lines) while improving code quality, maintainability, and developer experience. The modular architecture makes the codebase easier to understand, modify, and extend.

Each module has a clear purpose, well-defined interfaces, and minimal dependencies. This follows industry best practices and makes the codebase future-proof.
