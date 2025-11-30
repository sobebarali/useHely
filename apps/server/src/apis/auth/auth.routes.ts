import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { authRateLimiter } from "../../middlewares/rate-limit";
import { validate } from "../../middlewares/validate";
import { hospitalsController } from "./controllers/hospitals.auth.controller";
import { meController } from "./controllers/me.auth.controller";
import { revokeController } from "./controllers/revoke.auth.controller";
import { tokenController } from "./controllers/token.auth.controller";
import { hospitalsQuerySchema } from "./validations/hospitals.auth.validation";
import { revokeTokenSchema } from "./validations/revoke.auth.validation";
import { tokenSchema } from "./validations/token.auth.validation";

const router = Router();

// GET /api/auth/hospitals - Get hospitals for an email
// Public endpoint (used during login to show hospital selector)
// Rate limited to prevent user enumeration
router.get(
	"/hospitals",
	authRateLimiter,
	validate(hospitalsQuerySchema),
	hospitalsController,
);

// POST /api/auth/token - Get access and refresh tokens
// Supports password, authorization_code, and refresh_token grants
// Rate limited to prevent brute-force attacks
router.post("/token", authRateLimiter, validate(tokenSchema), tokenController);

// POST /api/auth/revoke - Revoke access or refresh token
// Authentication required
router.post(
	"/revoke",
	authenticate,
	validate(revokeTokenSchema),
	revokeController,
);

// GET /api/auth/me - Get current authenticated user
// Authentication required
router.get("/me", authenticate, meController);

export default router;
