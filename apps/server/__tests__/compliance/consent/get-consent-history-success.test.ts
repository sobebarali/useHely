import { Consent, ConsentHistory } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/compliance/consent/:purpose/history - Success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let consentId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: [],
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create consent with history
		const consentResponse = await request(app)
			.post("/api/compliance/consent")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				purpose: "analytics",
				granted: true,
				source: "settings",
			});

		consentId = consentResponse.body.data.id;

		// Update consent to create history
		await request(app)
			.post("/api/compliance/consent")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				purpose: "analytics",
				granted: false,
				source: "settings",
			});

		// Update again
		await request(app)
			.post("/api/compliance/consent")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				purpose: "analytics",
				granted: true,
				source: "settings",
			});
	}, 30000);

	afterAll(async () => {
		if (consentId) {
			await ConsentHistory.deleteMany({ consentId });
			await Consent.deleteOne({ _id: consentId });
		}
		await context.cleanup();
	});

	it("returns consent history for a purpose", async () => {
		const response = await request(app)
			.get("/api/compliance/consent/analytics/history")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toHaveProperty("purpose", "analytics");
		expect(response.body.data).toHaveProperty("history");
		expect(response.body.data.history).toBeInstanceOf(Array);
		expect(response.body.data.history.length).toBeGreaterThanOrEqual(3);
	});

	it("returns history entries with correct structure", async () => {
		const response = await request(app)
			.get("/api/compliance/consent/analytics/history")
			.set("Authorization", `Bearer ${accessToken}`);

		const historyEntry = response.body.data.history[0];
		expect(historyEntry).toHaveProperty("action");
		expect(historyEntry).toHaveProperty("timestamp");
		expect(historyEntry).toHaveProperty("source");
	});
});
