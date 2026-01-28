import crypto from 'crypto';

interface TokenData {
  clientId: string;
  scope: string[];
  issuedAt: Date;
  expiresAt: Date;
}

interface RefreshTokenData extends TokenData {
  tokenFamily: string;
}

export class TokenService {
  private accessTokens: Map<string, TokenData> = new Map();
  private refreshTokens: Map<string, RefreshTokenData> = new Map();
  private revokedTokens: Set<string> = new Set();
  private revokedFamilies: Set<string> = new Set();

  generateTokens(
    clientId: string,
    scope: string[]
  ): { accessToken: string; refreshToken: string } {
    const accessToken = this.generateAccessToken(clientId, scope);
    const refreshToken = this.generateRefreshToken(clientId, scope);

    return { accessToken, refreshToken };
  }

  private generateAccessToken(clientId: string, scope: string[]): string {
    const token = crypto.randomBytes(32).toString('base64url');
    const now = new Date();

    this.accessTokens.set(token, {
      clientId,
      scope,
      issuedAt: now,
      expiresAt: new Date(now.getTime() + 3600 * 1000), // 1 hour
    });

    return token;
  }

  private generateRefreshToken(clientId: string, scope: string[]): string {
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenFamily = crypto.randomBytes(16).toString('base64url');
    const now = new Date();

    this.refreshTokens.set(token, {
      clientId,
      scope,
      tokenFamily,
      issuedAt: now,
      expiresAt: new Date(now.getTime() + 30 * 24 * 3600 * 1000), // 30 days
    });

    return token;
  }

  verifyAccessToken(token: string): TokenData | null {
    if (this.revokedTokens.has(token)) {
      return null;
    }

    const data = this.accessTokens.get(token);
    if (!data) {
      return null;
    }

    if (new Date() > data.expiresAt) {
      return null;
    }

    return data;
  }

  verifyRefreshToken(token: string): RefreshTokenData | null {
    if (this.revokedTokens.has(token)) {
      return null;
    }

    const data = this.refreshTokens.get(token);
    if (!data) {
      return null;
    }

    if (this.revokedFamilies.has(data.tokenFamily)) {
      return null;
    }

    if (new Date() > data.expiresAt) {
      return null;
    }

    return data;
  }

  rotateRefreshToken(
    oldToken: string,
    clientId: string,
    scope: string[]
  ): { accessToken: string; refreshToken: string } | null {
    const oldData = this.refreshTokens.get(oldToken);

    if (!oldData) {
      return null;
    }

    if (this.revokedFamilies.has(oldData.tokenFamily)) {
      return null;
    }

    if (new Date() > oldData.expiresAt) {
      return null;
    }

    // Revoke old refresh token
    this.revokedTokens.add(oldToken);

    // Generate new tokens with same family
    const accessToken = this.generateAccessToken(clientId, scope);
    const refreshToken = crypto.randomBytes(32).toString('base64url');
    const now = new Date();

    this.refreshTokens.set(refreshToken, {
      clientId,
      scope,
      tokenFamily: oldData.tokenFamily,
      issuedAt: now,
      expiresAt: new Date(now.getTime() + 30 * 24 * 3600 * 1000), // 30 days
    });

    return { accessToken, refreshToken };
  }

  revokeToken(token: string): { success: boolean } {
    // Check if it's a refresh token
    const refreshData = this.refreshTokens.get(token);
    if (refreshData) {
      // Revoke entire token family
      this.revokedFamilies.add(refreshData.tokenFamily);
      return { success: true };
    }

    // Check if it's an access token
    const accessData = this.accessTokens.get(token);
    if (accessData) {
      this.revokedTokens.add(token);
      return { success: true };
    }

    return { success: false };
  }
}

