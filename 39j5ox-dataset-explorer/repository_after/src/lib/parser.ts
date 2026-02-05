import Papa from 'papaparse';
import { ParseConfig, Column, DataType } from '../types/dataset';
import { generateId, inferDataType, parseDate } from './utils';

export interface ParseResult {
  data: Record<string, any>[];
  columns: Column[];
  errors: string[];
  meta: {
    rowCount: number;
    columnCount: number;
    encoding: string;
    delimiter: string;
    hasHeader: boolean;
  };
}

export interface SimpleParseResult {
  success: boolean;
  data?: Record<string, any>[];
  columns?: Column[];
  errors: string[];
  warnings?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  rowCount: number;
}

// Standalone function exports for testing compatibility
export async function parseCSV(
  file: File, 
  options: Partial<ParseConfig> = {}
): Promise<SimpleParseResult> {
  try {
    if (file.size === 0) {
      return {
        success: false,
        errors: ['File is empty or contains no valid data'],
      };
    }

    const parser = new CSVParser(options);
    const result = await parser.parseFile(file);
    
    return {
      success: result.errors.length === 0,
      data: result.data,
      columns: result.columns,
      errors: result.errors,
    };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown parsing error'],
    };
  }
}

export function inferColumnTypes(data: Record<string, any>[]): Column[] {
  if (data.length === 0) return [];

  const firstRow = data[0];
  const columnNames = Object.keys(firstRow);

  return columnNames.map((name, index) => {
    const columnValues = data.map(row => row[name]);
    
    // For mixed types, check if majority are of one type
    const stringValues = columnValues.map(v => String(v));
    const numericValues = columnValues.filter(v => {
      if (typeof v === 'number') return true;
      if (typeof v === 'string') {
        const trimmed = v.trim();
        return !isNaN(Number(trimmed)) && trimmed !== '';
      }
      return false;
    });
    
    // If 50% or more are numeric, infer as number (this will catch inconsistencies)
    let inferredType: DataType;
    if (numericValues.length >= columnValues.length * 0.5) {
      inferredType = 'number';
    } else {
      // Check for very mixed types (numbers, text, booleans)
      const hasNumbers = stringValues.some(v => /^\d+$/.test(v));
      const hasText = stringValues.some(v => /^[a-zA-Z]+$/.test(v));
      const hasBooleans = stringValues.some(v => /^(true|false)$/i.test(v));
      
      if (hasNumbers && hasText && hasBooleans) {
        inferredType = 'string'; // Mixed types default to string
      } else {
        inferredType = inferDataType(columnValues);
      }
    }

    return {
      id: generateId(),
      name: name || `Column_${index + 1}`,
      type: inferredType,
      nullable: columnValues.some(v => v === null || v === undefined || v === ''),
      unique: new Set(columnValues.filter(v => v !== null && v !== undefined)).size === columnValues.filter(v => v !== null && v !== undefined).length,
    };
  });
}

export function validateData(
  data: Record<string, any>[], 
  options: { requiredFields?: string[] } = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (data.length === 0) {
    errors.push('No data to validate');
    return {
      isValid: false,
      errors,
      warnings,
      rowCount: 0,
    };
  }

  // Check required fields
  if (options.requiredFields) {
    const firstRow = data[0];
    const availableFields = Object.keys(firstRow);
    
    for (const requiredField of options.requiredFields) {
      if (!availableFields.includes(requiredField)) {
        errors.push(`Required field '${requiredField}' is missing`);
      } else {
        // Check for missing values in required fields
        const missingRows = data.filter(row => 
          row[requiredField] === null || 
          row[requiredField] === undefined || 
          row[requiredField] === ''
        );
        
        if (missingRows.length > 0) {
          errors.push(`Required field '${requiredField}' has ${missingRows.length} missing values`);
        }
      }
    }
  }

  // Check for data type inconsistencies
  const columns = inferColumnTypes(data);
  columns.forEach(column => {
    const values = data.map(row => row[column.name]);
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    
    if (nonNullValues.length > 0) {
      // Check type consistency
      let inconsistentCount = 0;
      nonNullValues.forEach(value => {
        const actualType = typeof value;
        let expectedType = column.type;
        
        // Map our types to JS types
        if (expectedType === 'number' && actualType !== 'number') {
          if (isNaN(Number(value))) inconsistentCount++;
        } else if (expectedType === 'boolean' && actualType !== 'boolean') {
          const strValue = String(value).toLowerCase();
          if (!['true', 'false', 'yes', 'no', '1', '0'].includes(strValue)) {
            inconsistentCount++;
          }
        } else if (expectedType === 'date' && !parseDate(String(value))) {
          inconsistentCount++;
        }
      });
      
      if (inconsistentCount > 0) {
        warnings.push(`Column '${column.name}' has ${inconsistentCount} values that don't match expected type '${column.type}'`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    rowCount: data.length,
  };
}

export class CSVParser {
  private config: ParseConfig;
  private abortController: AbortController | null = null;

  constructor(config: Partial<ParseConfig> = {}) {
    this.config = {
      delimiter: ',',
      quoteChar: '"',
      escapeChar: '"',
      encoding: 'utf-8',
      hasHeader: true,
      skipEmptyLines: true,
      trimWhitespace: true,
      ...config,
    };
  }

  async parseFile(
    file: File,
    onProgress?: (progress: number) => void,
    onChunk?: (chunk: any[]) => void
  ): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
      this.abortController = new AbortController();
      
      const errors: string[] = [];
      const allData: any[] = [];
      let columns: Column[] = [];
      let isFirstChunk = true;
      let totalSize = file.size;
      let processedSize = 0;

      Papa.parse(file, {
        delimiter: this.config.delimiter,
        quoteChar: this.config.quoteChar,
        escapeChar: this.config.escapeChar,
        header: this.config.hasHeader,
        skipEmptyLines: this.config.skipEmptyLines,
        transformHeader: (header: string) => {
          return this.config.trimWhitespace ? header.trim() : header;
        },
        transform: (value: string, field: string | number) => {
          if (this.config.trimWhitespace && typeof value === 'string') {
            return value.trim();
          }
          return value;
        },
        chunk: (results, parser) => {
          if (this.abortController?.signal.aborted) {
            parser.abort();
            return;
          }

          try {
            const chunkData = results.data as any[];
            
            // Handle first chunk to establish columns
            if (isFirstChunk && chunkData.length > 0) {
              columns = this.inferColumns(chunkData);
              isFirstChunk = false;
            }

            // Process and validate chunk data
            const processedChunk = this.processChunk(chunkData, columns);
            allData.push(...processedChunk);

            // Report progress
            processedSize += results.meta.cursor || 0;
            const progress = Math.min((processedSize / totalSize) * 100, 100);
            onProgress?.(progress);

            // Call chunk callback
            onChunk?.(processedChunk);

            // Collect errors
            if (results.errors.length > 0) {
              errors.push(...results.errors.map(err => 
                `Row ${err.row}: ${err.message}`
              ));
            }
          } catch (error) {
            errors.push(`Chunk processing error: ${error}`);
          }
        },
        complete: (results) => {
          try {
            // Final column statistics
            const finalColumns = this.calculateColumnStats(columns, allData);

            const parseResult: ParseResult = {
              data: allData,
              columns: finalColumns,
              errors,
              meta: {
                rowCount: allData.length,
                columnCount: finalColumns.length,
                encoding: this.config.encoding,
                delimiter: this.config.delimiter,
                hasHeader: this.config.hasHeader,
              },
            };

            resolve(parseResult);
          } catch (error) {
            reject(new Error(`Parse completion error: ${error}`));
          }
        },
        error: (error) => {
          reject(new Error(`Parse error: ${error.message}`));
        },
      });
    });
  }

  private inferColumns(sampleData: any[]): Column[] {
    if (sampleData.length === 0) return [];

    const firstRow = sampleData[0];
    const columnNames = Object.keys(firstRow);

    return columnNames.map((name, index) => {
      const columnValues = sampleData.map(row => row[name]);
      const inferredType = inferDataType(columnValues);

      return {
        id: generateId(),
        name: name || `Column_${index + 1}`,
        type: inferredType,
        nullable: columnValues.some(v => v === null || v === undefined || v === ''),
        unique: false, // Will be calculated later
      };
    });
  }

  private processChunk(chunkData: any[], columns: Column[]): any[] {
    return chunkData.map(row => {
      const processedRow: Record<string, any> = {};

      columns.forEach(column => {
        let value = row[column.name];

        // Handle null/empty values
        if (value === null || value === undefined || value === '') {
          processedRow[column.name] = null;
          return;
        }

        // Type coercion based on inferred type
        try {
          switch (column.type) {
            case 'number':
              const numValue = Number(value);
              processedRow[column.name] = isNaN(numValue) ? null : numValue;
              break;
            
            case 'boolean':
              if (typeof value === 'boolean') {
                processedRow[column.name] = value;
              } else if (typeof value === 'string') {
                const lowerValue = value.toLowerCase().trim();
                processedRow[column.name] = ['true', 'yes', '1'].includes(lowerValue);
              } else {
                processedRow[column.name] = Boolean(value);
              }
              break;
            
            case 'date':
              const dateValue = parseDate(String(value));
              processedRow[column.name] = dateValue;
              break;
            
            default:
              processedRow[column.name] = String(value);
          }
        } catch (error) {
          // Fallback to string on coercion error
          processedRow[column.name] = String(value);
        }
      });

      return processedRow;
    });
  }

  private calculateColumnStats(columns: Column[], data: any[]): Column[] {
    return columns.map(column => {
      const values = data.map(row => row[column.name]);
      const nonNullValues = values.filter(v => v !== null && v !== undefined);
      
      const stats = {
        count: values.length,
        nullCount: values.length - nonNullValues.length,
        uniqueCount: new Set(nonNullValues).size,
      };

      // Calculate type-specific statistics
      if (column.type === 'number') {
        const numericValues = nonNullValues.filter(v => typeof v === 'number' && !isNaN(v));
        if (numericValues.length > 0) {
          const sorted = [...numericValues].sort((a, b) => a - b);
          const sum = numericValues.reduce((acc, val) => acc + val, 0);
          const mean = sum / numericValues.length;
          
          Object.assign(stats, {
            min: sorted[0],
            max: sorted[sorted.length - 1],
            mean,
            median: sorted[Math.floor(sorted.length / 2)],
            stdDev: Math.sqrt(
              numericValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numericValues.length
            ),
          });
        }
      } else if (column.type === 'string' || column.type === 'categorical') {
        // Calculate frequency distribution for categorical data
        const distribution: Record<string, number> = {};
        nonNullValues.forEach(value => {
          const key = String(value);
          distribution[key] = (distribution[key] || 0) + 1;
        });
        
        // Find mode
        const sortedEntries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
        if (sortedEntries.length > 0) {
          Object.assign(stats, {
            mode: sortedEntries[0][0],
            distribution,
          });
        }
      }

      return {
        ...column,
        unique: stats.uniqueCount === stats.count - stats.nullCount,
        stats,
      };
    });
  }

  abort(): void {
    this.abortController?.abort();
  }

  static detectDelimiter(sample: string): string {
    const delimiters = [',', ';', '\t', '|'];
    const counts = delimiters.map(delimiter => {
      const lines = sample.split('\n').slice(0, 5); // Check first 5 lines
      const counts = lines.map(line => (line.match(new RegExp(delimiter, 'g')) || []).length);
      const avgCount = counts.reduce((sum, count) => sum + count, 0) / counts.length;
      const consistency = counts.every(count => Math.abs(count - avgCount) <= 1);
      
      return { delimiter, avgCount, consistency };
    });

    // Prefer consistent delimiters with reasonable counts
    const validDelimiters = counts.filter(c => c.consistency && c.avgCount > 0);
    if (validDelimiters.length > 0) {
      return validDelimiters.sort((a, b) => b.avgCount - a.avgCount)[0].delimiter;
    }

    return ','; // Default fallback
  }

  static detectEncoding(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const buffer = reader.result as ArrayBuffer;
        const bytes = new Uint8Array(buffer.slice(0, 1024)); // Check first 1KB
        
        // Simple UTF-8 detection
        let isUTF8 = true;
        for (let i = 0; i < bytes.length; i++) {
          if (bytes[i] > 127) {
            // Check for valid UTF-8 sequences
            if ((bytes[i] & 0xE0) === 0xC0) {
              if (i + 1 >= bytes.length || (bytes[i + 1] & 0xC0) !== 0x80) {
                isUTF8 = false;
                break;
              }
              i++;
            } else if ((bytes[i] & 0xF0) === 0xE0) {
              if (i + 2 >= bytes.length || 
                  (bytes[i + 1] & 0xC0) !== 0x80 || 
                  (bytes[i + 2] & 0xC0) !== 0x80) {
                isUTF8 = false;
                break;
              }
              i += 2;
            } else {
              isUTF8 = false;
              break;
            }
          }
        }
        
        resolve(isUTF8 ? 'utf-8' : 'latin1');
      };
      reader.readAsArrayBuffer(file.slice(0, 1024));
    });
  }
}