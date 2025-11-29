import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { validate } from "../../middlewares/validate";
import { meController } from "./controllers/me.auth.controller";
import { revokeController } from "./controllers/revoke.auth.controller";
import { tokenController } from "./controllers/token.auth.controller";
import { revokeTokenSchema } from "./validations/revoke.auth.validation";
import { tokenSchema } from "./validations/token.auth.validation";

const router = Router();

// POST /api/auth/token - Get access and refresh tokens
// Supports password, authorization_code, and refresh_token grants
router.post("/token", validate(tokenSchema), tokenController);

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
