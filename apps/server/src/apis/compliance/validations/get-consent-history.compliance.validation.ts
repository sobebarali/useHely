/**
 * Get Consent History Validation
 *
 * Endpoint: GET /api/compliance/consent/:purpose/history
 * Description: Get history of consent changes for a specific purpose
 * Auth: Required
 */

import { ConsentPurpose } from "@hms/db";
import { z } from "zod";

export const getConsentHistorySchema = z.object({
	params: z.object({
		purpose: z.enum([
			ConsentPurpose.TERMS_OF_SERVICE,
			ConsentPurpose.PRIVACY_POLICY,
			ConsentPurpose.MARKETING_EMAILS,
			ConsentPurpose.SMS_NOTIFICATIONS,
			ConsentPurpose.ANALYTICS,
			ConsentPurpose.THIRD_PARTY_SHARING,
		]),
	}),
});

export type GetConsentHistoryInput = z.infer<
	typeof getConsentHistorySchema
>["params"];

export interface ConsentHistoryEntry {
	action: string;
	timestamp: string;
	source: string;
	ip: string | null;
}

export interface GetConsentHistoryOutput {
	purpose: string;
	history: ConsentHistoryEntry[];
}
