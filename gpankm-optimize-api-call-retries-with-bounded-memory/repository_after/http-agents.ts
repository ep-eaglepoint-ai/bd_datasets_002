import * as http from 'http';
import * as https from 'https';

/**
 * Persistent HTTP agents for connection pooling
 * Reusing connections improves performance and reduces overhead
 */
export const httpAgent = new http.Agent({ 
  keepAlive: true, 
  maxSockets: 1000 
});

export const httpsAgent = new https.Agent({ 
  keepAlive: true, 
  maxSockets: 1000 
});

/**
 * Gets the appropriate agent based on URL protocol
 */
export function getAgent(baseUrl: string): http.Agent | https.Agent {
  return baseUrl.startsWith('https') ? httpsAgent : httpAgent;
}
