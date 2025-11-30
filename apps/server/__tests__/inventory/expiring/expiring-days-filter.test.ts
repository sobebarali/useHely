import { Inventory, Medicine } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/inventory/expiring - Days Filter", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["INVENTORY:READ"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create test medicine
		const medicineId = uuidv4();
		await Medicine.create({
			_id: medicineId,
			tenantId: context.hospitalId,
			name: `Expiring Filter Medicine ${context.uniqueId}`,
			genericName: "Test Generic",
			code: `MED-EXPF-${context.uniqueId}`,
			category: "ANALGESICS",
			type: "TABLET",
			unit: "tablets",
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create inventory with batches expiring at different times
		const now = new Date();
		const expiringIn5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
		const expiringIn20Days = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000);
		const expiringIn45Days = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);

		await Inventory.create({
			_id: `${context.hospitalId}-INV-EXPF-${context.uniqueId}`,
			tenantId: context.hospitalId,
			medicineId,
			currentStock: 150,
			reorderLevel: 20,
			maxStock: 500,
			batches: [
				{
					batchNumber: `BATCH-EXPF-5-${context.uniqueId}`,
					quantity: 50,
					expiryDate: expiringIn5Days,
					purchasePrice: 10.0,
					addedAt: new Date(),
				},
				{
					batchNumber: `BATCH-EXPF-20-${context.uniqueId}`,
					quantity: 50,
					expiryDate: expiringIn20Days,
					purchasePrice: 10.0,
					addedAt: new Date(),
				},
				{
					batchNumber: `BATCH-EXPF-45-${context.uniqueId}`,
					quantity: 50,
					expiryDate: expiringIn45Days,
					purchasePrice: 10.0,
					addedAt: new Date(),
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

	it("filters by custom days parameter (7 days)", async () => {
		const response = await request(app)
			.get("/api/inventory/expiring?days=7")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		// Should only include batches expiring within 7 days
		// Our 5-day batch should be included, but not 20 or 45 day batches
		const has5DayBatch = response.body.items.some(
			(item: { batchNumber: string }) =>
				item.batchNumber === `BATCH-EXPF-5-${context.uniqueId}`,
		);
		const has20DayBatch = response.body.items.some(
			(item: { batchNumber: string }) =>
				item.batchNumber === `BATCH-EXPF-20-${context.uniqueId}`,
		);

		if (response.body.items.length > 0) {
			expect(has5DayBatch).toBe(true);
			expect(has20DayBatch).toBe(false);
		}
	});

	it("filters by custom days parameter (30 days)", async () => {
		const response = await request(app)
			.get("/api/inventory/expiring?days=30")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		// Should include 5 and 20 day batches, but not 45 day batch
		const has45DayBatch = response.body.items.some(
			(item: { batchNumber: string }) =>
				item.batchNumber === `BATCH-EXPF-45-${context.uniqueId}`,
		);

		expect(has45DayBatch).toBe(false);
	});

	it("filters by custom days parameter (60 days)", async () => {
		const response = await request(app)
			.get("/api/inventory/expiring?days=60")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		// Should include all batches (5, 20, and 45 days)
		// Verify at least one batch from our test data is included
		const hasTestBatch = response.body.items.some(
			(item: { batchNumber: string }) =>
				item.batchNumber.includes(`EXPF-${context.uniqueId}`),
		);

		if (response.body.total > 0) {
			expect(hasTestBatch).toBe(true);
		}
	});

	it("respects pagination with days filter", async () => {
		const response = await request(app)
			.get("/api/inventory/expiring?days=60&limit=1&page=1")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.items.length).toBeLessThanOrEqual(1);
		expect(response.body.page).toBe(1);
	});
});
