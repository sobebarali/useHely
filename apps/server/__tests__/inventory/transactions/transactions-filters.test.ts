import { Inventory, InventoryTransaction, Medicine } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/inventory/transactions - Filters", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let inventoryId1: string;
	let inventoryId2: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["INVENTORY:READ"],
			includeDepartment: true,
			pricingTier: "PROFESSIONAL",
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create test medicines
		const medicineId1 = uuidv4();
		const medicineId2 = uuidv4();

		await Medicine.insertMany([
			{
				_id: medicineId1,
				tenantId: context.hospitalId,
				name: `Filter Medicine 1 ${context.uniqueId}`,
				genericName: "Test Generic",
				code: `MED-FILT-1-${context.uniqueId}`,
				category: "ANALGESICS",
				type: "TABLET",
				unit: "tablets",
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				_id: medicineId2,
				tenantId: context.hospitalId,
				name: `Filter Medicine 2 ${context.uniqueId}`,
				genericName: "Test Generic",
				code: `MED-FILT-2-${context.uniqueId}`,
				category: "ANTIBIOTICS",
				type: "CAPSULE",
				unit: "capsules",
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		]);

		// Create inventory items
		inventoryId1 = `${context.hospitalId}-INV-FILT-1-${context.uniqueId}`;
		inventoryId2 = `${context.hospitalId}-INV-FILT-2-${context.uniqueId}`;

		await Inventory.insertMany([
			{
				_id: inventoryId1,
				tenantId: context.hospitalId,
				medicineId: medicineId1,
				currentStock: 100,
				reorderLevel: 20,
				maxStock: 500,
				batches: [],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				_id: inventoryId2,
				tenantId: context.hospitalId,
				medicineId: medicineId2,
				currentStock: 100,
				reorderLevel: 20,
				maxStock: 500,
				batches: [],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		]);

		// Create transactions with different types and dates
		const now = new Date();
		const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

		await InventoryTransaction.insertMany([
			{
				_id: uuidv4(),
				tenantId: context.hospitalId,
				inventoryId: inventoryId1,
				type: "RECEIPT",
				quantity: 50,
				reference: `TXN-FILT-R1-${context.uniqueId}`,
				performedBy: context.staffId,
				performedAt: now,
				createdAt: now,
				updatedAt: now,
			},
			{
				_id: uuidv4(),
				tenantId: context.hospitalId,
				inventoryId: inventoryId1,
				type: "DISPENSING",
				quantity: -10,
				reference: `TXN-FILT-D1-${context.uniqueId}`,
				performedBy: context.staffId,
				performedAt: yesterday,
				createdAt: yesterday,
				updatedAt: yesterday,
			},
			{
				_id: uuidv4(),
				tenantId: context.hospitalId,
				inventoryId: inventoryId2,
				type: "ADJUSTMENT",
				quantity: -5,
				reason: "DAMAGE",
				reference: `TXN-FILT-A1-${context.uniqueId}`,
				performedBy: context.staffId,
				performedAt: lastWeek,
				createdAt: lastWeek,
				updatedAt: lastWeek,
			},
		]);
	}, 30000);

	afterAll(async () => {
		await InventoryTransaction.deleteMany({ tenantId: context.hospitalId });
		await Inventory.deleteMany({ tenantId: context.hospitalId });
		await Medicine.deleteMany({ tenantId: context.hospitalId });
		await context.cleanup();
	});

	it("filters by itemId", async () => {
		const response = await request(app)
			.get(`/api/inventory/transactions?itemId=${inventoryId1}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		// All transactions should be for inventoryId1
		const allForItem1 = response.body.data.every(
			(txn: { inventoryId: string }) => txn.inventoryId === inventoryId1,
		);
		expect(allForItem1).toBe(true);
	});

	it("filters by type", async () => {
		const response = await request(app)
			.get("/api/inventory/transactions?type=RECEIPT")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		// All transactions should be RECEIPT type
		const allReceipt = response.body.data.every(
			(txn: { type: string }) => txn.type === "RECEIPT",
		);
		expect(allReceipt).toBe(true);
	});

	it("filters by date range", async () => {
		const now = new Date();
		const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

		const response = await request(app)
			.get(
				`/api/inventory/transactions?startDate=${twoDaysAgo.toISOString()}&endDate=${now.toISOString()}`,
			)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		// All transactions should be within the date range
		if (response.body.data.length > 0) {
			const allInRange = response.body.data.every(
				(txn: { performedAt: string }) => {
					const txnDate = new Date(txn.performedAt);
					return txnDate >= twoDaysAgo && txnDate <= now;
				},
			);
			expect(allInRange).toBe(true);
		}
	});

	it("combines multiple filters", async () => {
		const response = await request(app)
			.get(
				`/api/inventory/transactions?itemId=${inventoryId1}&type=RECEIPT&limit=10`,
			)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		// Should match both itemId AND type
		const allMatch = response.body.data.every(
			(txn: { inventoryId: string; type: string }) =>
				txn.inventoryId === inventoryId1 && txn.type === "RECEIPT",
		);
		expect(allMatch).toBe(true);
	});

	it("returns 400 for invalid date range (start > end)", async () => {
		const now = new Date();
		const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

		const response = await request(app)
			.get(
				`/api/inventory/transactions?startDate=${now.toISOString()}&endDate=${yesterday.toISOString()}`,
			)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(400);
	});
});
