import {
	Appointment,
	AppointmentPriority,
	AppointmentStatus,
	AppointmentType,
	Counter,
	Department,
	Organization,
	Patient,
	PatientType,
	Role,
	Staff,
} from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import { createServiceLogger } from "../logger";

const logger = createServiceLogger("appointmentsSeed");

interface CounterModel {
	getNextSequence(tenantId: string, type: string): Promise<number>;
}

const TIME_SLOTS = [
	{ start: "09:00", end: "09:30" },
	{ start: "09:30", end: "10:00" },
	{ start: "10:00", end: "10:30" },
	{ start: "10:30", end: "11:00" },
	{ start: "11:00", end: "11:30" },
	{ start: "11:30", end: "12:00" },
	{ start: "14:00", end: "14:30" },
	{ start: "14:30", end: "15:00" },
	{ start: "15:00", end: "15:30" },
	{ start: "15:30", end: "16:00" },
];

const REASONS = [
	"General checkup",
	"Follow-up visit",
	"Fever and cold",
	"Back pain",
	"Headache",
	"Routine examination",
	"Blood pressure check",
	"Diabetes follow-up",
	"Skin rash",
	"Stomach pain",
];

/**
 * Seed appointments for a tenant
 */
export async function seedAppointments({
	tenantId,
}: {
	tenantId: string;
}): Promise<number> {
	logger.info({ tenantId }, "Seeding appointments");

	// Get department
	const department = await Department.findOne({ tenantId, code: "GEN" });
	if (!department) {
		logger.warn({ tenantId }, "Department not found, skipping appointments");
		return 0;
	}

	// Get doctor (find staff with DOCTOR role)
	const doctorRole = await Role.findOne({ tenantId, name: "DOCTOR" });
	const doctor = doctorRole
		? await Staff.findOne({ tenantId, roles: doctorRole._id })
		: await Staff.findOne({ tenantId });

	if (!doctor) {
		logger.warn({ tenantId }, "Doctor not found, skipping appointments");
		return 0;
	}

	// Get receptionist for createdBy
	const receptionistRole = await Role.findOne({
		tenantId,
		name: "RECEPTIONIST",
	});
	const receptionist = receptionistRole
		? await Staff.findOne({ tenantId, roles: receptionistRole._id })
		: doctor;

	// Get OPD patients
	const patients = await Patient.find({
		tenantId,
		patientType: PatientType.OPD,
	}).limit(20);

	if (patients.length === 0) {
		logger.warn({ tenantId }, "No OPD patients found, skipping appointments");
		return 0;
	}

	let count = 0;
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	// Status distribution: 5 scheduled, 10 completed, 3 cancelled, 2 no-show
	const statusDistribution = [
		...Array(5).fill(AppointmentStatus.SCHEDULED),
		...Array(10).fill(AppointmentStatus.COMPLETED),
		...Array(3).fill(AppointmentStatus.CANCELLED),
		...Array(2).fill(AppointmentStatus.NO_SHOW),
	];

	for (let i = 0; i < 20; i++) {
		const patient = patients[i % patients.length];
		if (!patient) continue;

		const status = statusDistribution[i] as string;
		const timeSlot = TIME_SLOTS[i % TIME_SLOTS.length];

		// Check if appointment already exists for this patient on this slot
		const existing = await Appointment.findOne({
			tenantId,
			patientId: String(patient._id),
			"timeSlot.start": timeSlot?.start,
		});

		if (existing) {
			logger.debug(
				{ patientId: patient._id },
				"Appointment already exists, skipping",
			);
			continue;
		}

		// Get appointment number
		const seq = await (Counter as unknown as CounterModel).getNextSequence(
			tenantId,
			"appointment",
		);
		const appointmentNumber = `APT-${String(seq).padStart(6, "0")}`;

		const appointmentId = uuidv4();

		// Calculate date based on status
		let appointmentDate: Date;
		if (status === AppointmentStatus.SCHEDULED) {
			// Future appointments (1-7 days from now)
			appointmentDate = new Date(today);
			appointmentDate.setDate(today.getDate() + 1 + (i % 7));
		} else {
			// Past appointments (1-14 days ago)
			appointmentDate = new Date(today);
			appointmentDate.setDate(today.getDate() - 1 - (i % 14));
		}

		const appointmentData: Record<string, unknown> = {
			_id: appointmentId,
			tenantId,
			appointmentNumber,
			patientId: String(patient._id),
			doctorId: String(doctor._id),
			departmentId: String(department._id),
			date: appointmentDate,
			timeSlot,
			type:
				i % 3 === 0 ? AppointmentType.FOLLOW_UP : AppointmentType.CONSULTATION,
			priority:
				i % 5 === 0 ? AppointmentPriority.URGENT : AppointmentPriority.NORMAL,
			reason: REASONS[i % REASONS.length],
			status,
			queueNumber: i + 1,
			createdBy: receptionist ? String(receptionist._id) : String(doctor._id),
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		// Add status-specific fields
		if (status === AppointmentStatus.COMPLETED) {
			appointmentData.checkedInAt = new Date(appointmentDate);
			appointmentData.completedAt = new Date(appointmentDate);
		} else if (status === AppointmentStatus.CANCELLED) {
			appointmentData.cancelledAt = new Date(appointmentDate);
			appointmentData.cancelledBy = receptionist
				? String(receptionist._id)
				: String(doctor._id);
			appointmentData.cancellationReason = "Patient requested cancellation";
		}

		await Appointment.create(appointmentData);
		count++;
	}

	logger.info({ tenantId, count }, "Appointments seeded");
	return count;
}

/**
 * Seed appointments for all organizations
 */
export async function seedAllAppointments(): Promise<number> {
	logger.info("Starting appointments seed for all organizations");

	const orgs = await Organization.find({ status: "ACTIVE" });
	let totalCount = 0;

	for (const org of orgs) {
		const count = await seedAppointments({ tenantId: String(org._id) });
		totalCount += count;
	}

	logger.info({ totalCount }, "All appointments seeded");
	return totalCount;
}

/**
 * Main function for standalone execution
 */
async function main(): Promise<void> {
	const dotenv = await import("dotenv");
	dotenv.config();

	const { connectDB, mongoose } = await import("@hms/db");
	await connectDB();

	console.log("Connected to database");

	try {
		const count = await seedAllAppointments();
		console.log(`\nAppointments seed completed: ${count} appointments created`);
	} finally {
		await mongoose.disconnect();
		console.log("Disconnected from database");
	}
}

const isMainModule = process.argv[1]?.endsWith("appointments.seed.ts");
if (isMainModule) {
	main()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error("Seed failed:", error);
			process.exit(1);
		});
}
