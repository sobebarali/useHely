import { Medicine } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/inventory/medicines - List medicines success", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["INVENTORY:READ"],
			includeDepartment: true,
			pricingTier: "PROFESSIONAL",
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create test medicines
		await Medicine.create([
			{
				_id: uuidv4(),
				tenantId: context.hospitalId,
				name: `Paracetamol ${context.uniqueId}`,
				genericName: "Acetaminophen",
				code: `PARA-${context.uniqueId}`,
				category: "ANALGESICS",
				type: "TABLET",
				unit: "tablets",
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				_id: uuidv4(),
				tenantId: context.hospitalId,
				name: `Amoxicillin ${context.uniqueId}`,
				genericName: "Amoxicillin",
				code: `AMOX-${context.uniqueId}`,
				category: "ANTIBIOTICS",
				type: "CAPSULE",
				unit: "capsules",
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		]);
	}, 30000);

	afterAll(async () => {
		await Medicine.deleteMany({ tenantId: context.hospitalId });
		await context.cleanup();
	});

	it("returns list of medicines with default pagination", async () => {
		const response = await request(app)
			.get("/api/inventory/medicines")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("data");
		expect(response.body).toHaveProperty("pagination");
		expect(Array.isArray(response.body.data)).toBe(true);
		expect(response.body.data.length).toBeGreaterThanOrEqual(2);

		// Check medicine object structure
		const medicine = response.body.data[0];
		expect(medicine).toHaveProperty("id");
		expect(medicine).toHaveProperty("name");
		expect(medicine).toHaveProperty("genericName");
		expect(medicine).toHaveProperty("code");
		expect(medicine).toHaveProperty("category");
		expect(medicine).toHaveProperty("type");
		expect(medicine).toHaveProperty("unit");

		// Check pagination structure
		expect(response.body.pagination).toHaveProperty("page");
		expect(response.body.pagination).toHaveProperty("limit");
		expect(response.body.pagination).toHaveProperty("total");
		expect(response.body.pagination).toHaveProperty("totalPages");
	});
});
