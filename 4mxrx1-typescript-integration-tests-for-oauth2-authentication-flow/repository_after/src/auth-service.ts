import crypto from 'crypto';
import { TokenService } from './token-service';
import { PKCEUtils } from './pkce-utils';

interface Client {
  id: string;
  secret: string;
  redirectUris: string[];
  allowedScopes: string[];
}

interface AuthorizationCode {
  code: string;
  clientId: string;
  redirectUri: string;
  scope: string[];
  codeChallenge?: string;
  codeChallengeMethod?: string;
  expiresAt: Date;
  used: boolean;
}

interface RateLimitEntry {
  count: number;
  resetAt: Date;
}

export class AuthService {
  private clients: Map<string, Client> = new Map();
  private authCodes: Map<string, AuthorizationCode> = new Map();
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private tokenService: TokenService;

  constructor() {
    this.tokenService = new TokenService();
    this.initializeClients();
  }

  private initializeClients() {
    this.clients.set('test-client', {
      id: 'test-client',
      secret: 'test-secret',
      redirectUris: ['http://localhost:3000/callback'],
      allowedScopes: ['read', 'write', 'admin'],
    });
  }

  authorize(params: {
    clientId: string;
    redirectUri: string;
    scope: string;
    state: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
  }): { code: string; state: string } | { error: string } {
    const client = this.clients.get(params.clientId);
    if (!client) {
      return { error: 'invalid_client' };
    }

    if (!client.redirectUris.includes(params.redirectUri)) {
      return { error: 'invalid_redirect_uri' };
    }

    const requestedScopes = params.scope.split(' ');
    const invalidScopes = requestedScopes.filter(
      (s) => !client.allowedScopes.includes(s)
    );
    if (invalidScopes.length > 0) {
      return { error: 'invalid_scope' };
    }

    if (params.codeChallenge && params.codeChallengeMethod !== 'S256') {
      return { error: 'invalid_code_challenge_method' };
    }

    const code = crypto.randomBytes(32).toString('base64url');
    const authCode: AuthorizationCode = {
      code,
      clientId: params.clientId,
      redirectUri: params.redirectUri,
      scope: requestedScopes,
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: params.codeChallengeMethod,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      used: false,
    };

    this.authCodes.set(code, authCode);

    return { code, state: params.state };
  }

  token(params: {
    grantType: string;
    code?: string;
    codeVerifier?: string;
    refreshToken?: string;
    clientId: string;
    clientSecret: string;
    redirectUri?: string;
  }):
    | { accessToken: string; refreshToken: string; expiresIn: number }
    | { error: string } {
    
    if (!this.checkRateLimit(params.clientId)) {
      return { error: 'rate_limit_exceeded' };
    }

    const client = this.clients.get(params.clientId);
    if (!client || client.secret !== params.clientSecret) {
      return { error: 'invalid_client' };
    }

    if (params.grantType === 'authorization_code') {
      return this.handleAuthorizationCodeGrant(params, client);
    } else if (params.grantType === 'refresh_token') {
      return this.handleRefreshTokenGrant(params, client);
    }

    return { error: 'unsupported_grant_type' };
  }

  private handleAuthorizationCodeGrant(
    params: any,
    client: Client
  ): { accessToken: string; refreshToken: string; expiresIn: number } | { error: string } {
    const authCode = this.authCodes.get(params.code);

    if (!authCode) {
      return { error: 'invalid_grant' };
    }

    if (authCode.used) {
      return { error: 'invalid_grant' };
    }

    if (new Date() > authCode.expiresAt) {
      return { error: 'invalid_grant' };
    }

    if (authCode.clientId !== params.clientId) {
      return { error: 'invalid_grant' };
    }

    if (authCode.redirectUri !== params.redirectUri) {
      return { error: 'invalid_grant' };
    }

    if (authCode.codeChallenge) {
      if (!params.codeVerifier) {
        return { error: 'invalid_request' };
      }

      if (!PKCEUtils.verify(params.codeVerifier, authCode.codeChallenge)) {
        return { error: 'invalid_grant' };
      }
    }

    authCode.used = true;

    const tokens = this.tokenService.generateTokens(
      params.clientId,
      authCode.scope
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 3600,
    };
  }

  private handleRefreshTokenGrant(
    params: any,
    client: Client
  ): { accessToken: string; refreshToken: string; expiresIn: number } | { error: string; isExpiredOrRevoked?: boolean } {
    const tokenData = this.tokenService.verifyRefreshToken(params.refreshToken);

    if (!tokenData) {
      // Check if token was expired or revoked (for 401 status code)
      const isExpiredOrRevoked = this.tokenService.isTokenExpiredOrRevoked(params.refreshToken);
      return { error: 'invalid_grant', isExpiredOrRevoked };
    }

    if (tokenData.clientId !== params.clientId) {
      return { error: 'invalid_grant' };
    }

    const newTokens = this.tokenService.rotateRefreshToken(
      params.refreshToken,
      tokenData.clientId,
      tokenData.scope
    );

    if (!newTokens) {
      // Token was consumed or expired during rotation
      const isExpiredOrRevoked = this.tokenService.isTokenExpiredOrRevoked(params.refreshToken);
      return { error: 'invalid_grant', isExpiredOrRevoked };
    }

    return {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      expiresIn: 3600,
    };
  }

  revoke(token: string): { success: boolean } {
    return this.tokenService.revokeToken(token);
  }

  private checkRateLimit(clientId: string): boolean {
    const now = new Date();
    const entry = this.rateLimits.get(clientId);

    if (!entry || now > entry.resetAt) {
      this.rateLimits.set(clientId, {
        count: 1,
        resetAt: new Date(now.getTime() + 60 * 1000),
      });
      return true;
    }

    if (entry.count >= 10) {
      return false;
    }

    entry.count++;
    return true;
  }

  // Test helper
  clearRateLimits() {
    this.rateLimits.clear();
  }

  // Test helper: expire an authorization code
  expireAuthorizationCode(code: string): boolean {
    const authCode = this.authCodes.get(code);
    if (authCode) {
      authCode.expiresAt = new Date(Date.now() - 1000); // Set to 1 second ago
      return true;
    }
    return false;
  }

  // Test helper: expire a refresh token
  expireRefreshToken(token: string): boolean {
    return this.tokenService.expireRefreshToken(token);
  }

  // Test helper: clear all state
  clearAllState() {
    this.authCodes.clear();
    this.rateLimits.clear();
    this.tokenService.clearAllState();
  }
}
