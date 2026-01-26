import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { query } from "../db";
import { AuthService } from "../services/AuthService";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const result = await query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rowCount === 0)
      return res.status(401).json({ error: "Invalid credentials" });

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword)
      return res.status(401).json({ error: "Invalid credentials" });

    const refreshTokenData = await AuthService.generateRefreshToken(user.id);
    const accessToken = AuthService.generateAccessToken(
      user,
      refreshTokenData.familyId
    );

    res.cookie("refreshToken", refreshTokenData.tokenString, {
      ...COOKIE_OPTIONS,
      expires: refreshTokenData.expiresAt,
    });

    res.json({
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const refresh = async (req: Request, res: Response) => {
  const tokenString = req.cookies.refreshToken;
  if (!tokenString) return res.status(401).json({ error: "No token provided" });

  try {
    const { accessToken, refreshToken, user } =
      await AuthService.rotateRefreshToken(tokenString);

    res.cookie("refreshToken", refreshToken, {
      ...COOKIE_OPTIONS,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.json({ accessToken, user });
  } catch (error: any) {
    res.clearCookie("refreshToken", COOKIE_OPTIONS);
    return res.status(403).json({ error: "Invalid token" });
  }
};

export const logout = async (req: Request, res: Response) => {
  const tokenString = req.cookies.refreshToken;
  if (tokenString) {
    try {
      const decoded = Buffer.from(tokenString, "base64").toString("utf-8");
      const [tokenId] = decoded.split(":");
      if (tokenId) {
        await query(
          "UPDATE refresh_tokens SET is_revoked = TRUE WHERE id = $1",
          [tokenId]
        );
      }
    } catch (e) {}
  }
  res.clearCookie("refreshToken", COOKIE_OPTIONS);
  res.sendStatus(204);
};
