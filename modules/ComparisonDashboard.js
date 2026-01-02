import { ChartService } from '../services/ChartService.js';
import { ModalManager } from '../components/Modal.js';
import * as DataAggregation from '../utils/dataAggregation.js';
import { APP_CONFIG } from '../config/appConfig.js';
import { COLOR_PALETTES } from '../config/constants.js';

/**
 * Comparison Dashboard Module - Month-to-Month comparison and trend analysis
 */
export class ComparisonDashboard {
    constructor(dataService, exportService, storageService) {
        this.dataService = dataService;
        this.exportService = exportService;
        this.storageService = storageService;
        this.chartService = new ChartService();
        this.modalManager = new ModalManager();
        
        this.monthsData = {};
        this.comparisonMetrics = [];
    }

    /**
     * Load data for comparison
     */
    loadData() {
        const monthsList = this.storageService.getMonthsList();
        
        if (monthsList.length < 2) {
            this.showNoDataMessage();
            return;
        }

        // Load all months data
        this.monthsData = {};
        monthsList.forEach(month => {
            const data = this.storageService.loadMonthData(month.key);
            if (data && data.length > 0) {
                this.monthsData[month.key] = {
                    label: month.label,
                    data: data,
                    metrics: this.calculateMonthMetrics(data)
                };
            }
        });

        this.calculateComparisonMetrics();
        this.updateDashboard();
    }

    /**
     * Calculate metrics for a single month
     */
    calculateMonthMetrics(data) {
        const totalUsers = new Set(data.map(row => row.user)).size;
        const totalRequests = data.reduce((sum, row) => sum + row.requests, 0);
        const totalModels = new Set(data.map(row => row.model)).size;
        const avgRequestsPerUser = totalUsers > 0 ? totalRequests / totalUsers : 0;
        
        // Calculate active days
        const uniqueDays = new Set(data.map(row => row.timestamp.toDateString())).size;
        const avgRequestsPerDay = uniqueDays > 0 ? totalRequests / uniqueDays : 0;
        
        // Calculate quota usage
        const quotaData = this.dataService.processQuotaData(data, 1);
        const avgQuotaUsage = quotaData.length > 0
            ? quotaData.reduce((sum, u) => sum + u.usagePercentage, 0) / quotaData.length
            : 0;
        const usersOver80Quota = quotaData.filter(u => u.usagePercentage >= 80).length;
        
        // Model distribution
        const modelStats = DataAggregation.groupBy(data, row => row.model);
        const topModels = DataAggregation.topN(modelStats, 5);
        
        // User engagement tiers
        const userRequestCounts = Object.values(DataAggregation.calculateRequestsPerUser(data));
        const heavyEngagement = userRequestCounts.filter(c => c > 250).length;
        const significantEngagement = userRequestCounts.filter(c => c >= 150 && c <= 250).length;
        const modestEngagement = userRequestCounts.filter(c => c >= 35 && c < 150).length;
        const lowEngagement = userRequestCounts.filter(c => c < 35).length;

        return {
            totalUsers,
            totalRequests,
            totalModels,
            avgRequestsPerUser,
            avgRequestsPerDay,
            avgQuotaUsage,
            usersOver80Quota,
            topModels,
            uniqueDays,
            heavyEngagement,
            significantEngagement,
            modestEngagement,
            lowEngagement
        };
    }

    /**
     * Calculate comparison metrics (growth rates, etc.)
     */
    calculateComparisonMetrics() {
        const monthKeys = Object.keys(this.monthsData).sort();
        this.comparisonMetrics = [];

        for (let i = 1; i < monthKeys.length; i++) {
            const prevKey = monthKeys[i - 1];
            const currKey = monthKeys[i];
            const prev = this.monthsData[prevKey].metrics;
            const curr = this.monthsData[currKey].metrics;

            const growthRate = (metric, prevVal, currVal) => {
                if (prevVal === 0) return currVal > 0 ? 100 : 0;
                return ((currVal - prevVal) / prevVal) * 100;
            };

            this.comparisonMetrics.push({
                month: currKey,
                label: this.monthsData[currKey].label,
                userGrowth: growthRate('users', prev.totalUsers, curr.totalUsers),
                requestGrowth: growthRate('requests', prev.totalRequests, curr.totalRequests),
                newUsers: curr.totalUsers - prev.totalUsers,
                avgRequestsPerUserGrowth: growthRate('avgReq', prev.avgRequestsPerUser, curr.avgRequestsPerUser)
            });
        }
    }

    /**
     * Update entire dashboard
     */
    updateDashboard() {
        this.hideNoDataMessage();
        this.updateStatCards();
        this.updateCharts();
    }

    /**
     * Update statistics cards with growth indicators
     */
    updateStatCards() {
        const monthKeys = Object.keys(this.monthsData).sort();
        if (monthKeys.length < 2) return;

        const latest = monthKeys[monthKeys.length - 1];
        const previous = monthKeys[monthKeys.length - 2];
        
        const latestMetrics = this.monthsData[latest].metrics;
        const previousMetrics = this.monthsData[previous].metrics;

        const calculateGrowth = (curr, prev) => {
            if (prev === 0) return curr > 0 ? '+100%' : '0%';
            const growth = ((curr - prev) / prev) * 100;
            return (growth >= 0 ? '+' : '') + growth.toFixed(1) + '%';
        };

        // Update stat cards
        this.updateStatCard('compTotalUsers', latestMetrics.totalUsers);
        this.updateStatCard('compUserGrowth', calculateGrowth(latestMetrics.totalUsers, previousMetrics.totalUsers));
        
        this.updateStatCard('compTotalRequests', latestMetrics.totalRequests);
        this.updateStatCard('compRequestGrowth', calculateGrowth(latestMetrics.totalRequests, previousMetrics.totalRequests));
        
        this.updateStatCard('compAvgRequestsPerUser', Math.round(latestMetrics.avgRequestsPerUser));
        this.updateStatCard('compAvgGrowth', calculateGrowth(latestMetrics.avgRequestsPerUser, previousMetrics.avgRequestsPerUser));
        
        this.updateStatCard('compAvgQuotaUsage', latestMetrics.avgQuotaUsage.toFixed(1) + '%');
        this.updateStatCard('compQuotaGrowth', calculateGrowth(latestMetrics.avgQuotaUsage, previousMetrics.avgQuotaUsage));
    }

    /**
     * Update a single stat card
     */
    updateStatCard(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = typeof value === 'number' ? value.toLocaleString() : value;
            
            // Add growth indicator styling
            if (id.includes('Growth')) {
                element.classList.remove('growth-positive', 'growth-negative', 'growth-neutral');
                if (typeof value === 'string') {
                    if (value.startsWith('+') && !value.startsWith('+0')) {
                        element.classList.add('growth-positive');
                    } else if (value.startsWith('-')) {
                        element.classList.add('growth-negative');
                    } else {
                        element.classList.add('growth-neutral');
                    }
                }
            }
        }
    }

    /**
     * Update all charts
     */
    updateCharts() {
        this.createUserAdoptionTrendChart();
        this.createRequestVolumeChart();
        this.createUserEngagementDistributionChart();
        this.createModelUsageEvolutionChart();
        this.createQuotaUtilizationTrendChart();
        this.createAvgRequestsPerUserChart();
    }

    /**
     * Create user adoption trend chart (quartiles over time)
     */
    createUserAdoptionTrendChart() {
        const monthKeys = Object.keys(this.monthsData).sort();
        const labels = monthKeys.map(key => this.monthsData[key].label);
        
        // Calculate quartiles and extremes for each month
        const minValues = [];
        const q1Values = [];
        const q2Values = []; // Median
        const q3Values = [];
        const maxValues = [];
        const avgValues = [];
        
        monthKeys.forEach(key => {
            const data = this.monthsData[key].data;
            const userRequestCounts = Object.values(DataAggregation.calculateRequestsPerUser(data)).sort((a, b) => a - b);
            
            if (userRequestCounts.length > 0) {
                const q1Index = Math.floor(userRequestCounts.length * 0.25);
                const q2Index = Math.floor(userRequestCounts.length * 0.5);
                const q3Index = Math.floor(userRequestCounts.length * 0.75);
                
                minValues.push(userRequestCounts[0]);
                q1Values.push(userRequestCounts[q1Index]);
                q2Values.push(userRequestCounts[q2Index]);
                q3Values.push(userRequestCounts[q3Index]);
                maxValues.push(userRequestCounts[userRequestCounts.length - 1]);
                avgValues.push(this.monthsData[key].metrics.avgRequestsPerUser);
            } else {
                minValues.push(0);
                q1Values.push(0);
                q2Values.push(0);
                q3Values.push(0);
                maxValues.push(0);
                avgValues.push(0);
            }
        });

        // Determine if log scale would be helpful (if max is > 10x the median)
        const maxOfMax = Math.max(...maxValues);
        const avgOfMedian = q2Values.reduce((a, b) => a + b, 0) / q2Values.length;
        const useLogScale = maxOfMax > (avgOfMedian * 10) && avgOfMedian > 0;

        this.chartService.createLineChart('compUserAdoptionChart', {
            labels: labels,
            datasets: [
                {
                    label: '25th Percentile',
                    data: q1Values,
                    borderColor: COLOR_PALETTES.success,
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: '75th Percentile (Top Users)',
                    data: q3Values,
                    borderColor: COLOR_PALETTES.success,
                    backgroundColor: `${COLOR_PALETTES.success}20`,
                    fill: '-1',
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'Median (50th Percentile)',
                    data: q2Values,
                    borderColor: COLOR_PALETTES.warning,
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'Minimum',
                    data: minValues,
                    borderColor: COLOR_PALETTES.secondary,
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 1,
                    borderDash: [2, 3],
                    pointRadius: 2
                },
                {
                    label: 'Average',
                    data: avgValues,
                    borderColor: COLOR_PALETTES.primary,
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2,
                    borderDash: [8, 4]
                }
            ]
        }, {
            scales: {
                y: {
                    type: useLogScale ? 'logarithmic' : 'linear',
                    title: { 
                        display: true, 
                        text: useLogScale ? 'Requests per User (log scale)' : 'Requests per User' 
                    },
                    beginAtZero: !useLogScale
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        footer: (tooltipItems) => {
                            if (tooltipItems && tooltipItems.length > 0) {
                                const dataIndex = tooltipItems[0].dataIndex;
                                const maxValue = Math.round(maxValues[dataIndex]);
                                return `Maximum: ${maxValue.toLocaleString()}`;
                            }
                            return '';
                        }
                    }
                },
                legend: {
                    labels: {
                        usePointStyle: true,
                        boxWidth: 6
                    }
                }
            }
        });
    }

    /**
     * Create request volume comparison chart
     */
    createRequestVolumeChart() {
        const monthKeys = Object.keys(this.monthsData).sort();
        const labels = monthKeys.map(key => this.monthsData[key].label);
        const values = monthKeys.map(key => this.monthsData[key].metrics.totalRequests);

        this.chartService.createBarChart('compRequestVolumeChart', {
            labels: labels,
            datasets: [{
                label: 'Total Requests',
                data: values,
                backgroundColor: COLOR_PALETTES.primary
            }]
        }, { hideLegend: true });
    }

    /**
     * Create average requests per user chart
     */
    createAvgRequestsPerUserChart() {
        const monthKeys = Object.keys(this.monthsData).sort();
        const labels = monthKeys.map(key => this.monthsData[key].label);
        const values = monthKeys.map(key => this.monthsData[key].metrics.avgRequestsPerUser);

        this.chartService.createLineChart('compAvgRequestsChart', {
            labels: labels,
            datasets: [{
                label: 'Avg Requests per User',
                data: values,
                borderColor: COLOR_PALETTES.info,
                backgroundColor: `${COLOR_PALETTES.info}20`,
                fill: true,
                tension: 0.4
            }]
        }, { hideLegend: true });
    }

    /**
     * Create model usage evolution chart (stacked area)
     */
    createModelUsageEvolutionChart() {
        const monthKeys = Object.keys(this.monthsData).sort();
        const labels = monthKeys.map(key => this.monthsData[key].label);
        
        // Get all unique models across all months
        const allModels = new Set();
        monthKeys.forEach(key => {
            this.monthsData[key].metrics.topModels.forEach(([model]) => allModels.add(model));
        });
        
        // Filter models with more than 50 requests in any month
        const qualifyingModels = [];
        allModels.forEach(model => {
            const hasHighUsage = monthKeys.some(key => {
                const modelData = this.monthsData[key].metrics.topModels.find(([m]) => m === model);
                return modelData && modelData[1] > 50;
            });
            if (hasHighUsage) {
                // Calculate total for sorting
                const total = monthKeys.reduce((sum, key) => {
                    const modelData = this.monthsData[key].metrics.topModels.find(([m]) => m === model);
                    return sum + (modelData ? modelData[1] : 0);
                }, 0);
                qualifyingModels.push({ model, total });
            }
        });
        
        // Sort by total usage
        const selectedModels = qualifyingModels
            .sort((a, b) => b.total - a.total)
            .map(item => item.model);
        
        // Create datasets for each model
        const colors = this.chartService.generateColors(selectedModels.length);
        const datasets = selectedModels.map((model, idx) => {
            const data = monthKeys.map(key => {
                const modelData = this.monthsData[key].metrics.topModels.find(([m]) => m === model);
                return modelData ? modelData[1] : 0;
            });
            
            return {
                label: model,
                data: data,
                borderColor: colors[idx],
                backgroundColor: 'transparent',
                fill: false,
                tension: 0.4,
                borderWidth: 2
            };
        });

        this.chartService.createLineChart('compModelEvolutionChart', {
            labels: labels,
            datasets: datasets
        }, {
            scales: {
                y: {
                    stacked: false,
                    beginAtZero: true
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        });
    }

    /**
     * Create quota utilization trend chart
     */
    createQuotaUtilizationTrendChart() {
        const monthKeys = Object.keys(this.monthsData).sort();
        const labels = monthKeys.map(key => this.monthsData[key].label);
        const avgUsage = monthKeys.map(key => this.monthsData[key].metrics.avgQuotaUsage);

        this.chartService.createLineChart('compQuotaTrendChart', {
            labels: labels,
            datasets: [{
                label: 'Avg Quota Usage %',
                data: avgUsage,
                borderColor: COLOR_PALETTES.warning,
                backgroundColor: `${COLOR_PALETTES.warning}20`,
                fill: true,
                tension: 0.4
            }]
        }, {
            hideLegend: true,
            yAxisCallback: (value) => value.toFixed(0) + '%'
        });
    }

    /**
     * Create user engagement distribution chart
     */
    createUserEngagementDistributionChart() {
        const monthKeys = Object.keys(this.monthsData).sort();
        const labels = monthKeys.map(key => this.monthsData[key].label);
        
        const heavyEngagement = monthKeys.map(key => this.monthsData[key].metrics.heavyEngagement);
        const significantEngagement = monthKeys.map(key => this.monthsData[key].metrics.significantEngagement);
        const modestEngagement = monthKeys.map(key => this.monthsData[key].metrics.modestEngagement);
        const lowEngagement = monthKeys.map(key => this.monthsData[key].metrics.lowEngagement);

        // Use line chart to show progression trends
        this.chartService.createLineChart('compEngagementChart', {
            labels: labels,
            datasets: [
                {
                    label: 'Heavy (>250 req)',
                    data: heavyEngagement,
                    borderColor: COLOR_PALETTES.danger,
                    backgroundColor: `${COLOR_PALETTES.danger}20`,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'Significant (150-250 req)',
                    data: significantEngagement,
                    borderColor: COLOR_PALETTES.success,
                    backgroundColor: `${COLOR_PALETTES.success}20`,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'Modest (35-150 req)',
                    data: modestEngagement,
                    borderColor: COLOR_PALETTES.info,
                    backgroundColor: `${COLOR_PALETTES.info}20`,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'Low (<35 req)',
                    data: lowEngagement,
                    borderColor: COLOR_PALETTES.secondary,
                    backgroundColor: `${COLOR_PALETTES.secondary}20`,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2
                }
            ]
        }, {
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Users'
                    }
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        });
    }

    /**
     * Show message when not enough data
     */
    showNoDataMessage() {
        const container = document.getElementById('comparison-dashboard');
        if (container) {
            container.innerHTML = `
                <div class="no-data-message">
                    <i class="fas fa-chart-line"></i>
                    <h3>Not Enough Data for Comparison</h3>
                    <p>Upload data from at least 2 different months to see month-to-month comparisons.</p>
                </div>
            `;
        }
    }

    /**
     * Hide no data message
     */
    hideNoDataMessage() {
        const message = document.querySelector('#comparison-dashboard .no-data-message');
        if (message) {
            message.remove();
        }
    }

    /**
     * Update theme for charts
     */
    updateTheme() {
        this.updateCharts();
    }
}
