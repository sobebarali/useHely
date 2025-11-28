import { Router } from "express";
import { validate } from "../../middlewares/validate";
import { getHospitalByIdController } from "./controllers/get-by-id.hospital.controller";
import { registerHospitalController } from "./controllers/register.hospital.controller";
import { getHospitalByIdSchema } from "./validations/get-by-id.hospital.validation";
import { registerHospitalSchema } from "./validations/register.hospital.validation";

const router = Router();

// POST /api/hospitals - Register new hospital
router.post("/", validate(registerHospitalSchema), registerHospitalController);

// GET /api/hospitals/:id - Get hospital by ID
router.get("/:id", validate(getHospitalByIdSchema), getHospitalByIdController);

export default router;
