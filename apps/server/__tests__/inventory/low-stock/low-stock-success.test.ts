import { Inventory, Medicine } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/inventory/low-stock - Success", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["INVENTORY:READ"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create test medicines
		const medicine1Id = uuidv4();
		const medicine2Id = uuidv4();
		const medicine3Id = uuidv4();

		await Medicine.insertMany([
			{
				_id: medicine1Id,
				tenantId: context.hospitalId,
				name: `Low Stock Medicine ${context.uniqueId}-1`,
				genericName: "Test Generic",
				code: `MED-${context.uniqueId}-1`,
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
				name: `Low Stock Medicine ${context.uniqueId}-2`,
				genericName: "Test Generic",
				code: `MED-${context.uniqueId}-2`,
				category: "ANTIBIOTICS",
				type: "CAPSULE",
				unit: "capsules",
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				_id: medicine3Id,
				tenantId: context.hospitalId,
				name: `Adequate Stock Medicine ${context.uniqueId}`,
				genericName: "Test Generic",
				code: `MED-${context.uniqueId}-3`,
				category: "ANALGESICS",
				type: "TABLET",
				unit: "tablets",
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		]);

		// Create inventory items - some low stock, some adequate
		await Inventory.insertMany([
			{
				_id: `${context.hospitalId}-INV-${context.uniqueId}-1`,
				tenantId: context.hospitalId,
				medicineId: medicine1Id,
				currentStock: 5, // Below reorder level of 20
				reorderLevel: 20,
				maxStock: 500,
				batches: [],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				_id: `${context.hospitalId}-INV-${context.uniqueId}-2`,
				tenantId: context.hospitalId,
				medicineId: medicine2Id,
				currentStock: 10, // At reorder level of 10
				reorderLevel: 10,
				maxStock: 500,
				batches: [],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				_id: `${context.hospitalId}-INV-${context.uniqueId}-3`,
				tenantId: context.hospitalId,
				medicineId: medicine3Id,
				currentStock: 100, // Above reorder level of 20
				reorderLevel: 20,
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

	it("returns low stock items successfully", async () => {
		const response = await request(app)
			.get("/api/inventory/low-stock")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("items");
		expect(response.body).toHaveProperty("count");
		expect(Array.isArray(response.body.items)).toBe(true);

		// Should include items at or below reorder level
		expect(response.body.count).toBeGreaterThanOrEqual(2);

		// Each item should have expected properties
		if (response.body.items.length > 0) {
			const item = response.body.items[0];
			expect(item).toHaveProperty("id");
			expect(item).toHaveProperty("name");
			expect(item).toHaveProperty("currentStock");
			expect(item).toHaveProperty("reorderLevel");
			expect(item).toHaveProperty("deficit");
		}
	});

	it("returns items with correct deficit calculation", async () => {
		const response = await request(app)
			.get("/api/inventory/low-stock")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		// Find our test item with stock 5 and reorder level 20
		const lowStockItem = response.body.items.find(
			(item: { currentStock: number; reorderLevel: number }) =>
				item.currentStock === 5 && item.reorderLevel === 20,
		);

		if (lowStockItem) {
			expect(lowStockItem.deficit).toBe(15); // 20 - 5 = 15
		}
	});

	it("respects limit parameter", async () => {
		const response = await request(app)
			.get("/api/inventory/low-stock?limit=1")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.items.length).toBeLessThanOrEqual(1);
	});
});
