import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/inventory/medicines - Add medicine forbidden", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["INVENTORY:READ"], // Only READ, no CREATE
			includeDepartment: true,
			pricingTier: "PROFESSIONAL",
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 403 when user lacks INVENTORY:CREATE permission", async () => {
		const response = await request(app)
			.post("/api/inventory/medicines")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				name: "Test Medicine",
				genericName: "Test Generic",
				category: "ANALGESICS",
				type: "TABLET",
				unit: "tablets",
			});

		expect(response.status).toBe(403);
	});
});
