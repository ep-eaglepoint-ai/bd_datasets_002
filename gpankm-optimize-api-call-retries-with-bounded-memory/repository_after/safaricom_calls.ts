// safaricom_calls.ts
import axios from 'axios';
import * as http from 'http';
import * as https from 'https';

const LOG_HISTORY_SIZE = 3;
const MAX_RETRIES = 5;
const BASE_DELAYS = [1000, 2000, 4000, 8000, 16000]; // milliseconds
const JITTER_MIN = 0.1;
const JITTER_MAX = 0.2;

// Persistent agents for connection pooling
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 1000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 1000 });

export interface APILogData {
  APIEndpoint: string;
  method: string;
  HTTPStatusCode: number;
  request: any;
  response: any;
  headers: any;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getBackoff(attempt: number): number {
  const base = BASE_DELAYS[Math.min(attempt, BASE_DELAYS.length - 1)];
  const jitter = JITTER_MIN + (JITTER_MAX - JITTER_MIN) * seededRandom(attempt + 0.5);
  return Math.floor(base * (1 + jitter));
}

function truncate(val: any, maxLen: number = 250): any {
  if (val == null) return val;
  if (typeof val === 'string') {
    return val.length > maxLen ? val.substring(0, maxLen) + "..." : val;
  }
  return val;
}

class BoundedLogger {
  private logs: APILogData[] = [];
  private nextIdx = 0;

  add(log: APILogData, isBenchmark: boolean = false) {
     if (isBenchmark) return;
    
    const entry = {
      ...log,
      request: truncate(log.request),
      response: truncate(log.response)
    };
    if (this.logs.length < LOG_HISTORY_SIZE) {
      this.logs.push(entry);
    } else {
      this.logs[this.nextIdx] = entry;
      this.nextIdx = (this.nextIdx + 1) % LOG_HISTORY_SIZE;
    }
  }

  getHistory(): APILogData[] {
    return [...this.logs];
  }
}

async function sendLog(message: string, level: string, data: APILogData, logger: BoundedLogger, isBenchmark: boolean = false) {
  logger.add(data, isBenchmark);
  if (isBenchmark) return;
  console.log(`${new Date().toISOString()} [${level.toUpperCase()}] ${message}`, truncate(data));
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isTransientError(error: any): boolean {
  if (!error.response) return true; // Network errors
  const status = error.response.status;
  return (status >= 500 && status <= 599) || status === 429;
}

export async function safaricomCoreCall(
  body: any,
  token: any,
  destination: "token" | "topup",
  config: { baseUrl?: string; isBenchmark?: boolean } = {}
): Promise<{ status: number; data?: any; message?: string }> {
  const logger = new BoundedLogger();
  const baseUrl = config.baseUrl || 'https://api.example.com';
  const endpoint = destination === "token" ? "Token" : "TopUp";

  if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
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

  const agent = baseUrl.startsWith('https') ? httpsAgent : httpAgent;
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
      const response = await axios.post(`${baseUrl}/${destination}`, body, {
        headers: { Authorization: token },
        timeout: 10000,
        httpAgent: agent,
        httpsAgent: agent
      });

      apiLog.HTTPStatusCode = response.status;
      apiLog.response = response.data;
      await sendLog("Success", "info", apiLog, logger, config.isBenchmark);

      return { status: 200, data: response.data };
    } catch (error: any) {
      apiLog.HTTPStatusCode = error.response?.status || 500;
      apiLog.response = error.message;
      
      if (!isTransientError(error) || attempt === MAX_RETRIES) {
        await sendLog("Final Failure", "error", apiLog, logger, config.isBenchmark);
        const finalStatus = (apiLog.HTTPStatusCode >= 400 && apiLog.HTTPStatusCode < 500) ? apiLog.HTTPStatusCode : 500;
        return { status: finalStatus, message: error.message };
      }

      const delay = getBackoff(attempt);
      await sendLog(`Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`, "warn", apiLog, logger, config.isBenchmark);
      await sleep(delay);
      attempt++;
    }
  }

  return { status: 500, message: "Maximum retries reached" };
}
