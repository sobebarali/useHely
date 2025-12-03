import {
	Admission,
	AdmissionStatus,
	Counter,
	Department,
	DischargeType,
	Organization,
	Patient,
	PatientType,
	Role,
	Staff,
} from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import { createServiceLogger } from "../logger";

const logger = createServiceLogger("admissionsSeed");

interface CounterModel {
	getNextSequence(tenantId: string, type: string): Promise<number>;
}

const ADMISSION_REASONS = [
	"Pneumonia requiring IV antibiotics",
	"Uncontrolled diabetes",
	"Severe dehydration",
	"Post-surgical observation",
	"Cardiac monitoring",
];

const WARDS = [
	"General Ward A",
	"General Ward B",
	"ICU",
	"CCU",
	"Private Room",
];

/**
 * Seed admissions for a tenant
 */
export async function seedAdmissions({
	tenantId,
}: {
	tenantId: string;
}): Promise<number> {
	logger.info({ tenantId }, "Seeding admissions");

	// Get department
	const department = await Department.findOne({ tenantId, code: "GEN" });
	if (!department) {
		logger.warn({ tenantId }, "Department not found, skipping admissions");
		return 0;
	}

	// Get doctor
	const doctorRole = await Role.findOne({ tenantId, name: "DOCTOR" });
	const doctor = doctorRole
		? await Staff.findOne({ tenantId, roles: doctorRole._id })
		: await Staff.findOne({ tenantId });

	if (!doctor) {
		logger.warn({ tenantId }, "Doctor not found, skipping admissions");
		return 0;
	}

	// Get IPD patients
	const patients = await Patient.find({
		tenantId,
		patientType: PatientType.IPD,
	}).limit(5);

	if (patients.length === 0) {
		logger.warn({ tenantId }, "No IPD patients found, skipping admissions");
		return 0;
	}

	let count = 0;

	// Status distribution: 3 admitted, 2 discharged
	const statusDistribution = [
		AdmissionStatus.ADMITTED,
		AdmissionStatus.ADMITTED,
		AdmissionStatus.ADMITTED,
		AdmissionStatus.DISCHARGED,
		AdmissionStatus.DISCHARGED,
	];

	for (let i = 0; i < 5; i++) {
		const patient = patients[i % patients.length];
		const status = statusDistribution[i];

		if (!patient) continue;

		// Check if admission already exists for this patient
		const existing = await Admission.findOne({
			tenantId,
			patientId: String(patient._id),
			status: AdmissionStatus.ADMITTED,
		});

		if (existing) {
			logger.debug(
				{ patientId: patient._id },
				"Patient already admitted, skipping",
			);
			continue;
		}

		// Get admission number
		const seq = await (Counter as unknown as CounterModel).getNextSequence(
			tenantId,
			"admission",
		);
		const admissionNumber = `ADM-${String(seq).padStart(6, "0")}`;

		const id = uuidv4();

		// Calculate dates
		const admissionDate = new Date();
		admissionDate.setDate(admissionDate.getDate() - (i + 1) * 2); // 2, 4, 6, 8, 10 days ago

		const admissionData: Record<string, unknown> = {
			_id: id,
			tenantId,
			admissionNumber,
			patientId: String(patient._id),
			doctorId: String(doctor._id),
			departmentId: String(department._id),
			admissionDate,
			bedNumber: `B-${100 + i}`,
			roomNumber: `R-${10 + i}`,
			ward: WARDS[i % WARDS.length],
			admissionReason: ADMISSION_REASONS[i % ADMISSION_REASONS.length],
			provisionalDiagnosis: ADMISSION_REASONS[i % ADMISSION_REASONS.length],
			status,
			notes: "Patient stable, under observation",
			admittedBy: String(doctor._id),
			createdAt: admissionDate,
			updatedAt: new Date(),
		};

		// Add discharge info for discharged patients
		if (status === AdmissionStatus.DISCHARGED) {
			const dischargeDate = new Date(admissionDate);
			dischargeDate.setDate(admissionDate.getDate() + 3); // 3 days stay

			admissionData.dischargeDate = dischargeDate;
			admissionData.dischargeType = DischargeType.NORMAL;
			admissionData.finalDiagnosis =
				ADMISSION_REASONS[i % ADMISSION_REASONS.length];
			admissionData.dischargeSummary =
				"Patient recovered well. Follow up in 1 week.";
			admissionData.dischargedBy = String(doctor._id);
		}

		await Admission.create(admissionData);
		count++;
	}

	logger.info({ tenantId, count }, "Admissions seeded");
	return count;
}

/**
 * Seed admissions for all organizations
 */
export async function seedAllAdmissions(): Promise<number> {
	logger.info("Starting admissions seed for all organizations");

	const orgs = await Organization.find({ status: "ACTIVE" });
	let totalCount = 0;

	for (const org of orgs) {
		const count = await seedAdmissions({ tenantId: String(org._id) });
		totalCount += count;
	}

	logger.info({ totalCount }, "All admissions seeded");
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
		const count = await seedAllAdmissions();
		console.log(`\nAdmissions seed completed: ${count} admissions created`);
	} finally {
		await mongoose.disconnect();
		console.log("Disconnected from database");
	}
}

const isMainModule = process.argv[1]?.endsWith("admissions.seed.ts");
if (isMainModule) {
	main()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error("Seed failed:", error);
			process.exit(1);
		});
}
