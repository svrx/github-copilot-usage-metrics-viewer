import { ChartService } from '../services/ChartService.js';
import { ModalManager } from '../components/Modal.js';
import * as DataAggregation from '../utils/dataAggregation.js';
import { APP_CONFIG } from '../config/appConfig.js';
import { COLOR_PALETTES } from '../config/constants.js';
import { getThemeColors } from '../config/chartConfig.js';

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
        this.selectedMonths = new Set();
        this.comparisonMetrics = [];
    }

    /**
     * Load data for comparison
     */
    loadData() {
        const monthsList = this.storageService.getMonthsList();
        
        if (monthsList.length < 1) {
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

        if (Object.keys(this.monthsData).length < 2) {
            this.showNoDataMessage();
            return;
        }

        // Initialize with all months selected
        this.selectedMonths = new Set(Object.keys(this.monthsData));

        this.renderMonthCheckboxes();
        this.calculateComparisonMetrics();
        this.updateDashboard();
    }

    /**
     * Render month selection checkboxes
     */
    renderMonthCheckboxes() {
        const container = document.getElementById('comparisonMonthCheckboxes');
        if (!container) return;

        container.innerHTML = '';

        const monthKeys = Object.keys(this.monthsData).sort().reverse(); // Most recent first
        
        monthKeys.forEach(key => {
            const month = this.monthsData[key];
            const checkbox = document.createElement('label');
            checkbox.className = 'month-checkbox';
            checkbox.innerHTML = `
                <input type="checkbox" value="${key}" ${this.selectedMonths.has(key) ? 'checked' : ''}>
                <span>${month.label}</span>
            `;
            
            checkbox.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedMonths.add(key);
                } else {
                    this.selectedMonths.delete(key);
                }
                
                // Ensure at least one month is selected
                if (this.selectedMonths.size === 0) {
                    e.target.checked = true;
                    this.selectedMonths.add(key);
                    return;
                }
                
                this.calculateComparisonMetrics();
                this.updateDashboard();
            });
            
            container.appendChild(checkbox);
        });
    }

    /**
     * Get filtered months data based on selection
     */
    getFilteredMonthsData() {
        const filtered = {};
        this.selectedMonths.forEach(key => {
            if (this.monthsData[key]) {
                filtered[key] = this.monthsData[key];
            }
        });
        return filtered;
    }

    /**
     * Calculate metrics for a single month
     */
    calculateMonthMetrics(data) {
        const totalUsers = new Set(data.map(row => row.user)).size;
        const totalRequests = data.reduce((sum, row) => sum + row.requests, 0);
        const totalModels = new Set(data.map(row => row.model)).size;
        const avgRequestsPerUser = totalUsers > 0 ? totalRequests / totalUsers : 0;
        
        // Calculate active days and DAU (excluding weekends)
        const days = {};
        data.forEach(row => {
            // Exclude weekends (0 = Sunday, 6 = Saturday)
            const dayOfWeek = row.timestamp.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) return;

            const day = row.timestamp.toDateString();
            if (!days[day]) days[day] = new Set();
            days[day].add(row.user);
        });
        const uniqueDays = Object.keys(days).length;
        const totalDailyActiveUsers = Object.values(days).reduce((sum, users) => sum + users.size, 0);
        const avgDailyActiveUsers = uniqueDays > 0 ? totalDailyActiveUsers / uniqueDays : 0;
        const avgRequestsPerDay = uniqueDays > 0 ? totalRequests / uniqueDays : 0;

        // Calculate Cost
        const totalCost = data.reduce((sum, row) => sum + (parseFloat(row.net_amount) || 0), 0);
        const avgCostPerUser = totalUsers > 0 ? totalCost / totalUsers : 0;
        
        // Calculate quota usage
        const quotaData = this.dataService.processQuotaData(data, 1);
        const avgQuotaUsage = quotaData.length > 0
            ? quotaData.reduce((sum, u) => sum + u.usagePercentage, 0) / quotaData.length
            : 0;
        const usersOver80Quota = quotaData.filter(u => u.usagePercentage >= 80).length;
        const usersOverQuota = quotaData.filter(u => u.usagePercentage >= 100).length;
        const percentOverQuota = totalUsers > 0 ? (usersOverQuota / totalUsers) * 100 : 0;
        
        // Model distribution
        const modelStats = DataAggregation.groupBy(data, row => row.model);
        const topModels = DataAggregation.topN(modelStats, 5);
        
        // User engagement tiers
        const userRequestCounts = Object.values(DataAggregation.calculateRequestsPerUser(data));
        const heavyEngagement = userRequestCounts.filter(c => c > 250).length;
        const significantEngagement = userRequestCounts.filter(c => c >= 120 && c <= 250).length;
        const modestEngagement = userRequestCounts.filter(c => c >= 30 && c < 120).length;
        const lowEngagement = userRequestCounts.filter(c => c < 30).length;

        return {
            totalUsers,
            totalRequests,
            totalModels,
            avgRequestsPerUser,
            avgRequestsPerDay,
            avgDailyActiveUsers,
            avgCostPerUser,
            avgQuotaUsage,
            usersOver80Quota,
            usersOverQuota,
            percentOverQuota,
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
        const filteredData = this.getFilteredMonthsData();
        const monthKeys = Object.keys(filteredData).sort();
        this.comparisonMetrics = [];

        for (let i = 1; i < monthKeys.length; i++) {
            const prevKey = monthKeys[i - 1];
            const currKey = monthKeys[i];
            const prev = filteredData[prevKey].metrics;
            const curr = filteredData[currKey].metrics;

            const growthRate = (metric, prevVal, currVal) => {
                if (prevVal === 0) return currVal > 0 ? 100 : 0;
                return ((currVal - prevVal) / prevVal) * 100;
            };

            this.comparisonMetrics.push({
                month: currKey,
                label: filteredData[currKey].label,
                userGrowth: growthRate('users', prev.totalUsers, curr.totalUsers),
                requestGrowth: growthRate('requests', prev.totalRequests, curr.totalRequests),
                newUsers: curr.totalUsers - prev.totalUsers,
                avgDailyActiveUsersGrowth: growthRate('avgDAU', prev.avgDailyActiveUsers, curr.avgDailyActiveUsers),
                avgCostPerUserGrowth: growthRate('avgCost', prev.avgCostPerUser, curr.avgCostPerUser)
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
        const filteredData = this.getFilteredMonthsData();
        const monthKeys = Object.keys(filteredData).sort();
        if (monthKeys.length < 1) return;

        const latest = monthKeys[monthKeys.length - 1];
        const latestMetrics = filteredData[latest].metrics;

        // Calculate growth from previous selected month if available
        let previousMetrics = null;
        if (monthKeys.length >= 2) {
            const previous = monthKeys[monthKeys.length - 2];
            previousMetrics = filteredData[previous].metrics;
        }

        const calculateGrowth = (curr, prev) => {
            if (!prev) return '-';
            if (prev === 0) return curr > 0 ? '+100%' : '0%';
            const growth = ((curr - prev) / prev) * 100;
            return (growth >= 0 ? '+' : '') + growth.toFixed(1) + '%';
        };

        // Update stat cards
        this.updateStatCard('compTotalUsers', latestMetrics.totalUsers);
        this.updateStatCard('compUserGrowth', previousMetrics ? calculateGrowth(latestMetrics.totalUsers, previousMetrics.totalUsers) : '-');
        
        this.updateStatCard('compTotalRequests', latestMetrics.totalRequests);
        this.updateStatCard('compRequestGrowth', previousMetrics ? calculateGrowth(latestMetrics.totalRequests, previousMetrics.totalRequests) : '-');
        
        this.updateStatCard('compAvgDailyActiveUsers', Math.round(latestMetrics.avgDailyActiveUsers));
        this.updateStatCard('compAvgDAUGrowth', previousMetrics ? calculateGrowth(latestMetrics.avgDailyActiveUsers, previousMetrics.avgDailyActiveUsers) : '-');
        
        this.updateStatCard('compAvgQuotaUsage', latestMetrics.avgQuotaUsage.toFixed(1) + '%');
        this.updateStatCard('compQuotaGrowth', previousMetrics ? calculateGrowth(latestMetrics.avgQuotaUsage, previousMetrics.avgQuotaUsage) : '-');
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
        this.createAvgDailyActiveUsersChart();
    }

    /**
     * Create user adoption trend chart (quartiles over time)
     */
    createUserAdoptionTrendChart() {
        const filteredData = this.getFilteredMonthsData();
        const monthKeys = Object.keys(filteredData).sort();
        const labels = monthKeys.map(key => filteredData[key].label);
        
        // Calculate quartiles and extremes for each month
        const minValues = [];
        const q1Values = [];
        const q2Values = []; // Median
        const q3Values = [];
        const q90Values = []; // 90th percentile
        const maxValues = [];
        const avgValues = [];
        
        monthKeys.forEach(key => {
            const data = filteredData[key].data;
            const userRequestCounts = Object.values(DataAggregation.calculateRequestsPerUser(data)).sort((a, b) => a - b);
            
            if (userRequestCounts.length > 0) {
                const q1Index = Math.floor(userRequestCounts.length * 0.25);
                const q2Index = Math.floor(userRequestCounts.length * 0.5);
                const q3Index = Math.floor(userRequestCounts.length * 0.75);
                const q90Index = Math.floor(userRequestCounts.length * 0.90);
                
                minValues.push(userRequestCounts[0]);
                q1Values.push(userRequestCounts[q1Index]);
                q2Values.push(userRequestCounts[q2Index]);
                q3Values.push(userRequestCounts[q3Index]);
                q90Values.push(userRequestCounts[q90Index]);
                maxValues.push(userRequestCounts[userRequestCounts.length - 1]);
                avgValues.push(filteredData[key].metrics.avgRequestsPerUser);
            } else {
                minValues.push(0);
                q1Values.push(0);
                q2Values.push(0);
                q3Values.push(0);
                q90Values.push(0);
                maxValues.push(0);
                avgValues.push(0);
            }
        });

        // Set y-axis max based on 90th percentile (with some padding)
        const maxQ90 = Math.max(...q90Values);
        const yAxisMax = Math.ceil(maxQ90 * 1.1); // 10% padding

        this.chartService.createLineChart('compUserAdoptionChart', {
            labels: labels,
            datasets: [
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
                    label: '25th Percentile',
                    data: q1Values,
                    borderColor: COLOR_PALETTES.success,
                    backgroundColor: 'transparent',
                    fill: false,
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
                    label: 'Average',
                    data: avgValues,
                    borderColor: COLOR_PALETTES.primary,
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2,
                    borderDash: [8, 4]
                },
                {
                    label: '75th Percentile',
                    data: q3Values,
                    borderColor: COLOR_PALETTES.success,
                    backgroundColor: `${COLOR_PALETTES.success}20`,
                    fill: 1,
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: '90th Percentile',
                    data: q90Values,
                    borderColor: '#dc3545',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 3
                }
            ]
        }, {
            customOptions: {
                scales: {
                    y: {
                        type: 'linear',
                        title: { 
                            display: true, 
                            text: 'Requests per User' 
                        },
                        beginAtZero: true,
                        max: yAxisMax
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            afterLabel: (context) => {
                                // Add maximum value after the 90th percentile label
                                if (context.dataset.label === '90th Percentile') {
                                    const dataIndex = context.dataIndex;
                                    const maxValue = Math.round(maxValues[dataIndex]);
                                    return `(Max for this month: ${maxValue.toLocaleString()})`;
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
            }
        });
    }

    /**
     * Create request volume comparison chart
     */
    createRequestVolumeChart() {
        const filteredData = this.getFilteredMonthsData();
        const monthKeys = Object.keys(filteredData).sort();
        const labels = monthKeys.map(key => filteredData[key].label);
        const values = monthKeys.map(key => filteredData[key].metrics.totalRequests);

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
     * Create average daily active users chart
     */
    createAvgDailyActiveUsersChart() {
        const filteredData = this.getFilteredMonthsData();
        const monthKeys = Object.keys(filteredData).sort();
        const labels = monthKeys.map(key => filteredData[key].label);
        const values = monthKeys.map(key => filteredData[key].metrics.avgDailyActiveUsers);

        this.chartService.createLineChart('compAvgDailyActiveUsersChart', {
            labels: labels,
            datasets: [{
                label: 'Avg Daily Active Users',
                data: values,
                borderColor: COLOR_PALETTES.info,
                backgroundColor: `${COLOR_PALETTES.info}20`,
                fill: true,
                tension: 0.4
            }]
        }, { 
            hideLegend: true,
            customOptions: {
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Average Daily Active Users (Excluding Weekends)'
                    }
                }
            }
        });
    }

    /**
     * Create model usage evolution chart (stacked area)
     */
    createModelUsageEvolutionChart() {
        const filteredData = this.getFilteredMonthsData();
        const monthKeys = Object.keys(filteredData).sort();
        const labels = monthKeys.map(key => filteredData[key].label);
        
        // Get all unique models across all months
        const allModels = new Set();
        monthKeys.forEach(key => {
            filteredData[key].metrics.topModels.forEach(([model]) => allModels.add(model));
        });
        
        // Filter models with more than 50 requests in any month
        const qualifyingModels = [];
        allModels.forEach(model => {
            const hasHighUsage = monthKeys.some(key => {
                const modelData = filteredData[key].metrics.topModels.find(([m]) => m === model);
                return modelData && modelData[1] > 50;
            });
            if (hasHighUsage) {
                // Calculate total for sorting
                const total = monthKeys.reduce((sum, key) => {
                    const modelData = filteredData[key].metrics.topModels.find(([m]) => m === model);
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
                const modelData = filteredData[key].metrics.topModels.find(([m]) => m === model);
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
        const filteredData = this.getFilteredMonthsData();
        const monthKeys = Object.keys(filteredData).sort();
        const labels = monthKeys.map(key => filteredData[key].label);
        const avgUsage = monthKeys.map(key => filteredData[key].metrics.avgQuotaUsage);
        const percentOverQuota = monthKeys.map(key => filteredData[key].metrics.percentOverQuota);

        this.chartService.createLineChart('compQuotaTrendChart', {
            labels: labels,
            datasets: [
                {
                    label: 'Avg Quota Usage %',
                    data: avgUsage,
                    borderColor: COLOR_PALETTES.warning,
                    backgroundColor: `${COLOR_PALETTES.warning}20`,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: '% Users Over Quota',
                    data: percentOverQuota,
                    borderColor: COLOR_PALETTES.danger,
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2,
                    borderDash: [8, 4]
                }
            ]
        }, {
            customOptions: {
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: (value) => value.toFixed(0) + '%'
                        }
                    }
                }
            }
        });
    }

    /**
     * Create user engagement distribution chart
     */
    createUserEngagementDistributionChart() {
        const filteredData = this.getFilteredMonthsData();
        const monthKeys = Object.keys(filteredData).sort();
        const labels = monthKeys.map(key => filteredData[key].label);
        
        const heavyEngagement = monthKeys.map(key => filteredData[key].metrics.heavyEngagement);
        const significantEngagement = monthKeys.map(key => filteredData[key].metrics.significantEngagement);
        const modestEngagement = monthKeys.map(key => filteredData[key].metrics.modestEngagement);
        const lowEngagement = monthKeys.map(key => filteredData[key].metrics.lowEngagement);

        const themeColors = getThemeColors();

        // Use stacked area chart to show distribution
        this.chartService.createLineChart('compEngagementChart', {
            labels: labels,
            datasets: [
                {
                    label: 'Light (<30 req)',
                    data: lowEngagement,
                    borderColor: COLOR_PALETTES.secondary,
                    backgroundColor: `${COLOR_PALETTES.secondary}60`,
                    fill: 'origin',
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'Moderate (30-120 req)',
                    data: modestEngagement,
                    borderColor: COLOR_PALETTES.info,
                    backgroundColor: `${COLOR_PALETTES.info}60`,
                    fill: '-1',
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'Proficient (120-250 req)',
                    data: significantEngagement,
                    borderColor: COLOR_PALETTES.success,
                    backgroundColor: `${COLOR_PALETTES.success}60`,
                    fill: '-1',
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'Power (>250 req)',
                    data: heavyEngagement,
                    borderColor: COLOR_PALETTES.danger,
                    backgroundColor: `${COLOR_PALETTES.danger}60`,
                    fill: '-1',
                    tension: 0.4,
                    borderWidth: 2
                }
            ]
        }, {
            customOptions: {
                scales: {
                    y: {
                        beginAtZero: true,
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Total Active Users',
                            color: themeColors.textColor
                        },
                        ticks: {
                            color: themeColors.textColor
                        },
                        grid: {
                            color: themeColors.gridColor
                        }
                    },
                    x: {
                        ticks: {
                            color: themeColors.textColor
                        },
                        grid: {
                            color: themeColors.gridColor
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'User Engagement Distribution',
                        color: themeColors.textColor,
                        font: { size: 14, weight: 'normal' },
                        padding: { bottom: 15 }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    },
                    legend: {
                        labels: {
                            color: themeColors.textColor
                        }
                    }
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
