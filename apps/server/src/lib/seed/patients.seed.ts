import {
	Counter,
	Department,
	Gender,
	Organization,
	Patient,
	PatientStatus,
	PatientType,
	Staff,
} from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import { createServiceLogger } from "../logger";

const logger = createServiceLogger("patientsSeed");

interface CounterModel {
	getNextSequence(tenantId: string, type: string): Promise<number>;
}

// Patient name configurations
const FIRST_NAMES_MALE = [
	"James",
	"John",
	"Robert",
	"Michael",
	"William",
	"David",
	"Richard",
	"Joseph",
	"Thomas",
	"Charles",
	"Daniel",
	"Matthew",
	"Anthony",
	"Mark",
	"Steven",
];
const FIRST_NAMES_FEMALE = [
	"Mary",
	"Patricia",
	"Jennifer",
	"Linda",
	"Barbara",
	"Elizabeth",
	"Susan",
	"Jessica",
	"Sarah",
	"Karen",
	"Lisa",
	"Nancy",
	"Betty",
	"Margaret",
	"Sandra",
];
const LAST_NAMES = [
	"Smith",
	"Johnson",
	"Williams",
	"Brown",
	"Jones",
	"Garcia",
	"Miller",
	"Davis",
	"Rodriguez",
	"Martinez",
	"Wilson",
	"Anderson",
	"Taylor",
	"Thomas",
	"Moore",
	"Jackson",
	"Martin",
	"Lee",
	"Thompson",
	"White",
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

/**
 * Generate a random date of birth (age between 18 and 80)
 */
function randomDOB(): Date {
	const now = new Date();
	const minAge = 18;
	const maxAge = 80;
	const age = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
	const year = now.getFullYear() - age;
	const month = Math.floor(Math.random() * 12);
	const day = Math.floor(Math.random() * 28) + 1;
	return new Date(year, month, day);
}

/**
 * Generate a random phone number
 */
function randomPhone(index: number): string {
	return `+1555${String(index).padStart(4, "0")}${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;
}

/**
 * Seed patients for a tenant
 */
export async function seedPatients({
	tenantId,
}: {
	tenantId: string;
}): Promise<number> {
	logger.info({ tenantId }, "Seeding patients");

	// Get department (General Medicine)
	const department = await Department.findOne({ tenantId, code: "GEN" });
	if (!department) {
		logger.warn(
			{ tenantId },
			"General Medicine department not found, skipping patients",
		);
		return 0;
	}

	// Get doctor staff
	const doctor = await Staff.findOne({ tenantId })
		.populate("roles")
		.then((staff) => {
			if (staff) return staff;
			return null;
		});

	let count = 0;
	const totalPatients = 30;
	const opdCount = 20;

	for (let i = 0; i < totalPatients; i++) {
		const isMale = i % 2 === 0;
		const gender = isMale ? Gender.MALE : Gender.FEMALE;
		const firstNames = isMale ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE;
		const firstName = firstNames[i % firstNames.length] as string;
		const lastName = LAST_NAMES[i % LAST_NAMES.length] as string;
		const patientType = i < opdCount ? PatientType.OPD : PatientType.IPD;

		// Check if patient already exists by name combination
		const existingPatient = await Patient.findOne({
			tenantId,
			firstName,
			lastName,
		});

		if (existingPatient) {
			logger.debug({ firstName, lastName }, "Patient already exists, skipping");
			continue;
		}

		// Get patient ID
		const seq = await (Counter as unknown as CounterModel).getNextSequence(
			tenantId,
			"patient",
		);
		const patientId = `PAT-${String(seq).padStart(6, "0")}`;

		const id = uuidv4();

		await Patient.create({
			_id: id,
			tenantId,
			patientId,
			firstName,
			lastName,
			dateOfBirth: randomDOB(),
			gender,
			bloodGroup: BLOOD_GROUPS[i % BLOOD_GROUPS.length],
			phone: randomPhone(i + 1),
			email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
			address: {
				street: `${100 + i} Main Street`,
				city: "Medical City",
				state: "MC",
				postalCode: `${10000 + i}`,
				country: "USA",
			},
			emergencyContact: {
				name: `Emergency Contact ${i + 1}`,
				relationship: i % 2 === 0 ? "Spouse" : "Parent",
				phone: randomPhone(1000 + i),
			},
			patientType,
			departmentId: String(department._id),
			assignedDoctorId: doctor ? String(doctor._id) : undefined,
			status: PatientStatus.ACTIVE,
		});

		count++;
		logger.debug(
			{ patientId, firstName, lastName, patientType },
			"Patient created",
		);
	}

	logger.info({ tenantId, count }, "Patients seeded");
	return count;
}

/**
 * Seed patients for all organizations
 */
export async function seedAllPatients(): Promise<number> {
	logger.info("Starting patients seed for all organizations");

	const orgs = await Organization.find({ status: "ACTIVE" });
	let totalCount = 0;

	for (const org of orgs) {
		const count = await seedPatients({ tenantId: String(org._id) });
		totalCount += count;
	}

	logger.info({ totalCount }, "All patients seeded");
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
		const count = await seedAllPatients();
		console.log(`\nPatients seed completed: ${count} patients created`);
	} finally {
		await mongoose.disconnect();
		console.log("Disconnected from database");
	}
}

const isMainModule = process.argv[1]?.endsWith("patients.seed.ts");
if (isMainModule) {
	main()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error("Seed failed:", error);
			process.exit(1);
		});
}
