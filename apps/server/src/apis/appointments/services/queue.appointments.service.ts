import { Patient } from "@hms/db";
import { createServiceLogger } from "../../../lib/logger";
import { getQueue } from "../repositories/queue.appointments.repository";
import type {
	GetQueueInput,
	GetQueueOutput,
} from "../validations/queue.appointments.validation";

const logger = createServiceLogger("queueAppointments");

// Estimated minutes per appointment
const MINUTES_PER_APPOINTMENT = 15;

/**
 * Get current OPD queue
 */
export async function getQueueService({
	tenantId,
	doctorId,
	departmentId,
	date,
}: {
	tenantId: string;
} & GetQueueInput): Promise<GetQueueOutput> {
	logger.info({ tenantId, doctorId, departmentId, date }, "Getting queue");

	const result = await getQueue({
		tenantId,
		doctorId,
		departmentId,
		date,
	});

	// Fetch patient details
	const patientIds = [
		...new Set(result.appointments.map((apt) => apt.patientId)),
	];
	const patients = await Patient.find({
		_id: { $in: patientIds },
		tenantId,
	}).lean();
	const patientMap = new Map(patients.map((p) => [String(p._id), p]));

	// Build queue items with estimated times
	const queue = result.appointments.map((apt, index) => {
		const patient = patientMap.get(apt.patientId);
		const waitMinutes = index * MINUTES_PER_APPOINTMENT;
		const estimatedTime = new Date(
			Date.now() + waitMinutes * 60 * 1000,
		).toISOString();

		return {
			queueNumber: apt.queueNumber || index + 1,
			appointment: {
				id: String(apt._id),
				appointmentNumber: apt.appointmentNumber,
				type: apt.type,
				priority: apt.priority,
			},
			patient: {
				id: apt.patientId,
				patientId: patient?.patientId || "",
				firstName: patient?.firstName || "",
				lastName: patient?.lastName || "",
			},
			checkedInAt: apt.checkedInAt?.toISOString() || "",
			estimatedTime,
			status: apt.status === "IN_PROGRESS" ? "IN_PROGRESS" : "WAITING",
		};
	});

	logger.info(
		{ queueLength: queue.length, currentNumber: result.currentNumber },
		"Queue retrieved successfully",
	);

	return {
		queue,
		currentNumber: result.currentNumber,
		totalWaiting: result.totalWaiting,
	};
}
