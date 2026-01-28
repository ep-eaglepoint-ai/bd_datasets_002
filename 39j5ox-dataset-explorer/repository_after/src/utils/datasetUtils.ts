// /utils/datasetUtils.ts
export function computeColumnStats(rows: any[][], colIdx: number) {
  const values = rows.map((r) => r[colIdx]).filter((v) => v !== null && v !== undefined && !isNaN(v));
  const count = values.length;
  const numericValues = values.map((v) => Number(v)).filter((v) => !isNaN(v));
  const sum = numericValues.reduce((a, b) => a + b, 0);
  const mean = count > 0 ? sum / count : 0;
  const sorted = [...numericValues].sort((a, b) => a - b);
  const median = count > 0 ? (sorted[Math.floor(count / 2)] ?? 0) : 0;
  const min = sorted[0] ?? 0;
  const max = sorted[sorted.length - 1] ?? 0;
  const variance =
    count > 1 ? numericValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (count - 1) : 0;
  const stdDev = Math.sqrt(variance);

  // Frequency for categorical
  const freqMap: Record<string, number> = {};
  values.forEach((v) => {
    const key = String(v);
    freqMap[key] = (freqMap[key] || 0) + 1;
  });

  return { count, sum, mean, median, min, max, stdDev, freqMap };
}
