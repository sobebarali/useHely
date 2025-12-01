import { createFileRoute, Link } from "@tanstack/react-router";
import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import {
	AlertTriangle,
	ArrowUpDown,
	Calendar,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Loader2,
	MoreHorizontal,
	Package,
	PackagePlus,
	Plus,
	Search,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
	type InventoryItemSummary,
	type StockStatus,
	useInventory,
} from "@/hooks/use-inventory";

export const Route = createFileRoute("/dashboard/inventory/")({
	component: InventoryListPage,
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

// Medicine category display names
const categoryLabels: Record<string, string> = {
	ANALGESICS: "Analgesics",
	ANTIBIOTICS: "Antibiotics",
	ANTIDIABETICS: "Antidiabetics",
	ANTIHYPERTENSIVES: "Antihypertensives",
	ANTIHISTAMINES: "Antihistamines",
	CARDIOVASCULAR: "Cardiovascular",
	GASTROINTESTINAL: "Gastrointestinal",
	RESPIRATORY: "Respiratory",
	VITAMINS: "Vitamins",
	TOPICAL: "Topical",
	INJECTABLE: "Injectable",
	OTHER: "Other",
};

function InventoryListPage() {
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [categoryFilter, setCategoryFilter] = useState<string>("");
	const [statusFilter, setStatusFilter] = useState<string>("");
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = useState({});

	const { data: inventoryData, isLoading } = useInventory({
		page,
		limit: 10,
		search: search || undefined,
		category:
			categoryFilter && categoryFilter !== "ALL" ? categoryFilter : undefined,
		status:
			statusFilter && statusFilter !== "ALL"
				? (statusFilter as StockStatus)
				: undefined,
	});

	const columns: ColumnDef<InventoryItemSummary>[] = [
		{
			accessorKey: "name",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Medicine
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			),
			cell: ({ row }) => (
				<div className="flex flex-col">
					<span className="font-medium">{row.original.name}</span>
					<span className="text-muted-foreground text-xs">
						{row.original.genericName} - {row.original.code}
					</span>
				</div>
			),
		},
		{
			accessorKey: "category",
			header: "Category",
			cell: ({ row }) => (
				<Badge variant="outline">
					{categoryLabels[row.original.category] || row.original.category}
				</Badge>
			),
		},
		{
			accessorKey: "currentStock",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Stock
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			),
			cell: ({ row }) => (
				<div className="flex flex-col">
					<span className="font-medium">
						{row.original.currentStock} {row.original.unit}
					</span>
					<span className="text-muted-foreground text-xs">
						Reorder at: {row.original.reorderLevel}
					</span>
				</div>
			),
		},
		{
			accessorKey: "status",
			header: "Status",
			cell: ({ row }) => {
				const status = row.original.status;
				return (
					<Badge className={stockStatusColors[status]} variant="outline">
						{status.replace("_", " ")}
					</Badge>
				);
			},
		},
		{
			accessorKey: "lastRestocked",
			header: "Last Restocked",
			cell: ({ row }) => (
				<div className="text-muted-foreground">
					{row.original.lastRestocked
						? new Date(row.original.lastRestocked).toLocaleDateString()
						: "—"}
				</div>
			),
		},
		{
			accessorKey: "expiryDate",
			header: "Nearest Expiry",
			cell: ({ row }) => {
				if (!row.original.expiryDate)
					return <span className="text-muted-foreground">—</span>;
				const expiryDate = new Date(row.original.expiryDate);
				const daysUntilExpiry = Math.ceil(
					(expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
				);
				return (
					<div className="flex items-center gap-1">
						{daysUntilExpiry <= 30 && (
							<AlertTriangle className="h-4 w-4 text-orange-500" />
						)}
						<span
							className={
								daysUntilExpiry <= 30
									? "font-medium text-orange-600"
									: "text-muted-foreground"
							}
						>
							{expiryDate.toLocaleDateString()}
						</span>
					</div>
				);
			},
		},
		{
			id: "actions",
			enableHiding: false,
			cell: ({ row }) => {
				const item = row.original;
				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="h-8 w-8 p-0">
								<span className="sr-only">Open menu</span>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Actions</DropdownMenuLabel>
							<DropdownMenuItem asChild>
								<Link to="/dashboard/inventory/$id" params={{ id: item.id }}>
									<Package className="mr-2 h-4 w-4" />
									View Details
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<Link
									to="/dashboard/inventory/$id"
									params={{ id: item.id }}
									search={{ action: "add-stock" }}
								>
									<PackagePlus className="mr-2 h-4 w-4" />
									Add Stock
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link
									to="/dashboard/inventory/$id"
									params={{ id: item.id }}
									search={{ action: "adjust" }}
								>
									<Calendar className="mr-2 h-4 w-4" />
									Adjust Stock
								</Link>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];

	const table = useReactTable({
		data: inventoryData?.data ?? [],
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			rowSelection,
		},
		manualPagination: true,
		pageCount: inventoryData?.pagination.totalPages ?? 0,
	});

	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-bold text-2xl">Inventory</h1>
					<p className="text-muted-foreground">
						Manage your pharmacy inventory and stock levels
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" asChild>
						<Link to="/dashboard/inventory/medicines">
							<Package className="mr-2 h-4 w-4" />
							Medicine Catalog
						</Link>
					</Button>
					<Button asChild>
						<Link
							to="/dashboard/inventory/medicines"
							search={{ action: "add" }}
						>
							<Plus className="mr-2 h-4 w-4" />
							Add Medicine
						</Link>
					</Button>
				</div>
			</div>

			{/* Summary Cards */}
			{inventoryData?.summary && (
				<div className="grid gap-4 md:grid-cols-5">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">Total Items</CardTitle>
							<Package className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl">
								{inventoryData.summary.totalItems}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">In Stock</CardTitle>
							<div className="h-2 w-2 rounded-full bg-green-500" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl text-green-600">
								{inventoryData.summary.inStock}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">Low Stock</CardTitle>
							<div className="h-2 w-2 rounded-full bg-yellow-500" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl text-yellow-600">
								{inventoryData.summary.lowStock}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">
								Out of Stock
							</CardTitle>
							<div className="h-2 w-2 rounded-full bg-red-500" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl text-red-600">
								{inventoryData.summary.outOfStock}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">
								Expiring Soon
							</CardTitle>
							<AlertTriangle className="h-4 w-4 text-orange-500" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl text-orange-600">
								{inventoryData.summary.expiringSoon}
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Quick Links */}
			<div className="flex gap-2">
				<Button variant="outline" size="sm" asChild>
					<Link to="/dashboard/inventory/expiring">
						<AlertTriangle className="mr-2 h-4 w-4" />
						View Expiring Items
					</Link>
				</Button>
				<Button variant="outline" size="sm" asChild>
					<Link to="/dashboard/inventory/transactions">
						<Calendar className="mr-2 h-4 w-4" />
						Transaction History
					</Link>
				</Button>
			</div>

			{/* Filters */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
				<div className="relative flex-1">
					<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search by medicine name or code..."
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
						className="pl-9"
					/>
				</div>
				<div className="flex gap-2">
					<div className="w-44">
						<Label htmlFor="category-filter" className="sr-only">
							Category
						</Label>
						<Select
							value={categoryFilter}
							onValueChange={(value) => {
								setCategoryFilter(value);
								setPage(1);
							}}
						>
							<SelectTrigger id="category-filter">
								<SelectValue placeholder="All categories" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">All categories</SelectItem>
								{Object.entries(categoryLabels).map(([key, label]) => (
									<SelectItem key={key} value={key}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="w-40">
						<Label htmlFor="status-filter" className="sr-only">
							Status
						</Label>
						<Select
							value={statusFilter}
							onValueChange={(value) => {
								setStatusFilter(value);
								setPage(1);
							}}
						>
							<SelectTrigger id="status-filter">
								<SelectValue placeholder="All statuses" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">All statuses</SelectItem>
								<SelectItem value="IN_STOCK">In Stock</SelectItem>
								<SelectItem value="LOW_STOCK">Low Stock</SelectItem>
								<SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
								<SelectItem value="EXPIRING">Expiring</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>

			{/* Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id}>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									<Loader2 className="mx-auto h-6 w-6 animate-spin" />
								</TableCell>
							</TableRow>
						) : table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && "selected"}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									<div className="flex flex-col items-center gap-2">
										<Package className="h-8 w-8 text-muted-foreground" />
										<p>No inventory items found.</p>
									</div>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			{inventoryData && (
				<div className="flex items-center justify-between px-2">
					<div className="text-muted-foreground text-sm">
						Showing {inventoryData.data.length} of{" "}
						{inventoryData.pagination.total} items
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="icon"
							onClick={() => setPage(1)}
							disabled={page === 1}
						>
							<ChevronsLeft className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<span className="text-sm">
							Page {page} of {inventoryData.pagination.totalPages || 1}
						</span>
						<Button
							variant="outline"
							size="icon"
							onClick={() =>
								setPage((p) =>
									Math.min(inventoryData.pagination.totalPages, p + 1),
								)
							}
							disabled={
								page === inventoryData.pagination.totalPages ||
								inventoryData.pagination.totalPages === 0
							}
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={() => setPage(inventoryData.pagination.totalPages)}
							disabled={
								page === inventoryData.pagination.totalPages ||
								inventoryData.pagination.totalPages === 0
							}
						>
							<ChevronsRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
