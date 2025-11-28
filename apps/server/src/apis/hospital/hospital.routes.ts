import { Router } from "express";
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

// POST /api/hospitals - Register new hospital
router.post("/", validate(registerHospitalSchema), registerHospitalController);

// GET /api/hospitals/:id - Get hospital by ID
router.get("/:id", validate(getHospitalByIdSchema), getHospitalByIdController);

// PATCH /api/hospitals/:id - Update hospital
router.patch("/:id", validate(updateHospitalSchema), updateHospitalController);

// PATCH /api/hospitals/:id/status - Update hospital status
router.patch(
	"/:id/status",
	validate(updateStatusHospitalSchema),
	updateStatusHospitalController,
);

// POST /api/hospitals/:id/verify - Verify hospital
router.post(
	"/:id/verify",
	validate(verifyHospitalSchema),
	verifyHospitalController,
);

export default router;
