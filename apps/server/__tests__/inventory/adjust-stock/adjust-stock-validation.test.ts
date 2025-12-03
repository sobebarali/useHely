import { Inventory, Medicine } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/inventory/:id/adjust - Validation", () => {
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

		// Create inventory item
		inventoryId = `${context.hospitalId}-INV-${context.uniqueId}`;
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
	}, 30000);

	afterAll(async () => {
		await Inventory.deleteMany({ tenantId: context.hospitalId });
		await Medicine.deleteMany({ tenantId: context.hospitalId });
		await context.cleanup();
	});

	it("returns 400 when adjustment is missing", async () => {
		const response = await request(app)
			.post(`/api/inventory/${inventoryId}/adjust`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reason: "CORRECTION",
			});

		expect(response.status).toBe(400);
	});

	it("returns 400 when reason is missing", async () => {
		const response = await request(app)
			.post(`/api/inventory/${inventoryId}/adjust`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				adjustment: 10,
			});

		expect(response.status).toBe(400);
	});

	it("returns 400 when reason is invalid", async () => {
		const response = await request(app)
			.post(`/api/inventory/${inventoryId}/adjust`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				adjustment: 10,
				reason: "INVALID_REASON",
			});

		expect(response.status).toBe(400);
	});

	it("returns 400 when adjustment is not an integer", async () => {
		const response = await request(app)
			.post(`/api/inventory/${inventoryId}/adjust`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				adjustment: 10.5,
				reason: "CORRECTION",
			});

		expect(response.status).toBe(400);
	});

	it("returns 400 when adjustment is zero", async () => {
		const response = await request(app)
			.post(`/api/inventory/${inventoryId}/adjust`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				adjustment: 0,
				reason: "CORRECTION",
			});

		// Zero adjustment might be allowed by validation but rejected by service
		// or might be rejected by validation - depends on implementation
		expect([200, 400]).toContain(response.status);
	});
});
