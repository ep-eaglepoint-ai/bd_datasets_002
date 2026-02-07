import axios from 'axios';
import { APILogData, SafaricomResponse } from './types';
import { MAX_RETRIES, DEFAULT_TIMEOUT } from './constants';
import { getAgent } from './http-agents';
import { isTransientError } from './utils';
import { getBackoff } from './backoff';
import { sleep } from './utils';
import { BoundedLogger, sendLog } from './bounded-logger';

/**
 * Makes an HTTP POST request with retry logic
 */
export async function makeApiRequest(
  url: string,
  body: any,
  token: string,
  endpoint: string,
  logger: BoundedLogger,
  isBenchmark: boolean = false
): Promise<SafaricomResponse> {
  const agent = getAgent(url);
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    const apiLog: APILogData = {
      APIEndpoint: endpoint,
      method: "POST",
      HTTPStatusCode: 0,
      request: body,
      response: {},
      headers: {},
    };

    try {
      const response = await axios.post(url, body, {
        headers: { Authorization: token },
        timeout: DEFAULT_TIMEOUT,
        httpAgent: agent,
        httpsAgent: agent
      });

      apiLog.HTTPStatusCode = response.status;
      apiLog.response = response.data;
      await sendLog("Success", "info", apiLog, logger, isBenchmark);

      return { status: 200, data: response.data };
    } catch (error: any) {
      apiLog.HTTPStatusCode = error.response?.status || 500;
      apiLog.response = error.message;
      
      if (!isTransientError(error) || attempt === MAX_RETRIES) {
        await sendLog("Final Failure", "error", apiLog, logger, isBenchmark);
        const finalStatus = (apiLog.HTTPStatusCode >= 400 && apiLog.HTTPStatusCode < 500) 
          ? apiLog.HTTPStatusCode 
          : 500;
        return { status: finalStatus, message: error.message };
      }

      const delay = getBackoff(attempt);
      await sendLog(
        `Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`, 
        "warn", 
        apiLog, 
        logger, 
        isBenchmark
      );
      await sleep(delay);
      attempt++;
    }
  }

  return { status: 500, message: "Maximum retries reached" };
}
