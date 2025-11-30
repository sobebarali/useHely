import { Inventory, Medicine } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/inventory - List inventory filters", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["INVENTORY:READ"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create test medicines with different categories
		const analgesicId = uuidv4();
		await Medicine.create({
			_id: analgesicId,
			tenantId: context.hospitalId,
			name: `Paracetamol ${context.uniqueId}`,
			genericName: "Acetaminophen",
			code: `PARA-${context.uniqueId}`,
			category: "ANALGESICS",
			type: "TABLET",
			unit: "tablets",
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const antibioticId = uuidv4();
		await Medicine.create({
			_id: antibioticId,
			tenantId: context.hospitalId,
			name: `Amoxicillin ${context.uniqueId}`,
			genericName: "Amoxicillin",
			code: `AMOX-${context.uniqueId}`,
			category: "ANTIBIOTICS",
			type: "CAPSULE",
			unit: "capsules",
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create inventory - one in stock, one low stock
		await Inventory.create({
			_id: `${context.hospitalId}-INV-PARA-${context.uniqueId}`,
			tenantId: context.hospitalId,
			medicineId: analgesicId,
			currentStock: 100,
			reorderLevel: 20,
			batches: [
				{
					batchNumber: "BATCH-001",
					quantity: 100,
					expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
					receivedDate: new Date(),
				},
			],
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		await Inventory.create({
			_id: `${context.hospitalId}-INV-AMOX-${context.uniqueId}`,
			tenantId: context.hospitalId,
			medicineId: antibioticId,
			currentStock: 5, // Below reorder level of 20
			reorderLevel: 20,
			batches: [
				{
					batchNumber: "BATCH-002",
					quantity: 5,
					expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
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

	it("filters by search term", async () => {
		const response = await request(app)
			.get("/api/inventory")
			.query({ search: "Paracetamol" })
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.length).toBeGreaterThanOrEqual(1);
		expect(
			response.body.data.some((item: { name: string }) =>
				item.name.includes("Paracetamol"),
			),
		).toBe(true);
	});

	it("filters by category", async () => {
		const response = await request(app)
			.get("/api/inventory")
			.query({ category: "ANTIBIOTICS" })
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		for (const item of response.body.data) {
			expect(item.category).toBe("ANTIBIOTICS");
		}
	});

	it("filters by stock status - LOW_STOCK", async () => {
		const response = await request(app)
			.get("/api/inventory")
			.query({ status: "LOW_STOCK" })
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		for (const item of response.body.data) {
			expect(item.status).toBe("LOW_STOCK");
		}
	});

	it("filters by stock status - IN_STOCK", async () => {
		const response = await request(app)
			.get("/api/inventory")
			.query({ status: "IN_STOCK" })
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		for (const item of response.body.data) {
			expect(item.status).toBe("IN_STOCK");
		}
	});
});
