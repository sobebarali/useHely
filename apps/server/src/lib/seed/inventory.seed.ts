import { Inventory, Medicine, Organization } from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import { createServiceLogger } from "../logger";

const logger = createServiceLogger("inventorySeed");

/**
 * Generate a batch number
 */
function generateBatchNumber(index: number): string {
	const year = new Date().getFullYear();
	return `BATCH-${year}-${String(index + 1).padStart(4, "0")}`;
}

/**
 * Generate expiry date (6-24 months from now)
 */
function generateExpiryDate(): Date {
	const now = new Date();
	const monthsAhead = Math.floor(Math.random() * 18) + 6; // 6-24 months
	return new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1);
}

/**
 * Seed inventory for a tenant
 */
export async function seedInventory({
	tenantId,
}: {
	tenantId: string;
}): Promise<number> {
	logger.info({ tenantId }, "Seeding inventory");

	// Get all medicines for this tenant
	const medicines = await Medicine.find({ tenantId, isActive: true });

	if (medicines.length === 0) {
		logger.warn({ tenantId }, "No medicines found, skipping inventory");
		return 0;
	}

	let count = 0;

	for (let i = 0; i < medicines.length; i++) {
		const medicine = medicines[i];
		if (!medicine) continue;

		// Check if inventory already exists
		const existing = await Inventory.findOne({
			tenantId,
			medicineId: String(medicine._id),
		});

		if (existing) {
			logger.debug(
				{ medicineId: medicine._id },
				"Inventory already exists, skipping",
			);
			continue;
		}

		const inventoryId = uuidv4();
		const baseQuantity = Math.floor(Math.random() * 200) + 50; // 50-250 units

		await Inventory.create({
			_id: inventoryId,
			tenantId,
			medicineId: String(medicine._id),
			currentStock: baseQuantity,
			reorderLevel: 20,
			maxStock: 500,
			location: "Pharmacy Store A",
			batches: [
				{
					batchNumber: generateBatchNumber(i),
					quantity: baseQuantity,
					expiryDate: generateExpiryDate(),
					purchasePrice: Math.floor(Math.random() * 50) + 10, // $10-60
					receivedDate: new Date(),
					supplier: "MedSupply Corp",
				},
			],
			lastRestocked: new Date(),
		});

		count++;
	}

	logger.info({ tenantId, count }, "Inventory seeded");
	return count;
}

/**
 * Seed inventory for all organizations
 */
export async function seedAllInventory(): Promise<number> {
	logger.info("Starting inventory seed for all organizations");

	const orgs = await Organization.find({ status: "ACTIVE" });
	let totalCount = 0;

	for (const org of orgs) {
		const count = await seedInventory({ tenantId: String(org._id) });
		totalCount += count;
	}

	logger.info({ totalCount }, "All inventory seeded");
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
		const count = await seedAllInventory();
		console.log(`\nInventory seed completed: ${count} records created`);
	} finally {
		await mongoose.disconnect();
		console.log("Disconnected from database");
	}
}

const isMainModule = process.argv[1]?.endsWith("inventory.seed.ts");
if (isMainModule) {
	main()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error("Seed failed:", error);
			process.exit(1);
		});
}
