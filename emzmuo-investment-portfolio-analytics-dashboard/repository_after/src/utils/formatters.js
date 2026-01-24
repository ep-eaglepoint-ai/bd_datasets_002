/**
 * Reusable formatting utilities for the Investment Portfolio Analytics Dashboard
 * These functions provide consistent formatting across all components
 */

/**
 * Format a number as currency (USD)
 * @param {number} value - The numeric value to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, options = {}) => {
  const defaultOptions = {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  };
  
  return new Intl.NumberFormat('en-US', { ...defaultOptions, ...options }).format(value);
};

/**
 * Format a number as a percentage with optional sign
 * @param {number} value - The numeric value to format as percentage
 * @param {boolean} includeSign - Whether to include + sign for positive values
 * @returns {string} Formatted percentage string
 */
export const formatPercent = (value, includeSign = true) => {
  const sign = includeSign && value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

/**
 * Get CSS class name based on numeric value (positive/negative/neutral)
 * @param {number} value - The numeric value to evaluate
 * @returns {string} CSS class name
 */
export const getColorClass = (value) => {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
};

/**
 * Format a date string for display
 * @param {Date|string} date - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  const defaultOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  };
  
  return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(new Date(date));
};

/**
 * Format a date for chart display (shorter format)
 * @param {Date|string} dateStr - Date to format
 * @returns {string} Formatted date string for charts
 */
export const formatChartDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
};

/**
 * Get transaction type icon
 * @param {string} type - Transaction type (BUY, SELL, DIVIDEND)
 * @returns {string} Icon character
 */
export const getTypeIcon = (type) => {
  switch (type) {
    case 'BUY': return '↗';
    case 'SELL': return '↘';
    case 'DIVIDEND': return '💰';
    default: return '•';
  }
};

/**
 * Get color for transaction type
 * @param {string} type - Transaction type (BUY, SELL, DIVIDEND)
 * @returns {string} CSS color value
 */
export const getTypeColor = (type) => {
  switch (type) {
    case 'BUY': return '#10b981';
    case 'SELL': return '#ef4444';
    case 'DIVIDEND': return '#8b5cf6';
    default: return '#6b7280';
  }
};

/**
 * Format large numbers with appropriate suffixes (K, M, B)
 * @param {number} value - The numeric value to format
 * @returns {string} Formatted number with suffix
 */
export const formatLargeNumber = (value) => {
  if (Math.abs(value) >= 1e9) {
    return (value / 1e9).toFixed(1) + 'B';
  }
  if (Math.abs(value) >= 1e6) {
    return (value / 1e6).toFixed(1) + 'M';
  }
  if (Math.abs(value) >= 1e3) {
    return (value / 1e3).toFixed(1) + 'K';
  }
  return value.toString();
};

/**
 * Truncate text to specified length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 20) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Format number with thousands separators
 * @param {number} value - The numeric value to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (value) => {
  return new Intl.NumberFormat('en-US').format(value);
};