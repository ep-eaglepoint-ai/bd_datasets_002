import { 
  generateTokenPair, 
  verifyRefreshToken, 
  rotateRefreshToken, 
  clearTokenStores 
} from '../token';
import { UserPayload } from '../types';
import jwt from 'jsonwebtoken';

describe('JWT Refresh Token Management', () => {
  const user: UserPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    roles: ['user']
  };

  beforeEach(() => {
    clearTokenStores();
  });

  describe('Requirement 5: Single-use & JTI Claim', () => {
    it('should fail if refresh token is missing jti claim', () => {
       // Manually create token without jti
       const secret = process.env.JWT_REFRESH_SECRET || 'refresh-secret-key';
       const token = jwt.sign({ userId: user.userId }, secret);
       
       expect(() => {
         verifyRefreshToken(token);
       }).toThrow('Invalid refresh token: missing jti');
    });

    it('should throw error when a refresh token is reused (Replay Attack)', () => {
      const { refreshToken } = generateTokenPair(user);
      
      // First use: success
      rotateRefreshToken(refreshToken, user);
      
      // Second use: should throw
      expect(() => {
        rotateRefreshToken(refreshToken, user);
      }).toThrow('Refresh token has already been used');
    });
    
    it('should ensure different token pairs have unique JTIs', () => {
        const pair1 = generateTokenPair(user);
        const pair2 = generateTokenPair(user);
        
        const decoded1 = jwt.decode(pair1.refreshToken) as any;
        const decoded2 = jwt.decode(pair2.refreshToken) as any;
        
        expect(decoded1.jti).toBeDefined();
        expect(decoded2.jti).toBeDefined();
        expect(decoded1.jti).not.toBe(decoded2.jti);
    });
  });

  describe('Requirement 6: Concurrent Refresh Handling', () => {
    it('should handle multiple simultaneous refresh attempts by only allowing one', async () => {
      const { refreshToken } = generateTokenPair(user);
      
      // We wrap the sync call in an async function to test concurrent behavior in Promise.all
      const attemptRotate = async () => {
          // In a real production environment (e.g. Redis), this would be an atomic operation.
          // In this sync implementation, we're testing that the Set logic is robust.
          return rotateRefreshToken(refreshToken, user);
      };

      const attempts = [
        attemptRotate(),
        attemptRotate(),
        attemptRotate(),
        attemptRotate(),
        attemptRotate()
      ];

      const results = await Promise.allSettled(attempts);
      
      const fulfilled = results.filter(r => r.status === 'fulfilled');
      const rejected = results.filter(r => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(4);
      expect((rejected[0] as PromiseRejectedResult).reason.message).toBe('Refresh token has already been used');
    });
  });
});
