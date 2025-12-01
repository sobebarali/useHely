import { Consent, ConsentHistory } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("PUT /api/compliance/consent/:id/withdraw - Withdraw consent success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let consentId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: [],
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create a consent to withdraw
		const consentResponse = await request(app)
			.post("/api/compliance/consent")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				purpose: "sms_notifications",
				granted: true,
				source: "settings",
			});

		consentId = consentResponse.body.data.id;
	}, 30000);

	afterAll(async () => {
		if (consentId) {
			await ConsentHistory.deleteMany({ consentId });
			await Consent.deleteOne({ _id: consentId });
		}
		await context.cleanup();
	});

	it("withdraws granted consent successfully", async () => {
		const response = await request(app)
			.put(`/api/compliance/consent/${consentId}/withdraw`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.id).toBe(consentId);
		expect(response.body.data.granted).toBe(false);
		expect(response.body.data).toHaveProperty("withdrawnAt");
		expect(response.body.data).toHaveProperty("message");
	});

	it("verifies consent is updated in database", async () => {
		const consent = await Consent.findById(consentId);

		expect(consent).not.toBeNull();
		expect(consent?.granted).toBe(false);
		expect(consent?.withdrawnAt).toBeTruthy();
	});

	it("verifies consent history is updated", async () => {
		const history = await ConsentHistory.find({ consentId }).sort({
			timestamp: -1,
		});

		expect(history.length).toBeGreaterThanOrEqual(2);
		expect(history[0]).toBeDefined();
		expect(history[0]?.action).toBe("withdrawn");
	});
});
