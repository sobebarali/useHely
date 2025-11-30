import { z } from "zod";
import { INVENTORY_DEFAULTS } from "../../../constants";

// Zod schema for runtime validation
export const expiringInventorySchema = z.object({
	query: z.object({
		days: z.coerce
			.number()
			.int()
			.positive()
			.default(INVENTORY_DEFAULTS.EXPIRY_ALERT_DAYS)
			.optional(),
		limit: z.coerce
			.number()
			.int()
			.positive()
			.max(100)
			.default(INVENTORY_DEFAULTS.PAGE_LIMIT)
			.optional(),
		page: z.coerce.number().int().positive().default(1).optional(),
	}),
});

// Input type - inferred from Zod
export type ExpiringInventoryInput = z.infer<
	typeof expiringInventorySchema.shape.query
>;

// Expiring item output type
export interface ExpiringItemOutput {
	id: string;
	name: string;
	batchNumber: string;
	quantity: number;
	expiryDate: string;
	daysUntilExpiry: number;
}

// Output type - manually defined for response structure
export interface ExpiringInventoryOutput {
	items: ExpiringItemOutput[];
	count: number;
	total: number;
	page: number;
	totalPages: number;
}
