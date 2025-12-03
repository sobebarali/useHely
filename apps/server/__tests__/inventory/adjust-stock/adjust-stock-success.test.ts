import { Inventory, InventoryTransaction, Medicine } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/inventory/:id/adjust - Adjust stock success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let inventoryId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["INVENTORY:UPDATE", "INVENTORY:READ"],
			includeDepartment: true,
			pricingTier: "PROFESSIONAL",
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

		// Create inventory item with stock
		inventoryId = `${context.hospitalId}-INV-${context.uniqueId}`;
		await Inventory.create({
			_id: inventoryId,
			tenantId: context.hospitalId,
			medicineId,
			currentStock: 100,
			reorderLevel: 20,
			maxStock: 500,
			batches: [
				{
					batchNumber: `BATCH-${context.uniqueId}`,
					quantity: 100,
					expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
					purchasePrice: 10.0,
					receivedDate: new Date(),
				},
			],
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

	it("adjusts stock with positive adjustment (CORRECTION)", async () => {
		const adjustmentData = {
			adjustment: 10,
			reason: "CORRECTION",
			notes: "Inventory count correction - found extra units",
		};

		const response = await request(app)
			.post(`/api/inventory/${inventoryId}/adjust`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send(adjustmentData);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("id", inventoryId);
		expect(response.body).toHaveProperty("previousStock", 100);
		expect(response.body).toHaveProperty("adjustment", 10);
		expect(response.body).toHaveProperty("currentStock", 110);
		expect(response.body).toHaveProperty("reason", "CORRECTION");
		expect(response.body).toHaveProperty("transactionId");

		// Verify database updated
		const inventory = await Inventory.findById(inventoryId).lean();
		expect(inventory?.currentStock).toBe(110);

		// Verify transaction created
		const transaction = await InventoryTransaction.findOne({
			inventoryId,
			type: "ADJUSTMENT",
		}).lean();
		expect(transaction).not.toBeNull();
		expect(transaction?.quantity).toBe(10);
		// Transaction reason includes notes if provided
		expect(transaction?.reason).toContain("CORRECTION");
	});

	it("adjusts stock with negative adjustment (DAMAGE)", async () => {
		const adjustmentData = {
			adjustment: -5,
			reason: "DAMAGE",
			notes: "Damaged during storage",
		};

		const response = await request(app)
			.post(`/api/inventory/${inventoryId}/adjust`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send(adjustmentData);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("adjustment", -5);
		expect(response.body).toHaveProperty("reason", "DAMAGE");
		expect(response.body.currentStock).toBe(response.body.previousStock - 5);
	});

	it("adjusts stock with EXPIRY reason", async () => {
		const adjustmentData = {
			adjustment: -3,
			reason: "EXPIRY",
			batchNumber: `BATCH-${context.uniqueId}`,
		};

		const response = await request(app)
			.post(`/api/inventory/${inventoryId}/adjust`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send(adjustmentData);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("reason", "EXPIRY");
	});

	it("adjusts stock with LOSS reason", async () => {
		const adjustmentData = {
			adjustment: -2,
			reason: "LOSS",
		};

		const response = await request(app)
			.post(`/api/inventory/${inventoryId}/adjust`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send(adjustmentData);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("reason", "LOSS");
	});

	it("adjusts stock with RETURN reason (positive adjustment)", async () => {
		const adjustmentData = {
			adjustment: 5,
			reason: "RETURN",
			notes: "Customer return - unopened package",
		};

		const response = await request(app)
			.post(`/api/inventory/${inventoryId}/adjust`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send(adjustmentData);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("reason", "RETURN");
		expect(response.body).toHaveProperty("adjustment", 5);
	});
});
