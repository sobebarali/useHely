import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/inventory/medicines - Add medicine validation", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["INVENTORY:CREATE", "INVENTORY:READ"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 400 when name is missing", async () => {
		const response = await request(app)
			.post("/api/inventory/medicines")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				genericName: "Test Generic",
				category: "ANALGESICS",
				type: "TABLET",
				unit: "tablets",
			});

		expect(response.status).toBe(400);
	});

	it("returns 400 when genericName is missing", async () => {
		const response = await request(app)
			.post("/api/inventory/medicines")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				name: "Test Medicine",
				category: "ANALGESICS",
				type: "TABLET",
				unit: "tablets",
			});

		expect(response.status).toBe(400);
	});

	it("returns 400 when category is missing", async () => {
		const response = await request(app)
			.post("/api/inventory/medicines")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				name: "Test Medicine",
				genericName: "Test Generic",
				type: "TABLET",
				unit: "tablets",
			});

		expect(response.status).toBe(400);
	});

	it("returns 400 when category is invalid", async () => {
		const response = await request(app)
			.post("/api/inventory/medicines")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				name: "Test Medicine",
				genericName: "Test Generic",
				category: "INVALID_CATEGORY",
				type: "TABLET",
				unit: "tablets",
			});

		expect(response.status).toBe(400);
	});

	it("returns 400 when type is missing", async () => {
		const response = await request(app)
			.post("/api/inventory/medicines")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				name: "Test Medicine",
				genericName: "Test Generic",
				category: "ANALGESICS",
				unit: "tablets",
			});

		expect(response.status).toBe(400);
	});

	it("returns 400 when type is invalid", async () => {
		const response = await request(app)
			.post("/api/inventory/medicines")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				name: "Test Medicine",
				genericName: "Test Generic",
				category: "ANALGESICS",
				type: "INVALID_TYPE",
				unit: "tablets",
			});

		expect(response.status).toBe(400);
	});

	it("returns 400 when unit is missing", async () => {
		const response = await request(app)
			.post("/api/inventory/medicines")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				name: "Test Medicine",
				genericName: "Test Generic",
				category: "ANALGESICS",
				type: "TABLET",
			});

		expect(response.status).toBe(400);
	});
});
