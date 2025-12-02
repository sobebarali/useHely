/**
 * RBAC (Role-Based Access Control) constants
 *
 * Resources, actions, permissions, roles, and hierarchy
 * Used for authorization checks across the application
 */

// Resources
export const Resources = {
	PATIENT: "PATIENT",
	PRESCRIPTION: "PRESCRIPTION",
	DIAGNOSIS: "DIAGNOSIS",
	VITALS: "VITALS",
	DISPENSING: "DISPENSING",
	APPOINTMENT: "APPOINTMENT",
	USER: "USER",
	ROLE: "ROLE",
	DEPARTMENT: "DEPARTMENT",
	INVENTORY: "INVENTORY",
	REPORT: "REPORT",
	TENANT: "TENANT",
	ADMISSION: "ADMISSION",
	DASHBOARD: "DASHBOARD",
	SETTINGS: "SETTINGS",
	QUEUE: "QUEUE",
	DOCTOR: "DOCTOR",
	SECURITY: "SECURITY",
	AUDIT: "AUDIT",
	COMPLIANCE: "COMPLIANCE",
	BILLING: "BILLING",
	SUBSCRIPTION: "SUBSCRIPTION",
} as const;

// Actions
export const Actions = {
	CREATE: "CREATE",
	READ: "READ",
	UPDATE: "UPDATE",
	DELETE: "DELETE",
	MANAGE: "MANAGE",
	VIEW: "VIEW",
	EXPORT: "EXPORT",
	REPORT: "REPORT",
} as const;

// Permission type
export type Permission =
	`${(typeof Resources)[keyof typeof Resources]}:${(typeof Actions)[keyof typeof Actions]}`;

// All permissions
export const Permissions = {
	// Patient permissions
	PATIENT_CREATE: "PATIENT:CREATE" as Permission,
	PATIENT_READ: "PATIENT:READ" as Permission,
	PATIENT_UPDATE: "PATIENT:UPDATE" as Permission,
	PATIENT_DELETE: "PATIENT:DELETE" as Permission,
	PATIENT_MANAGE: "PATIENT:MANAGE" as Permission,

	// Prescription permissions
	PRESCRIPTION_CREATE: "PRESCRIPTION:CREATE" as Permission,
	PRESCRIPTION_READ: "PRESCRIPTION:READ" as Permission,
	PRESCRIPTION_UPDATE: "PRESCRIPTION:UPDATE" as Permission,
	PRESCRIPTION_DELETE: "PRESCRIPTION:DELETE" as Permission,
	PRESCRIPTION_MANAGE: "PRESCRIPTION:MANAGE" as Permission,

	// Diagnosis permissions
	DIAGNOSIS_CREATE: "DIAGNOSIS:CREATE" as Permission,
	DIAGNOSIS_READ: "DIAGNOSIS:READ" as Permission,
	DIAGNOSIS_UPDATE: "DIAGNOSIS:UPDATE" as Permission,
	DIAGNOSIS_DELETE: "DIAGNOSIS:DELETE" as Permission,
	DIAGNOSIS_MANAGE: "DIAGNOSIS:MANAGE" as Permission,

	// Vitals permissions
	VITALS_CREATE: "VITALS:CREATE" as Permission,
	VITALS_READ: "VITALS:READ" as Permission,
	VITALS_UPDATE: "VITALS:UPDATE" as Permission,
	VITALS_DELETE: "VITALS:DELETE" as Permission,
	VITALS_MANAGE: "VITALS:MANAGE" as Permission,

	// Dispensing permissions
	DISPENSING_CREATE: "DISPENSING:CREATE" as Permission,
	DISPENSING_READ: "DISPENSING:READ" as Permission,
	DISPENSING_UPDATE: "DISPENSING:UPDATE" as Permission,
	DISPENSING_DELETE: "DISPENSING:DELETE" as Permission,
	DISPENSING_MANAGE: "DISPENSING:MANAGE" as Permission,

	// Appointment permissions
	APPOINTMENT_CREATE: "APPOINTMENT:CREATE" as Permission,
	APPOINTMENT_READ: "APPOINTMENT:READ" as Permission,
	APPOINTMENT_UPDATE: "APPOINTMENT:UPDATE" as Permission,
	APPOINTMENT_DELETE: "APPOINTMENT:DELETE" as Permission,
	APPOINTMENT_MANAGE: "APPOINTMENT:MANAGE" as Permission,

	// User permissions
	USER_CREATE: "USER:CREATE" as Permission,
	USER_READ: "USER:READ" as Permission,
	USER_UPDATE: "USER:UPDATE" as Permission,
	USER_DELETE: "USER:DELETE" as Permission,
	USER_MANAGE: "USER:MANAGE" as Permission,

	// Role permissions
	ROLE_CREATE: "ROLE:CREATE" as Permission,
	ROLE_READ: "ROLE:READ" as Permission,
	ROLE_UPDATE: "ROLE:UPDATE" as Permission,
	ROLE_DELETE: "ROLE:DELETE" as Permission,
	ROLE_MANAGE: "ROLE:MANAGE" as Permission,

	// Department permissions
	DEPARTMENT_CREATE: "DEPARTMENT:CREATE" as Permission,
	DEPARTMENT_READ: "DEPARTMENT:READ" as Permission,
	DEPARTMENT_UPDATE: "DEPARTMENT:UPDATE" as Permission,
	DEPARTMENT_DELETE: "DEPARTMENT:DELETE" as Permission,
	DEPARTMENT_MANAGE: "DEPARTMENT:MANAGE" as Permission,

	// Inventory permissions
	INVENTORY_CREATE: "INVENTORY:CREATE" as Permission,
	INVENTORY_READ: "INVENTORY:READ" as Permission,
	INVENTORY_UPDATE: "INVENTORY:UPDATE" as Permission,
	INVENTORY_DELETE: "INVENTORY:DELETE" as Permission,
	INVENTORY_MANAGE: "INVENTORY:MANAGE" as Permission,

	// Report permissions
	REPORT_CREATE: "REPORT:CREATE" as Permission,
	REPORT_READ: "REPORT:READ" as Permission,
	REPORT_UPDATE: "REPORT:UPDATE" as Permission,
	REPORT_DELETE: "REPORT:DELETE" as Permission,
	REPORT_MANAGE: "REPORT:MANAGE" as Permission,

	// Tenant/Hospital permissions
	TENANT_CREATE: "TENANT:CREATE" as Permission,
	TENANT_READ: "TENANT:READ" as Permission,
	TENANT_UPDATE: "TENANT:UPDATE" as Permission,
	TENANT_DELETE: "TENANT:DELETE" as Permission,
	TENANT_MANAGE: "TENANT:MANAGE" as Permission,

	// Admission permissions
	ADMISSION_CREATE: "ADMISSION:CREATE" as Permission,
	ADMISSION_READ: "ADMISSION:READ" as Permission,
	ADMISSION_UPDATE: "ADMISSION:UPDATE" as Permission,
	ADMISSION_DELETE: "ADMISSION:DELETE" as Permission,
	ADMISSION_MANAGE: "ADMISSION:MANAGE" as Permission,

	// Dashboard permissions
	DASHBOARD_VIEW: "DASHBOARD:VIEW" as Permission,

	// Settings permissions
	SETTINGS_READ: "SETTINGS:READ" as Permission,
	SETTINGS_MANAGE: "SETTINGS:MANAGE" as Permission,

	// Queue permissions
	QUEUE_READ: "QUEUE:READ" as Permission,
	QUEUE_MANAGE: "QUEUE:MANAGE" as Permission,

	// Doctor permissions
	DOCTOR_READ: "DOCTOR:READ" as Permission,

	// Export permissions
	PATIENT_EXPORT: "PATIENT:EXPORT" as Permission,
	REPORT_EXPORT: "REPORT:EXPORT" as Permission,

	// Security permissions
	SECURITY_READ: "SECURITY:READ" as Permission,
	SECURITY_MANAGE: "SECURITY:MANAGE" as Permission,

	// MFA permissions
	MFA_MANAGE: "MFA:MANAGE" as Permission,

	// Audit permissions
	AUDIT_READ: "AUDIT:READ" as Permission,
	AUDIT_REPORT: "AUDIT:REPORT" as Permission,
	AUDIT_EXPORT: "AUDIT:EXPORT" as Permission,
	AUDIT_MANAGE: "AUDIT:MANAGE" as Permission,

	// Compliance permissions (GDPR)
	COMPLIANCE_READ: "COMPLIANCE:READ" as Permission,
	COMPLIANCE_MANAGE: "COMPLIANCE:MANAGE" as Permission,

	// Billing permissions
	BILLING_READ: "BILLING:READ" as Permission,
	BILLING_MANAGE: "BILLING:MANAGE" as Permission,

	// Subscription permissions
	SUBSCRIPTION_READ: "SUBSCRIPTION:READ" as Permission,
	SUBSCRIPTION_MANAGE: "SUBSCRIPTION:MANAGE" as Permission,
} as const;

// Pre-defined role names
export const RoleNames = {
	SUPER_ADMIN: "SUPER_ADMIN",
	HOSPITAL_ADMIN: "HOSPITAL_ADMIN",
	DOCTOR: "DOCTOR",
	NURSE: "NURSE",
	PHARMACIST: "PHARMACIST",
	RECEPTIONIST: "RECEPTIONIST",
} as const;

export type RoleName = (typeof RoleNames)[keyof typeof RoleNames];

// Role hierarchy levels (lower number = higher authority)
export const RoleHierarchy: Record<RoleName, number> = {
	[RoleNames.SUPER_ADMIN]: 0,
	[RoleNames.HOSPITAL_ADMIN]: 1,
	[RoleNames.DOCTOR]: 2,
	[RoleNames.NURSE]: 2,
	[RoleNames.PHARMACIST]: 2,
	[RoleNames.RECEPTIONIST]: 3,
};

// Default permissions for each role
export const RolePermissions: Record<RoleName, Permission[]> = {
	[RoleNames.SUPER_ADMIN]: [
		// Super admin has all permissions via MANAGE
		Permissions.PATIENT_MANAGE,
		Permissions.PRESCRIPTION_MANAGE,
		Permissions.DIAGNOSIS_MANAGE,
		Permissions.VITALS_MANAGE,
		Permissions.DISPENSING_MANAGE,
		Permissions.APPOINTMENT_MANAGE,
		Permissions.USER_MANAGE,
		Permissions.ROLE_MANAGE,
		Permissions.DEPARTMENT_MANAGE,
		Permissions.INVENTORY_MANAGE,
		Permissions.REPORT_MANAGE,
		Permissions.TENANT_MANAGE,
		Permissions.ADMISSION_MANAGE,
		Permissions.DASHBOARD_VIEW,
		Permissions.SETTINGS_MANAGE,
		Permissions.QUEUE_MANAGE,
		Permissions.DOCTOR_READ,
		Permissions.SECURITY_MANAGE,
		Permissions.MFA_MANAGE,
		Permissions.AUDIT_MANAGE,
		Permissions.COMPLIANCE_MANAGE,
		Permissions.BILLING_MANAGE,
		Permissions.SUBSCRIPTION_MANAGE,
	],

	[RoleNames.HOSPITAL_ADMIN]: [
		// Hospital admin has all permissions within their tenant
		Permissions.PATIENT_MANAGE,
		Permissions.PRESCRIPTION_MANAGE,
		Permissions.DIAGNOSIS_MANAGE,
		Permissions.VITALS_MANAGE,
		Permissions.DISPENSING_MANAGE,
		Permissions.APPOINTMENT_MANAGE,
		Permissions.USER_MANAGE,
		Permissions.ROLE_CREATE,
		Permissions.ROLE_READ,
		Permissions.ROLE_UPDATE,
		Permissions.ROLE_DELETE,
		Permissions.DEPARTMENT_MANAGE,
		Permissions.INVENTORY_MANAGE,
		Permissions.REPORT_MANAGE,
		Permissions.TENANT_READ,
		Permissions.TENANT_UPDATE,
		Permissions.ADMISSION_MANAGE,
		Permissions.DASHBOARD_VIEW,
		Permissions.SETTINGS_MANAGE,
		Permissions.QUEUE_MANAGE,
		Permissions.DOCTOR_READ,
		Permissions.REPORT_EXPORT,
		Permissions.SECURITY_READ,
		Permissions.AUDIT_READ,
		Permissions.AUDIT_REPORT,
		Permissions.AUDIT_EXPORT,
		Permissions.COMPLIANCE_READ,
		Permissions.COMPLIANCE_MANAGE,
		Permissions.BILLING_READ,
		Permissions.BILLING_MANAGE,
		Permissions.SUBSCRIPTION_READ,
		Permissions.SUBSCRIPTION_MANAGE,
	],

	[RoleNames.DOCTOR]: [
		Permissions.PATIENT_CREATE,
		Permissions.PATIENT_READ,
		Permissions.PATIENT_UPDATE,
		Permissions.PRESCRIPTION_CREATE,
		Permissions.PRESCRIPTION_READ,
		Permissions.PRESCRIPTION_UPDATE,
		Permissions.DIAGNOSIS_CREATE,
		Permissions.DIAGNOSIS_READ,
		Permissions.VITALS_READ,
		Permissions.APPOINTMENT_READ,
		Permissions.APPOINTMENT_UPDATE,
		Permissions.ADMISSION_CREATE,
		Permissions.ADMISSION_READ,
		Permissions.ADMISSION_UPDATE,
		Permissions.DASHBOARD_VIEW,
	],

	[RoleNames.NURSE]: [
		Permissions.PATIENT_READ,
		Permissions.PATIENT_UPDATE, // For vitals updates
		Permissions.VITALS_CREATE,
		Permissions.VITALS_READ,
		Permissions.VITALS_UPDATE,
		Permissions.PRESCRIPTION_READ,
		Permissions.APPOINTMENT_READ,
		Permissions.ADMISSION_READ,
		Permissions.ADMISSION_UPDATE,
		Permissions.DASHBOARD_VIEW,
	],

	[RoleNames.PHARMACIST]: [
		Permissions.PRESCRIPTION_READ,
		Permissions.DISPENSING_CREATE,
		Permissions.DISPENSING_READ,
		Permissions.DISPENSING_UPDATE,
		Permissions.INVENTORY_READ,
		Permissions.INVENTORY_UPDATE,
		Permissions.PATIENT_READ,
		Permissions.DASHBOARD_VIEW,
	],

	[RoleNames.RECEPTIONIST]: [
		Permissions.PATIENT_CREATE,
		Permissions.PATIENT_READ,
		Permissions.APPOINTMENT_CREATE,
		Permissions.APPOINTMENT_READ,
		Permissions.APPOINTMENT_UPDATE,
		Permissions.APPOINTMENT_DELETE,
		Permissions.ADMISSION_CREATE,
		Permissions.ADMISSION_READ,
		Permissions.DASHBOARD_VIEW,
		Permissions.QUEUE_MANAGE,
	],
};

/**
 * Check if a permission satisfies a required permission
 * MANAGE permission implies all other actions on the same resource
 */
export function hasPermission(
	userPermissions: string[],
	requiredPermission: Permission,
): boolean {
	// Direct match
	if (userPermissions.includes(requiredPermission)) {
		return true;
	}

	// Check if user has MANAGE permission for the resource
	const [resource] = requiredPermission.split(":");
	const managePermission = `${resource}:MANAGE`;

	return userPermissions.includes(managePermission);
}

/**
 * Check if a role has higher or equal authority than another
 */
export function hasHigherOrEqualAuthority(
	userRole: RoleName,
	targetRole: RoleName,
): boolean {
	return RoleHierarchy[userRole] <= RoleHierarchy[targetRole];
}

/**
 * Get all effective permissions for a set of roles
 */
export function getEffectivePermissions(roleNames: RoleName[]): Permission[] {
	const permissions = new Set<Permission>();

	for (const roleName of roleNames) {
		const rolePerms = RolePermissions[roleName];
		if (rolePerms) {
			for (const perm of rolePerms) {
				permissions.add(perm);
			}
		}
	}

	return Array.from(permissions);
}
