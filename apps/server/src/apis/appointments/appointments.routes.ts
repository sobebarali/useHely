import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";

// Controllers
import { getAvailabilityController } from "./controllers/availability.appointments.controller";
import { cancelAppointmentController } from "./controllers/cancel.appointments.controller";
import { checkInAppointmentController } from "./controllers/check-in.appointments.controller";
import { completeAppointmentController } from "./controllers/complete.appointments.controller";
import { createAppointmentController } from "./controllers/create.appointments.controller";
import { getAppointmentByIdController } from "./controllers/get-by-id.appointments.controller";
import { listAppointmentsController } from "./controllers/list.appointments.controller";
import { getQueueController } from "./controllers/queue.appointments.controller";
import { updateAppointmentController } from "./controllers/update.appointments.controller";

// Validations
import { getAvailabilitySchema } from "./validations/availability.appointments.validation";
import { cancelAppointmentSchema } from "./validations/cancel.appointments.validation";
import { checkInAppointmentSchema } from "./validations/check-in.appointments.validation";
import { completeAppointmentSchema } from "./validations/complete.appointments.validation";
import { createAppointmentSchema } from "./validations/create.appointments.validation";
import { getAppointmentByIdSchema } from "./validations/get-by-id.appointments.validation";
import { listAppointmentsSchema } from "./validations/list.appointments.validation";
import { getQueueSchema } from "./validations/queue.appointments.validation";
import { updateAppointmentSchema } from "./validations/update.appointments.validation";

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/appointments/queue - Get OPD queue (must be before /:id route)
router.get(
	"/queue",
	authorize("QUEUE:READ"),
	validate(getQueueSchema),
	getQueueController,
);

// GET /api/appointments/availability/:doctorId - Get doctor availability (must be before /:id route)
router.get(
	"/availability/:doctorId",
	authorize("DOCTOR:READ"),
	validate(getAvailabilitySchema),
	getAvailabilityController,
);

// POST /api/appointments - Create new appointment
router.post(
	"/",
	authorize("APPOINTMENT:CREATE"),
	validate(createAppointmentSchema),
	createAppointmentController,
);

// GET /api/appointments - List appointments with pagination
router.get(
	"/",
	authorize("APPOINTMENT:READ"),
	validate(listAppointmentsSchema),
	listAppointmentsController,
);

// GET /api/appointments/:id - Get appointment by ID
router.get(
	"/:id",
	authorize("APPOINTMENT:READ"),
	validate(getAppointmentByIdSchema),
	getAppointmentByIdController,
);

// PATCH /api/appointments/:id - Update appointment
router.patch(
	"/:id",
	authorize("APPOINTMENT:UPDATE"),
	validate(updateAppointmentSchema),
	updateAppointmentController,
);

// DELETE /api/appointments/:id - Cancel appointment
router.delete(
	"/:id",
	authorize("APPOINTMENT:DELETE"),
	validate(cancelAppointmentSchema),
	cancelAppointmentController,
);

// POST /api/appointments/:id/check-in - Check in patient for appointment
router.post(
	"/:id/check-in",
	authorize("QUEUE:MANAGE"),
	validate(checkInAppointmentSchema),
	checkInAppointmentController,
);

// POST /api/appointments/:id/complete - Complete appointment
router.post(
	"/:id/complete",
	authorize("APPOINTMENT:UPDATE"),
	validate(completeAppointmentSchema),
	completeAppointmentController,
);

export default router;
