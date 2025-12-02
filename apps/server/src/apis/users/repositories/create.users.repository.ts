import { Account, mongoose, Staff, User } from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { CreateUserInput } from "../validations/create.users.validation";

const logger = createRepositoryLogger("createUser");

/**
 * Link existing user input - subset of CreateUserInput with userId
 */
export interface LinkExistingUserInput {
	userId: string;
	firstName: string;
	lastName: string;
	phone?: string;
	department: string;
	roles: string[];
	specialization?: string;
	shift?: string;
}

/**
 * Create a new user with associated account and staff record.
 * Uses MongoDB transaction to ensure atomicity - if any creation fails,
 * all changes are rolled back to prevent orphaned records.
 */
export async function createUser({
	tenantId,
	data,
	hashedPassword,
	employeeId,
}: {
	tenantId: string;
	data: CreateUserInput;
	hashedPassword: string;
	employeeId: string;
}) {
	const session = await mongoose.startSession();

	try {
		session.startTransaction();

		const userId = uuidv4();
		const staffId = uuidv4();
		const accountId = uuidv4();

		logger.debug({ userId, tenantId }, "Creating user with transaction");

		// Create user record
		const userDocs = await User.create(
			[
				{
					_id: userId,
					name: `${data.firstName} ${data.lastName}`,
					email: data.email,
					emailVerified: false,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			],
			{ session },
		);
		const user = userDocs[0];
		if (!user) {
			throw new Error("Failed to create user document");
		}

		logDatabaseOperation(
			logger,
			"create",
			"user",
			{ tenantId, email: data.email },
			{ _id: user._id },
		);

		// Create account record with password
		const accountDocs = await Account.create(
			[
				{
					_id: accountId,
					accountId: accountId,
					userId: userId,
					providerId: "credential",
					password: hashedPassword,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			],
			{ session },
		);
		const account = accountDocs[0];
		if (!account) {
			throw new Error("Failed to create account document");
		}

		logDatabaseOperation(
			logger,
			"create",
			"account",
			{ userId },
			{ _id: account._id },
		);

		// Create staff record
		const staffDocs = await Staff.create(
			[
				{
					_id: staffId,
					tenantId,
					userId,
					employeeId,
					firstName: data.firstName,
					lastName: data.lastName,
					phone: data.phone,
					departmentId: data.department,
					roles: data.roles,
					specialization: data.specialization,
					shift: data.shift,
					status: "ACTIVE",
					forcePasswordChange: true, // New users must change password on first login
					passwordHistory: [hashedPassword],
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			],
			{ session },
		);
		const staff = staffDocs[0];
		if (!staff) {
			throw new Error("Failed to create staff document");
		}

		logDatabaseOperation(
			logger,
			"create",
			"staff",
			{ tenantId, userId },
			{ _id: staff._id },
		);

		// Commit transaction
		await session.commitTransaction();

		logger.info({ userId, staffId, tenantId }, "User created successfully");

		// Return user and staff without password hash for security
		const accountObj = account.toObject();
		const { password: _password, ...accountWithoutPassword } = accountObj;

		return {
			user,
			staff,
			account: accountWithoutPassword,
		};
	} catch (error) {
		// Abort transaction on error to rollback all changes
		await session.abortTransaction();
		logError(logger, error, "Failed to create user - transaction aborted", {
			tenantId,
		});
		throw error;
	} finally {
		await session.endSession();
	}
}

/**
 * Link an existing user to a new tenant by creating only a Staff record.
 * Used when adding a user who already exists in the system to another organization.
 * No User or Account records are created - only the Staff association.
 */
export async function linkExistingUserToTenant({
	tenantId,
	data,
	employeeId,
}: {
	tenantId: string;
	data: LinkExistingUserInput;
	employeeId: string;
}) {
	const staffId = uuidv4();

	logger.debug(
		{ userId: data.userId, tenantId, staffId },
		"Linking existing user to tenant",
	);

	try {
		// Create only staff record - user and account already exist
		const staffDocs = await Staff.create([
			{
				_id: staffId,
				tenantId,
				userId: data.userId,
				employeeId,
				firstName: data.firstName,
				lastName: data.lastName,
				phone: data.phone,
				departmentId: data.department,
				roles: data.roles,
				specialization: data.specialization,
				shift: data.shift,
				status: "ACTIVE",
				// No passwordHistory for linked users - they use their existing credentials
				passwordHistory: [],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		]);

		const staff = staffDocs[0];
		if (!staff) {
			throw new Error("Failed to create staff document for linked user");
		}

		logDatabaseOperation(
			logger,
			"create",
			"staff",
			{ tenantId, userId: data.userId, linkedUser: true },
			{ _id: staff._id },
		);

		logger.info(
			{ userId: data.userId, staffId, tenantId },
			"Existing user linked to tenant successfully",
		);

		return { staff };
	} catch (error) {
		logError(logger, error, "Failed to link existing user to tenant", {
			tenantId,
			userId: data.userId,
		});
		throw error;
	}
}
