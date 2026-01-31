import { Question, Response, ResponseValue } from '@/types/survey';

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format duration in seconds to human readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Calculate completion percentage
 */
export function calculateCompletionRate(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Validate response value against question constraints
 */
export function validateResponseValue(question: Question, value: ResponseValue): {
  isValid: boolean;
  error?: string;
} {
  // Check if required question has a value
  if (question.required && (value === null || value === undefined || value === '')) {
    return { isValid: false, error: 'This question is required' };
  }

  // If not required and empty, it's valid
  if (!question.required && (value === null || value === undefined || value === '')) {
    return { isValid: true };
  }

  switch (question.type) {
    case 'short_text':
      if (typeof value !== 'string') {
        return { isValid: false, error: 'Value must be text' };
      }
      if (question.maxLength && value.length > question.maxLength) {
        return { isValid: false, error: `Text must be ${question.maxLength} characters or less` };
      }
      break;

    case 'long_text':
      if (typeof value !== 'string') {
        return { isValid: false, error: 'Value must be text' };
      }
      if (question.maxLength && value.length > question.maxLength) {
        return { isValid: false, error: `Text must be ${question.maxLength} characters or less` };
      }
      break;

    case 'single_choice':
      if (typeof value !== 'string') {
        return { isValid: false, error: 'Please select an option' };
      }
      const validOption = question.options.some(option => option.value === value);
      if (!validOption) {
        return { isValid: false, error: 'Invalid option selected' };
      }
      break;

    case 'multiple_choice':
      if (!Array.isArray(value)) {
        return { isValid: false, error: 'Please select at least one option' };
      }
      
      if (question.minSelections && value.length < question.minSelections) {
        return { isValid: false, error: `Please select at least ${question.minSelections} options` };
      }
      
      if (question.maxSelections && value.length > question.maxSelections) {
        return { isValid: false, error: `Please select no more than ${question.maxSelections} options` };
      }
      
      const allValidOptions = value.every(v => 
        question.options.some(option => option.value === v)
      );
      if (!allValidOptions) {
        return { isValid: false, error: 'Invalid options selected' };
      }
      break;

    case 'rating_scale':
      const ratingValue = Number(value);
      if (isNaN(ratingValue)) {
        return { isValid: false, error: 'Please select a rating' };
      }
      if (ratingValue < question.minValue || ratingValue > question.maxValue) {
        return { isValid: false, error: `Rating must be between ${question.minValue} and ${question.maxValue}` };
      }
      break;

    case 'numeric_input':
      const numericValue = Number(value);
      if (isNaN(numericValue)) {
        return { isValid: false, error: 'Please enter a valid number' };
      }
      
      if (!question.allowDecimals && numericValue % 1 !== 0) {
        return { isValid: false, error: 'Please enter a whole number' };
      }
      
      if (question.minValue !== undefined && numericValue < question.minValue) {
        return { isValid: false, error: `Value must be at least ${question.minValue}` };
      }
      
      if (question.maxValue !== undefined && numericValue > question.maxValue) {
        return { isValid: false, error: `Value must be no more than ${question.maxValue}` };
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        return { isValid: false, error: 'Please select an option' };
      }
      break;

    default:
      return { isValid: false, error: 'Unknown question type' };
  }

  return { isValid: true };
}

/**
 * Calculate response completion rate
 */
export function calculateResponseCompletion(response: Response, totalQuestions: number): number {
  if (totalQuestions === 0) return 1;
  return response.answers.length / totalQuestions;
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (Array.isArray(obj)) return obj.map(item => deepClone(item)) as unknown as T;
  
  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Check if a value is empty
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Sanitize text input
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
    .substring(0, 10000); // Limit length
}

/**
 * Generate a slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Sort array by multiple criteria
 */
export function multiSort<T>(
  array: T[],
  sortBy: Array<{
    key: keyof T;
    direction: 'asc' | 'desc';
  }>
): T[] {
  return [...array].sort((a, b) => {
    for (const { key, direction } of sortBy) {
      const aVal = a[key];
      const bVal = b[key];
      
      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      if (aVal > bVal) comparison = 1;
      
      if (comparison !== 0) {
        return direction === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  });
}

/**
 * Group array by key
 */
export function groupBy<T, K extends keyof T>(array: T[], key: K): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Check if two objects are equal (shallow comparison)
 */
export function shallowEqual(obj1: any, obj2: any): boolean {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) {
    return false;
  }
  
  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }
  
  return true;
}