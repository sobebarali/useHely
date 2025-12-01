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
		// Array destructuring is safe here - create() always returns documents on success
		const user = userDocs[0]!;

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
		const account = accountDocs[0]!;

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
					passwordHistory: [hashedPassword],
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			],
			{ session },
		);
		const staff = staffDocs[0]!;

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
