import { Router } from "express";
import { login, refresh, logout } from "../controllers/authController";
import { loginLimiter } from "../middleware/rateLimit";

const router = Router();

router.post("/login", loginLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;
