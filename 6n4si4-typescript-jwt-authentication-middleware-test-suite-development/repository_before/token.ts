import jwt, { SignOptions, Algorithm } from 'jsonwebtoken';
import crypto from 'crypto';
import { UserPayload, TokenPair, DecodedToken } from './types';

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'access-secret-key';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-key';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const ALLOWED_ALGORITHMS: Algorithm[] = ['HS256', 'HS384', 'HS512'];
const CLOCK_TOLERANCE_SECONDS = 30;

// In-memory stores (would be Redis in production)
const usedRefreshTokens = new Set<string>();
const blacklistedTokens = new Set<string>();

export function generateTokenPair(user: UserPayload): TokenPair {
  const jti = crypto.randomUUID();
  
  const accessToken = jwt.sign(
    { userId: user.userId, email: user.email, roles: user.roles },
    ACCESS_TOKEN_SECRET,
    { 
      expiresIn: ACCESS_TOKEN_EXPIRY,
      algorithm: 'HS256'
    }
  );
  
  const refreshToken = jwt.sign(
    { userId: user.userId, jti },
    REFRESH_TOKEN_SECRET,
    { 
      expiresIn: REFRESH_TOKEN_EXPIRY,
      algorithm: 'HS256'
    }
  );
  
  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): DecodedToken {
  const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET, {
    algorithms: ALLOWED_ALGORITHMS,
    clockTolerance: CLOCK_TOLERANCE_SECONDS
  }) as DecodedToken;
  
  if (blacklistedTokens.has(token)) {
    throw new Error('Token has been revoked');
  }
  
  return decoded;
}

export function verifyRefreshToken(token: string): DecodedToken {
  const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET, {
    algorithms: ALLOWED_ALGORITHMS
  }) as DecodedToken;
  
  if (!decoded.jti) {
    throw new Error('Invalid refresh token: missing jti');
  }
  
  if (usedRefreshTokens.has(decoded.jti)) {
    throw new Error('Refresh token has already been used');
  }
  
  return decoded;
}

export function rotateRefreshToken(oldToken: string, user: UserPayload): TokenPair {
  const decoded = verifyRefreshToken(oldToken);
  
  // Mark old token as used
  usedRefreshTokens.add(decoded.jti!);
  
  // Generate new token pair
  return generateTokenPair(user);
}

export function revokeToken(token: string): void {
  blacklistedTokens.add(token);
}

export function clearTokenStores(): void {
  usedRefreshTokens.clear();
  blacklistedTokens.clear();
}
