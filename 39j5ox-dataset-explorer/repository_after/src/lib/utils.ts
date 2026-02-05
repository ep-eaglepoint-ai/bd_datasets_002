import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatNumber(num: number, decimals = 2): string {
  if (isNaN(num)) return 'N/A';
  if (num === 0) return '0';
  
  const absNum = Math.abs(num);
  if (absNum >= 1e9) return (num / 1e9).toFixed(decimals) + 'B';
  if (absNum >= 1e6) return (num / 1e6).toFixed(decimals) + 'M';
  if (absNum >= 1e3) return (num / 1e3).toFixed(decimals) + 'K';
  
  return num.toFixed(decimals);
}

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

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function calculateChecksum(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

export function isValidDate(date: any): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

export function parseDate(value: string): Date | null {
  if (!value || typeof value !== 'string') return null;
  
  // Try various date formats
  const formats = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
    /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
  ];
  
  const date = new Date(value);
  if (isValidDate(date)) return date;
  
  return null;
}

export function inferDataType(values: any[]): 'string' | 'number' | 'boolean' | 'date' | 'categorical' {
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNullValues.length === 0) return 'string';
  
  const sample = nonNullValues.slice(0, Math.min(100, nonNullValues.length));
  
  // Check for boolean
  const booleanCount = sample.filter(v => 
    typeof v === 'boolean' || 
    (typeof v === 'string' && /^(true|false|yes|no|1|0)$/i.test(v.trim()))
  ).length;
  
  if (booleanCount / sample.length > 0.8) return 'boolean';
  
  // Check for numbers
  const numberCount = sample.filter(v => {
    if (typeof v === 'number') return true;
    if (typeof v === 'string') {
      const trimmed = v.trim();
      return !isNaN(Number(trimmed)) && trimmed !== '';
    }
    return false;
  }).length;
  
  if (numberCount / sample.length > 0.8) return 'number';
  
  // Check for dates
  const dateCount = sample.filter(v => {
    if (v instanceof Date) return true;
    if (typeof v === 'string') {
      return parseDate(v) !== null;
    }
    return false;
  }).length;
  
  if (dateCount / sample.length > 0.8) return 'date';
  
  // Check for mixed types (different primitive types)
  const types = new Set(sample.map(v => typeof v));
  if (types.size > 2) return 'string'; // Mixed types default to string
  
  // Check for categorical (limited unique values, but only for strings)
  const stringValues = sample.filter(v => typeof v === 'string');
  if (stringValues.length > sample.length * 0.7) { // Mostly strings
    const uniqueValues = new Set(stringValues.map(v => String(v).toLowerCase()));
    const uniqueRatio = uniqueValues.size / stringValues.length;
    
    // Consider categorical if:
    // - Less than 10 unique values AND less than 70% unique
    // - OR less than 5 unique values regardless of ratio
    if (uniqueValues.size <= 5 || (uniqueValues.size <= 10 && uniqueRatio < 0.7)) {
      return 'categorical';
    }
  }
  
  return 'string';
}