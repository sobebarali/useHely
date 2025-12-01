/**
 * Withdraw Consent Validation
 *
 * Endpoint: PUT /api/compliance/consent/:id/withdraw
 * Description: Withdraw previously granted consent
 * Auth: Required
 */

import { z } from "zod";

export const withdrawConsentSchema = z.object({
	params: z.object({
		id: z.string().min(1, "Consent ID is required"),
	}),
});

export type WithdrawConsentInput = z.infer<
	typeof withdrawConsentSchema
>["params"];

export type WithdrawConsentOutput = {
	id: string;
	purpose: string;
	granted: boolean;
	withdrawnAt: string;
	message: string;
};
