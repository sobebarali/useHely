import {
	Account,
	Counter,
	Department,
	DepartmentStatus,
	DepartmentType,
	type mongoose,
	Organization,
	OrganizationStatus,
	OrganizationType,
	PricingTier,
	Role,
	Staff,
	User,
} from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import { hashPassword } from "../../utils/crypto";
import { createServiceLogger } from "../logger";
import { seedSystemRoles } from "./system-roles.seed";

const logger = createServiceLogger("organizationsSeed");

// Default password for all seed users
const SEED_PASSWORD = "Test123!";

// Organization configurations
const ORGANIZATIONS_CONFIG = [
	{
		name: "City General Hospital",
		slug: "city-general-hospital",
		emailPrefix: "hospital",
		type: OrganizationType.HOSPITAL,
		licenseNumber: "HOSP-2024-001",
	},
	{
		name: "Downtown Medical Clinic",
		slug: "downtown-medical-clinic",
		emailPrefix: "clinic",
		type: OrganizationType.CLINIC,
		licenseNumber: "CLIN-2024-001",
	},
	{
		name: "Dr. Smith Solo Practice",
		slug: "dr-smith-solo-practice",
		emailPrefix: "solo",
		type: OrganizationType.SOLO_PRACTICE,
		licenseNumber: undefined,
	},
] as const;

// Department configurations
const DEPARTMENTS_CONFIG = [
	{
		name: "General Medicine",
		code: "GEN",
		type: DepartmentType.CLINICAL,
		description: "General medicine and primary care",
	},
	{
		name: "Emergency",
		code: "ER",
		type: DepartmentType.EMERGENCY,
		description: "Emergency and urgent care services",
	},
	{
		name: "Pharmacy",
		code: "PHARM",
		type: DepartmentType.PHARMACY,
		description: "Pharmacy and dispensing services",
	},
	{
		name: "Administration",
		code: "ADMIN",
		type: DepartmentType.ADMINISTRATIVE,
		description: "Administrative and front desk services",
	},
] as const;

// User configurations
const USERS_CONFIG = [
	{
		role: "HOSPITAL_ADMIN",
		firstName: "Admin",
		lastName: "User",
		departmentCode: "ADMIN",
	},
	{
		role: "DOCTOR",
		firstName: "John",
		lastName: "Doctor",
		departmentCode: "GEN",
	},
	{
		role: "NURSE",
		firstName: "Jane",
		lastName: "Nurse",
		departmentCode: "GEN",
	},
	{
		role: "PHARMACIST",
		firstName: "Paul",
		lastName: "Pharmacist",
		departmentCode: "PHARM",
	},
	{
		role: "RECEPTIONIST",
		firstName: "Rachel",
		lastName: "Receptionist",
		departmentCode: "ADMIN",
	},
] as const;

interface CounterModel {
	getNextSequence(tenantId: string, type: string): Promise<number>;
}

/**
 * Seed departments for a tenant
 */
async function seedDepartments({
	tenantId,
	session,
}: {
	tenantId: string;
	session?: mongoose.ClientSession;
}): Promise<Map<string, string>> {
	logger.info({ tenantId }, "Seeding departments");

	const departmentMap = new Map<string, string>();

	for (const deptConfig of DEPARTMENTS_CONFIG) {
		// Check if department already exists
		const existing = await Department.findOne({
			tenantId,
			code: deptConfig.code,
		}).session(session ?? null);

		if (existing) {
			logger.debug(
				{ tenantId, deptCode: deptConfig.code },
				"Department already exists, skipping",
			);
			departmentMap.set(deptConfig.code, String(existing._id));
			continue;
		}

		const deptId = uuidv4();

		await Department.create(
			[
				{
					_id: deptId,
					tenantId,
					name: deptConfig.name,
					code: deptConfig.code,
					description: deptConfig.description,
					type: deptConfig.type,
					status: DepartmentStatus.ACTIVE,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			],
			{ session },
		);

		departmentMap.set(deptConfig.code, deptId);

		logger.info(
			{ tenantId, deptId, deptName: deptConfig.name },
			"Department created",
		);
	}

	return departmentMap;
}

/**
 * Seed users for a tenant
 */
async function seedUsers({
	tenantId,
	emailPrefix,
	departmentMap,
	roleMap,
	session,
}: {
	tenantId: string;
	emailPrefix: string;
	departmentMap: Map<string, string>;
	roleMap: Map<string, string>;
	session?: mongoose.ClientSession;
}): Promise<void> {
	logger.info({ tenantId }, "Seeding users");

	const hashedPassword = await hashPassword(SEED_PASSWORD);

	for (const userConfig of USERS_CONFIG) {
		const email = `${emailPrefix}-${userConfig.role.toLowerCase().replace("hospital_", "")}@usehely.com`;

		// Check if user already exists globally
		const existingUser = await User.findOne({ email }).session(session ?? null);

		if (existingUser) {
			logger.debug({ email }, "User already exists, skipping");
			continue;
		}

		// Generate IDs
		const userId = uuidv4();
		const staffId = uuidv4();
		const accountId = uuidv4();

		// Get employee ID using Counter
		const seq = await (Counter as unknown as CounterModel).getNextSequence(
			tenantId,
			"employee",
		);
		const employeeId = `EMP-${String(seq).padStart(5, "0")}`;

		// Get role and department IDs
		const roleId = roleMap.get(userConfig.role);
		const departmentId = departmentMap.get(userConfig.departmentCode);

		if (!roleId) {
			logger.error({ role: userConfig.role }, "Role not found");
			throw new Error(`Role ${userConfig.role} not found`);
		}

		if (!departmentId) {
			logger.error(
				{ departmentCode: userConfig.departmentCode },
				"Department not found",
			);
			throw new Error(`Department ${userConfig.departmentCode} not found`);
		}

		// Create User record
		await User.create(
			[
				{
					_id: userId,
					name: `${userConfig.firstName} ${userConfig.lastName}`,
					email,
					emailVerified: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			],
			{ session },
		);

		// Create Account record
		await Account.create(
			[
				{
					_id: accountId,
					accountId,
					userId,
					providerId: "credential",
					password: hashedPassword,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			],
			{ session },
		);

		// Create Staff record
		await Staff.create(
			[
				{
					_id: staffId,
					tenantId,
					userId,
					employeeId,
					firstName: userConfig.firstName,
					lastName: userConfig.lastName,
					phone: "+1234567890",
					departmentId,
					roles: [roleId],
					status: "ACTIVE",
					forcePasswordChange: false, // Seed users don't need to change password
					passwordHistory: [hashedPassword],
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			],
			{ session },
		);

		logger.info(
			{ userId, email, employeeId, role: userConfig.role },
			"User created",
		);
	}
}

/**
 * Seed a single organization with departments and users
 */
async function seedOrganization(
	config: (typeof ORGANIZATIONS_CONFIG)[number],
): Promise<{ tenantId: string; departments: number; users: number } | null> {
	const { mongoose } = await import("@hms/db");
	const session = await mongoose.startSession();

	try {
		session.startTransaction();

		// Check if organization already exists
		const existing = await Organization.findOne({ slug: config.slug }).session(
			session,
		);

		if (existing) {
			logger.info(
				{ slug: config.slug },
				"Organization already exists, skipping",
			);
			await session.abortTransaction();
			return null;
		}

		// Create organization
		const tenantId = uuidv4();

		await Organization.create(
			[
				{
					_id: tenantId,
					name: config.name,
					slug: config.slug,
					type: config.type,
					licenseNumber: config.licenseNumber,
					address: {
						street: "123 Healthcare Ave",
						city: "Medical City",
						state: "HC",
						postalCode: "12345",
						country: "USA",
					},
					contactEmail: `contact@${config.slug}.example.com`,
					contactPhone: "+1234567890",
					adminEmail: `${config.emailPrefix}-admin@usehely.com`,
					adminPhone: "+1234567890",
					status: OrganizationStatus.ACTIVE,
					pricingTier: PricingTier.ENTERPRISE,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			],
			{ session },
		);

		logger.info({ tenantId, orgName: config.name }, "Organization created");

		// Seed system roles
		await seedSystemRoles({ tenantId, session });

		// Get role map
		const roles = await Role.find({ tenantId, isSystem: true }).session(
			session,
		);
		const roleMap = new Map(
			roles.map((r) => [r.name as string, String(r._id)]),
		);

		// Seed departments
		const departmentMap = await seedDepartments({ tenantId, session });

		// Seed users
		await seedUsers({
			tenantId,
			emailPrefix: config.emailPrefix,
			departmentMap,
			roleMap,
			session,
		});

		await session.commitTransaction();

		logger.info(
			{ tenantId, orgName: config.name },
			"Organization seeded successfully",
		);

		return {
			tenantId,
			departments: departmentMap.size,
			users: USERS_CONFIG.length,
		};
	} catch (error) {
		await session.abortTransaction();
		logger.error(
			{ error, orgSlug: config.slug },
			"Failed to seed organization",
		);
		throw error;
	} finally {
		await session.endSession();
	}
}

/**
 * Seed all organizations with departments and users
 */
export async function seedOrganizations(): Promise<{
	organizations: number;
	departments: number;
	users: number;
}> {
	logger.info("Starting organizations seed");

	let orgCount = 0;
	let deptCount = 0;
	let userCount = 0;

	for (const orgConfig of ORGANIZATIONS_CONFIG) {
		const result = await seedOrganization(orgConfig);

		if (result) {
			orgCount++;
			deptCount += result.departments;
			userCount += result.users;
		}
	}

	logger.info(
		{ organizations: orgCount, departments: deptCount, users: userCount },
		"Organizations seed completed",
	);

	return { organizations: orgCount, departments: deptCount, users: userCount };
}

/**
 * Main function for standalone execution
 */
async function main(): Promise<void> {
	// Load environment variables
	const dotenv = await import("dotenv");
	dotenv.config();

	// Connect to database
	const { connectDB, mongoose } = await import("@hms/db");
	await connectDB();

	console.log("Connected to database");

	try {
		const result = await seedOrganizations();

		console.log("\nSeed completed successfully!");
		console.log(`  Organizations: ${result.organizations}`);
		console.log(`  Departments: ${result.departments}`);
		console.log(`  Users: ${result.users}`);
		console.log(`\nDefault password for all users: ${SEED_PASSWORD}`);
	} finally {
		await mongoose.disconnect();
		console.log("\nDisconnected from database");
	}
}

// Check if running as main module
const isMainModule = process.argv[1]?.endsWith("organizations.seed.ts");
if (isMainModule) {
	main()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error("Seed failed:", error);
			process.exit(1);
		});
}
