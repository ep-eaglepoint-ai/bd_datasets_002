// safaricom_calls.ts
import axios from 'axios';
import moment from 'moment';

interface APILogData {
  APIEndpoint: string;
  method: string;
  HTTPStatusCode: number;
  request: any;
  response: any;
  headers: any;
}

let logs: APILogData[] = []; // Unbounded, grows forever

async function sendLog(message: string, level: string, data: APILogData) {
  logs.push(data); // Memory leak potential
  console.log(`${level}: ${message}`, data);
}

export async function safaricomCoreCall(
  body: any,
  token: any,
  destination: "token" | "topup",
  config?: { baseUrl?: string }
): Promise<any> {
  const base = config?.baseUrl || 'https://api.example.com';
  const APILogData: APILogData = {
    APIEndpoint: destination === "token" ? "Token" : "TopUp",
    method: "POST",
    HTTPStatusCode: 0,
    request: body,
    response: {},
    headers: {},
  };

  if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
    APILogData.HTTPStatusCode = 400;
    APILogData.response = 'Empty body';
    sendLog("Empty body", "error", APILogData);
    return { status: 400, message: 'Empty body' };
  }

  try {
    const response = await axios.post(base.replace(/\/$/, '') + '/' + destination, body, { headers: { Authorization: token } });
    APILogData.response = response.data;
    APILogData.HTTPStatusCode = 200;
    sendLog("Success", "info", APILogData);
    return { status: 200, data: response.data };
  } catch (error: any) {
    APILogData.response = error.message;
    APILogData.HTTPStatusCode = 500;
    sendLog("Failed", "error", APILogData);
    return { status: 500, message: error.message };
  }
}