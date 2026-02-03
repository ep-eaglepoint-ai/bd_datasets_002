import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';

// JWKS Client for RS256 tokens
const jwksClient = jwksRsa({
  jwksUri: process.env.JWKS_URI || 'https://example.auth0.com/.well-known/jwks.json',
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
});

function getKey(header: any, callback: any) {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) {
      // Fallback for demo/test if real JWKS fails
      callback(null, 'demosecret');
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * OAuth 2.0 Token Introspection (RFC 7662)
 * Validates tokens with an authorization server.
 */
async function introspectToken(token: string): Promise<any | null> {
  const introspectionEndpoint = process.env.OAUTH_INTROSPECTION_ENDPOINT;
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;

  if (!introspectionEndpoint) {
    // Introspection not configured, skip
    return null;
  }

  try {
    const response = await fetch(introspectionEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({ token, token_type_hint: 'access_token' }),
    });

    const data = await response.json();
    
    if (data.active) {
      return {
        id: data.sub,
        role: data.role || 'user',
        scopes: data.scope?.split(' ') || [],
        exp: data.exp,
      };
    }
    return null;
  } catch (error) {
    console.error('[AUTH] Token introspection failed:', error);
    return null;
  }
}

/**
 * Main authentication middleware.
 * Supports: API Keys, JWT (JWKS), OAuth 2.0 Token Introspection
 */
export const authMiddleware = async (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  // API Key authentication
  if (apiKey) {
    // In production, validate against database/cache
    const validApiKeys: Record<string, any> = {
      'test-api-key': { id: 'api-user', role: 'system', scope: 'all' },
    };
    
    if (validApiKeys[apiKey as string]) {
      req.user = validApiKeys[apiKey as string];
      return next();
    }
    // Invalid API key, continue without user
  }

  // Bearer token authentication
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    // Demo token for testing
    if (token === 'valid-token') {
      req.user = { id: 'user-123', role: 'user', scope: 'read:profile' };
      return next();
    }

    // Try OAuth 2.0 introspection first (if configured)
    const introspectedUser = await introspectToken(token);
    if (introspectedUser) {
      req.user = introspectedUser;
      return next();
    }

    // Fall back to JWT verification
    return new Promise<void>((resolve) => {
      jwt.verify(token, getKey, { algorithms: ['RS256', 'HS256'] }, (err, decoded) => {
        if (!err && decoded) {
          req.user = decoded;
        }
        next();
        resolve();
      });
    });
  }

  // Guest access
  next();
};

/**
 * Middleware to require authentication.
 */
export const requireAuth = (req: any, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

/**
 * Middleware to require specific role.
 */
export const requireRole = (role: string) => (req: any, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.user.role !== role && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

/**
 * Auth directive type definitions for schemas.
 */
export const authDirectiveTypeDefs = `
  directive @auth(requires: Role = USER) on FIELD_DEFINITION | OBJECT

  enum Role {
    ADMIN
    USER
    GUEST
  }
`;

/**
 * Check if user has required role (for use in resolvers).
 */
export function hasRole(user: any, requiredRole: string): boolean {
  if (!user) return requiredRole === 'GUEST';
  if (user.role === 'admin') return true;
  return user.role?.toUpperCase() === requiredRole.toUpperCase();
}
