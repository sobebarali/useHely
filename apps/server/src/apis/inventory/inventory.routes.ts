import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";
import { requireFeature } from "../../middlewares/check-subscription";
import { inventoryStockRateLimiter } from "../../middlewares/rate-limit";
import { validate } from "../../middlewares/validate";
// Controllers
import { addMedicineInventoryController } from "./controllers/add-medicine.inventory.controller";
import { addStockInventoryController } from "./controllers/add-stock.inventory.controller";
import { adjustStockInventoryController } from "./controllers/adjust-stock.inventory.controller";
import { expiringInventoryController } from "./controllers/expiring.inventory.controller";
import { getByIdInventoryController } from "./controllers/get-by-id.inventory.controller";
import { listInventoryController } from "./controllers/list.inventory.controller";
import { listMedicinesInventoryController } from "./controllers/list-medicines.inventory.controller";
import { lowStockInventoryController } from "./controllers/low-stock.inventory.controller";
import { transactionsInventoryController } from "./controllers/transactions.inventory.controller";
// Validations
import { addMedicineInventorySchema } from "./validations/add-medicine.inventory.validation";
import { addStockInventorySchema } from "./validations/add-stock.inventory.validation";
import { adjustStockInventorySchema } from "./validations/adjust-stock.inventory.validation";
import { expiringInventorySchema } from "./validations/expiring.inventory.validation";
import { getByIdInventorySchema } from "./validations/get-by-id.inventory.validation";
import { listInventorySchema } from "./validations/list.inventory.validation";
import { listMedicinesInventorySchema } from "./validations/list-medicines.inventory.validation";
import { lowStockInventorySchema } from "./validations/low-stock.inventory.validation";
import { transactionsInventorySchema } from "./validations/transactions.inventory.validation";

const router = Router();

// All routes require authentication and INVENTORY feature (PROFESSIONAL+)
router.use(authenticate);
router.use(requireFeature("INVENTORY"));

// GET /api/inventory - List inventory items
router.get(
	"/",
	authorize("INVENTORY:READ"),
	validate(listInventorySchema),
	listInventoryController,
);

// GET /api/inventory/low-stock - Get items below reorder level
router.get(
	"/low-stock",
	authorize("INVENTORY:READ"),
	validate(lowStockInventorySchema),
	lowStockInventoryController,
);

// GET /api/inventory/expiring - Get expiring batches
router.get(
	"/expiring",
	authorize("INVENTORY:READ"),
	validate(expiringInventorySchema),
	expiringInventoryController,
);

// GET /api/inventory/medicines - List medicine catalog
router.get(
	"/medicines",
	authorize("INVENTORY:READ"),
	validate(listMedicinesInventorySchema),
	listMedicinesInventoryController,
);

// POST /api/inventory/medicines - Add medicine to catalog
router.post(
	"/medicines",
	authorize("INVENTORY:CREATE"),
	validate(addMedicineInventorySchema),
	addMedicineInventoryController,
);

// GET /api/inventory/transactions - Get transaction history
router.get(
	"/transactions",
	authorize("INVENTORY:READ"),
	validate(transactionsInventorySchema),
	transactionsInventoryController,
);

// GET /api/inventory/:id - Get inventory item by ID
router.get(
	"/:id",
	authorize("INVENTORY:READ"),
	validate(getByIdInventorySchema),
	getByIdInventoryController,
);

// POST /api/inventory/:id/add - Add stock to inventory item
router.post(
	"/:id/add",
	inventoryStockRateLimiter,
	authorize("INVENTORY:UPDATE"),
	validate(addStockInventorySchema),
	addStockInventoryController,
);

// POST /api/inventory/:id/adjust - Adjust stock (corrections, damage, expiry)
router.post(
	"/:id/adjust",
	inventoryStockRateLimiter,
	authorize("INVENTORY:UPDATE"),
	validate(adjustStockInventorySchema),
	adjustStockInventoryController,
);

export default router;
