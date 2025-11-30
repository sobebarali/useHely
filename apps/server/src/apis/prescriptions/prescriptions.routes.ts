import { Router } from "express";
import { prescriptionOwnershipPolicy } from "../../middlewares/abac-policies";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";

// Controllers
import { cancelPrescriptionController } from "./controllers/cancel.prescriptions.controller";
import { createPrescriptionController } from "./controllers/create.prescriptions.controller";
import { createTemplateController } from "./controllers/create-template.prescriptions.controller";
import { deleteTemplateController } from "./controllers/delete-template.prescriptions.controller";
import { getPrescriptionByIdController } from "./controllers/get-by-id.prescriptions.controller";
import { getTemplateController } from "./controllers/get-template.prescriptions.controller";
import { listPrescriptionsController } from "./controllers/list.prescriptions.controller";
import { listTemplatesController } from "./controllers/list-templates.prescriptions.controller";
import { updatePrescriptionController } from "./controllers/update.prescriptions.controller";
import { updateTemplateController } from "./controllers/update-template.prescriptions.controller";

// Validations
import { cancelPrescriptionSchema } from "./validations/cancel.prescriptions.validation";
import { createPrescriptionSchema } from "./validations/create.prescriptions.validation";
import { createTemplateSchema } from "./validations/create-template.prescriptions.validation";
import { deleteTemplateSchema } from "./validations/delete-template.prescriptions.validation";
import { getPrescriptionByIdSchema } from "./validations/get-by-id.prescriptions.validation";
import { getTemplateSchema } from "./validations/get-template.prescriptions.validation";
import { listPrescriptionsSchema } from "./validations/list.prescriptions.validation";
import { listTemplatesSchema } from "./validations/list-templates.prescriptions.validation";
import { updatePrescriptionSchema } from "./validations/update.prescriptions.validation";
import { updateTemplateSchema } from "./validations/update-template.prescriptions.validation";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Template routes (must be before /:id route)
// GET /api/prescriptions/templates - List prescription templates
router.get(
	"/templates",
	authorize("PRESCRIPTION:READ"),
	validate(listTemplatesSchema),
	listTemplatesController,
);

// POST /api/prescriptions/templates - Create prescription template
router.post(
	"/templates",
	authorize("PRESCRIPTION:CREATE"),
	validate(createTemplateSchema),
	createTemplateController,
);

// GET /api/prescriptions/templates/:id - Get template by ID
router.get(
	"/templates/:id",
	authorize("PRESCRIPTION:READ"),
	validate(getTemplateSchema),
	getTemplateController,
);

// PATCH /api/prescriptions/templates/:id - Update template
router.patch(
	"/templates/:id",
	authorize("PRESCRIPTION:UPDATE"),
	validate(updateTemplateSchema),
	updateTemplateController,
);

// DELETE /api/prescriptions/templates/:id - Delete template
router.delete(
	"/templates/:id",
	authorize("PRESCRIPTION:DELETE"),
	validate(deleteTemplateSchema),
	deleteTemplateController,
);

// Prescription routes
// POST /api/prescriptions - Create new prescription
router.post(
	"/",
	authorize("PRESCRIPTION:CREATE"),
	validate(createPrescriptionSchema),
	createPrescriptionController,
);

// GET /api/prescriptions - List prescriptions with pagination
router.get(
	"/",
	authorize("PRESCRIPTION:READ"),
	validate(listPrescriptionsSchema),
	listPrescriptionsController,
);

// GET /api/prescriptions/:id - Get prescription by ID
router.get(
	"/:id",
	authorize("PRESCRIPTION:READ"),
	prescriptionOwnershipPolicy, // ABAC: Doctors can only access prescriptions they created
	validate(getPrescriptionByIdSchema),
	getPrescriptionByIdController,
);

// PATCH /api/prescriptions/:id - Update prescription
router.patch(
	"/:id",
	authorize("PRESCRIPTION:UPDATE"),
	prescriptionOwnershipPolicy, // ABAC: Doctors can only update prescriptions they created
	validate(updatePrescriptionSchema),
	updatePrescriptionController,
);

// PATCH /api/prescriptions/:id/cancel - Cancel prescription
router.patch(
	"/:id/cancel",
	authorize("PRESCRIPTION:UPDATE"),
	prescriptionOwnershipPolicy, // ABAC: Doctors can only cancel prescriptions they created
	validate(cancelPrescriptionSchema),
	cancelPrescriptionController,
);

export default router;
