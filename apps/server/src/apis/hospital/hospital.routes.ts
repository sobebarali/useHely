import { Router } from "express";
import { validate } from "../../middlewares/validate";
import { registerHospitalController } from "./controllers/register.hospital.controller";
import { registerHospitalSchema } from "./validations/register.hospital.validation";

const router = Router();

// POST /api/hospitals - Register new hospital
router.post("/", validate(registerHospitalSchema), registerHospitalController);

export default router;
