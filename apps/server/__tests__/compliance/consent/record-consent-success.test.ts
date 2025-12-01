import { Consent, ConsentHistory } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/compliance/consent - Record consent success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let createdConsentId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: [], // No special permissions needed for own consent
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		if (createdConsentId) {
			await ConsentHistory.deleteMany({ consentId: createdConsentId });
			await Consent.deleteOne({ _id: createdConsentId });
		}
		await context.cleanup();
	});

	it("records new consent successfully", async () => {
		const payload = {
			purpose: "marketing_emails",
			granted: true,
			source: "settings",
		};

		const response = await request(app)
			.post("/api/compliance/consent")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(201);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toHaveProperty("id");
		expect(response.body.data.purpose).toBe("marketing_emails");
		expect(response.body.data.granted).toBe(true);
		expect(response.body.data).toHaveProperty("grantedAt");
		expect(response.body.data.version).toBe("1.0");

		createdConsentId = response.body.data.id;

		// Verify consent was created in database
		const consent = await Consent.findById(createdConsentId);
		expect(consent).not.toBeNull();
		expect(consent?.granted).toBe(true);
		expect(consent?.purpose).toBe("marketing_emails");
	});

	it("updates existing consent successfully", async () => {
		// First consent should already exist from previous test
		const payload = {
			purpose: "marketing_emails",
			granted: false,
			source: "settings",
		};

		const response = await request(app)
			.post("/api/compliance/consent")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.granted).toBe(false);
		expect(response.body.data).toHaveProperty("withdrawnAt");

		// Verify history was created
		const history = await ConsentHistory.find({
			consentId: createdConsentId,
		}).sort({ timestamp: -1 });
		expect(history.length).toBeGreaterThanOrEqual(2);
	});
});
