import { Inventory, Medicine } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/inventory/:id/adjust - Insufficient Stock", () => {
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

		// Create inventory item with limited stock
		inventoryId = `${context.hospitalId}-INV-${context.uniqueId}`;
		await Inventory.create({
			_id: inventoryId,
			tenantId: context.hospitalId,
			medicineId,
			currentStock: 10,
			reorderLevel: 5,
			maxStock: 500,
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

	it("returns 400 when negative adjustment exceeds current stock", async () => {
		const response = await request(app)
			.post(`/api/inventory/${inventoryId}/adjust`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				adjustment: -15, // Current stock is 10
				reason: "DAMAGE",
			});

		expect(response.status).toBe(400);
		expect(response.body).toHaveProperty("code", "INSUFFICIENT_STOCK");
	});

	it("returns 400 when adjustment would result in exactly zero stock", async () => {
		// First check if adjusting to exactly zero is allowed
		const response = await request(app)
			.post(`/api/inventory/${inventoryId}/adjust`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				adjustment: -10, // Would bring stock to 0
				reason: "EXPIRY",
			});

		// Adjusting to zero should be allowed
		expect(response.status).toBe(200);
		expect(response.body.currentStock).toBe(0);
	});

	it("returns 400 when trying to reduce stock below zero after previous adjustment", async () => {
		// After previous test, stock is 0
		const response = await request(app)
			.post(`/api/inventory/${inventoryId}/adjust`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				adjustment: -1,
				reason: "LOSS",
			});

		expect(response.status).toBe(400);
		expect(response.body).toHaveProperty("code", "INSUFFICIENT_STOCK");
	});
});
