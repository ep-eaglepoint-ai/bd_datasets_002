/**
 * Custom Metrics Service
 * 
 * Provides custom metrics for observability:
 * - Query complexity scores
 * - Resolver timing
 * - Cache hit rates
 */

interface MetricData {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

class MetricsService {
  private metrics: MetricData[] = [];
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels: Record<string, string> = {}, value: number = 1): void {
    const key = `${name}:${JSON.stringify(labels)}`;
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
    
    this.recordMetric(name, current + value, labels);
  }

  /**
   * Record a histogram value (for timing, sizes, etc.)
   */
  recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = `${name}:${JSON.stringify(labels)}`;
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }
    this.histograms.get(key)!.push(value);
    
    this.recordMetric(name, value, labels);
  }

  /**
   * Record a gauge metric (current value)
   */
  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    this.recordMetric(name, value, labels);
  }

  private recordMetric(name: string, value: number, labels: Record<string, string>): void {
    this.metrics.push({
      name,
      value,
      labels,
      timestamp: Date.now(),
    });

    // Keep last 10000 metrics
    if (this.metrics.length > 10000) {
      this.metrics.shift();
    }
  }

  /**
   * Get metrics summary for a specific metric name
   */
  getSummary(name: string): { count: number; sum: number; avg: number; min: number; max: number } {
    const values = this.metrics
      .filter(m => m.name === name)
      .map(m => m.value);

    if (values.length === 0) {
      return { count: 0, sum: 0, avg: 0, min: 0, max: 0 };
    }

    return {
      count: values.length,
      sum: values.reduce((a, b) => a + b, 0),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  /**
   * Get all metrics (for export to Prometheus, etc.)
   */
  getAll(): MetricData[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics (for testing)
   */
  clear(): void {
    this.metrics = [];
    this.counters.clear();
    this.histograms.clear();
  }
}

// Singleton instance
export const metrics = new MetricsService();

// Predefined metric names
export const METRIC_NAMES = {
  QUERY_COMPLEXITY: 'graphql_query_complexity',
  RESOLVER_DURATION_MS: 'graphql_resolver_duration_ms',
  CACHE_HIT: 'graphql_cache_hit_total',
  CACHE_MISS: 'graphql_cache_miss_total',
  RATE_LIMIT_EXCEEDED: 'graphql_rate_limit_exceeded_total',
  REQUEST_DURATION_MS: 'graphql_request_duration_ms',
  ACTIVE_SUBSCRIPTIONS: 'graphql_active_subscriptions',
} as const;

/**
 * Apollo Server plugin for automatic metrics collection
 */
export const metricsPlugin = {
  async requestDidStart() {
    const startTime = Date.now();

    return {
      async didResolveOperation({ request, document }: any) {
        // Record complexity if available
        if ((request as any).complexity) {
          metrics.recordHistogram(
            METRIC_NAMES.QUERY_COMPLEXITY,
            (request as any).complexity,
            { operation: request.operationName || 'anonymous' }
          );
        }
      },
      async willSendResponse({ request }: any) {
        const duration = Date.now() - startTime;
        metrics.recordHistogram(
          METRIC_NAMES.REQUEST_DURATION_MS,
          duration,
          { operation: request.operationName || 'anonymous' }
        );
      },
    };
  },
};
