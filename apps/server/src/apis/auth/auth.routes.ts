import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { authRateLimiter } from "../../middlewares/rate-limit";
import { validate } from "../../middlewares/validate";
import { disableMfaController } from "./controllers/disable-mfa.auth.controller";
import { enableMfaController } from "./controllers/enable-mfa.auth.controller";
import { hospitalsController } from "./controllers/hospitals.auth.controller";
import { meController } from "./controllers/me.auth.controller";
import { revokeController } from "./controllers/revoke.auth.controller";
import { switchTenantController } from "./controllers/switch-tenant.auth.controller";
import { listUserTenantsController } from "./controllers/tenants.auth.controller";
import { tokenController } from "./controllers/token.auth.controller";
import { verifyMfaController } from "./controllers/verify-mfa.auth.controller";
import { hospitalsQuerySchema } from "./validations/hospitals.auth.validation";
import { revokeTokenSchema } from "./validations/revoke.auth.validation";
import { switchTenantSchema } from "./validations/switch-tenant.auth.validation";
import { tokenSchema } from "./validations/token.auth.validation";
import { verifyMfaSchema } from "./validations/verify-mfa.auth.validation";

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

// GET /api/auth/tenants - List all tenants the user belongs to
// Authentication required
// Returns tenant details including roles and status for each tenant
router.get("/tenants", authenticate, listUserTenantsController);

// POST /api/auth/mfa/enable - Enable MFA for current user
// Authentication required
// Returns TOTP secret, QR code, and backup codes for setup
router.post("/mfa/enable", authenticate, enableMfaController);

// POST /api/auth/mfa/verify - Verify MFA setup
// Authentication required
// Verifies TOTP code and enables MFA
router.post(
	"/mfa/verify",
	authenticate,
	validate(verifyMfaSchema),
	verifyMfaController,
);

// POST /api/auth/mfa/disable - Disable MFA for current user
// Authentication required
// Removes all MFA configuration
router.post("/mfa/disable", authenticate, disableMfaController);

// POST /api/auth/switch-tenant - Switch to a different tenant
// Authentication required
// Allows users who belong to multiple organizations to switch tenant context
// Revokes current tokens and issues new tokens scoped to the target tenant
router.post(
	"/switch-tenant",
	authenticate,
	validate(switchTenantSchema),
	switchTenantController,
);

export default router;
