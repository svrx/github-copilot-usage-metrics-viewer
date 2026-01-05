// Date ranges in days
export const DATE_RANGES = {
    WEEK: 7,
    TWO_WEEKS: 14,
    MONTH: 30,
    TWO_MONTHS: 60,
    QUARTER: 90,
    TWO_QUARTERS: 180
};

// Request size categories for grouping
export const REQUEST_SIZE_CATEGORIES = {
    SMALL: { label: 'Small (1)', min: 1, max: 1 },
    MEDIUM: { label: 'Medium (2-5)', min: 2, max: 5 },
    LARGE: { label: 'Large (6-10)', min: 6, max: 10 },
    XLARGE: { label: 'Extra Large (11+)', min: 11, max: Infinity }
};

// User distribution brackets for analytics
export const USER_DISTRIBUTION_BRACKETS = [
    { label: 'Light', min: 0, max: 29 },
    { label: 'Moderate', min: 30, max: 119 },
    { label: 'Proficient', min: 120, max: 250 },
    { label: 'Power', min: 251, max: Infinity }
];

// Quota thresholds
export const QUOTA_THRESHOLDS = {
    NORMAL: 0.8,
    WARNING: 0.9,
    CRITICAL: 1.0
};

// Day names for charts
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Color palettes for charts
export const COLOR_PALETTES = {
    primary: '#667eea',
    secondary: '#764ba2',
    success: '#4caf50',
    warning: '#ff9800',
    danger: '#f44336',
    info: '#17a2b8',
    purple: '#9c27b0',
    pink: '#f093fb',
    orange: '#fd7e14',
    blue: '#4285f4',
    green: '#34a853'
};

// Generate an array of gradient colors
export function generateColorPalette(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
        const hue = (i * 360 / count) % 360;
        colors.push(`hsl(${hue}, 70%, 60%)`);
    }
    return colors;
}
