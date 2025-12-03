import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/dispensing/:prescriptionId/unavailable - Not found", () => {
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

	it("returns 404 when dispensing record does not exist", async () => {
		const nonExistentId = uuidv4();
		const response = await request(app)
			.post(`/api/dispensing/${nonExistentId}/unavailable`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				medicineId: uuidv4(),
				reason: "Out of stock",
			});

		expect(response.status).toBe(404);
	});
});
