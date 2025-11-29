import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";

// Controllers
import { exportPatientsController } from "./controllers/export.patients.controller";
import { getPatientByIdController } from "./controllers/get-by-id.patients.controller";
import { listPatientsController } from "./controllers/list.patients.controller";
import { registerPatientController } from "./controllers/register.patients.controller";
import { searchPatientsController } from "./controllers/search.patients.controller";
import { updatePatientController } from "./controllers/update.patients.controller";

// Validations
import { exportPatientsSchema } from "./validations/export.patients.validation";
import { getPatientByIdSchema } from "./validations/get-by-id.patients.validation";
import { listPatientsSchema } from "./validations/list.patients.validation";
import { registerPatientSchema } from "./validations/register.patients.validation";
import { searchPatientsSchema } from "./validations/search.patients.validation";
import { updatePatientSchema } from "./validations/update.patients.validation";

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/patients/search - Search patients (must be before /:id route)
router.get(
	"/search",
	authorize("PATIENT:READ"),
	validate(searchPatientsSchema),
	searchPatientsController,
);

// GET /api/patients/export - Export patients (must be before /:id route)
router.get(
	"/export",
	authorize("PATIENT:MANAGE"),
	validate(exportPatientsSchema),
	exportPatientsController,
);

// POST /api/patients - Register new patient
router.post(
	"/",
	authorize("PATIENT:CREATE"),
	validate(registerPatientSchema),
	registerPatientController,
);

// GET /api/patients - List patients with pagination
router.get(
	"/",
	authorize("PATIENT:READ"),
	validate(listPatientsSchema),
	listPatientsController,
);

// GET /api/patients/:id - Get patient by ID
router.get(
	"/:id",
	authorize("PATIENT:READ"),
	validate(getPatientByIdSchema),
	getPatientByIdController,
);

// PATCH /api/patients/:id - Update patient
router.patch(
	"/:id",
	authorize("PATIENT:UPDATE"),
	validate(updatePatientSchema),
	updatePatientController,
);

export default router;
