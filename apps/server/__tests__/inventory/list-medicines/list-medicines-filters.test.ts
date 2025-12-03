import { Medicine } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/inventory/medicines - List medicines filters", () => {
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

		// Create test medicines with different categories and types
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
			{
				_id: uuidv4(),
				tenantId: context.hospitalId,
				name: `Cough Syrup ${context.uniqueId}`,
				genericName: "Dextromethorphan",
				code: `SYRUP-${context.uniqueId}`,
				category: "RESPIRATORY",
				type: "SYRUP",
				unit: "ml",
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

	it("filters by search term (name)", async () => {
		const response = await request(app)
			.get("/api/inventory/medicines")
			.query({ search: "Paracetamol" })
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.length).toBeGreaterThanOrEqual(1);
		expect(
			response.body.data.some((m: { name: string }) =>
				m.name.includes("Paracetamol"),
			),
		).toBe(true);
	});

	it("filters by category", async () => {
		const response = await request(app)
			.get("/api/inventory/medicines")
			.query({ category: "ANTIBIOTICS" })
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		for (const medicine of response.body.data) {
			expect(medicine.category).toBe("ANTIBIOTICS");
		}
	});

	it("filters by type", async () => {
		const response = await request(app)
			.get("/api/inventory/medicines")
			.query({ type: "SYRUP" })
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		for (const medicine of response.body.data) {
			expect(medicine.type).toBe("SYRUP");
		}
	});

	it("combines multiple filters", async () => {
		const response = await request(app)
			.get("/api/inventory/medicines")
			.query({ category: "ANALGESICS", type: "TABLET" })
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		for (const medicine of response.body.data) {
			expect(medicine.category).toBe("ANALGESICS");
			expect(medicine.type).toBe("TABLET");
		}
	});
});
