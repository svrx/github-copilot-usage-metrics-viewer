import { ChartService } from '../services/ChartService.js';
import { PaginationController } from '../components/PaginationController.js';
import { QuotaFilterPanel } from '../components/FilterPanel.js';
import { QuotaTableRenderer } from '../components/TableRenderer.js';
import { ModalManager } from '../components/Modal.js';
import * as DataAggregation from '../utils/dataAggregation.js';
import { APP_CONFIG } from '../config/appConfig.js';
import { COLOR_PALETTES, QUOTA_THRESHOLDS } from '../config/constants.js';

/**
 * Quota Dashboard Module - Handles quota-related charts and tables
 */
export class QuotaDashboard {
    constructor(dataService, exportService) {
        this.dataService = dataService;
        this.exportService = exportService;
        this.chartService = new ChartService();
        this.modalManager = new ModalManager();
        
        // Initialize components
        this.filterPanel = new QuotaFilterPanel('quota-filters', {
            onFilterChange: (filters) => this.handleFilterChange(filters)
        });
        
        this.tableRenderer = new QuotaTableRenderer('quotaTableBody');
        
        this.pagination = new PaginationController('quotaTable-pagination', {
            onPageChange: () => this.updateTable(),
            onRowsPerPageChange: () => this.updateTable()
        });
        
        this.quotaData = [];
        this.filteredQuotaData = [];
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('quotaSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterTable());
        }

        // Export button
        const exportBtn = document.getElementById('quotaExportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportService.exportQuotaData(this.filteredQuotaData);
            });
        }

        // Filter panel
        this.filterPanel.setupEventListeners();
    }

    /**
     * Load and process quota data
     */
    loadData(usageData, numberOfMonths = 1) {
        this.quotaData = this.dataService.processQuotaData(usageData, numberOfMonths);
        this.filterPanel.populateFilters(this.quotaData);
        this.applyFilters();
    }

    /**
     * Handle filter changes
     */
    handleFilterChange(filters) {
        this.applyFilters();
    }

    /**
     * Apply filters to quota data
     */
    applyFilters() {
        const filters = this.filterPanel.getFilters();
        let filtered = [...this.quotaData];

        // Date range filter (based on last activity)
        if (filters.dateRange && filters.dateRange !== 'all') {
            const now = new Date();
            const days = parseInt(filters.dateRange);
            const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
            filtered = filtered.filter(row => row.lastActivity >= cutoffDate);
        }

        // User filter
        if (filters.user && filters.user !== 'all') {
            filtered = filtered.filter(row => row.user === filters.user);
        }

        // Status filter
        if (filters.status && filters.status !== 'all') {
            filtered = filtered.filter(row => row.status === filters.status);
        }

        // Search filter
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filtered = filtered.filter(row =>
                row.user?.toLowerCase().includes(searchTerm)
            );
        }

        this.filteredQuotaData = filtered;
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
        const data = this.filteredQuotaData;
        
        const totalUsers = data.length;
        const usersNearLimit = data.filter(u => u.usagePercentage >= 80 && u.usagePercentage < 100).length;
        const usersOverLimit = data.filter(u => u.usagePercentage >= 100).length;
        const avgUsagePercentage = data.length > 0
            ? (data.reduce((sum, u) => sum + u.usagePercentage, 0) / data.length).toFixed(1)
            : 0;

        this.updateStatCard('quotaTotalUsers', totalUsers);
        this.updateStatCard('quotaNearLimitUsers', usersNearLimit);
        this.updateStatCard('quotaOverLimitUsers', usersOverLimit);
        this.updateStatCard('quotaAverageUsage', avgUsagePercentage + '%');
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
     * Update all quota charts
     */
    updateCharts() {
        this.createQuotaUsageChart();
        this.createQuotaDistributionChart();
        this.createQuotaBreakdownChart();
    }

    /**
     * Create quota usage chart (top users)
     */
    createQuotaUsageChart() {
        const topUsers = this.filteredQuotaData
            .sort((a, b) => b.usagePercentage - a.usagePercentage)
            .slice(0, APP_CONFIG.topItemsCount);

        const labels = topUsers.map(u => u.user);
        const usagePercentages = topUsers.map(u => u.usagePercentage);
        const colors = topUsers.map(u => {
            if (u.usagePercentage >= 100) return COLOR_PALETTES.danger;
            if (u.usagePercentage >= 80) return COLOR_PALETTES.warning;
            return COLOR_PALETTES.success;
        });

        this.chartService.createBarChart('quotaUsageChart', {
            labels: labels,
            datasets: [{
                label: 'Quota Usage %',
                data: usagePercentages,
                backgroundColor: colors
            }]
        }, { 
            hideLegend: true,
            yAxisCallback: (value) => value + '%',
            tooltipLabelCallback: (context) => `Usage: ${context.parsed.y.toFixed(1)}%`,
            xAxisRotation: 45
        });
    }

    /**
     * Create quota distribution chart
     */
    createQuotaDistributionChart() {
        const normal = this.filteredQuotaData.filter(u => u.usagePercentage < 80).length;
        const warning = this.filteredQuotaData.filter(u => u.usagePercentage >= 80 && u.usagePercentage < 90).length;
        const critical = this.filteredQuotaData.filter(u => u.usagePercentage >= 90 && u.usagePercentage < 100).length;
        const overLimit = this.filteredQuotaData.filter(u => u.usagePercentage >= 100).length;

        this.chartService.createDoughnutChart('quotaDistributionChart', {
            labels: ['Normal (0-80%)', 'Warning (80-90%)', 'Critical (90-100%)', 'Over Limit (100%+)'],
            datasets: [{
                data: [normal, warning, critical, overLimit],
                backgroundColor: [
                    COLOR_PALETTES.success,
                    COLOR_PALETTES.warning,
                    COLOR_PALETTES.danger,
                    '#8b0000'
                ]
            }]
        }, {
            onClick: (_, elements) => {
                if (elements.length > 0) {
                    const labels = ['Normal (0-80%)', 'Warning (80-90%)', 'Critical (90-100%)', 'Over Limit (100%+)'];
                    this.showQuotaDistributionDetails(labels[elements[0].index]);
                }
            }
        });
    }

    /**
     * Create quota breakdown chart
     */
    createQuotaBreakdownChart() {
        const topUsers = this.filteredQuotaData
            .sort((a, b) => b.requests - a.requests)
            .slice(0, APP_CONFIG.topItemsCount);

        const labels = topUsers.map(u => u.user);
        const normalRequests = topUsers.map(u => Math.min(u.requests, u.quota));
        const exceedingRequests = topUsers.map(u => Math.max(0, u.requests - u.quota));

        this.chartService.createBarChart('quotaBreakdownChart', {
            labels: labels,
            datasets: [
                {
                    label: 'Normal Requests',
                    data: normalRequests,
                    backgroundColor: COLOR_PALETTES.success
                },
                {
                    label: 'Exceeding Quota',
                    data: exceedingRequests,
                    backgroundColor: COLOR_PALETTES.danger
                }
            ]
        }, { stacked: true, xAxisRotation: 45 });
    }



    /**
     * Update table with paginated data
     */
    updateTable() {
        this.pagination.setTotalItems(this.filteredQuotaData.length);
        const paginationInfo = this.pagination.getPaginationInfo();
        
        const pageData = this.filteredQuotaData.slice(
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
        const searchTerm = document.getElementById('quotaSearchInput').value.toLowerCase();
        const rows = document.querySelectorAll('#quotaTableBody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }

    /**
     * Show quota distribution details in modal
     */
    showQuotaDistributionDetails(category) {
        let filteredUsers = [];
        
        if (category === 'Normal (0-80%)') {
            filteredUsers = this.filteredQuotaData.filter(u => u.usagePercentage < 80);
        } else if (category === 'Warning (80-90%)') {
            filteredUsers = this.filteredQuotaData.filter(u => u.usagePercentage >= 80 && u.usagePercentage < 90);
        } else if (category === 'Critical (90-100%)') {
            filteredUsers = this.filteredQuotaData.filter(u => u.usagePercentage >= 90 && u.usagePercentage < 100);
        } else {
            filteredUsers = this.filteredQuotaData.filter(u => u.usagePercentage >= 100);
        }

        filteredUsers.sort((a, b) => b.usagePercentage - a.usagePercentage);

        let html = `
            <h4>Users in Category: ${category}</h4>
            <p>Total Users: ${filteredUsers.length}</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <thead>
                    <tr style="background: #f8f9fa;">
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e1e1e1;">User</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e1e1e1;">Requests</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e1e1e1;">Quota</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e1e1e1;">Usage %</th>
                    </tr>
                </thead>
                <tbody>
        `;

        filteredUsers.forEach(user => {
            html += `
                <tr style="border-bottom: 1px solid #e1e1e1;">
                    <td style="padding: 10px;">${user.user}</td>
                    <td style="padding: 10px;">${user.requests.toLocaleString()}</td>
                    <td style="padding: 10px;">${user.quota.toLocaleString()}</td>
                    <td style="padding: 10px;">${user.usagePercentage.toFixed(1)}%</td>
                </tr>
            `;
        });

        html += `</tbody></table>`;

        const modal = this.modalManager.get('quota-distribution-modal');
        if (modal) {
            modal.open(html);
        }
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
