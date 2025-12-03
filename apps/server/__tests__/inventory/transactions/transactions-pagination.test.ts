import { Inventory, InventoryTransaction, Medicine } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/inventory/transactions - Pagination", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let inventoryId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["INVENTORY:READ"],
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
			name: `Pagination Medicine ${context.uniqueId}`,
			genericName: "Test Generic",
			code: `MED-PAGE-${context.uniqueId}`,
			category: "ANALGESICS",
			type: "TABLET",
			unit: "tablets",
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create inventory item
		inventoryId = `${context.hospitalId}-INV-PAGE-${context.uniqueId}`;
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

		// Create multiple transactions for pagination testing
		const now = new Date();
		const transactions = [];
		for (let i = 0; i < 15; i++) {
			transactions.push({
				_id: uuidv4(),
				tenantId: context.hospitalId,
				inventoryId,
				type: "RECEIPT",
				quantity: 10,
				reference: `TXN-PAGE-${context.uniqueId}-${i}`,
				performedBy: context.staffId,
				performedAt: new Date(now.getTime() - i * 60 * 60 * 1000),
				createdAt: new Date(now.getTime() - i * 60 * 60 * 1000),
				updatedAt: new Date(now.getTime() - i * 60 * 60 * 1000),
			});
		}
		await InventoryTransaction.insertMany(transactions);
	}, 30000);

	afterAll(async () => {
		await InventoryTransaction.deleteMany({ tenantId: context.hospitalId });
		await Inventory.deleteMany({ tenantId: context.hospitalId });
		await Medicine.deleteMany({ tenantId: context.hospitalId });
		await context.cleanup();
	});

	it("respects limit parameter", async () => {
		const response = await request(app)
			.get("/api/inventory/transactions?limit=5")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.length).toBeLessThanOrEqual(5);
		expect(response.body.pagination.limit).toBe(5);
	});

	it("respects page parameter", async () => {
		const response = await request(app)
			.get("/api/inventory/transactions?limit=5&page=2")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.pagination.page).toBe(2);
	});

	it("calculates totalPages correctly", async () => {
		const response = await request(app)
			.get("/api/inventory/transactions?limit=5")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		const expectedPages = Math.ceil(response.body.pagination.total / 5);
		expect(response.body.pagination.totalPages).toBe(expectedPages);
	});

	it("returns empty data for page beyond total", async () => {
		const response = await request(app)
			.get("/api/inventory/transactions?limit=5&page=100")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toEqual([]);
	});
});
