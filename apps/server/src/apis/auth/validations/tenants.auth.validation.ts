/**
 * Validation types for GET /api/auth/tenants endpoint
 * No input schema needed for GET endpoint - output interface only
 */

/**
 * Role information within a tenant
 */
export interface TenantRole {
	id: string;
	name: string;
}

/**
 * Individual tenant information for a user
 */
export interface UserTenant {
	/** Tenant/Hospital ID */
	id: string;
	/** Hospital name */
	name: string;
	/** Hospital status (ACTIVE, VERIFIED, SUSPENDED, etc.) */
	status: string;
	/** User's roles in this tenant */
	roles: TenantRole[];
	/** User's staff status in this tenant (ACTIVE, INACTIVE, LOCKED, etc.) */
	staffStatus: string;
	/** Whether this is the current active tenant */
	isCurrent: boolean;
}

/**
 * Output type for list user tenants endpoint
 */
export interface ListUserTenantsOutput {
	/** List of tenants the user belongs to */
	tenants: UserTenant[];
	/** ID of the current active tenant */
	currentTenantId: string;
}
