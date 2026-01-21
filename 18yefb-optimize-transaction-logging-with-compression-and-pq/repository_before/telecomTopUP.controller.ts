// telecomTopUP.controller.ts
interface APILogData {
  APIEndpoint: string;
  method: string;
  HTTPStatusCode: number;
  request: any;
  response: any;
  headers: any;
}

function sendLog(message: string, level: string, data: APILogData) {
  console.log(`${level}: ${message}`, data); // Faulty: No batch, direct IO each time
}

export async function telecomTopupRequest(req: any, res: any) {
  
  sendLog("Request", "info", {}); // Many calls -> slow
  
}