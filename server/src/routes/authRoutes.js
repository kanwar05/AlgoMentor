import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getProfile, login, register, updateProfile } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = Router();
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please wait 15 minutes and try again."
  }
});

router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);
router.get("/me", protect, getProfile);
router.put("/me", protect, updateProfile);
export default router;
