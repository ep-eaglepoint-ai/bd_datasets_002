import request from 'supertest';
import { createServer } from '../src/server';
import { PKCEUtils } from '../src/pkce-utils';

describe('OAuth2 Integration Tests', () => {
  let app: any;
  let authService: any;
  let suiteStartTime: number;

  beforeAll(() => {
    suiteStartTime = Date.now();
    const server = createServer();
    app = server.app;
    authService = server.authService;
  });

  beforeEach(() => {
    authService.clearAllState();
  });

  describe('Requirement 1: Authorization code flow test successfully obtains tokens', () => {
    it('should successfully obtain access_token and refresh_token', async () => {
      // Request authorization
      const authResponse = await request(app)
        .get('/authorize')
        .query({
          client_id: 'test-client',
          redirect_uri: 'http://localhost:3000/callback',
          scope: 'read write',
          state: 'test-state-123',
        });

      expect(authResponse.status).toBe(200);
      expect(authResponse.body.code).toBeDefined();
      expect(authResponse.body.state).toBe('test-state-123');

      const authCode = authResponse.body.code;

      // Exchange code for tokens
      const tokenResponse = await request(app)
        .post('/token')
        .send({
          grant_type: 'authorization_code',
          code: authCode,
          client_id: 'test-client',
          client_secret: 'test-secret',
          redirect_uri: 'http://localhost:3000/callback',
        });

      expect(tokenResponse.status).toBe(200);
      expect(tokenResponse.body.accessToken).toBeDefined();
      expect(tokenResponse.body.refreshToken).toBeDefined();
      expect(tokenResponse.body.expiresIn).toBe(3600);
    });
  });

  describe('Requirement 2: PKCE validation rejects mismatched code_verifier', () => {
    it('should reject mismatched code_verifier', async () => {
      // Generate code_verifier (must be 43-128 characters per spec)
      const codeVerifier = PKCEUtils.generateCodeVerifier();
      // Verify code_verifier length is within spec (32 bytes base64url = ~43 chars)
      expect(codeVerifier.length).toBeGreaterThanOrEqual(43);
      expect(codeVerifier.length).toBeLessThanOrEqual(128);
      
      const codeChallenge = PKCEUtils.generateCodeChallenge(codeVerifier);

      // Request authorization with PKCE
      const authResponse = await request(app)
        .get('/authorize')
        .query({
          client_id: 'test-client',
          redirect_uri: 'http://localhost:3000/callback',
          scope: 'read',
          state: 'test-state',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        });

      expect(authResponse.status).toBe(200);
      const authCode = authResponse.body.code;

      // Try to exchange with wrong code_verifier
      const wrongVerifier = PKCEUtils.generateCodeVerifier();
      const tokenResponse = await request(app)
        .post('/token')
        .send({
          grant_type: 'authorization_code',
          code: authCode,
          code_verifier: wrongVerifier,
          client_id: 'test-client',
          client_secret: 'test-secret',
          redirect_uri: 'http://localhost:3000/callback',
        });

      expect(tokenResponse.status).toBe(400);
      expect(tokenResponse.body.error).toBe('invalid_grant');
    });
  });

  describe('Requirement 3: Token refresh with valid refresh_token returns new tokens', () => {
    it('should return new tokens when refreshing with valid refresh_token', async () => {
      // Get initial tokens
      const authResponse = await request(app)
        .get('/authorize')
        .query({
          client_id: 'test-client',
          redirect_uri: 'http://localhost:3000/callback',
          scope: 'read',
          state: 'test-state',
        });

      const authCode = authResponse.body.code;

      const initialTokenResponse = await request(app)
        .post('/token')
        .send({
          grant_type: 'authorization_code',
          code: authCode,
          client_id: 'test-client',
          client_secret: 'test-secret',
          redirect_uri: 'http://localhost:3000/callback',
        });

      const originalAccessToken = initialTokenResponse.body.accessToken;
      const originalRefreshToken = initialTokenResponse.body.refreshToken;

      // Refresh tokens
      const refreshResponse = await request(app)
        .post('/token')
        .send({
          grant_type: 'refresh_token',
          refresh_token: originalRefreshToken,
          client_id: 'test-client',
          client_secret: 'test-secret',
        });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.accessToken).toBeDefined();
      expect(refreshResponse.body.refreshToken).toBeDefined();
      expect(refreshResponse.body.accessToken).not.toBe(originalAccessToken);
      expect(refreshResponse.body.refreshToken).not.toBe(originalRefreshToken);
    });
  });

  describe('Requirement 4: Expired refresh token returns 401 error', () => {
    it('should return 401 for expired refresh token', async () => {
      // Get initial tokens
      const authResponse = await request(app)
        .get('/authorize')
        .query({
          client_id: 'test-client',
          redirect_uri: 'http://localhost:3000/callback',
          scope: 'read',
          state: 'test-state',
        });

      const authCode = authResponse.body.code;

      const tokenResponse = await request(app)
        .post('/token')
        .send({
          grant_type: 'authorization_code',
          code: authCode,
          client_id: 'test-client',
          client_secret: 'test-secret',
          redirect_uri: 'http://localhost:3000/callback',
        });

      const refreshToken = tokenResponse.body.refreshToken;

      // Expire the refresh token by manipulating its expiration time
      // This actually affects the service's Date.now() checks
      authService.expireRefreshToken(refreshToken);

      const refreshResponse = await request(app)
        .post('/token')
        .send({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: 'test-client',
          client_secret: 'test-secret',
        });

      expect(refreshResponse.status).toBe(401);
      expect(refreshResponse.body.error).toBe('invalid_grant');
    });
  });

  describe('Requirement 5: Invalid redirect_uri in authorization request returns 400', () => {
    it('should return 400 for invalid redirect_uri', async () => {
      const response = await request(app)
        .get('/authorize')
        .query({
          client_id: 'test-client',
          redirect_uri: 'http://evil.com/callback',
          scope: 'read',
          state: 'test-state',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_redirect_uri');
    });
  });

  describe('Requirement 6: Invalid client credentials return 401 on token request', () => {
    it('should return 401 for invalid client_secret', async () => {
      // Get valid authorization code
      const authResponse = await request(app)
        .get('/authorize')
        .query({
          client_id: 'test-client',
          redirect_uri: 'http://localhost:3000/callback',
          scope: 'read',
          state: 'test-state',
        });

      const authCode = authResponse.body.code;

      // Try to exchange with wrong client_secret
      const tokenResponse = await request(app)
        .post('/token')
        .send({
          grant_type: 'authorization_code',
          code: authCode,
          client_id: 'test-client',
          client_secret: 'wrong-secret',
          redirect_uri: 'http://localhost:3000/callback',
        });

      expect(tokenResponse.status).toBe(401);
      expect(tokenResponse.body.error).toBe('invalid_client');
    });
  });

  describe('Requirement 7: Unauthorized scope in authorization request returns 400', () => {
    it('should return 400 for unauthorized scope', async () => {
      const response = await request(app)
        .get('/authorize')
        .query({
          client_id: 'test-client',
          redirect_uri: 'http://localhost:3000/callback',
          scope: 'read unknown-scope',
          state: 'test-state',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_scope');
    });
  });

  describe('Requirement 8: Rate limiting blocks 11th request within 60 seconds', () => {
    it('should block 11th request with 429 status', async () => {
      // Make 10 successful token requests (each needs a new authorization code since codes are single-use)
      // Use Promise.all to make requests in parallel for faster execution
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .get('/authorize')
            .query({
              client_id: 'test-client',
              redirect_uri: 'http://localhost:3000/callback',
              scope: 'read',
              state: `test-state-${i}`,
            })
            .then(authRes => {
              const authCode = authRes.body.code;
              return request(app)
                .post('/token')
                .send({
                  grant_type: 'authorization_code',
                  code: authCode,
                  client_id: 'test-client',
                  client_secret: 'test-secret',
                  redirect_uri: 'http://localhost:3000/callback',
                });
            })
        );
      }

      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.status).not.toBe(429);
      });

      // 11th request should be rate limited (get a new code but rate limit should still apply)
      const authResponse = await request(app)
        .get('/authorize')
        .query({
          client_id: 'test-client',
          redirect_uri: 'http://localhost:3000/callback',
          scope: 'read',
          state: 'test-state-11',
        });

      const authCode = authResponse.body.code;

      const rateLimitedResponse = await request(app)
        .post('/token')
        .send({
          grant_type: 'authorization_code',
          code: authCode,
          client_id: 'test-client',
          client_secret: 'test-secret',
          redirect_uri: 'http://localhost:3000/callback',
        });

      expect(rateLimitedResponse.status).toBe(429);
      expect(rateLimitedResponse.body.error).toBe('rate_limit_exceeded');
    });
  });

  describe('Requirement 9: Revoked token cannot be used for refresh', () => {
    it('should return 401 when refreshing with revoked token', async () => {
      // Get initial tokens
      const authResponse = await request(app)
        .get('/authorize')
        .query({
          client_id: 'test-client',
          redirect_uri: 'http://localhost:3000/callback',
          scope: 'read',
          state: 'test-state',
        });

      const authCode = authResponse.body.code;

      const tokenResponse = await request(app)
        .post('/token')
        .send({
          grant_type: 'authorization_code',
          code: authCode,
          client_id: 'test-client',
          client_secret: 'test-secret',
          redirect_uri: 'http://localhost:3000/callback',
        });

      const refreshToken = tokenResponse.body.refreshToken;

      // Revoke the token
      await request(app)
        .post('/revoke')
        .send({
          token: refreshToken,
        });

      // Try to refresh with revoked token
      const refreshResponse = await request(app)
        .post('/token')
        .send({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: 'test-client',
          client_secret: 'test-secret',
        });

      expect(refreshResponse.status).toBe(401);
      expect(refreshResponse.body.error).toBe('invalid_grant');
    });
  });

  describe('Requirement 10: Concurrent refresh requests on same token only succeed once', () => {
    it('should only allow one concurrent refresh to succeed', async () => {
      // Get initial tokens
      const authResponse = await request(app)
        .get('/authorize')
        .query({
          client_id: 'test-client',
          redirect_uri: 'http://localhost:3000/callback',
          scope: 'read',
          state: 'test-state',
        });

      const authCode = authResponse.body.code;

      const tokenResponse = await request(app)
        .post('/token')
        .send({
          grant_type: 'authorization_code',
          code: authCode,
          client_id: 'test-client',
          client_secret: 'test-secret',
          redirect_uri: 'http://localhost:3000/callback',
        });

      const refreshToken = tokenResponse.body.refreshToken;

      // Send two concurrent refresh requests
      const [response1, response2] = await Promise.all([
        request(app)
          .post('/token')
          .send({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: 'test-client',
            client_secret: 'test-secret',
          }),
        request(app)
          .post('/token')
          .send({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: 'test-client',
            client_secret: 'test-secret',
          }),
      ]);

      // Exactly one must return 200 with new tokens, the other must return 401
      const successCount = [response1, response2].filter(r => r.status === 200).length;
      const failCount = [response1, response2].filter(r => r.status === 401).length;

      // Requirement states exactly one succeeds and one fails
      expect(successCount).toBe(1);
      expect(failCount).toBe(1);
      
      // Verify the successful response has tokens
      const successResponse = response1.status === 200 ? response1 : response2;
      expect(successResponse.body.accessToken).toBeDefined();
      expect(successResponse.body.refreshToken).toBeDefined();
      expect(successResponse.body.refreshToken).not.toBe(refreshToken);
      
      // Verify the failed response returns 401 with invalid_grant
      const failedResponse = response1.status === 401 ? response1 : response2;
      expect(failedResponse.status).toBe(401);
      expect(failedResponse.body.error).toBe('invalid_grant');
    });
  });

  describe('Requirement 11: Authorization code reuse returns 400 error', () => {
    it('should return 400 when reusing authorization code', async () => {
      // Get authorization code
      const authResponse = await request(app)
        .get('/authorize')
        .query({
          client_id: 'test-client',
          redirect_uri: 'http://localhost:3000/callback',
          scope: 'read',
          state: 'test-state',
        });

      const authCode = authResponse.body.code;

      // First exchange - should succeed
      const firstExchange = await request(app)
        .post('/token')
        .send({
          grant_type: 'authorization_code',
          code: authCode,
          client_id: 'test-client',
          client_secret: 'test-secret',
          redirect_uri: 'http://localhost:3000/callback',
        });

      expect(firstExchange.status).toBe(200);

      // Second exchange with same code - should fail
      const secondExchange = await request(app)
        .post('/token')
        .send({
          grant_type: 'authorization_code',
          code: authCode,
          client_id: 'test-client',
          client_secret: 'test-secret',
          redirect_uri: 'http://localhost:3000/callback',
        });

      expect(secondExchange.status).toBe(400);
      expect(secondExchange.body.error).toBe('invalid_grant');
    });
  });

  describe('Requirement 12: Authorization code older than 10 minutes returns 400', () => {
    it('should return 400 for expired authorization code', async () => {
      // Get authorization code
      const authResponse = await request(app)
        .get('/authorize')
        .query({
          client_id: 'test-client',
          redirect_uri: 'http://localhost:3000/callback',
          scope: 'read',
          state: 'test-state',
        });

      const authCode = authResponse.body.code;

      // Expire the authorization code by manipulating its expiration time
      // This actually affects the service's Date.now() checks
      authService.expireAuthorizationCode(authCode);

      const tokenResponse = await request(app)
        .post('/token')
        .send({
          grant_type: 'authorization_code',
          code: authCode,
          client_id: 'test-client',
          client_secret: 'test-secret',
          redirect_uri: 'http://localhost:3000/callback',
        });

      expect(tokenResponse.status).toBe(400);
      expect(tokenResponse.body.error).toBe('invalid_grant');
    });
  });

  describe('Requirement 13: PKCE code_challenge without S256 method returns 400', () => {
    it('should return 400 when code_challenge_method is not S256', async () => {
      const codeVerifier = PKCEUtils.generateCodeVerifier();
      const codeChallenge = PKCEUtils.generateCodeChallenge(codeVerifier);

      // Test with 'plain' method
      const response1 = await request(app)
        .get('/authorize')
        .query({
          client_id: 'test-client',
          redirect_uri: 'http://localhost:3000/callback',
          scope: 'read',
          state: 'test-state',
          code_challenge: codeChallenge,
          code_challenge_method: 'plain',
        });

      expect(response1.status).toBe(400);
      expect(response1.body.error).toBe('invalid_code_challenge_method');

      // Test with omitted method
      const response2 = await request(app)
        .get('/authorize')
        .query({
          client_id: 'test-client',
          redirect_uri: 'http://localhost:3000/callback',
          scope: 'read',
          state: 'test-state',
          code_challenge: codeChallenge,
        });

      expect(response2.status).toBe(400);
      expect(response2.body.error).toBe('invalid_code_challenge_method');
    });

    it('should return 400 when code_verifier is missing for PKCE flow', async () => {
      // Request authorization with PKCE
      const codeVerifier = PKCEUtils.generateCodeVerifier();
      const codeChallenge = PKCEUtils.generateCodeChallenge(codeVerifier);

      const authResponse = await request(app)
        .get('/authorize')
        .query({
          client_id: 'test-client',
          redirect_uri: 'http://localhost:3000/callback',
          scope: 'read',
          state: 'test-state',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        });

      expect(authResponse.status).toBe(200);
      const authCode = authResponse.body.code;

      // Try to exchange code without code_verifier (should fail)
      const tokenResponse = await request(app)
        .post('/token')
        .send({
          grant_type: 'authorization_code',
          code: authCode,
          client_id: 'test-client',
          client_secret: 'test-secret',
          redirect_uri: 'http://localhost:3000/callback',
          // code_verifier is missing
        });

      expect(tokenResponse.status).toBe(400);
      expect(tokenResponse.body.error).toBe('invalid_request');
    });
  });

  describe('Requirement 14: Each test must be independent with no shared state', () => {
    it('should reset rate limits between tests (simulated isolation)', async () => {
      // Fill rate limit for the current app instance using parallel requests
      const fillRequests = [];
      for (let i = 0; i < 10; i++) {
        fillRequests.push(
          request(app)
            .get('/authorize')
            .query({
              client_id: 'test-client',
              redirect_uri: 'http://localhost:3000/callback',
              scope: 'read',
              state: `rate-test-${i}`,
            })
            .then(async (res) => {
              const code = res.body.code;
              return request(app)
                .post('/token')
                .send({
                  grant_type: 'authorization_code',
                  code,
                  client_id: 'test-client',
                  client_secret: 'test-secret',
                  redirect_uri: 'http://localhost:3000/callback',
                });
            })
        );
      }
      await Promise.all(fillRequests);
      
      // 11th should hit rate limit
      const limitedAuth = await request(app)
        .get('/authorize')
        .query({
          client_id: 'test-client',
          redirect_uri: 'http://localhost:3000/callback',
          scope: 'read',
          state: 'rate-test-11',
        });
      const limitedCode = limitedAuth.body.code;
      const limitedToken = await request(app)
        .post('/token')
        .send({
          grant_type: 'authorization_code',
          code: limitedCode,
          client_id: 'test-client',
          client_secret: 'test-secret',
          redirect_uri: 'http://localhost:3000/callback',
        });
      expect(limitedToken.status).toBe(429);

      // Simulate a fresh test run by creating a new server instance (beforeEach behavior)
      const freshServer = createServer();
      const freshApp = freshServer.app;
      const freshAuth = await request(freshApp)
        .get('/authorize')
        .query({
          client_id: 'test-client',
          redirect_uri: 'http://localhost:3000/callback',
          scope: 'read',
          state: 'fresh-test',
        });
      const freshCode = freshAuth.body.code;
      const freshToken = await request(freshApp)
        .post('/token')
        .send({
          grant_type: 'authorization_code',
          code: freshCode,
          client_id: 'test-client',
          client_secret: 'test-secret',
          redirect_uri: 'http://localhost:3000/callback',
        });
      expect(freshToken.status).toBe(200);
    });

    it('should succeed regardless of execution order (simulated random order)', async () => {
      const flows = [
        async () => {
          const authResponse = await request(app)
            .get('/authorize')
            .query({
              client_id: 'test-client',
              redirect_uri: 'http://localhost:3000/callback',
              scope: 'read',
              state: 'order-a',
            });
          const code = authResponse.body.code;
          const tokenResponse = await request(app)
            .post('/token')
            .send({
              grant_type: 'authorization_code',
              code,
              client_id: 'test-client',
              client_secret: 'test-secret',
              redirect_uri: 'http://localhost:3000/callback',
            });
          expect(tokenResponse.status).toBe(200);
        },
        async () => {
          const authResponse = await request(app)
            .get('/authorize')
            .query({
              client_id: 'test-client',
              redirect_uri: 'http://localhost:3000/callback',
              scope: 'read unknown-scope',
              state: 'order-b',
            });
          expect(authResponse.status).toBe(400);
          expect(authResponse.body.error).toBe('invalid_scope');
        },
      ];

      // Shuffle flows to simulate random execution order
      for (let i = flows.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [flows[i], flows[j]] = [flows[j], flows[i]];
      }

      for (const flow of flows) {
        await flow();
      }
    });
  });

  describe('Requirement 15: All tests must complete in under 5 seconds total', () => {
    it('should complete the full test suite in under 5 seconds', async () => {
      // This test checks the total time elapsed since the start of the suite
      // It satisfies the requirement to verify the full suite duration
      const totalElapsed = Date.now() - suiteStartTime;
      expect(totalElapsed).toBeLessThan(5000);
    });
  });
});
