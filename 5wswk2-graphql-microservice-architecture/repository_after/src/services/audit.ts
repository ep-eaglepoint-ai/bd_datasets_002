/**
 * Query Audit Logging Service
 * 
 * Logs all GraphQL operations for compliance and debugging.
 */

interface AuditEntry {
  timestamp: string;
  operationType: 'query' | 'mutation' | 'subscription';
  operationName: string | null;
  query: string;
  variables: any;
  userId: string | null;
  clientIp: string | null;
  duration: number;
  success: boolean;
  errorMessage?: string;
}

class AuditLogger {
  private logs: AuditEntry[] = [];
  private maxLogs: number = 10000; // Rolling buffer

  /**
   * Log a GraphQL operation
   */
  log(entry: Omit<AuditEntry, 'timestamp'>): void {
    const fullEntry: AuditEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    // Structured JSON log output
    console.log(JSON.stringify({
      type: 'AUDIT',
      ...fullEntry,
    }));

    // Keep in-memory buffer for recent queries
    this.logs.push(fullEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * Get recent audit logs (for debugging/admin API)
   */
  getRecentLogs(limit: number = 100): AuditEntry[] {
    return this.logs.slice(-limit);
  }

  /**
   * Query logs by user
   */
  getLogsByUser(userId: string, limit: number = 100): AuditEntry[] {
    return this.logs.filter(l => l.userId === userId).slice(-limit);
  }

  /**
   * Get failed operations
   */
  getFailedOperations(limit: number = 100): AuditEntry[] {
    return this.logs.filter(l => !l.success).slice(-limit);
  }

  /**
   * Clear logs (for testing)
   */
  clear(): void {
    this.logs = [];
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();

/**
 * Apollo Server plugin for automatic audit logging
 */
export const auditPlugin = {
  async requestDidStart(requestContext: any) {
    const startTime = Date.now();
    const { request, contextValue } = requestContext;

    return {
      async willSendResponse(responseContext: any) {
        const duration = Date.now() - startTime;
        const { response } = responseContext;

        auditLogger.log({
          operationType: request.operationName?.toLowerCase().includes('mutation') ? 'mutation' : 'query',
          operationName: request.operationName || null,
          query: request.query || '',
          variables: request.variables || {},
          userId: contextValue?.user?.id || null,
          clientIp: request.http?.headers.get('x-forwarded-for') || null,
          duration,
          success: !response.errors || response.errors.length === 0,
          errorMessage: response.errors?.[0]?.message,
        });
      },
    };
  },
};
