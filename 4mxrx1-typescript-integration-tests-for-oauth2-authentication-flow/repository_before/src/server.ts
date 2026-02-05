import express, { Request, Response } from 'express';
import { AuthService } from './auth-service';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authService = new AuthService();

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
    return res.status(400).json(result);
  }

  res.json(result);
});

app.post('/revoke', (req: Request, res: Response) => {
  const result = authService.revoke(req.body.token);
  res.json(result);
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`OAuth2 server listening on port ${PORT}`);
  });
}

export { app, authService };

