import {
	Medicine,
	MedicineCategory,
	MedicineType,
	Organization,
} from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import { createServiceLogger } from "../logger";

const logger = createServiceLogger("medicinesSeed");

// Medicine configurations - 50 common medicines across categories
const MEDICINES_CONFIG = [
	// ANALGESICS (6)
	{
		name: "Paracetamol 500mg",
		genericName: "Acetaminophen",
		code: "MED001",
		category: MedicineCategory.ANALGESICS,
		type: MedicineType.TABLET,
		strength: "500mg",
		unit: "tablet",
	},
	{
		name: "Ibuprofen 400mg",
		genericName: "Ibuprofen",
		code: "MED002",
		category: MedicineCategory.ANALGESICS,
		type: MedicineType.TABLET,
		strength: "400mg",
		unit: "tablet",
	},
	{
		name: "Aspirin 300mg",
		genericName: "Acetylsalicylic Acid",
		code: "MED003",
		category: MedicineCategory.ANALGESICS,
		type: MedicineType.TABLET,
		strength: "300mg",
		unit: "tablet",
	},
	{
		name: "Diclofenac 50mg",
		genericName: "Diclofenac Sodium",
		code: "MED004",
		category: MedicineCategory.ANALGESICS,
		type: MedicineType.TABLET,
		strength: "50mg",
		unit: "tablet",
	},
	{
		name: "Tramadol 50mg",
		genericName: "Tramadol HCl",
		code: "MED005",
		category: MedicineCategory.ANALGESICS,
		type: MedicineType.CAPSULE,
		strength: "50mg",
		unit: "capsule",
	},
	{
		name: "Naproxen 500mg",
		genericName: "Naproxen",
		code: "MED006",
		category: MedicineCategory.ANALGESICS,
		type: MedicineType.TABLET,
		strength: "500mg",
		unit: "tablet",
	},

	// ANTIBIOTICS (8)
	{
		name: "Amoxicillin 500mg",
		genericName: "Amoxicillin",
		code: "MED007",
		category: MedicineCategory.ANTIBIOTICS,
		type: MedicineType.CAPSULE,
		strength: "500mg",
		unit: "capsule",
	},
	{
		name: "Azithromycin 500mg",
		genericName: "Azithromycin",
		code: "MED008",
		category: MedicineCategory.ANTIBIOTICS,
		type: MedicineType.TABLET,
		strength: "500mg",
		unit: "tablet",
	},
	{
		name: "Ciprofloxacin 500mg",
		genericName: "Ciprofloxacin",
		code: "MED009",
		category: MedicineCategory.ANTIBIOTICS,
		type: MedicineType.TABLET,
		strength: "500mg",
		unit: "tablet",
	},
	{
		name: "Metronidazole 400mg",
		genericName: "Metronidazole",
		code: "MED010",
		category: MedicineCategory.ANTIBIOTICS,
		type: MedicineType.TABLET,
		strength: "400mg",
		unit: "tablet",
	},
	{
		name: "Doxycycline 100mg",
		genericName: "Doxycycline",
		code: "MED011",
		category: MedicineCategory.ANTIBIOTICS,
		type: MedicineType.CAPSULE,
		strength: "100mg",
		unit: "capsule",
	},
	{
		name: "Cephalexin 500mg",
		genericName: "Cephalexin",
		code: "MED012",
		category: MedicineCategory.ANTIBIOTICS,
		type: MedicineType.CAPSULE,
		strength: "500mg",
		unit: "capsule",
	},
	{
		name: "Amoxicillin Syrup",
		genericName: "Amoxicillin",
		code: "MED013",
		category: MedicineCategory.ANTIBIOTICS,
		type: MedicineType.SYRUP,
		strength: "250mg/5ml",
		unit: "ml",
	},
	{
		name: "Ceftriaxone 1g",
		genericName: "Ceftriaxone",
		code: "MED014",
		category: MedicineCategory.ANTIBIOTICS,
		type: MedicineType.INJECTION,
		strength: "1g",
		unit: "vial",
	},

	// ANTIHISTAMINES (4)
	{
		name: "Cetirizine 10mg",
		genericName: "Cetirizine",
		code: "MED015",
		category: MedicineCategory.ANTIHISTAMINES,
		type: MedicineType.TABLET,
		strength: "10mg",
		unit: "tablet",
	},
	{
		name: "Loratadine 10mg",
		genericName: "Loratadine",
		code: "MED016",
		category: MedicineCategory.ANTIHISTAMINES,
		type: MedicineType.TABLET,
		strength: "10mg",
		unit: "tablet",
	},
	{
		name: "Diphenhydramine 25mg",
		genericName: "Diphenhydramine",
		code: "MED017",
		category: MedicineCategory.ANTIHISTAMINES,
		type: MedicineType.CAPSULE,
		strength: "25mg",
		unit: "capsule",
	},
	{
		name: "Chlorpheniramine 4mg",
		genericName: "Chlorpheniramine",
		code: "MED018",
		category: MedicineCategory.ANTIHISTAMINES,
		type: MedicineType.TABLET,
		strength: "4mg",
		unit: "tablet",
	},

	// CARDIOVASCULAR (6)
	{
		name: "Amlodipine 5mg",
		genericName: "Amlodipine",
		code: "MED019",
		category: MedicineCategory.CARDIOVASCULAR,
		type: MedicineType.TABLET,
		strength: "5mg",
		unit: "tablet",
	},
	{
		name: "Metoprolol 50mg",
		genericName: "Metoprolol",
		code: "MED020",
		category: MedicineCategory.CARDIOVASCULAR,
		type: MedicineType.TABLET,
		strength: "50mg",
		unit: "tablet",
	},
	{
		name: "Atenolol 50mg",
		genericName: "Atenolol",
		code: "MED021",
		category: MedicineCategory.CARDIOVASCULAR,
		type: MedicineType.TABLET,
		strength: "50mg",
		unit: "tablet",
	},
	{
		name: "Lisinopril 10mg",
		genericName: "Lisinopril",
		code: "MED022",
		category: MedicineCategory.CARDIOVASCULAR,
		type: MedicineType.TABLET,
		strength: "10mg",
		unit: "tablet",
	},
	{
		name: "Losartan 50mg",
		genericName: "Losartan",
		code: "MED023",
		category: MedicineCategory.CARDIOVASCULAR,
		type: MedicineType.TABLET,
		strength: "50mg",
		unit: "tablet",
	},
	{
		name: "Aspirin 75mg",
		genericName: "Acetylsalicylic Acid",
		code: "MED024",
		category: MedicineCategory.CARDIOVASCULAR,
		type: MedicineType.TABLET,
		strength: "75mg",
		unit: "tablet",
	},

	// ANTIHYPERTENSIVES (4)
	{
		name: "Hydrochlorothiazide 25mg",
		genericName: "Hydrochlorothiazide",
		code: "MED025",
		category: MedicineCategory.ANTIHYPERTENSIVES,
		type: MedicineType.TABLET,
		strength: "25mg",
		unit: "tablet",
	},
	{
		name: "Furosemide 40mg",
		genericName: "Furosemide",
		code: "MED026",
		category: MedicineCategory.ANTIHYPERTENSIVES,
		type: MedicineType.TABLET,
		strength: "40mg",
		unit: "tablet",
	},
	{
		name: "Enalapril 10mg",
		genericName: "Enalapril",
		code: "MED027",
		category: MedicineCategory.ANTIHYPERTENSIVES,
		type: MedicineType.TABLET,
		strength: "10mg",
		unit: "tablet",
	},
	{
		name: "Ramipril 5mg",
		genericName: "Ramipril",
		code: "MED028",
		category: MedicineCategory.ANTIHYPERTENSIVES,
		type: MedicineType.CAPSULE,
		strength: "5mg",
		unit: "capsule",
	},

	// ANTIDIABETICS (5)
	{
		name: "Metformin 500mg",
		genericName: "Metformin",
		code: "MED029",
		category: MedicineCategory.ANTIDIABETICS,
		type: MedicineType.TABLET,
		strength: "500mg",
		unit: "tablet",
	},
	{
		name: "Glipizide 5mg",
		genericName: "Glipizide",
		code: "MED030",
		category: MedicineCategory.ANTIDIABETICS,
		type: MedicineType.TABLET,
		strength: "5mg",
		unit: "tablet",
	},
	{
		name: "Glimepiride 2mg",
		genericName: "Glimepiride",
		code: "MED031",
		category: MedicineCategory.ANTIDIABETICS,
		type: MedicineType.TABLET,
		strength: "2mg",
		unit: "tablet",
	},
	{
		name: "Sitagliptin 100mg",
		genericName: "Sitagliptin",
		code: "MED032",
		category: MedicineCategory.ANTIDIABETICS,
		type: MedicineType.TABLET,
		strength: "100mg",
		unit: "tablet",
	},
	{
		name: "Insulin Regular",
		genericName: "Insulin Human",
		code: "MED033",
		category: MedicineCategory.ANTIDIABETICS,
		type: MedicineType.INJECTION,
		strength: "100IU/ml",
		unit: "vial",
	},

	// GASTROINTESTINAL (6)
	{
		name: "Omeprazole 20mg",
		genericName: "Omeprazole",
		code: "MED034",
		category: MedicineCategory.GASTROINTESTINAL,
		type: MedicineType.CAPSULE,
		strength: "20mg",
		unit: "capsule",
	},
	{
		name: "Pantoprazole 40mg",
		genericName: "Pantoprazole",
		code: "MED035",
		category: MedicineCategory.GASTROINTESTINAL,
		type: MedicineType.TABLET,
		strength: "40mg",
		unit: "tablet",
	},
	{
		name: "Ranitidine 150mg",
		genericName: "Ranitidine",
		code: "MED036",
		category: MedicineCategory.GASTROINTESTINAL,
		type: MedicineType.TABLET,
		strength: "150mg",
		unit: "tablet",
	},
	{
		name: "Ondansetron 4mg",
		genericName: "Ondansetron",
		code: "MED037",
		category: MedicineCategory.GASTROINTESTINAL,
		type: MedicineType.TABLET,
		strength: "4mg",
		unit: "tablet",
	},
	{
		name: "Domperidone 10mg",
		genericName: "Domperidone",
		code: "MED038",
		category: MedicineCategory.GASTROINTESTINAL,
		type: MedicineType.TABLET,
		strength: "10mg",
		unit: "tablet",
	},
	{
		name: "Loperamide 2mg",
		genericName: "Loperamide",
		code: "MED039",
		category: MedicineCategory.GASTROINTESTINAL,
		type: MedicineType.CAPSULE,
		strength: "2mg",
		unit: "capsule",
	},

	// RESPIRATORY (5)
	{
		name: "Salbutamol Inhaler",
		genericName: "Salbutamol",
		code: "MED040",
		category: MedicineCategory.RESPIRATORY,
		type: MedicineType.INHALER,
		strength: "100mcg",
		unit: "puff",
	},
	{
		name: "Montelukast 10mg",
		genericName: "Montelukast",
		code: "MED041",
		category: MedicineCategory.RESPIRATORY,
		type: MedicineType.TABLET,
		strength: "10mg",
		unit: "tablet",
	},
	{
		name: "Theophylline 300mg",
		genericName: "Theophylline",
		code: "MED042",
		category: MedicineCategory.RESPIRATORY,
		type: MedicineType.TABLET,
		strength: "300mg",
		unit: "tablet",
	},
	{
		name: "Ambroxol Syrup",
		genericName: "Ambroxol",
		code: "MED043",
		category: MedicineCategory.RESPIRATORY,
		type: MedicineType.SYRUP,
		strength: "30mg/5ml",
		unit: "ml",
	},
	{
		name: "Dextromethorphan Syrup",
		genericName: "Dextromethorphan",
		code: "MED044",
		category: MedicineCategory.RESPIRATORY,
		type: MedicineType.SYRUP,
		strength: "15mg/5ml",
		unit: "ml",
	},

	// VITAMINS (4)
	{
		name: "Vitamin C 500mg",
		genericName: "Ascorbic Acid",
		code: "MED045",
		category: MedicineCategory.VITAMINS,
		type: MedicineType.TABLET,
		strength: "500mg",
		unit: "tablet",
	},
	{
		name: "Vitamin B12 1000mcg",
		genericName: "Cyanocobalamin",
		code: "MED046",
		category: MedicineCategory.VITAMINS,
		type: MedicineType.TABLET,
		strength: "1000mcg",
		unit: "tablet",
	},
	{
		name: "Vitamin D3 1000IU",
		genericName: "Cholecalciferol",
		code: "MED047",
		category: MedicineCategory.VITAMINS,
		type: MedicineType.CAPSULE,
		strength: "1000IU",
		unit: "capsule",
	},
	{
		name: "Multivitamin",
		genericName: "Multivitamin Complex",
		code: "MED048",
		category: MedicineCategory.VITAMINS,
		type: MedicineType.TABLET,
		strength: "-",
		unit: "tablet",
	},

	// TOPICAL (2)
	{
		name: "Hydrocortisone Cream",
		genericName: "Hydrocortisone",
		code: "MED049",
		category: MedicineCategory.TOPICAL,
		type: MedicineType.CREAM,
		strength: "1%",
		unit: "tube",
	},
	{
		name: "Clotrimazole Cream",
		genericName: "Clotrimazole",
		code: "MED050",
		category: MedicineCategory.TOPICAL,
		type: MedicineType.CREAM,
		strength: "1%",
		unit: "tube",
	},
];

/**
 * Seed medicines for a tenant
 */
export async function seedMedicines({
	tenantId,
}: {
	tenantId: string;
}): Promise<number> {
	logger.info({ tenantId }, "Seeding medicines");

	let count = 0;

	for (const medConfig of MEDICINES_CONFIG) {
		// Check if medicine already exists
		const existing = await Medicine.findOne({
			tenantId,
			code: medConfig.code,
		});

		if (existing) {
			logger.debug(
				{ tenantId, code: medConfig.code },
				"Medicine already exists, skipping",
			);
			continue;
		}

		const medId = uuidv4();

		await Medicine.create({
			_id: medId,
			tenantId,
			name: medConfig.name,
			genericName: medConfig.genericName,
			code: medConfig.code,
			category: medConfig.category,
			type: medConfig.type,
			strength: medConfig.strength,
			unit: medConfig.unit,
			manufacturer: "Generic Pharma",
			description: `${medConfig.genericName} - ${medConfig.strength}`,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		count++;
	}

	logger.info({ tenantId, count }, "Medicines seeded");
	return count;
}

/**
 * Seed medicines for all organizations
 */
export async function seedAllMedicines(): Promise<number> {
	logger.info("Starting medicines seed for all organizations");

	const orgs = await Organization.find({ status: "ACTIVE" });
	let totalCount = 0;

	for (const org of orgs) {
		const count = await seedMedicines({ tenantId: String(org._id) });
		totalCount += count;
	}

	logger.info({ totalCount }, "All medicines seeded");
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
		const count = await seedAllMedicines();
		console.log(`\nMedicines seed completed: ${count} medicines created`);
	} finally {
		await mongoose.disconnect();
		console.log("Disconnected from database");
	}
}

const isMainModule = process.argv[1]?.endsWith("medicines.seed.ts");
if (isMainModule) {
	main()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error("Seed failed:", error);
			process.exit(1);
		});
}
