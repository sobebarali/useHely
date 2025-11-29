import type { Request, Response } from "express";
import { getHospitalsForEmail } from "../services/hospitals.auth.service";

/**
 * GET /api/auth/hospitals
 * Get list of hospitals associated with a user's email
 * Used during login to let user select which hospital to sign into
 */
export async function hospitalsController(req: Request, res: Response) {
	try {
		const email = req.query.email as string;

		const result = await getHospitalsForEmail({ email });

		res.status(200).json(result);
	} catch (error) {
		const err = error as { status?: number; code?: string; message?: string };
		res.status(err.status || 500).json({
			success: false,
			code: err.code || "INTERNAL_ERROR",
			message: err.message || "Failed to get hospitals",
		});
	}
}
