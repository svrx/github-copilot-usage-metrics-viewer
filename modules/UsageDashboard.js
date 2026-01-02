import { ChartService } from '../services/ChartService.js';
import { PaginationController } from '../components/PaginationController.js';
import { FilterPanel } from '../components/FilterPanel.js';
import { UsageTableRenderer } from '../components/TableRenderer.js';
import { ModalManager } from '../components/Modal.js';
import * as DataAggregation from '../utils/dataAggregation.js';
import { APP_CONFIG } from '../config/appConfig.js';
import { COLOR_PALETTES, DAY_NAMES, REQUEST_SIZE_CATEGORIES, USER_DISTRIBUTION_BRACKETS } from '../config/constants.js';

/**
 * Usage Dashboard Module - Handles all usage-related charts and tables
 */
export class UsageDashboard {
    constructor(dataService, exportService) {
        this.dataService = dataService;
        this.exportService = exportService;
        this.chartService = new ChartService();
        this.modalManager = new ModalManager();
        
        // Initialize components
        this.filterPanel = new FilterPanel('usage-filters', {
            onFilterChange: (filters) => this.handleFilterChange(filters)
        });
        
        this.tableRenderer = new UsageTableRenderer('dataTableBody');
        
        this.pagination = new PaginationController('dataTable-pagination', {
            onPageChange: () => this.updateTable(),
            onRowsPerPageChange: () => this.updateTable()
        });
        
        this.rawData = [];
        this.filteredData = [];
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterTable());
        }

        // Export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportService.exportFilteredData(this.filteredData);
            });
        }

        // Filter panel
        this.filterPanel.setupEventListeners();
    }

    /**
     * Load and display data
     */
    loadData(data) {
        this.rawData = data;
        this.filterPanel.populateFilters(data);
        this.applyFilters();
    }

    /**
     * Handle filter changes
     */
    handleFilterChange(filters) {
        this.applyFilters();
    }

    /**
     * Apply filters to data
     */
    applyFilters() {
        const filters = this.filterPanel.getFilters();
        this.filteredData = this.dataService.filterData(this.rawData, filters);
        this.updateDashboard();
    }

    /**
     * Update entire dashboard
     */
    updateDashboard() {
        this.updateStatCards();
        this.updateCharts();
        this.updateTable();
    }

    /**
     * Update statistics cards
     */
    updateStatCards() {
        const data = this.filteredData;
        
        const totalUsers = new Set(data.map(row => row.user)).size;
        const totalRequests = data.reduce((sum, row) => sum + row.requests, 0);
        const totalModels = new Set(data.map(row => row.model)).size;
        const avgRequestsPerUser = totalUsers > 0 ? Math.round(totalRequests / totalUsers) : 0;
        
        // Calculate median and std dev using same logic as original
        const userRequestCounts = Object.values(
            DataAggregation.calculateRequestsPerUser(data)
        ).sort((a, b) => a - b);
        
        const medianRequestsPerUser = userRequestCounts.length > 0 
            ? userRequestCounts[Math.floor(userRequestCounts.length / 2)] 
            : 0;
        
        const stdDevRequestsPerUser = userRequestCounts.length > 0
            ? Math.round(Math.sqrt(
                userRequestCounts.reduce((sum, val) => sum + Math.pow(val - avgRequestsPerUser, 2), 0) / userRequestCounts.length
            ))
            : 0;
        
        // Calculate daily average
        const uniqueDays = new Set(data.map(row => row.timestamp.toDateString())).size;
        const dailyAverage = uniqueDays > 0 ? Math.round(totalRequests / uniqueDays) : 0;
        
        // Calculate weekly growth
        const weeklyGrowth = this.calculateWeeklyGrowth(data);
        
        // Get most active user and top model
        const userStats = DataAggregation.groupBy(data, row => row.user);
        const mostActiveUser = DataAggregation.topN(userStats, 1)[0]?.[0] || '--';
        
        const modelStats = DataAggregation.groupBy(data, row => row.model);
        const topModel = DataAggregation.topN(modelStats, 1)[0]?.[0] || '--';
        
        // Update DOM
        this.updateStatCard('totalUsers', totalUsers);
        this.updateStatCard('totalRequests', totalRequests);
        this.updateStatCard('totalModels', totalModels);
        this.updateStatCard('avgRequestsPerUser', avgRequestsPerUser);
        this.updateStatCard('medianRequestsPerUser', Math.round(medianRequestsPerUser));
        this.updateStatCard('stdDevRequestsPerUser', stdDevRequestsPerUser);
        this.updateStatCard('dailyAverage', dailyAverage);
        this.updateStatCard('weeklyGrowth', weeklyGrowth);
        this.updateStatCard('mostActiveUser', mostActiveUser);
        this.updateStatCard('topModel', topModel.length > 20 ? topModel.substring(0, 17) + '...' : topModel);
    }

    /**
     * Update a single stat card
     */
    updateStatCard(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = typeof value === 'number' ? value.toLocaleString() : value;
        }
    }

    /**
     * Calculate weekly growth percentage
     */
    calculateWeeklyGrowth(data) {
        if (data.length === 0) return '+0.0%';

        const sortedData = this.dataService.sortByTimestamp(data, true);
        const lastDate = sortedData[sortedData.length - 1].timestamp;
        
        const twoWeeksAgo = new Date(lastDate.getTime() - 14 * 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(lastDate.getTime() - 7 * 24 * 60 * 60 * 1000);

        const thisWeek = sortedData
            .filter(row => row.timestamp >= oneWeekAgo)
            .reduce((sum, row) => sum + row.requests, 0);
            
        const lastWeek = sortedData
            .filter(row => row.timestamp >= twoWeeksAgo && row.timestamp < oneWeekAgo)
            .reduce((sum, row) => sum + row.requests, 0);

        if (lastWeek === 0) return thisWeek > 0 ? '+100.0%' : '+0.0%';
        
        const growth = ((thisWeek - lastWeek) / lastWeek) * 100;
        return (growth >= 0 ? '+' : '') + growth.toFixed(1) + '%';
    }

    /**
     * Update all charts
     */
    updateCharts() {
        this.createTimelineChart();
        this.createModelChart();
        this.createModelBarChart();
        this.createUserChart();
        this.createModelTrendsChart();
        this.createDayOfWeekChart();
        this.createUserDistributionChart();
        this.createUserDistributionBoxPlotChart();
        this.createCumulativeGrowthChart();
        this.createRequestSizeChart();
        this.createUserEfficiencyChart();
        this.createModelPerformanceChart();
    }

    /**
     * Create timeline chart (requests over time)
     */
    createTimelineChart() {
        const dailyData = DataAggregation.groupByDate(this.filteredData);
        const sortedDates = Object.keys(dailyData).sort();
        const values = sortedDates.map(date => dailyData[date]);

        this.chartService.createLineChart('timelineChart', {
            labels: sortedDates.map(date => new Date(date).toLocaleDateString()),
            datasets: [{
                label: 'Requests',
                data: values,
                borderColor: COLOR_PALETTES.primary,
                backgroundColor: `${COLOR_PALETTES.primary}20`,
                fill: true,
                tension: 0.4
            }]
        }, { hideLegend: true });
    }

    /**
     * Create model distribution chart (doughnut)
     */
    createModelChart() {
        const modelData = DataAggregation.groupBy(this.filteredData, row => row.model);
        const topModels = DataAggregation.topN(modelData, APP_CONFIG.topItemsCount);
        
        const labels = topModels.map(([model]) => model);
        const values = topModels.map(([, count]) => count);

        this.chartService.createDoughnutChart('modelChart', {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: this.chartService.generateColors(labels.length)
            }]
        }, {
            onClick: (_, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    this.showModelDetails(labels[index]);
                }
            }
        });
    }

    /**
     * Create model bar chart
     */
    createModelBarChart() {
        const modelData = DataAggregation.groupBy(this.filteredData, row => row.model);
        const topModels = DataAggregation.topN(modelData, APP_CONFIG.topItemsCount);
        
        const labels = topModels.map(([model]) => model);
        const values = topModels.map(([, count]) => count);

        this.chartService.createBarChart('modelBarChart', {
            labels: labels,
            datasets: [{
                label: 'Requests',
                data: values,
                backgroundColor: COLOR_PALETTES.primary
            }]
        }, { hideLegend: true });
    }

    /**
     * Create user bar chart
     */
    createUserChart() {
        const userData = DataAggregation.groupBy(this.filteredData, row => row.user);
        const topUsers = DataAggregation.topN(userData, APP_CONFIG.topItemsCount);
        
        const labels = topUsers.map(([user]) => user);
        const values = topUsers.map(([, count]) => count);

        this.chartService.createBarChart('userChart', {
            labels: labels,
            datasets: [{
                label: 'Requests',
                data: values,
                backgroundColor: COLOR_PALETTES.pink
            }]
        }, { hideLegend: true });
    }

    /**
     * Create model trends chart (top models over time)
     */
    createModelTrendsChart() {
        const modelTotals = DataAggregation.groupBy(this.filteredData, row => row.model);
        const topModels = DataAggregation.topN(modelTotals, APP_CONFIG.topModelsInTrends)
            .map(([model]) => model);
        
        const allDates = [...new Set(this.filteredData.map(row => 
            row.timestamp.toISOString().split('T')[0]
        ))].sort();
        
        const datasets = topModels.map((model, index) => {
            const modelData = this.filteredData.filter(row => row.model === model);
            const dailyData = DataAggregation.groupByDate(modelData);
            
            return {
                label: model,
                data: allDates.map(date => dailyData[date] || 0),
                borderColor: this.chartService.generateColors(topModels.length)[index],
                tension: 0.4,
                fill: false
            };
        });

        this.chartService.createLineChart('modelTrendsChart', {
            labels: allDates.map(date => new Date(date).toLocaleDateString()),
            datasets: datasets
        });
    }

    /**
     * Create day of week chart
     */
    createDayOfWeekChart() {
        const dayData = DataAggregation.groupByDayOfWeek(this.filteredData);

        this.chartService.createBarChart('dayOfWeekChart', {
            labels: DAY_NAMES,
            datasets: [{
                label: 'Requests',
                data: dayData,
                backgroundColor: COLOR_PALETTES.blue
            }]
        }, { hideLegend: true });
    }

    /**
     * Create user distribution chart
     */
    createUserDistributionChart() {
        const userRequests = DataAggregation.calculateRequestsPerUser(this.filteredData);
        
        const distribution = USER_DISTRIBUTION_BRACKETS.map(bracket => {
            return Object.values(userRequests).filter(
                requests => requests >= bracket.min && requests <= bracket.max
            ).length;
        });

        this.chartService.createBarChart('userDistributionChart', {
            labels: USER_DISTRIBUTION_BRACKETS.map(b => b.label + ' requests'),
            datasets: [{
                label: 'Number of Users',
                data: distribution,
                backgroundColor: COLOR_PALETTES.green
            }]
        });
    }

    /**
     * Create cumulative growth chart
     */
    createCumulativeGrowthChart() {
        const dailyData = DataAggregation.groupByDate(this.filteredData);
        const cumulative = DataAggregation.calculateCumulative(dailyData);

        this.chartService.createLineChart('cumulativeGrowthChart', {
            labels: cumulative.map(d => new Date(d.date).toLocaleDateString()),
            datasets: [{
                label: 'Cumulative Requests',
                data: cumulative.map(d => d.value),
                borderColor: COLOR_PALETTES.purple,
                backgroundColor: `${COLOR_PALETTES.purple}20`,
                fill: true,
                tension: 0.4
            }]
        }, { hideLegend: true });
    }

    /**
     * Create request size chart
     */
    createRequestSizeChart() {
        const sizeCategories = DataAggregation.categorizeRequestSize(
            this.filteredData, 
            REQUEST_SIZE_CATEGORIES
        );

        this.chartService.createDoughnutChart('requestSizeChart', {
            labels: Object.keys(sizeCategories),
            datasets: [{
                data: Object.values(sizeCategories),
                backgroundColor: [
                    COLOR_PALETTES.success,
                    COLOR_PALETTES.warning,
                    COLOR_PALETTES.danger,
                    COLOR_PALETTES.purple
                ]
            }]
        });
    }

    /**
     * Create user efficiency chart
     */
    createUserEfficiencyChart() {
        const efficiencyData = DataAggregation.calculateUserEfficiency(this.filteredData)
            .sort((a, b) => b.efficiency - a.efficiency)
            .slice(0, APP_CONFIG.topItemsCount);

        this.chartService.createBarChart('userEfficiencyChart', {
            labels: efficiencyData.map(item => item.user),
            datasets: [{
                label: 'Requests per Active Day',
                data: efficiencyData.map(item => item.efficiency.toFixed(1)),
                backgroundColor: COLOR_PALETTES.info
            }]
        }, { hideLegend: true });
    }

    /**
     * Create model performance chart (scatter)
     */
    createModelPerformanceChart() {
        const modelStats = DataAggregation.calculateModelStats(this.filteredData)
            .sort((a, b) => b.users - a.users)
            .slice(0, 8);

        this.chartService.createScatterChart('modelPerformanceChart', {
            datasets: [{
                label: 'Model Performance',
                data: modelStats.map(item => ({
                    x: item.users,
                    y: item.requestsPerUser,
                    label: item.model
                })),
                backgroundColor: COLOR_PALETTES.orange,
                pointRadius: 8
            }]
        }, {
            customOptions: {
                scales: {
                    x: {
                        title: { display: true, text: 'User Adoption (# of Users)' },
                        beginAtZero: true
                    },
                    y: {
                        title: { display: true, text: 'Avg Requests per User' },
                        beginAtZero: true
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const item = modelStats[context.dataIndex];
                                return `${item.model}: ${item.users} users, ${item.requestsPerUser.toFixed(1)} req/user`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Update table with paginated data
     */
    updateTable() {
        const sortedData = this.dataService.sortByTimestamp(this.filteredData, false);
        
        this.pagination.setTotalItems(sortedData.length);
        const paginationInfo = this.pagination.getPaginationInfo();
        
        const pageData = sortedData.slice(
            paginationInfo.startIndex,
            paginationInfo.endIndex
        );
        
        this.tableRenderer.render(pageData);
        this.pagination.render();
    }

    /**
     * Filter table based on search
     */
    filterTable() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const rows = document.querySelectorAll('#dataTableBody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }

    /**
     * Show model details in modal
     */
    showModelDetails(modelName) {
        // Implementation for showing model details
        console.log('Show details for model:', modelName);
    }

    /**
     * Create user distribution box plot chart (simplified version)
     */
    createUserDistributionBoxPlotChart() {
        const userRequests = DataAggregation.calculateRequestsPerUser(this.filteredData);
        const data = Object.values(userRequests).sort((a, b) => a - b);
        
        if (data.length === 0) return;
        
        // Calculate statistics
        const min = data[0];
        const max = data[data.length - 1];
        const q1 = data[Math.floor(data.length * 0.25)];
        const median = data[Math.floor(data.length * 0.50)];
        const q3 = data[Math.floor(data.length * 0.75)];
        const mean = data.reduce((a, b) => a + b, 0) / data.length;

        // Store quartile data for tooltip
        const quartileData = {
            q1: { start: min, end: q1, userCount: Math.floor(data.length * 0.25) },
            q2: { start: q1, end: median, userCount: Math.floor(data.length * 0.25) },
            q3: { start: median, end: q3, userCount: Math.floor(data.length * 0.25) },
            q4: { start: q3, end: max, userCount: Math.ceil(data.length * 0.25) },
            mean: mean,
            median: median
        };

        const isDarkMode = document.body.classList.contains('dark-mode');
        const textColor = isDarkMode ? '#b8b8b8' : '#666';

        // Custom plugin to draw box plot
        const boxPlotPlugin = {
            id: 'boxPlotRenderer',
            afterDatasetsDraw(chart) {
                const { ctx, chartArea: { left, top, width, height } } = chart;
                const padding = 0;
                const yCenter = top + height / 2;
                const boxHeight = 80;
                const usableWidth = width - (padding * 2);
                const boxWidth = usableWidth / 4;
                
                const quartiles = [
                    { label: 'Q1', start: min, end: q1, color: 'rgba(100, 150, 255, 0.2)', border: 'rgba(100, 150, 255, 0.8)' },
                    { label: 'Q2', start: q1, end: median, color: 'rgba(52, 168, 83, 0.2)', border: 'rgba(52, 168, 83, 0.8)' },
                    { label: 'Q3', start: median, end: q3, color: 'rgba(52, 168, 83, 0.2)', border: 'rgba(52, 168, 83, 0.8)' },
                    { label: 'Q4', start: q3, end: max, color: 'rgba(255, 152, 0, 0.2)', border: 'rgba(255, 152, 0, 0.8)' }
                ];
                
                quartiles.forEach((q, i) => {
                    const x = left + padding + i * boxWidth;
                    
                    ctx.fillStyle = q.color;
                    ctx.fillRect(x, yCenter - boxHeight / 2, boxWidth, boxHeight);
                    
                    if (i === 1 || i === 2) {
                        ctx.strokeStyle = q.border;
                        ctx.lineWidth = 2;
                        ctx.strokeRect(x, yCenter - boxHeight / 2, boxWidth, boxHeight);
                    }
                    
                    ctx.fillStyle = textColor;
                    ctx.font = 'bold 14px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(q.label, x + boxWidth / 2, yCenter - boxHeight / 2 - 10);
                    
                    ctx.font = '12px Arial';
                    ctx.fillText(Math.round(q.start), x + 5, yCenter + boxHeight / 2 + 20);
                    if (i === 3) {
                        ctx.fillText(Math.round(q.end), x + boxWidth - 5, yCenter + boxHeight / 2 + 20);
                    }
                });
                
                // Median line
                ctx.strokeStyle = '#ff6b6b';
                ctx.lineWidth = 4;
                const medianX = left + padding + 2 * boxWidth;
                ctx.beginPath();
                ctx.moveTo(medianX, yCenter - boxHeight / 2);
                ctx.lineTo(medianX, yCenter + boxHeight / 2);
                ctx.stroke();
                
                // Mean indicator
                let meanQuartile = 0;
                if (mean > q1) meanQuartile = 1;
                if (mean > median) meanQuartile = 2;
                if (mean > q3) meanQuartile = 3;
                
                const meanX = left + padding + meanQuartile * boxWidth + boxWidth / 2;
                
                ctx.fillStyle = '#4285f4';
                ctx.strokeStyle = '#4285f4';
                ctx.lineWidth = 2;
                
                const starSize = 10;
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
                    const radius = i % 2 === 0 ? starSize : starSize / 2;
                    const px = meanX + radius * Math.cos(angle);
                    const py = yCenter + radius * Math.sin(angle);
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        };

        this.chartService.createScatterChart('userDistributionBoxPlotChart', {
            datasets: [
                {
                    label: 'Q1',
                    data: [{x: 0.5, y: 0}],
                    backgroundColor: 'transparent',
                    borderColor: 'transparent',
                    pointRadius: 40,
                    pointHoverRadius: 40,
                    quartile: 'q1'
                },
                {
                    label: 'Q2',
                    data: [{x: 1.5, y: 0}],
                    backgroundColor: 'transparent',
                    borderColor: 'transparent',
                    pointRadius: 40,
                    pointHoverRadius: 40,
                    quartile: 'q2'
                },
                {
                    label: 'Q3',
                    data: [{x: 2.5, y: 0}],
                    backgroundColor: 'transparent',
                    borderColor: 'transparent',
                    pointRadius: 40,
                    pointHoverRadius: 40,
                    quartile: 'q3'
                },
                {
                    label: 'Q4',
                    data: [{x: 3.5, y: 0}],
                    backgroundColor: 'transparent',
                    borderColor: 'transparent',
                    pointRadius: 40,
                    pointHoverRadius: 40,
                    quartile: 'q4'
                }
            ]
        }, {
            customOptions: {
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            title: (context) => {
                                const q = context[0].dataset.quartile;
                                if (q === 'q1') return 'Q1 - Bottom 25%';
                                if (q === 'q2') return 'Q2 - 25th to 50th percentile';
                                if (q === 'q3') return 'Q3 - 50th to 75th percentile';
                                if (q === 'q4') return 'Q4 - Top 25%';
                                return 'User Distribution';
                            },
                            label: (context) => {
                                const q = context.dataset.quartile;
                                const qData = quartileData[q];
                                return [
                                    `Range: ${Math.round(qData.start)} - ${Math.round(qData.end)} requests`,
                                    `Users: ${qData.userCount} (25%)`,
                                    '',
                                    `Overall Statistics:`,
                                    `Median: ${Math.round(quartileData.median)} requests`,
                                    `Mean: ${Math.round(quartileData.mean)} requests`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: { display: false, min: 0, max: 4 },
                    y: { display: false, min: -1, max: 1 }
                }
            },
            plugins: [boxPlotPlugin]
        });
    }

    /**
     * Destroy all charts
     */
    destroy() {
        this.chartService.destroyAllCharts();
    }

    /**
     * Update chart themes
     */
    updateTheme() {
        this.chartService.updateAllChartThemes();
    }
}
