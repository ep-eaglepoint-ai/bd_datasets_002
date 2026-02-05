import { SurveyResponse } from '@/lib/schemas/survey';
import { validateSurveyResponse } from './validation';

/**
 * Streams CSV data in chunks for large file processing
 */
export async function* streamCSVImport(
  file: File,
  chunkSize: number = 1000
): AsyncGenerator<SurveyResponse[], void, unknown> {
  const text = await file.text();
  const lines = text.split('\n');
  
  if (lines.length === 0) return;
  
  const headers = lines[0].split(',').map(h => h.trim());
  let batch: SurveyResponse[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    if (values.length !== headers.length) continue;
    
    // Convert to response format (simplified - would need proper mapping)
    const response: Partial<SurveyResponse> = {
      id: `response-${Date.now()}-${i}`,
      surveyId: '', // Would be set from context
      responses: [],
      submittedAt: new Date().toISOString(),
      completed: true,
    };
    
    // Validate before adding to batch
    const validation = validateSurveyResponse(response);
    if (validation.success && validation.data) {
      batch.push(validation.data);
    }
    
    if (batch.length >= chunkSize) {
      yield batch;
      batch = [];
    }
  }
  
  if (batch.length > 0) {
    yield batch;
  }
}

/**
 * Parses a CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

/**
 * Processes responses in batches to avoid memory issues
 */
export async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
    
    // Yield control to prevent blocking
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  return results;
}

/**
 * Incremental computation cache for analytics
 */
export class IncrementalCache {
  private cache = new Map<string, { data: unknown; timestamp: number; dependencies: string[] }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Gets cached value if dependencies haven't changed
   */
  get<T>(key: string, dependencies: string[]): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    // Check if dependencies match
    if (dependencies.length !== cached.dependencies.length) {
      return null;
    }
    
    for (let i = 0; i < dependencies.length; i++) {
      if (dependencies[i] !== cached.dependencies[i]) {
        return null;
      }
    }
    
    // Check TTL
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    // Return the data directly (unwrap if it's wrapped)
    const data = cached.data as any;
    if (data && typeof data === 'object' && 'data' in data && Object.keys(data).length === 1) {
      return data.data as T;
    }
    return data as T;
  }

  /**
   * Sets cached value with dependencies
   */
  set<T>(key: string, data: T, dependencies: string[]): void {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now(),
      dependencies,
    });
  }

  /**
   * Invalidates cache entries that depend on changed keys
   */
  invalidate(changedKeys: string[]): void {
    const toDelete: string[] = [];
    
    this.cache.forEach((value, key) => {
      if (value.dependencies.some(dep => changedKeys.includes(dep))) {
        toDelete.push(key);
      }
    });
    
    toDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clears all cache
   */
  clear(): void {
    this.cache.clear();
  }
}

export const analyticsCache = new IncrementalCache();
