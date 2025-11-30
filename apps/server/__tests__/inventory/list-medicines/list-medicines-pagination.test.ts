import { Medicine } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/inventory/medicines - List medicines pagination", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["INVENTORY:READ"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create multiple test medicines for pagination
		const medicines = [];
		for (let i = 0; i < 5; i++) {
			medicines.push({
				_id: uuidv4(),
				tenantId: context.hospitalId,
				name: `Medicine ${context.uniqueId}-${i}`,
				genericName: `Generic ${i}`,
				code: `MED-${context.uniqueId}-${i}`,
				category: "ANALGESICS",
				type: "TABLET",
				unit: "tablets",
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		}
		await Medicine.create(medicines);
	}, 30000);

	afterAll(async () => {
		await Medicine.deleteMany({ tenantId: context.hospitalId });
		await context.cleanup();
	});

	it("returns correct page with custom limit", async () => {
		const response = await request(app)
			.get("/api/inventory/medicines")
			.query({ page: 1, limit: 2 })
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.length).toBeLessThanOrEqual(2);
		expect(response.body.pagination.page).toBe(1);
		expect(response.body.pagination.limit).toBe(2);
	});

	it("returns second page correctly", async () => {
		const response = await request(app)
			.get("/api/inventory/medicines")
			.query({ page: 2, limit: 2 })
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.pagination.page).toBe(2);
	});

	it("returns empty data for page beyond total", async () => {
		const response = await request(app)
			.get("/api/inventory/medicines")
			.query({ page: 100, limit: 50 })
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toEqual([]);
	});
});
