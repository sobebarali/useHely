/**
 * Terminology configuration for dynamic UI text based on organization type
 *
 * This allows the same codebase to display appropriate terminology for:
 * - Hospitals: "Hospital", "Department", "Ward", etc.
 * - Clinics: "Clinic", "Unit", "Section", etc.
 * - Solo Practices: "Practice", "Service", "Area", etc.
 */

import type { OrganizationType } from "./auth-client";

export interface TerminologyConfig {
	// Organization terms
	organization: string;
	organizationPlural: string;
	organizationPossessive: string;

	// Facility terms
	facility: string;
	facilityPlural: string;

	// Department/unit terms
	department: string;
	departmentPlural: string;

	// Admin terms
	admin: string;
	adminPlural: string;
	adminTitle: string;

	// Patient flow terms
	admission: string;
	admissionPlural: string;
	admissionVerb: string;

	// Staff terms
	staff: string;
	staffPlural: string;
	staffMember: string;

	// Dashboard labels
	dashboardTitle: string;
	settingsTitle: string;

	// Registration messages
	registrationTitle: string;
	registrationSubtitle: string;
	registrationSuccessTitle: string;
	registrationSuccessMessage: string;
}

const hospitalTerminology: TerminologyConfig = {
	organization: "Hospital",
	organizationPlural: "Hospitals",
	organizationPossessive: "Hospital's",

	facility: "Hospital",
	facilityPlural: "Hospitals",

	department: "Department",
	departmentPlural: "Departments",

	admin: "Administrator",
	adminPlural: "Administrators",
	adminTitle: "Hospital Administrator",

	admission: "Admission",
	admissionPlural: "Admissions",
	admissionVerb: "Admit",

	staff: "Staff",
	staffPlural: "Staff Members",
	staffMember: "Staff Member",

	dashboardTitle: "Hospital Dashboard",
	settingsTitle: "Hospital Settings",

	registrationTitle: "Register Your Hospital",
	registrationSubtitle:
		"Set up your hospital management system in minutes. Start managing patients, appointments, and staff efficiently.",
	registrationSuccessTitle: "Hospital Registered Successfully",
	registrationSuccessMessage:
		"A verification email has been sent to the admin email address. Please verify to complete the registration.",
};

const clinicTerminology: TerminologyConfig = {
	organization: "Clinic",
	organizationPlural: "Clinics",
	organizationPossessive: "Clinic's",

	facility: "Clinic",
	facilityPlural: "Clinics",

	department: "Unit",
	departmentPlural: "Units",

	admin: "Manager",
	adminPlural: "Managers",
	adminTitle: "Clinic Manager",

	admission: "Visit",
	admissionPlural: "Visits",
	admissionVerb: "Schedule",

	staff: "Team",
	staffPlural: "Team Members",
	staffMember: "Team Member",

	dashboardTitle: "Clinic Dashboard",
	settingsTitle: "Clinic Settings",

	registrationTitle: "Register Your Clinic",
	registrationSubtitle:
		"Set up your clinic management system in minutes. Start managing patients, appointments, and team efficiently.",
	registrationSuccessTitle: "Clinic Registered Successfully",
	registrationSuccessMessage:
		"Your clinic has been activated. Check your email for login credentials to get started.",
};

const soloPracticeTerminology: TerminologyConfig = {
	organization: "Practice",
	organizationPlural: "Practices",
	organizationPossessive: "Practice's",

	facility: "Practice",
	facilityPlural: "Practices",

	department: "Service",
	departmentPlural: "Services",

	admin: "Owner",
	adminPlural: "Owners",
	adminTitle: "Practice Owner",

	admission: "Appointment",
	admissionPlural: "Appointments",
	admissionVerb: "Book",

	staff: "You",
	staffPlural: "Staff",
	staffMember: "Provider",

	dashboardTitle: "My Practice",
	settingsTitle: "Practice Settings",

	registrationTitle: "Start Your Solo Practice",
	registrationSubtitle:
		"Set up your practice management system in minutes. Manage your patients, appointments, and records with ease.",
	registrationSuccessTitle: "Practice Created Successfully",
	registrationSuccessMessage:
		"Your practice has been activated. Check your email for login credentials to get started.",
};

const terminologyMap: Record<OrganizationType, TerminologyConfig> = {
	HOSPITAL: hospitalTerminology,
	CLINIC: clinicTerminology,
	SOLO_PRACTICE: soloPracticeTerminology,
};

/**
 * Get terminology configuration for a given organization type
 * Defaults to hospital terminology if type is not specified
 */
export function getTerminology(
	type: OrganizationType | undefined,
): TerminologyConfig {
	return terminologyMap[type || "HOSPITAL"];
}

/**
 * Organization type display names for UI selectors
 */
export const organizationTypeLabels: Record<OrganizationType, string> = {
	HOSPITAL: "Hospital",
	CLINIC: "Clinic",
	SOLO_PRACTICE: "Solo Practice",
};

/**
 * Organization type descriptions for registration
 */
export const organizationTypeDescriptions: Record<OrganizationType, string> = {
	HOSPITAL:
		"Large healthcare facility with multiple departments, wards, and staff. Requires license verification.",
	CLINIC:
		"Medical clinic with one or more doctors and support staff. Instant activation.",
	SOLO_PRACTICE:
		"Individual practitioner managing their own patients. Instant activation with full access.",
};

/**
 * Get the organization types available for self-service registration
 */
export const selfServiceTypes: OrganizationType[] = ["CLINIC", "SOLO_PRACTICE"];

/**
 * Check if an organization type requires verification
 */
export function requiresVerification(type: OrganizationType): boolean {
	return type === "HOSPITAL";
}

export default terminologyMap;
