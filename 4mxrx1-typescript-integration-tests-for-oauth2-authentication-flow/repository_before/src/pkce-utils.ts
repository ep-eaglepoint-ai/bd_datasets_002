import crypto from 'crypto';

export class PKCEUtils {
  static generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  static generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  static verify(verifier: string, challenge: string): boolean {
    const computedChallenge = this.generateCodeChallenge(verifier);
    return computedChallenge === challenge;
  }
}

