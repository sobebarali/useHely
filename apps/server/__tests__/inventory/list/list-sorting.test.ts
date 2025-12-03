import { Inventory, Medicine } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/inventory - List inventory sorting", () => {
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

		// Create test medicines with different names
		const medicines = ["Apple Medicine", "Banana Medicine", "Cherry Medicine"];
		const stocks = [50, 100, 25];

		for (let i = 0; i < medicines.length; i++) {
			const medicineId = uuidv4();
			await Medicine.create({
				_id: medicineId,
				tenantId: context.hospitalId,
				name: `${medicines[i]} ${context.uniqueId}`,
				genericName: `Generic ${i}`,
				code: `SORT-${context.uniqueId}-${i}`,
				category: "ANALGESICS",
				type: "TABLET",
				unit: "tablets",
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await Inventory.create({
				_id: `${context.hospitalId}-INV-SORT-${context.uniqueId}-${i}`,
				tenantId: context.hospitalId,
				medicineId,
				currentStock: stocks[i],
				reorderLevel: 20,
				batches: [],
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		}
	}, 30000);

	afterAll(async () => {
		await Inventory.deleteMany({ tenantId: context.hospitalId });
		await Medicine.deleteMany({ tenantId: context.hospitalId });
		await context.cleanup();
	});

	it("sorts by name ascending", async () => {
		const response = await request(app)
			.get("/api/inventory")
			.query({ sortBy: "name", sortOrder: "asc" })
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		const names = response.body.data.map((item: { name: string }) => item.name);
		const sortedNames = [...names].sort();
		expect(names).toEqual(sortedNames);
	});

	it("sorts by name descending", async () => {
		const response = await request(app)
			.get("/api/inventory")
			.query({ sortBy: "name", sortOrder: "desc" })
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		const names = response.body.data.map((item: { name: string }) => item.name);
		const sortedNames = [...names].sort().reverse();
		expect(names).toEqual(sortedNames);
	});

	it("sorts by currentStock ascending", async () => {
		const response = await request(app)
			.get("/api/inventory")
			.query({ sortBy: "currentStock", sortOrder: "asc" })
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		const stocks = response.body.data.map(
			(item: { currentStock: number }) => item.currentStock,
		);
		const sortedStocks = [...stocks].sort((a, b) => a - b);
		expect(stocks).toEqual(sortedStocks);
	});
});
