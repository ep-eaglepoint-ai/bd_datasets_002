export interface APILogData {
  APIEndpoint: string;
  method: string;
  HTTPStatusCode: number;
  request: any;
  response: any;
  headers: any;
}

export interface SafaricomConfig {
  baseUrl?: string;
  isBenchmark?: boolean;
}

export interface SafaricomResponse {
  status: number;
  data?: any;
  message?: string;
}
