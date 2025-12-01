/**
 * Record Consent Validation
 *
 * Endpoint: POST /api/compliance/consent
 * Description: Record a new consent or update existing consent
 * Auth: Required
 */

import { ConsentPurpose, ConsentSource } from "@hms/db";
import { z } from "zod";

export const recordConsentSchema = z.object({
	body: z.object({
		purpose: z.enum([
			ConsentPurpose.TERMS_OF_SERVICE,
			ConsentPurpose.PRIVACY_POLICY,
			ConsentPurpose.MARKETING_EMAILS,
			ConsentPurpose.SMS_NOTIFICATIONS,
			ConsentPurpose.ANALYTICS,
			ConsentPurpose.THIRD_PARTY_SHARING,
		]),
		granted: z.boolean(),
		source: z
			.enum([
				ConsentSource.REGISTRATION,
				ConsentSource.SETTINGS,
				ConsentSource.PROMPT,
				ConsentSource.API,
			])
			.optional()
			.default(ConsentSource.API),
	}),
});

export type RecordConsentInput = z.infer<typeof recordConsentSchema>["body"];

export interface RecordConsentOutput {
	id: string;
	purpose: string;
	granted: boolean;
	grantedAt: string | null;
	withdrawnAt: string | null;
	version: string;
}
