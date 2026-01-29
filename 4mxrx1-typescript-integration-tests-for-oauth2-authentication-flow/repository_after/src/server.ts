import express, { Request, Response } from 'express';
import { AuthService } from './auth-service';

export function createServer() {
  const app = express();
  const authService = new AuthService();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/authorize', (req: Request, res: Response) => {
    const result = authService.authorize({
      clientId: req.query.client_id as string,
      redirectUri: req.query.redirect_uri as string,
      scope: req.query.scope as string,
      state: req.query.state as string,
      codeChallenge: req.query.code_challenge as string | undefined,
      codeChallengeMethod: req.query.code_challenge_method as string | undefined,
    });

    if ('error' in result) {
      return res.status(400).json(result);
    }

    res.json(result);
  });

  app.post('/token', (req: Request, res: Response) => {
    const result = authService.token({
      grantType: req.body.grant_type,
      code: req.body.code,
      codeVerifier: req.body.code_verifier,
      refreshToken: req.body.refresh_token,
      clientId: req.body.client_id,
      clientSecret: req.body.client_secret,
      redirectUri: req.body.redirect_uri,
    });

    if ('error' in result) {
      let statusCode = 400;
      if (result.error === 'rate_limit_exceeded') {
        statusCode = 429;
      } else if (result.error === 'invalid_client') {
        statusCode = 401;
      } else if (result.error === 'invalid_grant' && 'isExpiredOrRevoked' in result && result.isExpiredOrRevoked) {
        // Expired or revoked tokens should return 401 per requirements 4 and 9
        statusCode = 401;
      }
      return res.status(statusCode).json({ error: result.error });
    }

    res.json(result);
  });

  app.post('/revoke', (req: Request, res: Response) => {
    const result = authService.revoke(req.body.token);
    res.json(result);
  });

  return { app, authService };
}

// Support direct execution for production
if (require.main === module) {
  const { app } = createServer();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`OAuth2 server listening on port ${PORT}`);
  });
}
