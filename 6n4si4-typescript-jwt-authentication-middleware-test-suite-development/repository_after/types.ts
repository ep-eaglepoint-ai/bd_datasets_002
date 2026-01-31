export interface UserPayload {
  userId: string;
  email: string;
  roles: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface DecodedToken extends UserPayload {
  iat: number;
  exp: number;
  nbf?: number;
  jti?: string;
}
