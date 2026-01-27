/**
 * Web Worker for statistical computations
 * Runs in background thread to prevent UI blocking
 */

self.onmessage = function(e) {
  const { type, payload } = e.data;

  try {
    switch (type) {
      case 'compute-summary': {
        const { responses, questionId } = payload;
        
        // Extract values for the question
        const values = [];
        responses.forEach(response => {
          const res = response.responses.find(r => r.questionId === questionId);
          if (res && res.value !== null && res.value !== undefined) {
            if (typeof res.value === 'number') {
              values.push(res.value);
            }
          }
        });

        if (values.length === 0) {
          self.postMessage({
            type: 'result',
            payload: {
              count: 0,
              missing: responses.length,
              mean: null,
              median: null,
              stdDev: null,
            },
          });
          return;
        }

        // Compute statistics
        const sorted = [...values].sort((a, b) => a - b);
        const count = values.length;
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / count;
        
        const median = count % 2 === 0
          ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
          : sorted[Math.floor(count / 2)];

        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / count;
        const stdDev = Math.sqrt(variance);

        const min = Math.min(...values);
        const max = Math.max(...values);

        self.postMessage({
          type: 'result',
          payload: {
            count,
            missing: responses.length - count,
            mean,
            median,
            stdDev,
            variance,
            min,
            max,
          },
        });
        break;
      }

      case 'compute-crosstab': {
        const { responses, questionId1, questionId2 } = payload;
        
        // Build contingency table
        const pairs = [];
        responses.forEach(response => {
          const res1 = response.responses.find(r => r.questionId === questionId1);
          const res2 = response.responses.find(r => r.questionId === questionId2);
          if (res1 && res2 && res1.value !== null && res2.value !== null) {
            pairs.push({
              value1: String(res1.value),
              value2: String(res2.value),
            });
          }
        });

        const values1 = Array.from(new Set(pairs.map(p => p.value1))).sort();
        const values2 = Array.from(new Set(pairs.map(p => p.value2))).sort();

        const table = values1.map(() => values2.map(() => 0));

        pairs.forEach(({ value1, value2 }) => {
          const rowIndex = values1.indexOf(value1);
          const colIndex = values2.indexOf(value2);
          if (rowIndex >= 0 && colIndex >= 0) {
            table[rowIndex][colIndex]++;
          }
        });

        self.postMessage({
          type: 'result',
          payload: {
            table,
            rowLabels: values1,
            columnLabels: values2,
          },
        });
        break;
      }

      default:
        self.postMessage({
          type: 'error',
          payload: `Unknown operation type: ${type}`,
        });
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      payload: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
