import { Router } from "express";
import { Permissions } from "../../constants";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { getHospitalByIdController } from "./controllers/get-by-id.hospital.controller";
import { registerHospitalController } from "./controllers/register.hospital.controller";
import { updateHospitalController } from "./controllers/update.hospital.controller";
import { updateStatusHospitalController } from "./controllers/update-status.hospital.controller";
import { verifyHospitalController } from "./controllers/verify.hospital.controller";
import { getHospitalByIdSchema } from "./validations/get-by-id.hospital.validation";
import { registerHospitalSchema } from "./validations/register.hospital.validation";
import { updateHospitalSchema } from "./validations/update.hospital.validation";
import { updateStatusHospitalSchema } from "./validations/update-status.hospital.validation";
import { verifyHospitalSchema } from "./validations/verify.hospital.validation";

const router = Router();

// ============================================================================
// Public Routes (No Authentication Required)
// ============================================================================

// POST /api/hospitals - Register new hospital (public)
router.post("/", validate(registerHospitalSchema), registerHospitalController);

// POST /api/hospitals/:id/verify - Verify hospital (public, uses verification token)
router.post(
	"/:id/verify",
	validate(verifyHospitalSchema),
	verifyHospitalController,
);

// ============================================================================
// Protected Routes (Authentication Required)
// ============================================================================

// GET /api/hospitals/:id - Get hospital by ID
router.get(
	"/:id",
	authenticate,
	authorize(Permissions.TENANT_READ),
	validate(getHospitalByIdSchema),
	getHospitalByIdController,
);

// PATCH /api/hospitals/:id - Update hospital
router.patch(
	"/:id",
	authenticate,
	authorize(Permissions.TENANT_UPDATE),
	validate(updateHospitalSchema),
	updateHospitalController,
);

// PATCH /api/hospitals/:id/status - Update hospital status
router.patch(
	"/:id/status",
	authenticate,
	authorize(Permissions.TENANT_MANAGE),
	validate(updateStatusHospitalSchema),
	updateStatusHospitalController,
);

export default router;
