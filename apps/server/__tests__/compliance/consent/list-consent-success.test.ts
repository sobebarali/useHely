import { Consent, ConsentHistory } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/compliance/consent - List consent success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	const createdConsentIds: string[] = [];

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: [],
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		for (const consentId of createdConsentIds) {
			await ConsentHistory.deleteMany({ consentId });
			await Consent.deleteOne({ _id: consentId });
		}
		await context.cleanup();
	});

	it("returns empty list when no consents exist", async () => {
		const response = await request(app)
			.get("/api/compliance/consent")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toBeInstanceOf(Array);
		expect(response.body.data.length).toBe(0);
	});

	it("returns user's consent records", async () => {
		// Create consent records first
		const consentResponse1 = await request(app)
			.post("/api/compliance/consent")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				purpose: "marketing_emails",
				granted: true,
				source: "settings",
			});

		createdConsentIds.push(consentResponse1.body.data.id);

		const consentResponse2 = await request(app)
			.post("/api/compliance/consent")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				purpose: "analytics",
				granted: false,
				source: "settings",
			});

		createdConsentIds.push(consentResponse2.body.data.id);

		// List consents
		const response = await request(app)
			.get("/api/compliance/consent")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toBeInstanceOf(Array);
		expect(response.body.data.length).toBe(2);

		const purposes = response.body.data.map(
			(c: { purpose: string }) => c.purpose,
		);
		expect(purposes).toContain("marketing_emails");
		expect(purposes).toContain("analytics");
	});

	it("returns correct consent data structure", async () => {
		const response = await request(app)
			.get("/api/compliance/consent")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		const consent = response.body.data[0];

		expect(consent).toHaveProperty("id");
		expect(consent).toHaveProperty("purpose");
		expect(consent).toHaveProperty("granted");
		expect(consent).toHaveProperty("version");
		expect(consent).toHaveProperty("source");
	});
});
