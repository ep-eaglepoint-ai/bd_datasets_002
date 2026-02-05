import { SurveyResponse } from '@/lib/schemas/survey';
import { CrossTabulation } from '@/lib/schemas/analytics';
import { validateCrossTabulation } from './validation';

/**
 * Computes chi-square p-value approximation
 */
function chiSquarePValue(chiSquare: number, degreesOfFreedom: number): number {
  // Simplified approximation - in production would use proper chi-square distribution
  // This is a rough approximation based on common critical values
  if (degreesOfFreedom <= 0) return 1.0;
  
  // Critical values for common df at 0.05 significance
  const criticalValues: Record<number, number> = {
    1: 3.84,
    2: 5.99,
    3: 7.81,
    4: 9.49,
    5: 11.07,
    6: 12.59,
    7: 14.07,
    8: 15.51,
    9: 16.92,
    10: 18.31,
  };

  const critical = criticalValues[degreesOfFreedom] || degreesOfFreedom + 3.84;
  
  if (chiSquare < critical) {
    return 0.05 + (chiSquare / critical) * 0.45; // Rough approximation
  } else {
    return Math.max(0.001, 0.05 - (chiSquare - critical) / (critical * 10));
  }
}

/**
 * Computes cross-tabulation with proper normalization and statistical validity
 */
export function computeCrossTabulation(
  responses: SurveyResponse[],
  questionId1: string,
  questionId2: string,
  options?: {
    normalize?: 'none' | 'row' | 'column' | 'total';
    minCellSize?: number; // Minimum cell size for validity
  }
): CrossTabulation & {
  normalizedTable?: number[][];
  warnings: string[];
  isValid: boolean;
} {
  const { normalize = 'none', minCellSize = 5 } = options || {};
  const warnings: string[] = [];

  // Extract values for both questions
  const pairs: Array<{ value1: unknown; value2: unknown }> = [];

  responses.forEach(response => {
    const res1 = response.responses.find(r => r.questionId === questionId1);
    const res2 = response.responses.find(r => r.questionId === questionId2);
    
    if (res1 && res2 && res1.value !== null && res2.value !== null) {
      pairs.push({ value1: res1.value, value2: res2.value });
    }
  });

  if (pairs.length === 0) {
    warnings.push('No valid pairs found for cross-tabulation');
    return {
      questionId1,
      questionId2,
      table: [],
      rowLabels: [],
      columnLabels: [],
      rowTotals: [],
      columnTotals: [],
      grandTotal: 0,
      chiSquare: null,
      pValue: null,
      warnings,
      isValid: false,
    };
  }

  // Get unique values for each question
  const values1 = Array.from(new Set(pairs.map(p => String(p.value1)))).sort();
  const values2 = Array.from(new Set(pairs.map(p => String(p.value2)))).sort();

  if (values1.length === 0 || values2.length === 0) {
    warnings.push('Insufficient unique values for cross-tabulation');
    return {
      questionId1,
      questionId2,
      table: [],
      rowLabels: values1,
      columnLabels: values2,
      rowTotals: [],
      columnTotals: [],
      grandTotal: 0,
      chiSquare: null,
      pValue: null,
      warnings,
      isValid: false,
    };
  }

  // Build contingency table
  const table: number[][] = values1.map(() => values2.map(() => 0));

  pairs.forEach(({ value1, value2 }) => {
    const rowIndex = values1.indexOf(String(value1));
    const colIndex = values2.indexOf(String(value2));
    if (rowIndex >= 0 && colIndex >= 0) {
      table[rowIndex][colIndex]++;
    }
  });

  // Compute row and column totals
  const rowTotals = table.map(row => row.reduce((sum, val) => sum + val, 0));
  const columnTotals = values2.map((_, colIndex) =>
    table.reduce((sum, row) => sum + row[colIndex], 0)
  );
  const grandTotal = rowTotals.reduce((sum, val) => sum + val, 0);

  // Check for sparse cells
  let sparseCells = 0;
  table.forEach((row, i) => {
    row.forEach((cell, j) => {
      if (cell > 0 && cell < minCellSize) {
        sparseCells++;
      }
    });
  });

  if (sparseCells > 0) {
    warnings.push(
      `${sparseCells} cells have fewer than ${minCellSize} responses - chi-square may be unreliable`
    );
  }

  // Check for imbalanced distributions
  const rowProportions = rowTotals.map(total => total / grandTotal);
  const colProportions = columnTotals.map(total => total / grandTotal);
  
  const maxRowProp = Math.max(...rowProportions);
  const maxColProp = Math.max(...colProportions);
  
  if (maxRowProp > 0.8) {
    warnings.push('Highly imbalanced row distribution detected');
  }
  if (maxColProp > 0.8) {
    warnings.push('Highly imbalanced column distribution detected');
  }

  // Compute normalized table if requested
  let normalizedTable: number[][] | undefined;
  if (normalize !== 'none') {
    normalizedTable = table.map((row, i) =>
      row.map((cell, j) => {
        if (normalize === 'row') {
          return rowTotals[i] > 0 ? cell / rowTotals[i] : 0;
        } else if (normalize === 'column') {
          return columnTotals[j] > 0 ? cell / columnTotals[j] : 0;
        } else if (normalize === 'total') {
          return grandTotal > 0 ? cell / grandTotal : 0;
        }
        return cell;
      })
    );
  }

  // Compute chi-square test with proper handling
  let chiSquare: number | null = null;
  let pValue: number | null = null;
  let isValid = true;

  if (grandTotal > 0 && values1.length > 1 && values2.length > 1) {
    let chiSquareValue = 0;
    const degreesOfFreedom = (values1.length - 1) * (values2.length - 1);

    // Check if we have enough data for chi-square
    if (grandTotal < 20) {
      warnings.push('Sample size too small for reliable chi-square test');
      isValid = false;
    }

    table.forEach((row, i) => {
      row.forEach((observed, j) => {
        const expected = (rowTotals[i] * columnTotals[j]) / grandTotal;
        if (expected > 0) {
          chiSquareValue += Math.pow(observed - expected, 2) / expected;
        } else if (observed > 0) {
          // Cell with observed but no expected (problematic)
          warnings.push(`Cell [${i}, ${j}] has observed count but zero expected frequency`);
        }
      });
    });

    chiSquare = chiSquareValue;
    
    // Check for expected frequencies < 5 (rule of thumb for chi-square validity)
    let lowExpectedCells = 0;
    table.forEach((row, i) => {
      row.forEach((observed, j) => {
        const expected = (rowTotals[i] * columnTotals[j]) / grandTotal;
        if (expected > 0 && expected < 5) {
          lowExpectedCells++;
        }
      });
    });

    if (lowExpectedCells > 0) {
      warnings.push(
        `${lowExpectedCells} cells have expected frequency < 5 - consider combining categories`
      );
    }

    pValue = chiSquarePValue(chiSquareValue, degreesOfFreedom);
  } else {
    warnings.push('Insufficient data for chi-square test');
    isValid = false;
  }

  const result: CrossTabulation & {
    normalizedTable?: number[][];
    warnings: string[];
    isValid: boolean;
  } = {
    questionId1,
    questionId2,
    table,
    rowLabels: values1,
    columnLabels: values2,
    rowTotals,
    columnTotals,
    grandTotal,
    chiSquare,
    pValue,
    normalizedTable,
    warnings,
    isValid,
  };

  // Validate the computed cross-tabulation before returning
  const validation = validateCrossTabulation(result);
  if (!validation.success) {
    console.error('Cross-tabulation validation failed:', validation.errors);
    // Return result anyway but add warning
    result.warnings.push('Cross-tabulation validation failed - results may be inconsistent');
    result.isValid = false;
  }

  return result;
}
