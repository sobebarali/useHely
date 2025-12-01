/**
 * List Consent Records Validation
 *
 * Endpoint: GET /api/compliance/consent
 * Description: Get all consent records for the authenticated user
 * Auth: Required
 */

import { z } from "zod";

// No query params needed for listing user's own consent
export const listConsentSchema = z.object({});

export type ListConsentInput = z.infer<typeof listConsentSchema>;

export interface ConsentRecord {
	id: string;
	purpose: string;
	description: string | null;
	granted: boolean;
	grantedAt: string | null;
	withdrawnAt: string | null;
	version: string;
	source: string;
}

export interface ListConsentOutput {
	consents: ConsentRecord[];
}
