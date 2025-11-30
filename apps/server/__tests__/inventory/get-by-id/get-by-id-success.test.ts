import { Inventory, InventoryTransaction, Medicine } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/inventory/:id - Get inventory item success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let medicineId: string;
	let inventoryId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["INVENTORY:READ", "INVENTORY:UPDATE"],
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
			manufacturer: "TestCorp",
			strength: "500mg",
			unit: "tablets",
			description: "Test description",
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create inventory item with batches
		inventoryId = `${context.hospitalId}-INV-${context.uniqueId}`;
		await Inventory.create({
			_id: inventoryId,
			tenantId: context.hospitalId,
			medicineId,
			currentStock: 150,
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
				{
					batchNumber: "BATCH-002",
					quantity: 50,
					expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
					receivedDate: new Date(),
					supplier: "MediSupply",
				},
			],
			lastRestocked: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create transaction for the inventory
		await InventoryTransaction.create({
			_id: uuidv4(),
			tenantId: context.hospitalId,
			inventoryId,
			type: "RECEIPT",
			quantity: 100,
			batchNumber: "BATCH-001",
			performedBy: context.staffId,
			performedAt: new Date(),
			createdAt: new Date(),
		});
	}, 30000);

	afterAll(async () => {
		await InventoryTransaction.deleteMany({ tenantId: context.hospitalId });
		await Inventory.deleteMany({ tenantId: context.hospitalId });
		await Medicine.deleteMany({ tenantId: context.hospitalId });
		await context.cleanup();
	});

	it("returns inventory item with full details", async () => {
		const response = await request(app)
			.get(`/api/inventory/${inventoryId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("id", inventoryId);
		expect(response.body).toHaveProperty("medicine");
		expect(response.body).toHaveProperty("currentStock", 150);
		expect(response.body).toHaveProperty("reorderLevel", 20);
		expect(response.body).toHaveProperty("maxStock", 500);
		expect(response.body).toHaveProperty("location", "Shelf A1");
		expect(response.body).toHaveProperty("batches");
		expect(response.body).toHaveProperty("transactions");
		expect(response.body).toHaveProperty("status");

		// Check medicine details
		expect(response.body.medicine).toHaveProperty("id", medicineId);
		expect(response.body.medicine).toHaveProperty("name");
		expect(response.body.medicine).toHaveProperty("genericName");
		expect(response.body.medicine).toHaveProperty("category");
		expect(response.body.medicine).toHaveProperty("type");

		// Check batches
		expect(Array.isArray(response.body.batches)).toBe(true);
		expect(response.body.batches.length).toBe(2);

		// Check transactions
		expect(Array.isArray(response.body.transactions)).toBe(true);
	});
});
