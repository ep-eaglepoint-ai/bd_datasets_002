import { Response, NextFunction } from 'express';
import { requireRoles, AuthenticatedRequest } from '../middleware';
import { DecodedToken } from '../types';

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

describe('RBAC Middleware - Requirement 8', () => {
  const adminUser: DecodedToken = {
    userId: 'admin-1',
    email: 'admin@test.com',
    roles: ['admin'],
    iat: 1000,
    exp: 2000
  };

  const normalUser: DecodedToken = {
    userId: 'user-1',
    email: 'user@test.com',
    roles: ['user'],
    iat: 1000,
    exp: 2000
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 "Not authenticated" if req.user is missing', () => {
    const req = mockRequest();
    const res = mockResponse();
    const middleware = requireRoles('admin');

    middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 403 "Insufficient permissions" if the user lacks the required role', () => {
    const req = mockRequest();
    req.user = normalUser;
    const res = mockResponse();
    const middleware = requireRoles('admin');

    middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
  });

  it('should permit access if user has one of the required roles', () => {
    const req = mockRequest();
    req.user = normalUser;
    const res = mockResponse();
    const middleware = requireRoles('editor', 'user', 'moderator');

    middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should be CASE-SENSITIVE for role matching', () => {
    const req = mockRequest();
    // User has 'admin', we require 'Admin'
    req.user = adminUser;
    const res = mockResponse();
    const middleware = requireRoles('Admin');

    middleware(req, res, mockNext);

    // Should fail because 'admin' !== 'Admin'
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
  });

  it('should handle users with no roles gracefully by denying access', () => {
      const req = mockRequest();
      req.user = { userId: '1', email: 'e', roles: [], iat: 1, exp: 2 }; // empty roles array instead of missing
      const res = mockResponse();
      const middleware = requireRoles('user');

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
  });
});
