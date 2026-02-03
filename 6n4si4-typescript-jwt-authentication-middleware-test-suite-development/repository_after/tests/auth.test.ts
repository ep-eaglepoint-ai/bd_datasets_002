import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, AuthenticatedRequest } from '../middleware';
import { generateTokenPair, revokeToken, clearTokenStores } from '../token';
import { UserPayload } from '../types';

// Mock Express objects
const mockRequest = () => {
  return {
    headers: {},
  } as unknown as AuthenticatedRequest;
};

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockNext = jest.fn() as NextFunction;

describe('JWT Authentication Middleware - Comprehensive Tests', () => {
  const user: UserPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    roles: ['user']
  };

  beforeEach(() => {
    jest.useFakeTimers();
    clearTokenStores();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Requirement 1: Valid Tokens & Full Claim Assertions', () => {
    it('should call next() and populate req.user with all required claims', () => {
      const { accessToken } = generateTokenPair(user);
      const req = mockRequest();
      const res = mockResponse();
      req.headers.authorization = `Bearer ${accessToken}`;

      authenticate(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user).toMatchObject({
        userId: user.userId,
        email: user.email,
        roles: user.roles
      });
      // Assert iat and exp are present
      expect(typeof req.user?.iat).toBe('number');
      expect(typeof req.user?.exp).toBe('number');
      expect(req.user!.exp! > req.user!.iat!).toBe(true);
    });

    it('should return 401 for missing authorization header', () => {
      const req = mockRequest();
      const res = mockResponse();

      authenticate(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization header' });
    });
  });

  describe('Requirement 2: Clock Skew Boundaries (30s vs 31s)', () => {
    it('should ACCEPT tokens expired by exactly 30 seconds', () => {
      const { accessToken } = generateTokenPair(user);
      const req = mockRequest();
      const res = mockResponse();
      req.headers.authorization = `Bearer ${accessToken}`;

      // Advance time: 15 minutes (expiry) + 30 seconds (tolerance)
      jest.advanceTimersByTime((15 * 60 + 30) * 1000);

      authenticate(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should REJECT tokens expired by 31 seconds', () => {
      const { accessToken } = generateTokenPair(user);
      const req = mockRequest();
      const res = mockResponse();
      req.headers.authorization = `Bearer ${accessToken}`;

      // Advance time: 15 minutes + 31 seconds
      jest.advanceTimersByTime((15 * 60 + 31) * 1000);

      authenticate(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token expired' });
    });
  });

  describe('Requirement 3: Tampering Rejection (Header, Payload, Signature)', () => {
    it('should reject tokens with tampered signature', () => {
      const { accessToken } = generateTokenPair(user);
      const tampered = accessToken.substring(0, accessToken.length - 5) + 'abcde';
      
      const req = mockRequest();
      const res = mockResponse();
      req.headers.authorization = `Bearer ${tampered}`;

      authenticate(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    });

    it('should reject tokens with tampered payload', () => {
      const { accessToken } = generateTokenPair(user);
      const parts = accessToken.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      payload.roles = ['admin']; // Attempt to escalate privilege
      parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/=/g, '');
      const tampered = parts.join('.');

      const req = mockRequest();
      const res = mockResponse();
      req.headers.authorization = `Bearer ${tampered}`;

      authenticate(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    });

    it('should reject tokens with tampered header', () => {
      const { accessToken } = generateTokenPair(user);
      const parts = accessToken.split('.');
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
      header.alg = 'HS384'; // Tamper with algorithm
      parts[0] = Buffer.from(JSON.stringify(header)).toString('base64').replace(/=/g, '');
      const tampered = parts.join('.');

      const req = mockRequest();
      const res = mockResponse();
      req.headers.authorization = `Bearer ${tampered}`;

      authenticate(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Requirement 4: Algorithm Confusion & Future Claims', () => {
    it('should reject raw "alg:none" tokens', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64').replace(/=/g, '');
      const payload = Buffer.from(JSON.stringify(user)).toString('base64').replace(/=/g, '');
      const token = `${header}.${payload}.`;

      const req = mockRequest();
      const res = mockResponse();
      req.headers.authorization = `Bearer ${token}`;

      authenticate(req, res, mockNext);

      // Verify explicit algorithm whitelist prevents this
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should reject tokens with future "not before" (nbf) claim', () => {
      const secret = process.env.JWT_SECRET || 'access-secret-key';
      // Token valid in 1 hour
      const token = jwt.sign(user, secret, { notBefore: '1h' });
      
      const req = mockRequest();
      const res = mockResponse();
      req.headers.authorization = `Bearer ${token}`;

      authenticate(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Requirement 7: Revocation Persistence', () => {
    it('should reject revoked tokens across multiple consecutive attempts', () => {
      const { accessToken } = generateTokenPair(user);
      revokeToken(accessToken);

      const req1 = mockRequest();
      req1.headers.authorization = `Bearer ${accessToken}`;
      const res1 = mockResponse();
      authenticate(req1, res1, mockNext);
      expect(res1.status).toHaveBeenCalledWith(401);
      expect(res1.json).toHaveBeenCalledWith({ error: 'Token has been revoked' });

      jest.clearAllMocks();

      const req2 = mockRequest();
      req2.headers.authorization = `Bearer ${accessToken}`;
      const res2 = mockResponse();
      authenticate(req2, res2, mockNext);
      expect(res2.status).toHaveBeenCalledWith(401);
    });
  });
});
