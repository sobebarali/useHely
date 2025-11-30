import { Inventory, Medicine } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/inventory - List inventory success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let medicineId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["INVENTORY:READ"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create test medicine
		medicineId = uuidv4();
		await Medicine.create({
			_id: medicineId,
			tenantId: context.hospitalId,
			name: `Test Medicine ${context.uniqueId}`,
			genericName: "Test Generic",
			code: `MED-${context.uniqueId}`,
			category: "ANALGESICS",
			type: "TABLET",
			unit: "tablets",
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create inventory item
		const inventoryId = `${context.hospitalId}-INV-${context.uniqueId}`;
		await Inventory.create({
			_id: inventoryId,
			tenantId: context.hospitalId,
			medicineId,
			currentStock: 100,
			reorderLevel: 20,
			maxStock: 500,
			location: "Shelf A1",
			batches: [
				{
					batchNumber: "BATCH-001",
					quantity: 100,
					expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
					receivedDate: new Date(),
					supplier: "PharmaCorp",
				},
			],
			lastRestocked: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}, 30000);

	afterAll(async () => {
		await Inventory.deleteMany({ tenantId: context.hospitalId });
		await Medicine.deleteMany({ tenantId: context.hospitalId });
		await context.cleanup();
	});

	it("returns list of inventory items with summary", async () => {
		const response = await request(app)
			.get("/api/inventory")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("data");
		expect(response.body).toHaveProperty("pagination");
		expect(response.body).toHaveProperty("summary");
		expect(Array.isArray(response.body.data)).toBe(true);
		expect(response.body.data.length).toBeGreaterThanOrEqual(1);

		// Check inventory item structure
		const item = response.body.data[0];
		expect(item).toHaveProperty("id");
		expect(item).toHaveProperty("medicineId");
		expect(item).toHaveProperty("name");
		expect(item).toHaveProperty("currentStock");
		expect(item).toHaveProperty("reorderLevel");
		expect(item).toHaveProperty("status");

		// Check summary structure
		expect(response.body.summary).toHaveProperty("totalItems");
		expect(response.body.summary).toHaveProperty("inStock");
		expect(response.body.summary).toHaveProperty("lowStock");
		expect(response.body.summary).toHaveProperty("outOfStock");
		expect(response.body.summary).toHaveProperty("expiringSoon");

		// Check pagination structure
		expect(response.body.pagination).toHaveProperty("page");
		expect(response.body.pagination).toHaveProperty("limit");
		expect(response.body.pagination).toHaveProperty("total");
		expect(response.body.pagination).toHaveProperty("totalPages");
	});
});
