import {
	GlucoseTiming,
	GlucoseUnit,
	HeightUnit,
	Organization,
	Patient,
	Role,
	Staff,
	TemperatureUnit,
	Vitals,
	WeightUnit,
} from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import { createServiceLogger } from "../logger";

const logger = createServiceLogger("vitalsSeed");

/**
 * Generate random vitals within normal ranges
 */
function generateRandomVitals() {
	return {
		temperature: {
			value: 36.5 + Math.random() * 1.5, // 36.5-38°C
			unit: TemperatureUnit.CELSIUS,
		},
		bloodPressure: {
			systolic: 110 + Math.floor(Math.random() * 30), // 110-140
			diastolic: 70 + Math.floor(Math.random() * 20), // 70-90
		},
		heartRate: 60 + Math.floor(Math.random() * 40), // 60-100 bpm
		respiratoryRate: 12 + Math.floor(Math.random() * 8), // 12-20
		oxygenSaturation: 95 + Math.floor(Math.random() * 5), // 95-100%
		weight: {
			value: 50 + Math.floor(Math.random() * 50), // 50-100 kg
			unit: WeightUnit.KG,
		},
		height: {
			value: 150 + Math.floor(Math.random() * 40), // 150-190 cm
			unit: HeightUnit.CM,
		},
		bloodGlucose: {
			value: 80 + Math.floor(Math.random() * 40), // 80-120 mg/dL
			unit: GlucoseUnit.MG_DL,
			timing: GlucoseTiming.FASTING,
		},
		painLevel: Math.floor(Math.random() * 4), // 0-3 (low)
	};
}

/**
 * Seed vitals for a tenant
 */
export async function seedVitals({
	tenantId,
}: {
	tenantId: string;
}): Promise<number> {
	logger.info({ tenantId }, "Seeding vitals");

	// Get nurse for recording
	const nurseRole = await Role.findOne({ tenantId, name: "NURSE" });
	const nurse = nurseRole
		? await Staff.findOne({ tenantId, roles: nurseRole._id })
		: await Staff.findOne({ tenantId });

	if (!nurse) {
		logger.warn({ tenantId }, "Nurse not found, skipping vitals");
		return 0;
	}

	// Get patients
	const patients = await Patient.find({ tenantId }).limit(20);

	if (patients.length === 0) {
		logger.warn({ tenantId }, "No patients found, skipping vitals");
		return 0;
	}

	let count = 0;

	for (let i = 0; i < 20; i++) {
		const patient = patients[i % patients.length];
		if (!patient) continue;

		// Check if vitals already exist for this patient
		const existingCount = await Vitals.countDocuments({
			tenantId,
			patientId: String(patient._id),
		});

		if (existingCount >= 2) {
			logger.debug(
				{ patientId: patient._id },
				"Patient already has vitals, skipping",
			);
			continue;
		}

		const vitalsData = generateRandomVitals();
		const id = uuidv4();

		// Calculate BMI
		const heightInMeters = (vitalsData.height.value as number) / 100;
		const bmi =
			(vitalsData.weight.value as number) / (heightInMeters * heightInMeters);

		// Record time (spread over last 7 days)
		const recordedAt = new Date();
		recordedAt.setDate(recordedAt.getDate() - (i % 7));
		recordedAt.setHours(9 + (i % 8), 0, 0, 0);

		await Vitals.create({
			_id: id,
			tenantId,
			patientId: String(patient._id),
			temperature: vitalsData.temperature,
			bloodPressure: vitalsData.bloodPressure,
			heartRate: vitalsData.heartRate,
			respiratoryRate: vitalsData.respiratoryRate,
			oxygenSaturation: vitalsData.oxygenSaturation,
			weight: vitalsData.weight,
			height: vitalsData.height,
			bmi: Math.round(bmi * 10) / 10,
			bloodGlucose: vitalsData.bloodGlucose,
			painLevel: vitalsData.painLevel,
			notes: "Routine vitals check",
			recordedBy: String(nurse._id),
			recordedAt,
			createdAt: recordedAt,
			updatedAt: recordedAt,
		});

		count++;
	}

	logger.info({ tenantId, count }, "Vitals seeded");
	return count;
}

/**
 * Seed vitals for all organizations
 */
export async function seedAllVitals(): Promise<number> {
	logger.info("Starting vitals seed for all organizations");

	const orgs = await Organization.find({ status: "ACTIVE" });
	let totalCount = 0;

	for (const org of orgs) {
		const count = await seedVitals({ tenantId: String(org._id) });
		totalCount += count;
	}

	logger.info({ totalCount }, "All vitals seeded");
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
		const count = await seedAllVitals();
		console.log(`\nVitals seed completed: ${count} records created`);
	} finally {
		await mongoose.disconnect();
		console.log("Disconnected from database");
	}
}

const isMainModule = process.argv[1]?.endsWith("vitals.seed.ts");
if (isMainModule) {
	main()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error("Seed failed:", error);
			process.exit(1);
		});
}
