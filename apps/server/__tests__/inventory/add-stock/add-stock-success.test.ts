import { Inventory, InventoryTransaction, Medicine } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/inventory/:id/add - Add stock success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let inventoryId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["INVENTORY:UPDATE", "INVENTORY:READ"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create test medicine
		const medicineId = uuidv4();
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
		inventoryId = `${context.hospitalId}-INV-${context.uniqueId}`;
		await Inventory.create({
			_id: inventoryId,
			tenantId: context.hospitalId,
			medicineId,
			currentStock: 50,
			reorderLevel: 20,
			maxStock: 500,
			batches: [],
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}, 30000);

	afterAll(async () => {
		await InventoryTransaction.deleteMany({ tenantId: context.hospitalId });
		await Inventory.deleteMany({ tenantId: context.hospitalId });
		await Medicine.deleteMany({ tenantId: context.hospitalId });
		await context.cleanup();
	});

	it("adds stock successfully with all required fields", async () => {
		const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
		const stockData = {
			quantity: 100,
			batchNumber: `BATCH-${context.uniqueId}`,
			expiryDate: futureDate.toISOString(),
			purchasePrice: 10.5,
			supplier: "PharmaCorp",
		};

		const response = await request(app)
			.post(`/api/inventory/${inventoryId}/add`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send(stockData);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("id", inventoryId);
		expect(response.body).toHaveProperty("previousStock", 50);
		expect(response.body).toHaveProperty("addedQuantity", 100);
		expect(response.body).toHaveProperty("currentStock", 150);
		expect(response.body).toHaveProperty("batch");
		expect(response.body).toHaveProperty("transactionId");

		// Check batch details
		expect(response.body.batch).toHaveProperty(
			"batchNumber",
			stockData.batchNumber,
		);
		expect(response.body.batch).toHaveProperty("quantity", 100);

		// Verify database updated
		const inventory = await Inventory.findById(inventoryId).lean();
		expect(inventory?.currentStock).toBe(150);
		expect(inventory?.batches?.length).toBeGreaterThanOrEqual(1);

		// Verify transaction created
		const transaction = await InventoryTransaction.findOne({
			inventoryId,
			type: "RECEIPT",
		}).lean();
		expect(transaction).not.toBeNull();
		expect(transaction?.quantity).toBe(100);
	});
});
