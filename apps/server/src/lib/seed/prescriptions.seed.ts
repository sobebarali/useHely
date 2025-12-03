import {
	Appointment,
	AppointmentStatus,
	Counter,
	Medicine,
	Organization,
	Patient,
	PatientType,
	Prescription,
	PrescriptionStatus,
	Role,
	Staff,
} from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import { createServiceLogger } from "../logger";

const logger = createServiceLogger("prescriptionsSeed");

interface CounterModel {
	getNextSequence(tenantId: string, type: string): Promise<number>;
}

const DIAGNOSES = [
	"Upper respiratory tract infection",
	"Hypertension",
	"Type 2 Diabetes Mellitus",
	"Gastroesophageal reflux disease",
	"Allergic rhinitis",
	"Tension headache",
	"Lower back pain",
	"Urinary tract infection",
	"Bronchitis",
	"Dermatitis",
];

const FREQUENCIES = [
	"Once daily",
	"Twice daily",
	"Three times daily",
	"Every 8 hours",
	"As needed",
];
const DURATIONS = ["5 days", "7 days", "10 days", "14 days", "30 days"];
const ROUTES = ["Oral", "Topical", "Inhalation", "Injection"];

/**
 * Seed prescriptions for a tenant
 */
export async function seedPrescriptions({
	tenantId,
}: {
	tenantId: string;
}): Promise<number> {
	logger.info({ tenantId }, "Seeding prescriptions");

	// Get doctor
	const doctorRole = await Role.findOne({ tenantId, name: "DOCTOR" });
	const doctor = doctorRole
		? await Staff.findOne({ tenantId, roles: doctorRole._id })
		: await Staff.findOne({ tenantId });

	if (!doctor) {
		logger.warn({ tenantId }, "Doctor not found, skipping prescriptions");
		return 0;
	}

	// Get medicines
	const medicines = await Medicine.find({ tenantId, isActive: true }).limit(20);
	if (medicines.length === 0) {
		logger.warn({ tenantId }, "No medicines found, skipping prescriptions");
		return 0;
	}

	// Get completed appointments
	const appointments = await Appointment.find({
		tenantId,
		status: AppointmentStatus.COMPLETED,
	}).limit(10);

	// Get patients
	const patients = await Patient.find({
		tenantId,
		patientType: PatientType.OPD,
	}).limit(10);

	if (patients.length === 0) {
		logger.warn({ tenantId }, "No patients found, skipping prescriptions");
		return 0;
	}

	let count = 0;

	// Status distribution: 3 pending, 4 dispensed, 3 completed
	const statusDistribution = [
		...Array(3).fill(PrescriptionStatus.PENDING),
		...Array(4).fill(PrescriptionStatus.DISPENSED),
		...Array(3).fill(PrescriptionStatus.COMPLETED),
	];

	for (let i = 0; i < 10; i++) {
		const patient = patients[i % patients.length];
		const appointment = appointments[i % Math.max(appointments.length, 1)];
		const status = statusDistribution[i] as string;

		if (!patient) continue;

		// Check if prescription already exists for this patient
		const existingCount = await Prescription.countDocuments({
			tenantId,
			patientId: String(patient._id),
		});

		if (existingCount >= 2) {
			logger.debug(
				{ patientId: patient._id },
				"Patient already has prescriptions, skipping",
			);
			continue;
		}

		// Get prescription number
		const seq = await (Counter as unknown as CounterModel).getNextSequence(
			tenantId,
			"prescription",
		);
		const prescriptionId = `RX-${String(seq).padStart(6, "0")}`;

		const id = uuidv4();

		// Select 2-4 random medicines
		const numMedicines = Math.floor(Math.random() * 3) + 2;
		const selectedMedicines = [];
		const usedIndices = new Set<number>();

		for (let j = 0; j < numMedicines && j < medicines.length; j++) {
			let idx = Math.floor(Math.random() * medicines.length);
			while (usedIndices.has(idx)) {
				idx = (idx + 1) % medicines.length;
			}
			usedIndices.add(idx);

			const medicine = medicines[idx];
			if (!medicine) continue;

			selectedMedicines.push({
				_id: uuidv4(),
				medicineId: String(medicine._id),
				name: medicine.name,
				genericName: medicine.genericName,
				dosage: medicine.strength || "As directed",
				frequency: FREQUENCIES[j % FREQUENCIES.length],
				duration: DURATIONS[j % DURATIONS.length],
				route: ROUTES[j % ROUTES.length],
				quantity: Math.floor(Math.random() * 20) + 10,
				instructions: "Take as directed by physician",
				dispensed: status !== PrescriptionStatus.PENDING,
				dispensedQuantity:
					status !== PrescriptionStatus.PENDING
						? Math.floor(Math.random() * 20) + 10
						: 0,
			});
		}

		await Prescription.create({
			_id: id,
			tenantId,
			prescriptionId,
			patientId: String(patient._id),
			doctorId: String(doctor._id),
			appointmentId: appointment ? String(appointment._id) : undefined,
			diagnosis: DIAGNOSES[i % DIAGNOSES.length],
			notes: "Patient advised to follow up if symptoms persist",
			medicines: selectedMedicines,
			status,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		count++;
	}

	logger.info({ tenantId, count }, "Prescriptions seeded");
	return count;
}

/**
 * Seed prescriptions for all organizations
 */
export async function seedAllPrescriptions(): Promise<number> {
	logger.info("Starting prescriptions seed for all organizations");

	const orgs = await Organization.find({ status: "ACTIVE" });
	let totalCount = 0;

	for (const org of orgs) {
		const count = await seedPrescriptions({ tenantId: String(org._id) });
		totalCount += count;
	}

	logger.info({ totalCount }, "All prescriptions seeded");
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
		const count = await seedAllPrescriptions();
		console.log(
			`\nPrescriptions seed completed: ${count} prescriptions created`,
		);
	} finally {
		await mongoose.disconnect();
		console.log("Disconnected from database");
	}
}

const isMainModule = process.argv[1]?.endsWith("prescriptions.seed.ts");
if (isMainModule) {
	main()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error("Seed failed:", error);
			process.exit(1);
		});
}
