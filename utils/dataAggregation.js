// Utility functions for data aggregation and transformation

/**
 * Group data by a key function and sum requests
 */
export function groupBy(data, keyFn) {
    return data.reduce((acc, item) => {
        const key = keyFn(item);
        acc[key] = (acc[key] || 0) + item.requests;
        return acc;
    }, {});
}

/**
 * Get top N items from grouped data
 */
export function topN(groupedData, n = 10) {
    return Object.entries(groupedData)
        .sort(([,a], [,b]) => b - a)
        .slice(0, n);
}

/**
 * Get unique values from array
 */
export function getUniqueValues(data, keyFn) {
    return [...new Set(data.map(keyFn))];
}

/**
 * Calculate statistics for an array of numbers
 */
export function calculateStats(numbers) {
    if (numbers.length === 0) {
        return { min: 0, max: 0, mean: 0, median: 0, stdDev: 0 };
    }
    
    const sorted = [...numbers].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / sorted.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    
    const variance = sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sorted.length;
    const stdDev = Math.sqrt(variance);
    
    return { min, max, mean, median, stdDev };
}

/**
 * Group data by date
 */
export function groupByDate(data) {
    const dailyData = {};
    data.forEach(row => {
        const dateKey = row.timestamp.toISOString().split('T')[0];
        dailyData[dateKey] = (dailyData[dateKey] || 0) + row.requests;
    });
    return dailyData;
}

/**
 * Calculate cumulative sum for time series data
 */
export function calculateCumulative(dailyData) {
    const sortedDates = Object.keys(dailyData).sort();
    let cumulative = 0;
    return sortedDates.map(date => {
        cumulative += dailyData[date];
        return { date, value: cumulative };
    });
}

/**
 * Filter data by date range (in days from now)
 */
export function filterByDateRange(data, days) {
    if (days === 'all') return data;
    
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return data.filter(row => row.timestamp >= cutoffDate);
}

/**
 * Calculate requests per user
 */
export function calculateRequestsPerUser(data) {
    const userRequests = {};
    data.forEach(row => {
        userRequests[row.user] = (userRequests[row.user] || 0) + row.requests;
    });
    return userRequests;
}

/**
 * Calculate user efficiency (requests per active day)
 */
export function calculateUserEfficiency(data) {
    const userEfficiency = {};
    data.forEach(row => {
        if (!userEfficiency[row.user]) {
            userEfficiency[row.user] = {
                totalRequests: 0,
                activeDays: new Set()
            };
        }
        userEfficiency[row.user].totalRequests += row.requests;
        userEfficiency[row.user].activeDays.add(row.timestamp.toISOString().split('T')[0]);
    });
    
    return Object.entries(userEfficiency).map(([user, data]) => ({
        user,
        efficiency: data.totalRequests / data.activeDays.size,
        totalRequests: data.totalRequests,
        activeDays: data.activeDays.size
    }));
}

/**
 * Calculate model statistics
 */
export function calculateModelStats(data) {
    const modelStats = {};
    data.forEach(row => {
        if (!modelStats[row.model]) {
            modelStats[row.model] = {
                totalRequests: 0,
                uniqueUsers: new Set(),
                uniqueDays: new Set()
            };
        }
        modelStats[row.model].totalRequests += row.requests;
        modelStats[row.model].uniqueUsers.add(row.user);
        modelStats[row.model].uniqueDays.add(row.timestamp.toISOString().split('T')[0]);
    });
    
    return Object.entries(modelStats).map(([model, stats]) => ({
        model,
        requests: stats.totalRequests,
        users: stats.uniqueUsers.size,
        days: stats.uniqueDays.size,
        requestsPerUser: stats.totalRequests / stats.uniqueUsers.size,
        requestsPerDay: stats.totalRequests / stats.uniqueDays.size,
        usageScore: (stats.totalRequests / stats.uniqueUsers.size) * Math.log(stats.uniqueUsers.size + 1)
    }));
}

/**
 * Calculate daily data for time series
 */
export function calculateDailyTimeSeriesData(data, days) {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    const dailyRequests = new Map();
    const dailyUsers = new Map();
    
    // Initialize all dates
    for (let i = 0; i <= days; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateKey = date.toISOString().split('T')[0];
        dailyRequests.set(dateKey, 0);
        dailyUsers.set(dateKey, new Set());
    }
    
    // Aggregate data
    data.forEach(row => {
        const dateKey = row.timestamp.toISOString().split('T')[0];
        if (dailyRequests.has(dateKey)) {
            dailyRequests.set(dateKey, dailyRequests.get(dateKey) + row.requests);
            dailyUsers.get(dateKey).add(row.user);
        }
    });
    
    // Convert to arrays
    const dates = Array.from(dailyRequests.keys()).sort();
    const totalRequests = dates.map(date => ({
        x: date,
        y: dailyRequests.get(date)
    }));
    const activeUsers = dates.map(date => ({
        x: date,
        y: dailyUsers.get(date).size
    }));
    const avgRequests = dates.map(date => {
        const users = dailyUsers.get(date).size;
        const requests = dailyRequests.get(date);
        return {
            x: date,
            y: users > 0 ? requests / users : 0
        };
    });
    
    return { totalRequests, activeUsers, avgRequests };
}

/**
 * Group data by day of week
 */
export function groupByDayOfWeek(data) {
    const dayData = new Array(7).fill(0);
    data.forEach(row => {
        const dayOfWeek = row.timestamp.getDay();
        dayData[dayOfWeek] += row.requests;
    });
    return dayData;
}

/**
 * Categorize requests by size
 */
export function categorizeRequestSize(data, categories) {
    const categorized = {};
    Object.keys(categories).forEach(key => {
        categorized[categories[key].label] = 0;
    });
    
    data.forEach(row => {
        const requests = row.requests;
        for (const key in categories) {
            const category = categories[key];
            if (requests >= category.min && requests <= category.max) {
                categorized[category.label]++;
                break;
            }
        }
    });
    
    return categorized;
}
