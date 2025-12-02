/**
 * Hook for accessing dynamic terminology based on organization type
 *
 * This hook provides terminology that adapts based on the current
 * organization type (Hospital, Clinic, or Solo Practice).
 */

import { useMemo } from "react";
import type { OrganizationType } from "../lib/auth-client";
import {
	getTerminology,
	organizationTypeDescriptions,
	organizationTypeLabels,
	requiresVerification,
	selfServiceTypes,
	type TerminologyConfig,
} from "../lib/terminology";
import { useSession } from "./use-auth";
import { useHospital } from "./use-hospital";

interface UseTerminologyResult {
	/** Current terminology configuration */
	terminology: TerminologyConfig;

	/** Current organization type */
	organizationType: OrganizationType;

	/** Whether the current organization requires verification */
	needsVerification: boolean;

	/** Whether terminology is still loading */
	isLoading: boolean;

	/** Get terminology for a specific organization type (useful for registration) */
	getTerminologyFor: (type: OrganizationType) => TerminologyConfig;

	/** Organization type labels for display */
	typeLabels: typeof organizationTypeLabels;

	/** Organization type descriptions for registration */
	typeDescriptions: typeof organizationTypeDescriptions;

	/** Types available for self-service registration */
	selfServiceTypes: typeof selfServiceTypes;

	/** Check if a type requires verification */
	requiresVerification: typeof requiresVerification;
}

/**
 * Hook to access terminology based on the current user's organization
 *
 * @example
 * ```tsx
 * function DashboardHeader() {
 *   const { terminology } = useTerminology();
 *   return <h1>{terminology.dashboardTitle}</h1>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * function RegistrationForm() {
 *   const { typeLabels, typeDescriptions, getTerminologyFor } = useTerminology();
 *   const [selectedType, setSelectedType] = useState<OrganizationType>("CLINIC");
 *   const terminology = getTerminologyFor(selectedType);
 *
 *   return (
 *     <div>
 *       <h1>{terminology.registrationTitle}</h1>
 *       // ...
 *     </div>
 *   );
 * }
 * ```
 */
export function useTerminology(): UseTerminologyResult {
	const { data: user, isLoading: isAuthLoading } = useSession();
	const tenantId = user?.tenantId;

	const { data: hospital, isLoading: isHospitalLoading } =
		useHospital(tenantId);

	const organizationType: OrganizationType = useMemo(() => {
		if (hospital?.type) {
			return hospital.type;
		}
		// Default to HOSPITAL for backwards compatibility
		return "HOSPITAL";
	}, [hospital?.type]);

	const terminology = useMemo(
		() => getTerminology(organizationType),
		[organizationType],
	);

	const needsVerification = useMemo(
		() => requiresVerification(organizationType),
		[organizationType],
	);

	const isLoading = isAuthLoading || (!!tenantId && isHospitalLoading);

	return {
		terminology,
		organizationType,
		needsVerification,
		isLoading,
		getTerminologyFor: getTerminology,
		typeLabels: organizationTypeLabels,
		typeDescriptions: organizationTypeDescriptions,
		selfServiceTypes,
		requiresVerification,
	};
}

/**
 * Hook for registration page - provides terminology without requiring authentication
 *
 * @param type - The selected organization type
 */
export function useRegistrationTerminology(
	type: OrganizationType = "HOSPITAL",
) {
	const terminology = useMemo(() => getTerminology(type), [type]);

	const needsVerification = useMemo(() => requiresVerification(type), [type]);

	return {
		terminology,
		needsVerification,
		typeLabels: organizationTypeLabels,
		typeDescriptions: organizationTypeDescriptions,
		selfServiceTypes,
		requiresVerification,
		getTerminologyFor: getTerminology,
	};
}

export type { TerminologyConfig };
