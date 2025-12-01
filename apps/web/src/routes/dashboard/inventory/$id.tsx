import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowLeft,
	Calendar,
	Loader2,
	Minus,
	Package,
	PackagePlus,
	Plus,
	User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
	type AddStockInput,
	type AdjustmentReason,
	type AdjustStockInput,
	type StockStatus,
	useAddStock,
	useAdjustStock,
	useInventoryItem,
} from "@/hooks/use-inventory";
import type { ApiError } from "@/lib/inventory-client";

const searchSchema = z.object({
	action: z.enum(["add-stock", "adjust"]).optional(),
});

export const Route = createFileRoute("/dashboard/inventory/$id")({
	component: InventoryDetailPage,
	validateSearch: searchSchema,
});

// Stock status badge colors
const stockStatusColors: Record<StockStatus, string> = {
	IN_STOCK: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
	LOW_STOCK:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
	OUT_OF_STOCK: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
	EXPIRING:
		"bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

// Adjustment reasons
const adjustmentReasons: { value: AdjustmentReason; label: string }[] = [
	{ value: "DAMAGE", label: "Damage" },
	{ value: "EXPIRY", label: "Expiry" },
	{ value: "CORRECTION", label: "Correction" },
	{ value: "LOSS", label: "Loss" },
	{ value: "RETURN", label: "Return" },
	{ value: "OTHER", label: "Other" },
];

function InventoryDetailPage() {
	const { id } = Route.useParams();
	const { action } = Route.useSearch();
	const navigate = useNavigate();

	const { data: item, isLoading, error } = useInventoryItem(id);
	const addStockMutation = useAddStock();
	const adjustStockMutation = useAdjustStock();

	// Dialog states
	const [addStockOpen, setAddStockOpen] = useState(false);
	const [adjustStockOpen, setAdjustStockOpen] = useState(false);

	// Add Stock form state
	const [addStockForm, setAddStockForm] = useState<AddStockInput>({
		quantity: 0,
		batchNumber: "",
		expiryDate: "",
		purchasePrice: undefined,
		supplier: "",
		invoiceNumber: "",
		notes: "",
	});

	// Adjust Stock form state
	const [adjustStockForm, setAdjustStockForm] = useState<AdjustStockInput>({
		adjustment: 0,
		reason: "CORRECTION",
		batchNumber: "",
		notes: "",
	});

	// Handle action from URL search params
	useEffect(() => {
		if (action === "add-stock") {
			setAddStockOpen(true);
		} else if (action === "adjust") {
			setAdjustStockOpen(true);
		}
	}, [action]);

	const handleAddStock = async () => {
		try {
			await addStockMutation.mutateAsync({
				id,
				input: addStockForm,
			});
			toast.success("Stock added successfully");
			setAddStockOpen(false);
			setAddStockForm({
				quantity: 0,
				batchNumber: "",
				expiryDate: "",
				purchasePrice: undefined,
				supplier: "",
				invoiceNumber: "",
				notes: "",
			});
			// Clear the action from URL
			navigate({ to: "/dashboard/inventory/$id", params: { id }, search: {} });
		} catch (err) {
			const apiError = err as ApiError;
			toast.error(apiError.message || "Failed to add stock");
		}
	};

	const handleAdjustStock = async () => {
		try {
			await adjustStockMutation.mutateAsync({
				id,
				input: adjustStockForm,
			});
			toast.success("Stock adjusted successfully");
			setAdjustStockOpen(false);
			setAdjustStockForm({
				adjustment: 0,
				reason: "CORRECTION",
				batchNumber: "",
				notes: "",
			});
			// Clear the action from URL
			navigate({ to: "/dashboard/inventory/$id", params: { id }, search: {} });
		} catch (err) {
			const apiError = err as ApiError;
			toast.error(apiError.message || "Failed to adjust stock");
		}
	};

	if (isLoading) {
		return (
			<div className="flex h-96 items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	if (error || !item) {
		return (
			<div className="flex h-96 flex-col items-center justify-center gap-4">
				<Package className="h-12 w-12 text-muted-foreground" />
				<p className="text-muted-foreground">Item not found</p>
				<Button variant="outline" asChild>
					<Link to="/dashboard/inventory">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Inventory
					</Link>
				</Button>
			</div>
		);
	}

	return (
		<>
			<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
				{/* Header */}
				<div className="flex items-center gap-4">
					<Button variant="ghost" size="icon" asChild>
						<Link to="/dashboard/inventory">
							<ArrowLeft className="h-4 w-4" />
						</Link>
					</Button>
					<div className="flex-1">
						<h1 className="font-bold text-2xl">{item.medicine.name}</h1>
						<p className="text-muted-foreground">
							{item.medicine.genericName} - {item.medicine.code}
						</p>
					</div>
					<Badge className={stockStatusColors[item.status]} variant="outline">
						{item.status.replace("_", " ")}
					</Badge>
				</div>

				{/* Action Buttons */}
				<div className="flex gap-2">
					<Button onClick={() => setAddStockOpen(true)}>
						<PackagePlus className="mr-2 h-4 w-4" />
						Add Stock
					</Button>
					<Button variant="outline" onClick={() => setAdjustStockOpen(true)}>
						<Plus className="mr-2 h-4 w-4" />
						<Minus className="h-4 w-4" />
						Adjust Stock
					</Button>
				</div>

				{/* Info Cards */}
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="font-medium text-sm">
								Current Stock
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl">
								{item.currentStock} {item.unit}
							</div>
							<p className="text-muted-foreground text-xs">
								Reorder level: {item.reorderLevel}
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="font-medium text-sm">Category</CardTitle>
						</CardHeader>
						<CardContent>
							<Badge variant="outline">{item.medicine.category}</Badge>
							<p className="mt-1 text-muted-foreground text-xs">
								Type: {item.medicine.type}
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="font-medium text-sm">
								Manufacturer
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="font-medium">
								{item.medicine.manufacturer || "—"}
							</div>
							{item.medicine.strength && (
								<p className="text-muted-foreground text-xs">
									Strength: {item.medicine.strength}
								</p>
							)}
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="font-medium text-sm">Location</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="font-medium">
								{item.location || "Not specified"}
							</div>
							{item.maxStock && (
								<p className="text-muted-foreground text-xs">
									Max stock: {item.maxStock}
								</p>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Description */}
				{item.medicine.description && (
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Description</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground">
								{item.medicine.description}
							</p>
						</CardContent>
					</Card>
				)}

				{/* Batches */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Batches</CardTitle>
						<CardDescription>
							Current stock batches and their expiry dates
						</CardDescription>
					</CardHeader>
					<CardContent>
						{item.batches.length > 0 ? (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Batch Number</TableHead>
										<TableHead>Quantity</TableHead>
										<TableHead>Expiry Date</TableHead>
										<TableHead>Received Date</TableHead>
										<TableHead>Supplier</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{item.batches.map((batch, index) => {
										const expiryDate = new Date(batch.expiryDate);
										const daysUntilExpiry = Math.ceil(
											(expiryDate.getTime() - Date.now()) /
												(1000 * 60 * 60 * 24),
										);
										const isExpiringSoon = daysUntilExpiry <= 30;
										const isExpired = daysUntilExpiry <= 0;

										return (
											<TableRow key={`${batch.batchNumber}-${index}`}>
												<TableCell className="font-medium">
													{batch.batchNumber}
												</TableCell>
												<TableCell>{batch.quantity}</TableCell>
												<TableCell>
													<div className="flex items-center gap-1">
														{(isExpiringSoon || isExpired) && (
															<AlertTriangle
																className={`h-4 w-4 ${isExpired ? "text-red-500" : "text-orange-500"}`}
															/>
														)}
														<span
															className={
																isExpired
																	? "font-medium text-red-600"
																	: isExpiringSoon
																		? "font-medium text-orange-600"
																		: ""
															}
														>
															{expiryDate.toLocaleDateString()}
														</span>
														{isExpired && (
															<Badge variant="destructive" className="ml-2">
																Expired
															</Badge>
														)}
														{!isExpired && isExpiringSoon && (
															<Badge
																variant="outline"
																className="ml-2 text-orange-600"
															>
																{daysUntilExpiry} days left
															</Badge>
														)}
													</div>
												</TableCell>
												<TableCell>
													{new Date(batch.receivedDate).toLocaleDateString()}
												</TableCell>
												<TableCell>{batch.supplier || "—"}</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						) : (
							<div className="flex flex-col items-center gap-2 py-8 text-center">
								<Package className="h-8 w-8 text-muted-foreground" />
								<p className="text-muted-foreground">No batches in stock</p>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Recent Transactions */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Recent Transactions</CardTitle>
						<CardDescription>
							Last 10 stock movements for this item
						</CardDescription>
					</CardHeader>
					<CardContent>
						{item.transactions.length > 0 ? (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Type</TableHead>
										<TableHead>Quantity</TableHead>
										<TableHead>Reference</TableHead>
										<TableHead>Performed By</TableHead>
										<TableHead>Date</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{item.transactions.map((tx) => (
										<TableRow
											key={`${tx.type}-${tx.performedAt}-${tx.quantity}`}
										>
											<TableCell>
												<Badge
													variant={
														tx.type === "RECEIPT"
															? "default"
															: tx.type === "DISPENSING"
																? "secondary"
																: "outline"
													}
												>
													{tx.type}
												</Badge>
											</TableCell>
											<TableCell>
												<span
													className={
														tx.quantity > 0 ? "text-green-600" : "text-red-600"
													}
												>
													{tx.quantity > 0 ? "+" : ""}
													{tx.quantity}
												</span>
											</TableCell>
											<TableCell>{tx.reference || "—"}</TableCell>
											<TableCell>
												<div className="flex items-center gap-1">
													<User className="h-3 w-3" />
													{tx.performedBy.firstName} {tx.performedBy.lastName}
												</div>
											</TableCell>
											<TableCell>
												{new Date(tx.performedAt).toLocaleString()}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						) : (
							<div className="flex flex-col items-center gap-2 py-8 text-center">
								<Calendar className="h-8 w-8 text-muted-foreground" />
								<p className="text-muted-foreground">No transactions yet</p>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Add Stock Dialog */}
			<Dialog open={addStockOpen} onOpenChange={setAddStockOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Add Stock</DialogTitle>
						<DialogDescription>
							Add new stock to {item.medicine.name}
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="quantity">Quantity *</Label>
							<Input
								id="quantity"
								type="number"
								min="1"
								value={addStockForm.quantity || ""}
								onChange={(e) =>
									setAddStockForm({
										...addStockForm,
										quantity: Number.parseInt(e.target.value, 10) || 0,
									})
								}
								placeholder="Enter quantity"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="batchNumber">Batch Number *</Label>
							<Input
								id="batchNumber"
								value={addStockForm.batchNumber}
								onChange={(e) =>
									setAddStockForm({
										...addStockForm,
										batchNumber: e.target.value,
									})
								}
								placeholder="e.g., BATCH-2024-001"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="expiryDate">Expiry Date *</Label>
							<Input
								id="expiryDate"
								type="date"
								value={addStockForm.expiryDate}
								onChange={(e) =>
									setAddStockForm({
										...addStockForm,
										expiryDate: e.target.value,
									})
								}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="purchasePrice">Purchase Price</Label>
							<Input
								id="purchasePrice"
								type="number"
								step="0.01"
								min="0"
								value={addStockForm.purchasePrice || ""}
								onChange={(e) =>
									setAddStockForm({
										...addStockForm,
										purchasePrice:
											Number.parseFloat(e.target.value) || undefined,
									})
								}
								placeholder="Enter price"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="supplier">Supplier</Label>
							<Input
								id="supplier"
								value={addStockForm.supplier}
								onChange={(e) =>
									setAddStockForm({
										...addStockForm,
										supplier: e.target.value,
									})
								}
								placeholder="Supplier name"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="invoiceNumber">Invoice Number</Label>
							<Input
								id="invoiceNumber"
								value={addStockForm.invoiceNumber}
								onChange={(e) =>
									setAddStockForm({
										...addStockForm,
										invoiceNumber: e.target.value,
									})
								}
								placeholder="e.g., INV-2024-001"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="notes">Notes</Label>
							<Textarea
								id="notes"
								value={addStockForm.notes}
								onChange={(e) =>
									setAddStockForm({
										...addStockForm,
										notes: e.target.value,
									})
								}
								placeholder="Additional notes..."
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setAddStockOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleAddStock}
							disabled={
								addStockMutation.isPending ||
								!addStockForm.quantity ||
								!addStockForm.batchNumber ||
								!addStockForm.expiryDate
							}
						>
							{addStockMutation.isPending && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							Add Stock
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Adjust Stock Dialog */}
			<Dialog open={adjustStockOpen} onOpenChange={setAdjustStockOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Adjust Stock</DialogTitle>
						<DialogDescription>
							Adjust stock level for {item.medicine.name}. Use positive values
							to increase and negative values to decrease.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="adjustment">Adjustment *</Label>
							<Input
								id="adjustment"
								type="number"
								value={adjustStockForm.adjustment || ""}
								onChange={(e) =>
									setAdjustStockForm({
										...adjustStockForm,
										adjustment: Number.parseInt(e.target.value, 10) || 0,
									})
								}
								placeholder="e.g., -5 or +10"
							/>
							<p className="text-muted-foreground text-xs">
								Current stock: {item.currentStock}. After adjustment:{" "}
								{item.currentStock + (adjustStockForm.adjustment || 0)}
							</p>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="reason">Reason *</Label>
							<Select
								value={adjustStockForm.reason}
								onValueChange={(value) =>
									setAdjustStockForm({
										...adjustStockForm,
										reason: value as AdjustmentReason,
									})
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select reason" />
								</SelectTrigger>
								<SelectContent>
									{adjustmentReasons.map((reason) => (
										<SelectItem key={reason.value} value={reason.value}>
											{reason.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="adjustBatchNumber">Batch Number</Label>
							<Select
								value={adjustStockForm.batchNumber || ""}
								onValueChange={(value) =>
									setAdjustStockForm({
										...adjustStockForm,
										batchNumber: value,
									})
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select batch (optional)" />
								</SelectTrigger>
								<SelectContent>
									{item.batches.map((batch) => (
										<SelectItem
											key={batch.batchNumber}
											value={batch.batchNumber}
										>
											{batch.batchNumber} ({batch.quantity} units)
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="adjustNotes">Notes</Label>
							<Textarea
								id="adjustNotes"
								value={adjustStockForm.notes}
								onChange={(e) =>
									setAdjustStockForm({
										...adjustStockForm,
										notes: e.target.value,
									})
								}
								placeholder="Reason for adjustment..."
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setAdjustStockOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleAdjustStock}
							disabled={
								adjustStockMutation.isPending ||
								!adjustStockForm.adjustment ||
								!adjustStockForm.reason
							}
						>
							{adjustStockMutation.isPending && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							Adjust Stock
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
