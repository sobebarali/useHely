import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";
import { checkUserLimit } from "../../middlewares/check-subscription";
import { validate } from "../../middlewares/validate";

// Controllers
import { changePasswordController } from "./controllers/change-password.users.controller";
import { createUserController } from "./controllers/create.users.controller";
import { deactivateUserController } from "./controllers/deactivate.users.controller";
import { forcePasswordChangeController } from "./controllers/force-password-change.users.controller";
import { forgotPasswordController } from "./controllers/forgot-password.users.controller";
import { getUserByIdController } from "./controllers/get-by-id.users.controller";
import { listUsersController } from "./controllers/list.users.controller";
import { resetPasswordController } from "./controllers/reset-password.users.controller";
import { updateUserController } from "./controllers/update.users.controller";

// Validations
import { changePasswordSchema } from "./validations/change-password.users.validation";
import { createUserSchema } from "./validations/create.users.validation";
import { deactivateUserSchema } from "./validations/deactivate.users.validation";
import { forcePasswordChangeSchema } from "./validations/force-password-change.users.validation";
import { forgotPasswordSchema } from "./validations/forgot-password.users.validation";
import { getUserByIdSchema } from "./validations/get-by-id.users.validation";
import { listUsersSchema } from "./validations/list.users.validation";
import { resetPasswordSchema } from "./validations/reset-password.users.validation";
import { updateUserSchema } from "./validations/update.users.validation";

const router = Router();

// ===== Public Routes (no authentication) =====

// POST /api/users/forgot-password - Initiate password reset
router.post(
	"/forgot-password",
	validate(forgotPasswordSchema),
	forgotPasswordController,
);

// POST /api/users/reset-password - Complete password reset
router.post(
	"/reset-password",
	validate(resetPasswordSchema),
	resetPasswordController,
);

// ===== Protected Routes (require authentication) =====
router.use(authenticate);

// POST /api/users/change-password - Change own password
router.post(
	"/change-password",
	validate(changePasswordSchema),
	changePasswordController,
);

// POST /api/users - Create a new user
router.post(
	"/",
	authorize("USER:CREATE"),
	checkUserLimit, // Check subscription user limit
	validate(createUserSchema),
	createUserController,
);

// GET /api/users - List users with pagination
router.get(
	"/",
	authorize("USER:READ"),
	validate(listUsersSchema),
	listUsersController,
);

// GET /api/users/:id - Get user by ID
router.get(
	"/:id",
	authorize("USER:READ"),
	validate(getUserByIdSchema),
	getUserByIdController,
);

// PATCH /api/users/:id - Update user
router.patch(
	"/:id",
	authorize("USER:UPDATE"),
	validate(updateUserSchema),
	updateUserController,
);

// DELETE /api/users/:id - Deactivate user
router.delete(
	"/:id",
	authorize("USER:DELETE"),
	validate(deactivateUserSchema),
	deactivateUserController,
);

// POST /api/users/:id/force-password-change - Force password change
router.post(
	"/:id/force-password-change",
	authorize("USER:MANAGE"),
	validate(forcePasswordChangeSchema),
	forcePasswordChangeController,
);

export default router;
