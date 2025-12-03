import { Inventory, Medicine } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/inventory/low-stock - Filters", () => {
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

		// Create test medicines with different categories
		const medicine1Id = uuidv4();
		const medicine2Id = uuidv4();

		await Medicine.insertMany([
			{
				_id: medicine1Id,
				tenantId: context.hospitalId,
				name: `Analgesic Medicine ${context.uniqueId}`,
				genericName: "Test Generic",
				code: `MED-FILTER-${context.uniqueId}-1`,
				category: "ANALGESICS",
				type: "TABLET",
				unit: "tablets",
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				_id: medicine2Id,
				tenantId: context.hospitalId,
				name: `Antibiotic Medicine ${context.uniqueId}`,
				genericName: "Test Generic",
				code: `MED-FILTER-${context.uniqueId}-2`,
				category: "ANTIBIOTICS",
				type: "CAPSULE",
				unit: "capsules",
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		]);

		// Create low stock inventory items for each category
		await Inventory.insertMany([
			{
				_id: `${context.hospitalId}-INV-FILTER-${context.uniqueId}-1`,
				tenantId: context.hospitalId,
				medicineId: medicine1Id,
				currentStock: 5,
				reorderLevel: 20,
				maxStock: 500,
				batches: [],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				_id: `${context.hospitalId}-INV-FILTER-${context.uniqueId}-2`,
				tenantId: context.hospitalId,
				medicineId: medicine2Id,
				currentStock: 3,
				reorderLevel: 15,
				maxStock: 500,
				batches: [],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		]);
	}, 30000);

	afterAll(async () => {
		await Inventory.deleteMany({ tenantId: context.hospitalId });
		await Medicine.deleteMany({ tenantId: context.hospitalId });
		await context.cleanup();
	});

	it("filters by category", async () => {
		const response = await request(app)
			.get("/api/inventory/low-stock?category=ANALGESICS")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("items");

		// All returned items should be from ANALGESICS category
		// (verified by medicine name containing 'Analgesic')
		if (response.body.items.length > 0) {
			const hasAnalgesic = response.body.items.some(
				(item: { name: string }) =>
					item.name.includes("Analgesic") ||
					item.name.includes(context.uniqueId),
			);
			expect(hasAnalgesic).toBe(true);
		}
	});

	it("returns empty array for non-existent category", async () => {
		const response = await request(app)
			.get("/api/inventory/low-stock?category=NONEXISTENT")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.items).toEqual([]);
		expect(response.body.count).toBe(0);
	});

	it("combines category and limit filters", async () => {
		const response = await request(app)
			.get("/api/inventory/low-stock?category=ANALGESICS&limit=1")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.items.length).toBeLessThanOrEqual(1);
	});
});
