import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/dispensing/:prescriptionId/start - Prescription not found", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["DISPENSING:CREATE"],
			pricingTier: "PROFESSIONAL",
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 404 when prescription does not exist", async () => {
		const nonExistentId = uuidv4();
		const response = await request(app)
			.post(`/api/dispensing/${nonExistentId}/start`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
	});
});
