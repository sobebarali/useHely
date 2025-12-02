import { Hospital, Role, Staff } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("tenantsAuth");

/**
 * Staff record with tenant information for listing user tenants
 */
export interface StaffWithTenant {
	_id: string;
	tenantId: string;
	userId: string;
	roles: string[];
	status: string;
}

/**
 * Hospital/Tenant information
 */
export interface TenantInfo {
	_id: string;
	name: string;
	status: string;
}

/**
 * Role information
 */
export interface RoleInfo {
	_id: string;
	name: string;
	tenantId: string;
}

/**
 * Find all Staff records for a user across all tenants
 */
export async function findAllStaffForUser({
	userId,
}: {
	userId: string;
}): Promise<StaffWithTenant[]> {
	try {
		logger.debug({ userId }, "Finding all staff records for user");

		const staffRecords = await Staff.find({ userId })
			.select("_id tenantId userId roles status")
			.lean();

		logDatabaseOperation(
			logger,
			"find",
			"staff",
			{ userId },
			{ count: staffRecords.length },
		);

		return staffRecords.map((s) => ({
			_id: String(s._id),
			tenantId: s.tenantId,
			userId: s.userId,
			roles: (s.roles as string[]) || [],
			status: s.status,
		}));
	} catch (error) {
		logError(logger, error, "Failed to find staff records for user");
		throw error;
	}
}

/**
 * Find hospitals by IDs (without tenant scope - for listing user tenants)
 */
export async function findHospitalsByIds({
	hospitalIds,
}: {
	hospitalIds: string[];
}): Promise<TenantInfo[]> {
	try {
		logger.debug({ count: hospitalIds.length }, "Finding hospitals by IDs");

		const hospitals = await Hospital.find({ _id: { $in: hospitalIds } })
			.select("_id name status")
			.lean();

		logDatabaseOperation(
			logger,
			"find",
			"hospital",
			{ hospitalIds },
			{ count: hospitals.length },
		);

		return hospitals.map((h) => ({
			_id: String(h._id),
			name: h.name,
			status: h.status,
		}));
	} catch (error) {
		logError(logger, error, "Failed to find hospitals by IDs");
		throw error;
	}
}

/**
 * Find roles by IDs (without tenant scope - for listing user tenants across multiple tenants)
 */
export async function findRolesByIds({
	roleIds,
}: {
	roleIds: string[];
}): Promise<RoleInfo[]> {
	try {
		logger.debug({ count: roleIds.length }, "Finding roles by IDs");

		const roles = await Role.find({
			_id: { $in: roleIds },
			isActive: true,
		})
			.select("_id name tenantId")
			.lean();

		logDatabaseOperation(
			logger,
			"find",
			"role",
			{ roleIds },
			{ count: roles.length },
		);

		return roles.map((r) => ({
			_id: String(r._id),
			name: r.name,
			tenantId: r.tenantId,
		}));
	} catch (error) {
		logError(logger, error, "Failed to find roles by IDs");
		throw error;
	}
}
