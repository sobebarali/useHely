import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";
import { requireFeature } from "../../middlewares/check-subscription";
import { validate } from "../../middlewares/validate";
import { completeDispensingController } from "./controllers/complete.dispensing.controller";
import { dispenseDispensingController } from "./controllers/dispense.dispensing.controller";
import { getByIdDispensingController } from "./controllers/get-by-id.dispensing.controller";
import { historyDispensingController } from "./controllers/history.dispensing.controller";
// Controllers
import { pendingDispensingController } from "./controllers/pending.dispensing.controller";
import { returnDispensingController } from "./controllers/return.dispensing.controller";
import { startDispensingController } from "./controllers/start.dispensing.controller";
import { unavailableDispensingController } from "./controllers/unavailable.dispensing.controller";
import { completeDispensingSchema } from "./validations/complete.dispensing.validation";
import { dispenseDispensingSchema } from "./validations/dispense.dispensing.validation";
import { getByIdDispensingSchema } from "./validations/get-by-id.dispensing.validation";
import { historyDispensingSchema } from "./validations/history.dispensing.validation";
// Validations
import { pendingDispensingSchema } from "./validations/pending.dispensing.validation";
import { returnDispensingSchema } from "./validations/return.dispensing.validation";
import { startDispensingSchema } from "./validations/start.dispensing.validation";
import { unavailableDispensingSchema } from "./validations/unavailable.dispensing.validation";

const router = Router();

// All routes require authentication and PHARMACY feature (PROFESSIONAL+)
router.use(authenticate);
router.use(requireFeature("PHARMACY"));

// GET /api/dispensing/pending - List pending prescriptions awaiting dispensing
router.get(
	"/pending",
	authorize("DISPENSING:READ"),
	validate(pendingDispensingSchema),
	pendingDispensingController,
);

// GET /api/dispensing/history - List dispensing history
router.get(
	"/history",
	authorize("DISPENSING:READ"),
	validate(historyDispensingSchema),
	historyDispensingController,
);

// GET /api/dispensing/:prescriptionId - Get dispensing by prescription ID
router.get(
	"/:prescriptionId",
	authorize("DISPENSING:READ"),
	validate(getByIdDispensingSchema),
	getByIdDispensingController,
);

// POST /api/dispensing/:prescriptionId/start - Start dispensing a prescription
router.post(
	"/:prescriptionId/start",
	authorize("DISPENSING:CREATE"),
	validate(startDispensingSchema),
	startDispensingController,
);

// POST /api/dispensing/:prescriptionId/dispense - Dispense medicines
router.post(
	"/:prescriptionId/dispense",
	authorize("DISPENSING:CREATE"),
	validate(dispenseDispensingSchema),
	dispenseDispensingController,
);

// POST /api/dispensing/:prescriptionId/complete - Complete dispensing
router.post(
	"/:prescriptionId/complete",
	authorize("DISPENSING:CREATE"),
	validate(completeDispensingSchema),
	completeDispensingController,
);

// POST /api/dispensing/:prescriptionId/unavailable - Mark medicine as unavailable
router.post(
	"/:prescriptionId/unavailable",
	authorize("DISPENSING:CREATE"),
	validate(unavailableDispensingSchema),
	unavailableDispensingController,
);

// POST /api/dispensing/:prescriptionId/return - Return prescription to queue
router.post(
	"/:prescriptionId/return",
	authorize("DISPENSING:UPDATE"),
	validate(returnDispensingSchema),
	returnDispensingController,
);

export default router;
