import { APILogData, SafaricomConfig, SafaricomResponse } from './types';
import { DEFAULT_BASE_URL } from './constants';
import { BoundedLogger, sendLog } from './bounded-logger';
import { makeApiRequest } from './api-client';

// Re-export types for backward compatibility
export type { APILogData };

/**
 * Main API call function for Safaricom endpoints
 * @param body - Request body
 * @param token - Authorization token
 * @param destination - API endpoint destination ("token" or "topup")
 * @param config - Configuration options (baseUrl, isBenchmark)
 * @returns Promise with status and data/message
 */
export async function safaricomCoreCall(
  body: any,
  token: any,
  destination: "token" | "topup",
  config: SafaricomConfig = {}
): Promise<SafaricomResponse> {
  const logger = new BoundedLogger();
  const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  const endpoint = destination === "token" ? "Token" : "TopUp";

  // Validate request body
  if (body == null || (typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length === 0)) {
    const apiLogEntry: APILogData = {
      APIEndpoint: endpoint,
      method: "POST",
      HTTPStatusCode: 400,
      request: body,
      response: "Empty body",
      headers: {},
    };
    await sendLog("Empty body", "error", apiLogEntry, logger, config.isBenchmark);
    return { status: 400, message: "Empty body" };
  }

  // Make API request with retry logic
  const url = `${baseUrl}/${destination}`;
  return makeApiRequest(url, body, token, endpoint, logger, config.isBenchmark);
}
