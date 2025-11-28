import type { Request, Response } from "express";
import { registerHospital } from "../services/register.hospital.service";

export async function registerHospitalController(req: Request, res: Response) {
	try {
		const hospital = await registerHospital({
			data: req.body,
		});

		res.status(201).json(hospital);
	} catch (error: unknown) {
		// Handle known business errors
		if (
			error &&
			typeof error === "object" &&
			"status" in error &&
			"code" in error
		) {
			const err = error as { status: number; code: string; message: string };
			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Handle mongoose duplicate key errors
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === 11000
		) {
			return res.status(409).json({
				code: "DUPLICATE_ERROR",
				message: "A hospital with this information already exists",
			});
		}

		// Log unexpected errors
		console.error("Error registering hospital:", error);

		// Return generic error
		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred while registering the hospital",
		});
	}
}
