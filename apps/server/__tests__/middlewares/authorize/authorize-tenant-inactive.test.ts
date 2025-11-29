import { Hospital } from "@hms/db";
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authorize } from "../../../src/middlewares/authorize";

const app = express();
let inactiveHospitalId: string;

app.get(
	"/secure",
	(req, _res, next) => {
		req.user = {
			id: "user-1",
			email: "user@example.com",
			name: "Test User",
			tenantId: inactiveHospitalId,
			roles: ["DOCTOR"],
			permissions: ["PATIENT:READ"],
		};
		next();
	},
	authorize("PATIENT:READ"),
	(_req, res) => {
		res.status(200).json({ ok: true });
	},
);

describe("authorize middleware - inactive tenant", () => {
	beforeAll(async () => {
		const hospital = await Hospital.create({
			_id: `hospital-${Date.now()}-inactive`,
			name: "Inactive Hospital",
			slug: `inactive-${Date.now()}`,
			licenseNumber: `LIC-INACTIVE-${Date.now()}`,
			address: {
				street: "2 Auth Way",
				city: "Testville",
				state: "TS",
				postalCode: "12345",
				country: "USA",
			},
			contactEmail: "inactive@test.com",
			contactPhone: "+1234567890",
			adminEmail: "admin@test.com",
			adminPhone: "+1987654321",
			status: "SUSPENDED",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		inactiveHospitalId = String(hospital._id);
	});

	afterAll(async () => {
		await Hospital.deleteOne({ _id: inactiveHospitalId });
	});

	it("denies access when the tenant is not active", async () => {
		const response = await request(app).get("/secure");

		expect(response.status).toBe(403);
		expect(response.body).toMatchObject({
			code: "TENANT_INACTIVE",
			message: "Your organization is not active. Please contact support.",
		});
	});
});
