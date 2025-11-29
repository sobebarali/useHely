import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { createRoleController } from "./controllers/create.roles.controller";
import { createRoleSchema } from "./validations/create.roles.validation";

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /api/roles - Create a new custom role
// Requires ROLE:CREATE permission
router.post(
	"/",
	authorize("ROLE:CREATE"),
	validate(createRoleSchema),
	createRoleController,
);

export default router;
