import { Medicine } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/inventory/medicines - Add medicine auto code", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["INVENTORY:CREATE", "INVENTORY:READ"],
			includeDepartment: true,
			pricingTier: "PROFESSIONAL",
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await Medicine.deleteMany({ tenantId: context.hospitalId });
		await context.cleanup();
	});

	it("auto-generates a unique code when code is not provided", async () => {
		const response = await request(app)
			.post("/api/inventory/medicines")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				name: `Auto Code Medicine ${context.uniqueId}`,
				genericName: "Test Generic",
				category: "ANALGESICS",
				type: "TABLET",
				unit: "tablets",
			});

		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty("code");
		expect(response.body.code).toBeTruthy();
		expect(typeof response.body.code).toBe("string");
		expect(response.body.code.length).toBeGreaterThan(0);
	});
});
