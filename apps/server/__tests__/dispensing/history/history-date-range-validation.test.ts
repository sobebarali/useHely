import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/dispensing/history - Date range validation", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["DISPENSING:READ"],
			pricingTier: "PROFESSIONAL",
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 400 when startDate is after endDate", async () => {
		const response = await request(app)
			.get("/api/dispensing/history")
			.query({
				startDate: "2024-12-31",
				endDate: "2024-01-01",
			})
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(400);
	});

	it("accepts valid date range", async () => {
		const response = await request(app)
			.get("/api/dispensing/history")
			.query({
				startDate: "2024-01-01",
				endDate: "2024-12-31",
			})
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
	});
});
