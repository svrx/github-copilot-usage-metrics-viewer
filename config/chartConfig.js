import { COLOR_PALETTES } from './constants.js';

// Get theme-aware colors
export function getThemeColors() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    return {
        gridColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        textColor: isDarkMode ? '#b8b8b8' : '#666',
        borderColor: isDarkMode ? '#2a2d3e' : '#fff',
        backgroundColor: isDarkMode ? '#1a1d2e' : '#ffffff'
    };
}

// Base chart configuration
export const CHART_DEFAULTS = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        duration: 750
    }
};

// Line chart defaults
export function getLineChartDefaults(hideLegend = false) {
    const themeColors = getThemeColors();
    return {
        ...CHART_DEFAULTS,
        plugins: {
            legend: {
                display: !hideLegend,
                labels: {
                    color: themeColors.textColor
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
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
        }
    };
}

// Bar chart defaults
export function getBarChartDefaults(horizontal = false, hideLegend = false) {
    const themeColors = getThemeColors();
    return {
        ...CHART_DEFAULTS,
        indexAxis: horizontal ? 'y' : 'x',
        plugins: {
            legend: {
                display: !hideLegend,
                labels: {
                    color: themeColors.textColor
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    color: themeColors.textColor
                },
                grid: {
                    color: themeColors.gridColor
                }
            },
            x: {
                beginAtZero: true,
                ticks: {
                    color: themeColors.textColor,
                    maxRotation: horizontal ? 0 : 45,
                    minRotation: horizontal ? 0 : 45
                },
                grid: {
                    display: horizontal,
                    color: themeColors.gridColor
                }
            }
        }
    };
}

// Doughnut chart defaults
export function getDoughnutChartDefaults(legendPosition = 'bottom') {
    const themeColors = getThemeColors();
    return {
        ...CHART_DEFAULTS,
        plugins: {
            legend: {
                position: legendPosition,
                labels: {
                    color: themeColors.textColor,
                    padding: 20,
                    usePointStyle: true
                }
            }
        }
    };
}

// Scatter chart defaults
export function getScatterChartDefaults() {
    const themeColors = getThemeColors();
    return {
        ...CHART_DEFAULTS,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            x: {
                beginAtZero: true,
                ticks: {
                    color: themeColors.textColor
                },
                grid: {
                    color: themeColors.gridColor
                }
            },
            y: {
                beginAtZero: true,
                ticks: {
                    color: themeColors.textColor
                },
                grid: {
                    color: themeColors.gridColor
                }
            }
        }
    };
}

// Mini trend chart configuration (sparklines)
export function getMiniTrendChartDefaults() {
    const themeColors = getThemeColors();
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { enabled: true }
        },
        scales: {
            x: {
                display: false,
                grid: { display: false }
            },
            y: {
                display: false,
                grid: { display: false }
            }
        },
        elements: {
            point: { radius: 0 },
            line: { tension: 0.4, borderWidth: 2 }
        }
    };
}
