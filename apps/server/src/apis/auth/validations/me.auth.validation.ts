// No request body validation needed for GET /api/auth/me
// Authentication is handled by middleware

// Role object in response
export interface RoleOutput {
	id: string;
	name: string;
	description?: string;
}

// ABAC attributes in response
export interface UserAttributes {
	department?: string;
	specialization?: string;
	shift?: string;
}

// Output type - manually defined for response structure
export interface MeOutput {
	id: string;
	username: string;
	email: string;
	firstName: string;
	lastName: string;
	tenantId: string;
	department?: string;
	roles: RoleOutput[];
	permissions: string[];
	attributes: UserAttributes;
}
