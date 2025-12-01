/**
 * Inventory API Client
 *
 * This client interfaces with the /api/inventory/* endpoints on the server.
 */

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || "";

// Token storage keys
const ACCESS_TOKEN_KEY = "hms_access_token";
const REFRESH_TOKEN_KEY = "hms_refresh_token";
const TOKEN_EXPIRY_KEY = "hms_token_expiry";

// ===== Type Definitions =====

export type StockStatus =
	| "IN_STOCK"
	| "LOW_STOCK"
	| "OUT_OF_STOCK"
	| "EXPIRING";

export type AdjustmentReason =
	| "DAMAGE"
	| "EXPIRY"
	| "CORRECTION"
	| "LOSS"
	| "RETURN"
	| "OTHER";

export type MedicineCategory =
	| "ANALGESICS"
	| "ANTIBIOTICS"
	| "ANTIDIABETICS"
	| "ANTIHYPERTENSIVES"
	| "ANTIHISTAMINES"
	| "CARDIOVASCULAR"
	| "GASTROINTESTINAL"
	| "RESPIRATORY"
	| "VITAMINS"
	| "TOPICAL"
	| "INJECTABLE"
	| "OTHER";

export type MedicineType =
	| "TABLET"
	| "CAPSULE"
	| "SYRUP"
	| "INJECTION"
	| "CREAM"
	| "OINTMENT"
	| "DROPS"
	| "INHALER"
	| "POWDER"
	| "SUSPENSION";

export type TransactionType =
	| "RECEIPT"
	| "DISPENSING"
	| "ADJUSTMENT"
	| "RETURN"
	| "TRANSFER";

// ===== Input Types =====

export interface ListInventoryParams {
	page?: number;
	limit?: number;
	search?: string;
	category?: string;
	status?: StockStatus;
	expiringWithin?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

export interface ListMedicinesParams {
	page?: number;
	limit?: number;
	search?: string;
	category?: string;
	type?: string;
}

export interface LowStockParams {
	limit?: number;
	category?: string;
}

export interface ExpiringParams {
	days?: number;
	limit?: number;
	page?: number;
}

export interface TransactionsParams {
	page?: number;
	limit?: number;
	itemId?: string;
	type?: TransactionType;
	startDate?: string;
	endDate?: string;
}

export interface AddMedicineInput {
	name: string;
	genericName: string;
	code?: string;
	category: MedicineCategory;
	type: MedicineType;
	manufacturer?: string;
	strength?: string;
	unit: string;
	reorderLevel?: number;
	maxStock?: number;
	description?: string;
}

export interface AddStockInput {
	quantity: number;
	batchNumber: string;
	expiryDate: string;
	purchasePrice?: number;
	supplier?: string;
	invoiceNumber?: string;
	notes?: string;
}

export interface AdjustStockInput {
	adjustment: number;
	reason: AdjustmentReason;
	batchNumber?: string;
	notes?: string;
}

// ===== Output Types =====

export interface InventoryItemSummary {
	id: string;
	medicineId: string;
	name: string;
	genericName: string;
	code: string;
	category: string;
	currentStock: number;
	reorderLevel: number;
	unit: string;
	status: StockStatus;
	lastRestocked: string | null;
	expiryDate: string | null;
}

export interface InventorySummary {
	totalItems: number;
	inStock: number;
	lowStock: number;
	outOfStock: number;
	expiringSoon: number;
}

export interface ListInventoryResponse {
	data: InventoryItemSummary[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
	summary: InventorySummary;
}

export interface MedicineItem {
	id: string;
	name: string;
	genericName: string;
	code: string;
	category: string;
	type: string;
	manufacturer: string | null;
	strength: string | null;
	unit: string;
}

export interface ListMedicinesResponse {
	data: MedicineItem[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface LowStockItem {
	id: string;
	name: string;
	currentStock: number;
	reorderLevel: number;
	deficit: number;
	lastDispensed: string | null;
}

export interface LowStockResponse {
	items: LowStockItem[];
	count: number;
}

export interface ExpiringItem {
	id: string;
	name: string;
	batchNumber: string;
	quantity: number;
	expiryDate: string;
	daysUntilExpiry: number;
}

export interface ExpiringResponse {
	items: ExpiringItem[];
	count: number;
	total: number;
	page: number;
	totalPages: number;
}

export interface Batch {
	batchNumber: string;
	quantity: number;
	expiryDate: string;
	receivedDate: string;
	supplier: string | null;
}

export interface Transaction {
	type: string;
	quantity: number;
	reference: string | null;
	performedBy: {
		id: string;
		firstName: string;
		lastName: string;
	};
	performedAt: string;
}

export interface MedicineDetails {
	id: string;
	name: string;
	genericName: string;
	code: string;
	category: string;
	type: string;
	manufacturer: string | null;
	strength: string | null;
	unit: string;
	description: string | null;
}

export interface InventoryItemDetails {
	id: string;
	medicine: MedicineDetails;
	currentStock: number;
	reorderLevel: number;
	maxStock: number | null;
	unit: string;
	location: string | null;
	batches: Batch[];
	transactions: Transaction[];
	status: StockStatus;
}

export interface TransactionItem {
	id: string;
	inventoryId: string;
	medicineName: string;
	type: TransactionType;
	quantity: number;
	batchNumber: string | null;
	reference: string | null;
	reason: string | null;
	performedBy: {
		id: string;
		firstName: string;
		lastName: string;
	};
	performedAt: string;
}

export interface TransactionsResponse {
	data: TransactionItem[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface AddMedicineResponse {
	id: string;
	name: string;
	genericName: string;
	code: string;
	category: string;
	type: string;
	manufacturer: string | null;
	strength: string | null;
	unit: string;
	description: string | null;
}

export interface AddStockResponse {
	id: string;
	previousStock: number;
	addedQuantity: number;
	currentStock: number;
	batch: Batch;
	transactionId: string;
}

export interface AdjustStockResponse {
	id: string;
	previousStock: number;
	adjustment: number;
	currentStock: number;
	reason: string;
	transactionId: string;
}

export interface ApiError {
	code: string;
	message: string;
}

// ===== Token Management Helpers =====

function getStoredTokens(): {
	accessToken: string | null;
	refreshToken: string | null;
	expiry: number | null;
} {
	return {
		accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
		refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
		expiry: localStorage.getItem(TOKEN_EXPIRY_KEY)
			? Number(localStorage.getItem(TOKEN_EXPIRY_KEY))
			: null,
	};
}

function isTokenExpired(): boolean {
	const { expiry } = getStoredTokens();
	if (!expiry) return true;
	return Date.now() >= expiry - 60000;
}

// ===== API Helpers =====

async function apiRequest<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<T> {
	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options.headers,
		},
	});

	const data = await response.json();

	if (!response.ok) {
		throw {
			code: data.code || "UNKNOWN_ERROR",
			message: data.message || "An error occurred",
		} as ApiError;
	}

	return data;
}

async function refreshTokens(): Promise<boolean> {
	const { refreshToken } = getStoredTokens();

	if (!refreshToken) {
		return false;
	}

	try {
		const response = await apiRequest<{
			access_token: string;
			token_type: string;
			expires_in: number;
			refresh_token: string;
			refresh_expires_in: number;
		}>("/api/auth/token", {
			method: "POST",
			body: JSON.stringify({
				grant_type: "refresh_token",
				refresh_token: refreshToken,
			}),
		});

		localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
		localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
		localStorage.setItem(
			TOKEN_EXPIRY_KEY,
			String(Date.now() + response.expires_in * 1000),
		);
		return true;
	} catch {
		localStorage.removeItem(ACCESS_TOKEN_KEY);
		localStorage.removeItem(REFRESH_TOKEN_KEY);
		localStorage.removeItem(TOKEN_EXPIRY_KEY);
		return false;
	}
}

async function authenticatedRequest<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<T> {
	let { accessToken } = getStoredTokens();

	// Try to refresh if token is expired
	if (isTokenExpired()) {
		const refreshed = await refreshTokens();
		if (!refreshed) {
			throw { code: "UNAUTHORIZED", message: "Session expired" } as ApiError;
		}
		accessToken = getStoredTokens().accessToken;
	}

	if (!accessToken) {
		throw { code: "UNAUTHORIZED", message: "Not authenticated" } as ApiError;
	}

	return apiRequest<T>(endpoint, {
		...options,
		headers: {
			...options.headers,
			Authorization: `Bearer ${accessToken}`,
		},
	});
}

// ===== Inventory API Functions =====

/**
 * List inventory items with pagination and filters
 */
export async function listInventory(
	params: ListInventoryParams = {},
): Promise<ListInventoryResponse> {
	const searchParams = new URLSearchParams();

	if (params.page) searchParams.set("page", String(params.page));
	if (params.limit) searchParams.set("limit", String(params.limit));
	if (params.search) searchParams.set("search", params.search);
	if (params.category) searchParams.set("category", params.category);
	if (params.status) searchParams.set("status", params.status);
	if (params.expiringWithin)
		searchParams.set("expiringWithin", String(params.expiringWithin));
	if (params.sortBy) searchParams.set("sortBy", params.sortBy);
	if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);

	const queryString = searchParams.toString();
	const endpoint = `/api/inventory${queryString ? `?${queryString}` : ""}`;

	const response = await authenticatedRequest<{
		success: boolean;
		data: ListInventoryResponse["data"];
		pagination: ListInventoryResponse["pagination"];
		summary: ListInventoryResponse["summary"];
	}>(endpoint);

	return {
		data: response.data,
		pagination: response.pagination,
		summary: response.summary,
	};
}

/**
 * Get inventory item by ID
 */
export async function getInventoryById(
	id: string,
): Promise<InventoryItemDetails> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: InventoryItemDetails;
	}>(`/api/inventory/${id}`);
	return response.data;
}

/**
 * List medicines catalog
 */
export async function listMedicines(
	params: ListMedicinesParams = {},
): Promise<ListMedicinesResponse> {
	const searchParams = new URLSearchParams();

	if (params.page) searchParams.set("page", String(params.page));
	if (params.limit) searchParams.set("limit", String(params.limit));
	if (params.search) searchParams.set("search", params.search);
	if (params.category) searchParams.set("category", params.category);
	if (params.type) searchParams.set("type", params.type);

	const queryString = searchParams.toString();
	const endpoint = `/api/inventory/medicines${queryString ? `?${queryString}` : ""}`;

	const response = await authenticatedRequest<{
		success: boolean;
		data: ListMedicinesResponse["data"];
		pagination: ListMedicinesResponse["pagination"];
	}>(endpoint);

	return {
		data: response.data,
		pagination: response.pagination,
	};
}

/**
 * Add medicine to catalog
 */
export async function addMedicine(
	input: AddMedicineInput,
): Promise<AddMedicineResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: AddMedicineResponse;
	}>("/api/inventory/medicines", {
		method: "POST",
		body: JSON.stringify(input),
	});
	return response.data;
}

/**
 * Get low stock items
 */
export async function getLowStock(
	params: LowStockParams = {},
): Promise<LowStockResponse> {
	const searchParams = new URLSearchParams();

	if (params.limit) searchParams.set("limit", String(params.limit));
	if (params.category) searchParams.set("category", params.category);

	const queryString = searchParams.toString();
	const endpoint = `/api/inventory/low-stock${queryString ? `?${queryString}` : ""}`;

	const response = await authenticatedRequest<{
		success: boolean;
		items: LowStockResponse["items"];
		count: LowStockResponse["count"];
	}>(endpoint);

	return {
		items: response.items,
		count: response.count,
	};
}

/**
 * Get expiring items
 */
export async function getExpiring(
	params: ExpiringParams = {},
): Promise<ExpiringResponse> {
	const searchParams = new URLSearchParams();

	if (params.days) searchParams.set("days", String(params.days));
	if (params.limit) searchParams.set("limit", String(params.limit));
	if (params.page) searchParams.set("page", String(params.page));

	const queryString = searchParams.toString();
	const endpoint = `/api/inventory/expiring${queryString ? `?${queryString}` : ""}`;

	const response = await authenticatedRequest<{
		success: boolean;
		items: ExpiringResponse["items"];
		count: ExpiringResponse["count"];
		total: ExpiringResponse["total"];
		page: ExpiringResponse["page"];
		totalPages: ExpiringResponse["totalPages"];
	}>(endpoint);

	return {
		items: response.items,
		count: response.count,
		total: response.total,
		page: response.page,
		totalPages: response.totalPages,
	};
}

/**
 * Get transaction history
 */
export async function getTransactions(
	params: TransactionsParams = {},
): Promise<TransactionsResponse> {
	const searchParams = new URLSearchParams();

	if (params.page) searchParams.set("page", String(params.page));
	if (params.limit) searchParams.set("limit", String(params.limit));
	if (params.itemId) searchParams.set("itemId", params.itemId);
	if (params.type) searchParams.set("type", params.type);
	if (params.startDate) searchParams.set("startDate", params.startDate);
	if (params.endDate) searchParams.set("endDate", params.endDate);

	const queryString = searchParams.toString();
	const endpoint = `/api/inventory/transactions${queryString ? `?${queryString}` : ""}`;

	const response = await authenticatedRequest<{
		success: boolean;
		data: TransactionsResponse["data"];
		pagination: TransactionsResponse["pagination"];
	}>(endpoint);

	return {
		data: response.data,
		pagination: response.pagination,
	};
}

/**
 * Add stock to inventory item
 */
export async function addStock({
	id,
	input,
}: {
	id: string;
	input: AddStockInput;
}): Promise<AddStockResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: AddStockResponse;
	}>(`/api/inventory/${id}/add`, {
		method: "POST",
		body: JSON.stringify(input),
	});
	return response.data;
}

/**
 * Adjust stock for inventory item
 */
export async function adjustStock({
	id,
	input,
}: {
	id: string;
	input: AdjustStockInput;
}): Promise<AdjustStockResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: AdjustStockResponse;
	}>(`/api/inventory/${id}/adjust`, {
		method: "POST",
		body: JSON.stringify(input),
	});
	return response.data;
}

// Export as a client object for consistency with other clients
export const inventoryClient = {
	listInventory,
	getInventoryById,
	listMedicines,
	addMedicine,
	getLowStock,
	getExpiring,
	getTransactions,
	addStock,
	adjustStock,
};

export default inventoryClient;
