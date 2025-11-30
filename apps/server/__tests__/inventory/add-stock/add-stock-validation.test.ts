import { Inventory, Medicine } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/inventory/:id/add - Add stock validation", () => {
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

		// Create test medicine and inventory
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

		inventoryId = `${context.hospitalId}-INV-${context.uniqueId}`;
		await Inventory.create({
			_id: inventoryId,
			tenantId: context.hospitalId,
			medicineId,
			currentStock: 50,
			reorderLevel: 20,
			batches: [],
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}, 30000);

	afterAll(async () => {
		await Inventory.deleteMany({ tenantId: context.hospitalId });
		await Medicine.deleteMany({ tenantId: context.hospitalId });
		await context.cleanup();
	});

	it("returns 400 when quantity is missing", async () => {
		const response = await request(app)
			.post(`/api/inventory/${inventoryId}/add`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				batchNumber: "BATCH-001",
				expiryDate: new Date(
					Date.now() + 365 * 24 * 60 * 60 * 1000,
				).toISOString(),
			});

		expect(response.status).toBe(400);
	});

	it("returns 400 when quantity is negative", async () => {
		const response = await request(app)
			.post(`/api/inventory/${inventoryId}/add`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				quantity: -10,
				batchNumber: "BATCH-001",
				expiryDate: new Date(
					Date.now() + 365 * 24 * 60 * 60 * 1000,
				).toISOString(),
			});

		expect(response.status).toBe(400);
	});

	it("returns 400 when batchNumber is missing", async () => {
		const response = await request(app)
			.post(`/api/inventory/${inventoryId}/add`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				quantity: 100,
				expiryDate: new Date(
					Date.now() + 365 * 24 * 60 * 60 * 1000,
				).toISOString(),
			});

		expect(response.status).toBe(400);
	});

	it("returns 400 when expiryDate is missing", async () => {
		const response = await request(app)
			.post(`/api/inventory/${inventoryId}/add`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				quantity: 100,
				batchNumber: "BATCH-001",
			});

		expect(response.status).toBe(400);
	});
});
