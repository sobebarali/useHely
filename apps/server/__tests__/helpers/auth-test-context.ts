import { randomBytes } from "node:crypto";
import {
	Account,
	Department,
	Hospital,
	Role,
	Session,
	Staff,
	User,
} from "@hms/db";
import bcrypt from "bcryptjs";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { app } from "../../src/index";

interface ExtraRoleConfig {
	name: string;
	permissions: string[];
	isSystem?: boolean;
}

interface CreateAuthTestContextOptions {
	roleName?: string;
	rolePermissions?: string[];
	extraRoles?: ExtraRoleConfig[];
	includeDepartment?: boolean;
	departmentOverrides?: Partial<{
		name: string;
		code: string;
		type: string;
	}>;
	staffOverrides?: Partial<{
		departmentId?: string;
		specialization?: string;
		shift?: string;
		status?: string;
	}>;
	createStaff?: boolean;
	password?: string;
}

export interface AuthTestContext {
	uniqueId: string;
	hospitalId: string;
	userId: string;
	staffId?: string;
	roleIds: string[];
	roleNames: string[];
	email: string;
	password: string;
	departmentId?: string;
	departmentName?: string;
	issuePasswordTokens: () => Promise<{
		accessToken: string;
		refreshToken: string;
	}>;
	createSessionToken: (options?: {
		token?: string;
		expiresAt?: Date;
	}) => Promise<string>;
	cleanup: () => Promise<void>;
}

export async function createAuthTestContext(
	options: CreateAuthTestContextOptions = {},
): Promise<AuthTestContext> {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const {
		roleName = "HOSPITAL_ADMIN",
		rolePermissions = [
			"ROLE:CREATE",
			"ROLE:READ",
			"ROLE:UPDATE",
			"ROLE:DELETE",
		],
		extraRoles = [],
		includeDepartment = false,
		departmentOverrides = {},
		staffOverrides = {},
		createStaff = true,
		password = "TestPassword123!",
	} = options;

	const createdRoleIds: string[] = [];
	const createdRoleNames: string[] = [];

	// Generate UUIDs for entities to match validation requirements
	const hospitalId = uuidv4();
	const userId = uuidv4();

	const hospital = await Hospital.create({
		_id: hospitalId,
		name: `Test Hospital ${uniqueId}`,
		slug: `test-hospital-${uniqueId}`,
		licenseNumber: `LIC-${uniqueId}`,
		address: {
			street: "123 Test St",
			city: "Test City",
			state: "TS",
			postalCode: "12345",
			country: "USA",
		},
		contactEmail: `contact-${uniqueId}@test.com`,
		contactPhone: "+1234567890",
		adminEmail: `admin-${uniqueId}@test.com`,
		adminPhone: "+0987654321",
		status: "ACTIVE",
		createdAt: new Date(),
		updatedAt: new Date(),
	});

	const user = await User.create({
		_id: userId,
		name: "Test User",
		email: `user-${uniqueId}@test.com`,
		emailVerified: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	});

	let departmentId: string | undefined;
	let departmentName: string | undefined;

	if (includeDepartment) {
		const department = await Department.create({
			_id: uuidv4(),
			tenantId: String(hospital._id),
			name: departmentOverrides.name ?? `Department ${uniqueId}`,
			code: departmentOverrides.code ?? `DEPT-${uniqueId}`,
			description: "Test Department",
			type: departmentOverrides.type ?? "CLINICAL",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		departmentId = String(department._id);
		departmentName = department.name;
	}

	const primaryRole = await Role.create({
		_id: uuidv4(),
		tenantId: String(hospital._id),
		name: roleName,
		description: `${roleName} role for tests`,
		permissions: rolePermissions,
		isSystem: true,
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	});

	createdRoleIds.push(String(primaryRole._id));
	createdRoleNames.push(primaryRole.name);

	for (const extraRole of extraRoles) {
		const role = await Role.create({
			_id: uuidv4(),
			tenantId: String(hospital._id),
			name: extraRole.name,
			description: `${extraRole.name} role for tests`,
			permissions: extraRole.permissions,
			isSystem: extraRole.isSystem ?? false,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		createdRoleIds.push(String(role._id));
		createdRoleNames.push(role.name);
	}

	let staffRecord: Awaited<ReturnType<typeof Staff.create>>[number] | null =
		null;

	if (createStaff) {
		const created = await Staff.create({
			_id: uuidv4(),
			tenantId: String(hospital._id),
			userId: String(user._id),
			employeeId: `EMP-${uniqueId}`,
			firstName: "Test",
			lastName: "User",
			phone: "+1234567890",
			departmentId: staffOverrides.departmentId ?? departmentId,
			roles: createdRoleIds,
			specialization: staffOverrides.specialization ?? "General Practice",
			shift: staffOverrides.shift ?? "MORNING",
			status: staffOverrides.status ?? "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		staffRecord = created;
	}

	const hashedPassword = await bcrypt.hash(password, 10);

	const accountId = uuidv4();
	await Account.create({
		_id: accountId,
		accountId: accountId,
		userId: String(user._id),
		providerId: "credential",
		password: hashedPassword,
		createdAt: new Date(),
		updatedAt: new Date(),
	});

	async function issuePasswordTokens() {
		if (!staffRecord) {
			throw new Error("Cannot issue tokens without staff assignment");
		}

		const response = await request(app)
			.post("/api/auth/token")
			.send({
				grant_type: "password",
				username: user.email,
				password,
				tenant_id: String(hospital._id),
			});

		if (response.status !== 200) {
			throw new Error(
				`Failed to create tokens: ${response.status} ${response.text}`,
			);
		}

		return {
			accessToken: response.body.access_token as string,
			refreshToken: response.body.refresh_token as string,
		};
	}

	async function createSessionToken({
		token = randomBytes(16).toString("hex"),
		expiresAt = new Date(Date.now() + 60 * 60 * 1000),
	}: {
		token?: string;
		expiresAt?: Date;
	} = {}) {
		await Session.create({
			_id: uuidv4(),
			userId: String(user._id),
			token,
			expiresAt,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		return token;
	}

	async function cleanup() {
		await Session.deleteMany({ userId: String(user._id) });
		await Account.deleteOne({ userId: String(user._id) });

		if (staffRecord) {
			await Staff.deleteOne({ _id: String(staffRecord._id) });
		}

		if (departmentId) {
			await Department.deleteOne({ _id: departmentId });
		}

		for (const roleId of createdRoleIds) {
			await Role.deleteOne({ _id: roleId });
		}

		await User.deleteOne({ _id: String(user._id) });
		await Hospital.deleteOne({ _id: String(hospital._id) });
	}

	return {
		uniqueId,
		hospitalId: String(hospital._id),
		userId: String(user._id),
		staffId: staffRecord ? String(staffRecord._id) : undefined,
		roleIds: createdRoleIds,
		roleNames: createdRoleNames,
		email: user.email,
		password,
		departmentId,
		departmentName,
		issuePasswordTokens,
		createSessionToken,
		cleanup,
	};
}
