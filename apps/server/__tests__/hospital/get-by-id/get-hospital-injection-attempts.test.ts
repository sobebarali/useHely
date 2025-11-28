import mongoose from "mongoose";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("GET /api/hospitals/:id - SQL and NoSQL injection attempts", () => {
	beforeAll(async () => {
		// Ensure database connection
		if (mongoose.connection.readyState === 0) {
			await mongoose.connect(process.env.DATABASE_URL || "");
		}
	});

	it("should safely handle SQL injection attempt with OR 1=1", async () => {
		const sqlInjectionId = "' OR '1'='1";

		const response = await request(app).get(
			`/api/hospitals/${encodeURIComponent(sqlInjectionId)}`,
		);

		// Should not return data, should safely handle the injection
		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("error");
	});

	it("should safely handle SQL injection with DROP TABLE", async () => {
		const sqlInjectionId = "'; DROP TABLE hospitals; --";

		const response = await request(app).get(
			`/api/hospitals/${encodeURIComponent(sqlInjectionId)}`,
		);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("error");
	});

	it("should safely handle NoSQL injection with $ne operator", async () => {
		const noSqlInjectionId = JSON.stringify({ $ne: null });

		const response = await request(app).get(
			`/api/hospitals/${encodeURIComponent(noSqlInjectionId)}`,
		);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("error");
	});

	it("should safely handle NoSQL injection with $gt operator", async () => {
		const noSqlInjectionId = JSON.stringify({ $gt: "" });

		const response = await request(app).get(
			`/api/hospitals/${encodeURIComponent(noSqlInjectionId)}`,
		);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("error");
	});

	it("should safely handle NoSQL injection with regex", async () => {
		const noSqlInjectionId = JSON.stringify({ $regex: ".*" });

		const response = await request(app).get(
			`/api/hospitals/${encodeURIComponent(noSqlInjectionId)}`,
		);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("error");
	});

	it("should safely handle JavaScript code injection", async () => {
		const jsInjectionId = "<script>alert('XSS')</script>";

		const response = await request(app).get(
			`/api/hospitals/${encodeURIComponent(jsInjectionId)}`,
		);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("error");
	});

	it("should safely handle command injection attempt", async () => {
		const cmdInjectionId = "; ls -la";

		const response = await request(app).get(
			`/api/hospitals/${encodeURIComponent(cmdInjectionId)}`,
		);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("error");
	});

	it("should safely handle path traversal attempt", async () => {
		const pathTraversalId = "../../../etc/passwd";

		const response = await request(app).get(
			`/api/hospitals/${encodeURIComponent(pathTraversalId)}`,
		);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("error");
	});
});
