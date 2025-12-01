import { Consent, ConsentHistory } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("PUT /api/compliance/consent/:id/withdraw - Already withdrawn", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let consentId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: [],
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create and withdraw a consent
		const consentResponse = await request(app)
			.post("/api/compliance/consent")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				purpose: "third_party_sharing",
				granted: true,
				source: "settings",
			});

		consentId = consentResponse.body.data.id;

		// Withdraw the consent
		await request(app)
			.put(`/api/compliance/consent/${consentId}/withdraw`)
			.set("Authorization", `Bearer ${accessToken}`);
	}, 30000);

	afterAll(async () => {
		if (consentId) {
			await ConsentHistory.deleteMany({ consentId });
			await Consent.deleteOne({ _id: consentId });
		}
		await context.cleanup();
	});

	it("returns 400 when consent is already withdrawn", async () => {
		const response = await request(app)
			.put(`/api/compliance/consent/${consentId}/withdraw`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("CONSENT_ALREADY_WITHDRAWN");
	});
});
