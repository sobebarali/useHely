import {
	Dispensing,
	DispensingStatus,
	Inventory,
	MedicineDispensingStatus,
	Organization,
	Prescription,
	PrescriptionStatus,
	Role,
	Staff,
} from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import { createServiceLogger } from "../logger";

const logger = createServiceLogger("dispensingSeed");

/**
 * Seed dispensing records for a tenant
 */
export async function seedDispensing({
	tenantId,
}: {
	tenantId: string;
}): Promise<number> {
	logger.info({ tenantId }, "Seeding dispensing records");

	// Get pharmacist
	const pharmacistRole = await Role.findOne({ tenantId, name: "PHARMACIST" });
	const pharmacist = pharmacistRole
		? await Staff.findOne({ tenantId, roles: pharmacistRole._id })
		: await Staff.findOne({ tenantId });

	if (!pharmacist) {
		logger.warn({ tenantId }, "Pharmacist not found, skipping dispensing");
		return 0;
	}

	// Get prescriptions that need dispensing
	const prescriptions = await Prescription.find({
		tenantId,
		status: {
			$in: [
				PrescriptionStatus.PENDING,
				PrescriptionStatus.DISPENSED,
				PrescriptionStatus.COMPLETED,
			],
		},
	}).limit(10);

	if (prescriptions.length === 0) {
		logger.warn({ tenantId }, "No prescriptions found, skipping dispensing");
		return 0;
	}

	let count = 0;

	// Status distribution: 3 pending, 5 dispensed, 2 collected
	const statusDistribution = [
		DispensingStatus.PENDING,
		DispensingStatus.PENDING,
		DispensingStatus.PENDING,
		DispensingStatus.DISPENSED,
		DispensingStatus.DISPENSED,
		DispensingStatus.DISPENSED,
		DispensingStatus.DISPENSED,
		DispensingStatus.DISPENSED,
		DispensingStatus.COLLECTED,
		DispensingStatus.COLLECTED,
	];

	for (let i = 0; i < prescriptions.length; i++) {
		const prescription = prescriptions[i];
		const status = statusDistribution[i % statusDistribution.length];

		if (!prescription) continue;

		// Check if dispensing already exists for this prescription
		const existing = await Dispensing.findOne({
			tenantId,
			prescriptionId: String(prescription._id),
		});

		if (existing) {
			logger.debug(
				{ prescriptionId: prescription._id },
				"Dispensing already exists, skipping",
			);
			continue;
		}

		const id = uuidv4();

		// Build medicines array from prescription
		const prescriptionMedicines = prescription.medicines || [];
		const dispensingMedicines = [];

		for (const med of prescriptionMedicines) {
			// Cast to access properties
			const medObj = med as unknown as {
				medicineId?: string;
				quantity?: number;
			};

			// Get inventory for batch info
			const inventory = await Inventory.findOne({
				tenantId,
				medicineId: medObj.medicineId,
			});

			// Cast batch to access properties
			const batch = inventory?.batches?.[0] as unknown as
				| {
						batchNumber?: string;
						expiryDate?: Date;
				  }
				| undefined;

			const medStatus =
				status === DispensingStatus.PENDING
					? MedicineDispensingStatus.PENDING
					: MedicineDispensingStatus.DISPENSED;

			dispensingMedicines.push({
				medicineId: medObj.medicineId || "",
				dispensedQuantity:
					status === DispensingStatus.PENDING ? 0 : medObj.quantity || 10,
				batchNumber: batch?.batchNumber || "BATCH-DEFAULT",
				expiryDate:
					batch?.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
				substituted: false,
				status: medStatus,
			});
		}

		const dispensingData: Record<string, unknown> = {
			_id: id,
			tenantId,
			prescriptionId: String(prescription._id),
			status,
			assignedTo: String(pharmacist._id),
			medicines: dispensingMedicines,
			patientCounseled: status === DispensingStatus.COLLECTED,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		// Add timestamps based on status
		if (status !== DispensingStatus.PENDING) {
			dispensingData.startedAt = new Date();
		}
		if (
			status === DispensingStatus.DISPENSED ||
			status === DispensingStatus.COLLECTED
		) {
			dispensingData.completedAt = new Date();
		}
		if (status === DispensingStatus.COLLECTED) {
			dispensingData.collectedAt = new Date();
			dispensingData.notes = "Patient counseled on medication usage";
		}

		await Dispensing.create(dispensingData);
		count++;
	}

	logger.info({ tenantId, count }, "Dispensing records seeded");
	return count;
}

/**
 * Seed dispensing for all organizations
 */
export async function seedAllDispensing(): Promise<number> {
	logger.info("Starting dispensing seed for all organizations");

	const orgs = await Organization.find({ status: "ACTIVE" });
	let totalCount = 0;

	for (const org of orgs) {
		const count = await seedDispensing({ tenantId: String(org._id) });
		totalCount += count;
	}

	logger.info({ totalCount }, "All dispensing records seeded");
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
		const count = await seedAllDispensing();
		console.log(`\nDispensing seed completed: ${count} records created`);
	} finally {
		await mongoose.disconnect();
		console.log("Disconnected from database");
	}
}

const isMainModule = process.argv[1]?.endsWith("dispensing.seed.ts");
if (isMainModule) {
	main()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error("Seed failed:", error);
			process.exit(1);
		});
}
