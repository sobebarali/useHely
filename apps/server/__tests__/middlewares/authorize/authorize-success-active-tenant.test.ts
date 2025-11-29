import { Hospital } from "@hms/db";
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authorize } from "../../../src/middlewares/authorize";

const app = express();

let createdHospitalId: string;

app.get(
	"/secure",
	(req, _res, next) => {
		req.user = {
			id: "user-1",
			email: "user@example.com",
			name: "Test User",
			tenantId: createdHospitalId,
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

describe("authorize middleware - happy path", () => {
	beforeAll(async () => {
		const hospital = await Hospital.create({
			_id: `hospital-${Date.now()}`,
			name: "Auth Test Hospital",
			slug: `auth-test-${Date.now()}`,
			licenseNumber: `LIC-${Date.now()}`,
			address: {
				street: "1 Auth Way",
				city: "Testville",
				state: "TS",
				postalCode: "12345",
				country: "USA",
			},
			contactEmail: "auth@test.com",
			contactPhone: "+1234567890",
			adminEmail: "admin@test.com",
			adminPhone: "+1987654321",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		createdHospitalId = String(hospital._id);
	});

	afterAll(async () => {
		await Hospital.deleteOne({ _id: createdHospitalId });
	});

	it("allows access when user has permission and tenant is active", async () => {
		const response = await request(app).get("/secure");

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ ok: true });
	});
});
