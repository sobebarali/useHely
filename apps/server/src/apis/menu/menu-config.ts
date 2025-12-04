/**
 * Full menu structure configuration
 *
 * Defines all possible menu items for the application.
 * Items are filtered based on user permissions at runtime.
 */

import type { MenuItem } from "./validations/get.menu.validation";

export const FULL_MENU_STRUCTURE: MenuItem[] = [
	// Dashboard - available to all authenticated users
	{
		id: "dashboard",
		label: "Dashboard",
		icon: "dashboard",
		path: "/dashboard",
		permission: "DASHBOARD:VIEW",
		order: 1,
		visible: true,
	},

	// Users - Hospital Admin and above
	{
		id: "users",
		label: "Staff",
		icon: "badge",
		permission: "USER:READ",
		order: 2,
		visible: true,
		children: [
			{
				id: "users-list",
				label: "All Staff",
				path: "/dashboard/staff",
				permission: "USER:READ",
				order: 1,
			},
			{
				id: "users-add",
				label: "Add Staff",
				path: "/dashboard/staff/add",
				permission: "USER:CREATE",
				order: 2,
			},
			{
				id: "users-roles",
				label: "Roles",
				path: "/dashboard/staff/roles",
				permission: "ROLE:READ",
				order: 3,
			},
		],
	},

	// Patients
	{
		id: "patients",
		label: "Patients",
		icon: "people",
		permission: "PATIENT:READ",
		order: 3,
		visible: true,
		children: [
			{
				id: "patients-list",
				label: "All Patients",
				path: "/dashboard/patients",
				permission: "PATIENT:READ",
				order: 1,
			},
			{
				id: "patients-register",
				label: "Register Patient",
				path: "/dashboard/patients/register",
				permission: "PATIENT:CREATE",
				order: 2,
			},
			{
				id: "patients-opd-queue",
				label: "OPD Queue",
				path: "/dashboard/patients/opd-queue",
				permission: "QUEUE:MANAGE",
				order: 3,
			},
		],
	},

	// Doctors - visible to Hospital Admin
	{
		id: "doctors",
		label: "Doctors",
		icon: "medical_services",
		path: "/dashboard/doctors",
		permission: "DOCTOR:READ",
		order: 4,
		visible: true,
		children: [
			{
				id: "doctors-list",
				label: "All Doctors",
				path: "/dashboard/doctors",
				permission: "DOCTOR:READ",
				order: 1,
			},
			{
				id: "doctors-availability",
				label: "Availability",
				path: "/dashboard/doctors/availability",
				permission: "DOCTOR:MANAGE",
				order: 2,
			},
		],
	},

	// Prescriptions
	{
		id: "prescriptions",
		label: "Prescriptions",
		icon: "medication",
		permission: "PRESCRIPTION:READ",
		order: 5,
		visible: true,
		children: [
			{
				id: "prescriptions-list",
				label: "All Prescriptions",
				path: "/dashboard/prescriptions",
				permission: "PRESCRIPTION:READ",
				order: 1,
			},
			{
				id: "prescriptions-create",
				label: "Create",
				path: "/dashboard/prescriptions/create",
				permission: "PRESCRIPTION:CREATE",
				order: 2,
			},
			{
				id: "prescriptions-templates",
				label: "Templates",
				path: "/dashboard/prescriptions/templates",
				permission: "PRESCRIPTION:MANAGE",
				order: 3,
			},
		],
	},

	// Appointments
	{
		id: "appointments",
		label: "Appointments",
		icon: "schedule",
		permission: "APPOINTMENT:READ",
		order: 6,
		visible: true,
		children: [
			{
				id: "appointments-list",
				label: "All Appointments",
				path: "/dashboard/appointments",
				permission: "APPOINTMENT:READ",
				order: 1,
			},
			{
				id: "appointments-schedule",
				label: "Schedule",
				path: "/dashboard/appointments/schedule",
				permission: "APPOINTMENT:CREATE",
				order: 2,
			},
			{
				id: "appointments-calendar",
				label: "Calendar",
				path: "/dashboard/appointments/calendar",
				permission: "APPOINTMENT:READ",
				order: 3,
			},
		],
	},

	// Vitals - Nurses
	{
		id: "vitals",
		label: "Vitals",
		icon: "vital_signs",
		permission: "VITALS:READ",
		order: 7,
		visible: true,
		children: [
			{
				id: "vitals-record",
				label: "Record Vitals",
				path: "/dashboard/vitals/record",
				permission: "VITALS:CREATE",
				order: 1,
			},
			{
				id: "vitals-history",
				label: "History",
				path: "/dashboard/vitals/history",
				permission: "VITALS:READ",
				order: 2,
			},
		],
	},

	// Pharmacy - Pharmacists
	{
		id: "pharmacy",
		label: "Dispensing",
		icon: "local_pharmacy",
		permission: "DISPENSING:READ",
		order: 8,
		visible: true,
		children: [
			{
				id: "pharmacy-queue",
				label: "Queue",
				path: "/dashboard/dispensing",
				permission: "DISPENSING:READ",
				order: 1,
			},
			{
				id: "pharmacy-history",
				label: "History",
				path: "/dashboard/dispensing/history",
				permission: "DISPENSING:READ",
				order: 2,
			},
		],
	},

	// Inventory - Pharmacists
	{
		id: "inventory",
		label: "Inventory",
		icon: "inventory",
		path: "/dashboard/inventory",
		permission: "INVENTORY:READ",
		order: 9,
		visible: true,
		children: [
			{
				id: "inventory-list",
				label: "Stock Overview",
				path: "/dashboard/inventory",
				permission: "INVENTORY:READ",
				order: 1,
			},
			{
				id: "inventory-medicines",
				label: "Medicine Catalog",
				path: "/dashboard/inventory/medicines",
				permission: "INVENTORY:READ",
				order: 2,
			},
			{
				id: "inventory-expiring",
				label: "Expiring Items",
				path: "/dashboard/inventory/expiring",
				permission: "INVENTORY:READ",
				order: 3,
			},
			{
				id: "inventory-transactions",
				label: "Transactions",
				path: "/dashboard/inventory/transactions",
				permission: "INVENTORY:READ",
				order: 4,
			},
		],
	},

	// Queue - Receptionists
	{
		id: "queue",
		label: "Queue",
		icon: "queue",
		path: "/dashboard/patients/opd-queue",
		permission: "QUEUE:MANAGE",
		order: 10,
		visible: true,
	},

	// Departments - Hospital Admin
	{
		id: "departments",
		label: "Departments",
		icon: "business",
		permission: "DEPARTMENT:READ",
		order: 11,
		visible: true,
		children: [
			{
				id: "departments-list",
				label: "All Departments",
				path: "/dashboard/departments",
				permission: "DEPARTMENT:READ",
				order: 1,
			},
			{
				id: "departments-add",
				label: "Add Department",
				path: "/dashboard/departments/add",
				permission: "DEPARTMENT:CREATE",
				order: 2,
			},
		],
	},

	// Reports - Hospital Admin
	{
		id: "reports",
		label: "Reports",
		icon: "assignment",
		path: "/dashboard/reports",
		permission: "REPORT:READ",
		order: 12,
		visible: true,
		children: [
			{
				id: "reports-patients",
				label: "Patient Reports",
				path: "/dashboard/reports/patients",
				permission: "REPORT:READ",
				order: 1,
			},
			{
				id: "reports-appointments",
				label: "Appointment Reports",
				path: "/dashboard/reports/appointments",
				permission: "REPORT:READ",
				order: 2,
			},
			{
				id: "reports-revenue",
				label: "Revenue Reports",
				path: "/dashboard/reports/revenue",
				permission: "REPORT:READ",
				order: 3,
			},
		],
	},

	// Settings - Hospital Admin
	{
		id: "settings",
		label: "Settings",
		icon: "settings",
		path: "/dashboard/settings",
		permission: "SETTINGS:MANAGE",
		order: 13,
		visible: true,
		children: [
			{
				id: "settings-general",
				label: "General",
				path: "/dashboard/settings/general",
				permission: "SETTINGS:MANAGE",
				order: 1,
			},
			{
				id: "settings-profile",
				label: "Hospital Profile",
				path: "/dashboard/settings/profile",
				permission: "SETTINGS:MANAGE",
				order: 2,
			},
			{
				id: "settings-security",
				label: "Security",
				path: "/dashboard/settings/security",
				permission: "SETTINGS:MANAGE",
				order: 3,
			},
			{
				id: "settings-notifications",
				label: "Notifications",
				path: "/dashboard/settings/notifications",
				permission: "SETTINGS:MANAGE",
				order: 4,
			},
			{
				id: "settings-privacy",
				label: "Privacy & Consent",
				path: "/dashboard/settings/privacy",
				permission: "COMPLIANCE:READ",
				order: 5,
			},
			{
				id: "settings-data-export",
				label: "Data Export",
				path: "/dashboard/settings/data-export",
				permission: "COMPLIANCE:READ",
				order: 6,
			},
			{
				id: "settings-data-deletion",
				label: "Data Deletion",
				path: "/dashboard/settings/data-deletion",
				permission: "COMPLIANCE:READ",
				order: 7,
			},
		],
	},

	// Admin Compliance - Hospital Admin only
	{
		id: "admin-compliance",
		label: "Compliance",
		icon: "shield_check",
		path: "/dashboard/admin/compliance",
		permission: "COMPLIANCE:MANAGE",
		order: 14,
		visible: true,
	},

	// Admin Security - Hospital Admin only
	{
		id: "admin-security",
		label: "Security Admin",
		icon: "security",
		permission: "SECURITY:READ",
		order: 15,
		visible: true,
		children: [
			{
				id: "admin-security-overview",
				label: "Overview",
				path: "/dashboard/admin/security",
				permission: "SECURITY:READ",
				order: 1,
			},
			{
				id: "admin-security-events",
				label: "Security Events",
				path: "/dashboard/admin/security/events",
				permission: "SECURITY:READ",
				order: 2,
			},
			{
				id: "admin-security-keys",
				label: "Encryption Keys",
				path: "/dashboard/admin/security/keys",
				permission: "SECURITY:MANAGE",
				order: 3,
			},
		],
	},
];
