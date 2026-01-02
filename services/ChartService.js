import { 
    getLineChartDefaults, 
    getBarChartDefaults, 
    getDoughnutChartDefaults,
    getScatterChartDefaults,
    getMiniTrendChartDefaults,
    getThemeColors
} from '../config/chartConfig.js';
import { COLOR_PALETTES, generateColorPalette } from '../config/constants.js';

/**
 * Service for creating and managing Chart.js charts
 */
export class ChartService {
    constructor() {
        this.charts = {};
    }

    /**
     * Create or update a line chart
     */
    createLineChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas ${canvasId} not found`);
            return null;
        }

        this.destroyChart(canvasId);

        const config = {
            type: 'line',
            data: data,
            options: {
                ...getLineChartDefaults(options.hideLegend),
                ...options.customOptions
            }
        };

        this.charts[canvasId] = new Chart(ctx.getContext('2d'), config);
        return this.charts[canvasId];
    }

    /**
     * Create or update a bar chart
     */
    createBarChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas ${canvasId} not found`);
            return null;
        }

        this.destroyChart(canvasId);

        const baseOptions = getBarChartDefaults(options.horizontal, options.hideLegend);
        
        // Handle stacked charts
        if (options.stacked) {
            baseOptions.scales.x.stacked = true;
            baseOptions.scales.y.stacked = true;
        }
        
        // Handle custom Y-axis callback
        if (options.yAxisCallback) {
            baseOptions.scales.y.ticks.callback = options.yAxisCallback;
        }
        
        // Handle X-axis rotation
        if (options.xAxisRotation) {
            baseOptions.scales.x.ticks.maxRotation = options.xAxisRotation;
            baseOptions.scales.x.ticks.minRotation = options.xAxisRotation;
        }
        
        // Handle custom tooltip callback
        if (options.tooltipLabelCallback) {
            baseOptions.plugins.tooltip = baseOptions.plugins.tooltip || {};
            baseOptions.plugins.tooltip.callbacks = {
                label: options.tooltipLabelCallback
            };
        }

        const config = {
            type: 'bar',
            data: data,
            options: {
                ...baseOptions,
                ...options.customOptions
            }
        };

        this.charts[canvasId] = new Chart(ctx.getContext('2d'), config);
        return this.charts[canvasId];
    }

    /**
     * Create or update a doughnut chart
     */
    createDoughnutChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas ${canvasId} not found`);
            return null;
        }

        this.destroyChart(canvasId);

        const themeColors = getThemeColors();
        
        // Apply theme colors to data if not already set
        if (data.datasets && data.datasets[0] && !data.datasets[0].borderColor) {
            data.datasets[0].borderColor = themeColors.borderColor;
            data.datasets[0].borderWidth = 2;
        }

        const config = {
            type: 'doughnut',
            data: data,
            options: {
                ...getDoughnutChartDefaults(options.legendPosition),
                onClick: options.onClick,
                ...options.customOptions
            }
        };

        this.charts[canvasId] = new Chart(ctx.getContext('2d'), config);
        return this.charts[canvasId];
    }

    /**
     * Create or update a scatter chart
     */
    createScatterChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas ${canvasId} not found`);
            return null;
        }

        this.destroyChart(canvasId);

        const config = {
            type: 'scatter',
            data: data,
            options: {
                ...getScatterChartDefaults(),
                ...options.customOptions
            },
            plugins: options.plugins || []
        };

        this.charts[canvasId] = new Chart(ctx.getContext('2d'), config);
        return this.charts[canvasId];
    }

    /**
     * Create a mini trend chart (sparkline)
     */
    createMiniTrendChart(canvasId, data, color = COLOR_PALETTES.primary) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas ${canvasId} not found`);
            return null;
        }

        this.destroyChart(canvasId);

        if (!data || data.length === 0) {
            data = [{ x: '2023-01-01', y: 0 }, { x: '2023-01-02', y: 0 }];
        }

        const config = {
            type: 'line',
            data: {
                datasets: [{
                    data: data,
                    borderColor: color,
                    backgroundColor: `${color}20`,
                    fill: true
                }]
            },
            options: getMiniTrendChartDefaults()
        };

        this.charts[canvasId] = new Chart(ctx.getContext('2d'), config);
        return this.charts[canvasId];
    }

    /**
     * Create a mixed chart (bar + line)
     */
    createMixedChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas ${canvasId} not found`);
            return null;
        }

        this.destroyChart(canvasId);

        const themeColors = getThemeColors();
        
        const config = {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: themeColors.textColor }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: themeColors.textColor,
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: { display: false }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: options.yAxisLabel || '',
                            color: themeColors.textColor
                        },
                        ticks: { color: themeColors.textColor }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: options.y1AxisLabel || '',
                            color: themeColors.textColor
                        },
                        ticks: { color: themeColors.textColor },
                        grid: { drawOnChartArea: false }
                    }
                },
                ...options.customOptions
            }
        };

        this.charts[canvasId] = new Chart(ctx.getContext('2d'), config);
        return this.charts[canvasId];
    }

    /**
     * Destroy a chart by ID
     */
    destroyChart(canvasId) {
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
            delete this.charts[canvasId];
        }
    }

    /**
     * Destroy all charts
     */
    destroyAllCharts() {
        Object.keys(this.charts).forEach(chartId => {
            this.destroyChart(chartId);
        });
    }

    /**
     * Update chart theme colors
     */
    updateChartTheme(canvasId) {
        const chart = this.charts[canvasId];
        if (!chart) return;

        const themeColors = getThemeColors();

        // Update chart options with new theme colors
        if (chart.options.plugins?.legend?.labels) {
            chart.options.plugins.legend.labels.color = themeColors.textColor;
        }

        if (chart.options.scales) {
            Object.values(chart.options.scales).forEach(scale => {
                if (scale.ticks) {
                    scale.ticks.color = themeColors.textColor;
                }
                if (scale.grid) {
                    scale.grid.color = themeColors.gridColor;
                }
                if (scale.title) {
                    scale.title.color = themeColors.textColor;
                }
            });
        }

        // Update doughnut chart border colors
        if (chart.config.type === 'doughnut' && chart.data.datasets[0]) {
            chart.data.datasets[0].borderColor = themeColors.borderColor;
        }

        chart.update();
    }

    /**
     * Update all chart themes
     */
    updateAllChartThemes() {
        Object.keys(this.charts).forEach(chartId => {
            this.updateChartTheme(chartId);
        });
    }

    /**
     * Get a chart by ID
     */
    getChart(canvasId) {
        return this.charts[canvasId];
    }

    /**
     * Generate color palette
     */
    generateColors(count) {
        return generateColorPalette(count);
    }
}
