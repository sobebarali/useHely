import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodObject } from "zod";

// biome-ignore lint/suspicious/noExplicitAny: Need to accept any ZodObject schema
export function validate(schema: ZodObject<any>) {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			await schema.parseAsync({
				body: req.body,
				query: req.query,
				params: req.params,
			});
			next();
		} catch (error) {
			if (error instanceof ZodError) {
				return res.status(400).json({
					code: "INVALID_REQUEST",
					message: "Validation failed",
					errors: error.issues.map((err) => ({
						path: err.path.join("."),
						message: err.message,
					})),
				});
			}
			next(error);
		}
	};
}
