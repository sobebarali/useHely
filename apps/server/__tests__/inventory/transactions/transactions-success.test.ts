import { Inventory, InventoryTransaction, Medicine } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/inventory/transactions - Success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let inventoryId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["INVENTORY:READ", "INVENTORY:UPDATE"],
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
			name: `Transaction Medicine ${context.uniqueId}`,
			genericName: "Test Generic",
			code: `MED-TXN-${context.uniqueId}`,
			category: "ANALGESICS",
			type: "TABLET",
			unit: "tablets",
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create inventory item
		inventoryId = `${context.hospitalId}-INV-TXN-${context.uniqueId}`;
		await Inventory.create({
			_id: inventoryId,
			tenantId: context.hospitalId,
			medicineId,
			currentStock: 100,
			reorderLevel: 20,
			maxStock: 500,
			batches: [],
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create test transactions
		const now = new Date();
		await InventoryTransaction.insertMany([
			{
				_id: uuidv4(),
				tenantId: context.hospitalId,
				inventoryId,
				type: "RECEIPT",
				quantity: 100,
				batchNumber: `BATCH-TXN-1-${context.uniqueId}`,
				reference: `TXN-1-${context.uniqueId}`,
				performedBy: context.staffId,
				performedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
				createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
				updatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
			},
			{
				_id: uuidv4(),
				tenantId: context.hospitalId,
				inventoryId,
				type: "DISPENSING",
				quantity: -10,
				reference: `TXN-2-${context.uniqueId}`,
				performedBy: context.staffId,
				performedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
				createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
				updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
			},
			{
				_id: uuidv4(),
				tenantId: context.hospitalId,
				inventoryId,
				type: "ADJUSTMENT",
				quantity: -5,
				reason: "DAMAGE",
				reference: `TXN-3-${context.uniqueId}`,
				performedBy: context.staffId,
				performedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
				createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
				updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
			},
		]);
	}, 30000);

	afterAll(async () => {
		await InventoryTransaction.deleteMany({ tenantId: context.hospitalId });
		await Inventory.deleteMany({ tenantId: context.hospitalId });
		await Medicine.deleteMany({ tenantId: context.hospitalId });
		await context.cleanup();
	});

	it("returns transactions list with pagination", async () => {
		const response = await request(app)
			.get("/api/inventory/transactions")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("data");
		expect(response.body).toHaveProperty("pagination");
		expect(Array.isArray(response.body.data)).toBe(true);
		expect(response.body.pagination).toHaveProperty("page");
		expect(response.body.pagination).toHaveProperty("limit");
		expect(response.body.pagination).toHaveProperty("total");
		expect(response.body.pagination).toHaveProperty("totalPages");
	});

	it("returns transactions with expected properties", async () => {
		const response = await request(app)
			.get("/api/inventory/transactions")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		if (response.body.data.length > 0) {
			const transaction = response.body.data[0];
			expect(transaction).toHaveProperty("id");
			expect(transaction).toHaveProperty("inventoryId");
			expect(transaction).toHaveProperty("medicineName");
			expect(transaction).toHaveProperty("type");
			expect(transaction).toHaveProperty("quantity");
			expect(transaction).toHaveProperty("performedBy");
			expect(transaction).toHaveProperty("performedAt");
			expect(transaction.performedBy).toHaveProperty("id");
			expect(transaction.performedBy).toHaveProperty("firstName");
			expect(transaction.performedBy).toHaveProperty("lastName");
		}
	});

	it("returns transactions sorted by date (most recent first)", async () => {
		const response = await request(app)
			.get("/api/inventory/transactions")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		if (response.body.data.length >= 2) {
			const firstDate = new Date(response.body.data[0].performedAt);
			const secondDate = new Date(response.body.data[1].performedAt);
			expect(firstDate.getTime()).toBeGreaterThanOrEqual(secondDate.getTime());
		}
	});
});
