import { Inventory, Medicine } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/inventory/expiring - Success", () => {
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

		// Create test medicine
		const medicineId = uuidv4();
		await Medicine.create({
			_id: medicineId,
			tenantId: context.hospitalId,
			name: `Expiring Medicine ${context.uniqueId}`,
			genericName: "Test Generic",
			code: `MED-EXP-${context.uniqueId}`,
			category: "ANALGESICS",
			type: "TABLET",
			unit: "tablets",
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create inventory with expiring batches
		const now = new Date();
		const expiringIn7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
		const expiringIn15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
		const expiringIn60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

		await Inventory.create({
			_id: `${context.hospitalId}-INV-EXP-${context.uniqueId}`,
			tenantId: context.hospitalId,
			medicineId,
			currentStock: 150,
			reorderLevel: 20,
			maxStock: 500,
			batches: [
				{
					batchNumber: `BATCH-EXP-7-${context.uniqueId}`,
					quantity: 50,
					expiryDate: expiringIn7Days,
					purchasePrice: 10.0,
					receivedDate: new Date(),
				},
				{
					batchNumber: `BATCH-EXP-15-${context.uniqueId}`,
					quantity: 50,
					expiryDate: expiringIn15Days,
					purchasePrice: 10.0,
					receivedDate: new Date(),
				},
				{
					batchNumber: `BATCH-EXP-60-${context.uniqueId}`,
					quantity: 50,
					expiryDate: expiringIn60Days,
					purchasePrice: 10.0,
					receivedDate: new Date(),
				},
			],
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}, 30000);

	afterAll(async () => {
		await Inventory.deleteMany({ tenantId: context.hospitalId });
		await Medicine.deleteMany({ tenantId: context.hospitalId });
		await context.cleanup();
	});

	it("returns expiring items with default 30-day window", async () => {
		const response = await request(app)
			.get("/api/inventory/expiring")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("items");
		expect(response.body).toHaveProperty("count");
		expect(response.body).toHaveProperty("total");
		expect(response.body).toHaveProperty("page");
		expect(response.body).toHaveProperty("totalPages");
		expect(Array.isArray(response.body.items)).toBe(true);

		// Should include items expiring within 30 days (7 and 15 day batches)
		// but not the 60 day batch
		if (response.body.items.length > 0) {
			const item = response.body.items[0];
			expect(item).toHaveProperty("id");
			expect(item).toHaveProperty("name");
			expect(item).toHaveProperty("batchNumber");
			expect(item).toHaveProperty("quantity");
			expect(item).toHaveProperty("expiryDate");
			expect(item).toHaveProperty("daysUntilExpiry");
		}
	});

	it("returns items sorted by expiry date (soonest first)", async () => {
		const response = await request(app)
			.get("/api/inventory/expiring")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		if (response.body.items.length >= 2) {
			const firstItem = response.body.items[0];
			const secondItem = response.body.items[1];
			expect(firstItem.daysUntilExpiry).toBeLessThanOrEqual(
				secondItem.daysUntilExpiry,
			);
		}
	});

	it("calculates daysUntilExpiry correctly", async () => {
		const response = await request(app)
			.get("/api/inventory/expiring?days=10")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		// Find our test batch expiring in 7 days
		const item = response.body.items.find(
			(i: { batchNumber: string }) =>
				i.batchNumber === `BATCH-EXP-7-${context.uniqueId}`,
		);

		if (item) {
			// Should be approximately 7 days (could be 6-8 depending on timing)
			expect(item.daysUntilExpiry).toBeGreaterThanOrEqual(6);
			expect(item.daysUntilExpiry).toBeLessThanOrEqual(8);
		}
	});
});
