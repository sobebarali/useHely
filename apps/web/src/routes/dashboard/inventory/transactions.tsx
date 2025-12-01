import { createFileRoute, Link } from "@tanstack/react-router";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import {
	ArrowLeft,
	ArrowUpDown,
	Calendar,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Loader2,
	Package,
	User,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
	type TransactionItem,
	type TransactionType,
	useTransactions,
} from "@/hooks/use-inventory";

export const Route = createFileRoute("/dashboard/inventory/transactions")({
	component: TransactionsHistoryPage,
});

// Transaction type options
const transactionTypes: { value: TransactionType; label: string }[] = [
	{ value: "RECEIPT", label: "Receipt" },
	{ value: "DISPENSING", label: "Dispensing" },
	{ value: "ADJUSTMENT", label: "Adjustment" },
	{ value: "RETURN", label: "Return" },
	{ value: "TRANSFER", label: "Transfer" },
];

// Transaction type badge variants
const transactionTypeVariant: Record<
	TransactionType,
	"default" | "secondary" | "outline" | "destructive"
> = {
	RECEIPT: "default",
	DISPENSING: "secondary",
	ADJUSTMENT: "outline",
	RETURN: "default",
	TRANSFER: "secondary",
};

function TransactionsHistoryPage() {
	const [page, setPage] = useState(1);
	const [typeFilter, setTypeFilter] = useState<string>("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [sorting, setSorting] = useState<SortingState>([]);

	const { data: transactionsData, isLoading } = useTransactions({
		page,
		limit: 20,
		type:
			typeFilter && typeFilter !== "ALL"
				? (typeFilter as TransactionType)
				: undefined,
		startDate: startDate || undefined,
		endDate: endDate || undefined,
	});

	const columns: ColumnDef<TransactionItem>[] = [
		{
			accessorKey: "performedAt",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Date
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			),
			cell: ({ row }) => (
				<div className="flex flex-col">
					<span className="font-medium">
						{new Date(row.original.performedAt).toLocaleDateString()}
					</span>
					<span className="text-muted-foreground text-xs">
						{new Date(row.original.performedAt).toLocaleTimeString()}
					</span>
				</div>
			),
		},
		{
			accessorKey: "medicineName",
			header: "Medicine",
			cell: ({ row }) => (
				<span className="font-medium">{row.original.medicineName}</span>
			),
		},
		{
			accessorKey: "type",
			header: "Type",
			cell: ({ row }) => (
				<Badge variant={transactionTypeVariant[row.original.type]}>
					{row.original.type}
				</Badge>
			),
		},
		{
			accessorKey: "quantity",
			header: "Quantity",
			cell: ({ row }) => {
				const qty = row.original.quantity;
				return (
					<span
						className={
							qty > 0
								? "font-medium text-green-600"
								: "font-medium text-red-600"
						}
					>
						{qty > 0 ? "+" : ""}
						{qty}
					</span>
				);
			},
		},
		{
			accessorKey: "batchNumber",
			header: "Batch",
			cell: ({ row }) => (
				<span className="font-mono text-sm">
					{row.original.batchNumber || "—"}
				</span>
			),
		},
		{
			accessorKey: "reason",
			header: "Reason",
			cell: ({ row }) => (
				<span className="text-muted-foreground">
					{row.original.reason || "—"}
				</span>
			),
		},
		{
			accessorKey: "reference",
			header: "Reference",
			cell: ({ row }) => (
				<span className="text-muted-foreground text-sm">
					{row.original.reference || "—"}
				</span>
			),
		},
		{
			accessorKey: "performedBy",
			header: "Performed By",
			cell: ({ row }) => (
				<div className="flex items-center gap-1">
					<User className="h-3 w-3" />
					<span className="text-sm">
						{row.original.performedBy.firstName}{" "}
						{row.original.performedBy.lastName}
					</span>
				</div>
			),
		},
	];

	const table = useReactTable({
		data: transactionsData?.data ?? [],
		columns,
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		state: {
			sorting,
		},
		manualPagination: true,
		pageCount: transactionsData?.pagination.totalPages ?? 0,
	});

	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link to="/dashboard/inventory">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<div className="flex-1">
					<h1 className="font-bold text-2xl">Transaction History</h1>
					<p className="text-muted-foreground">
						View all inventory transactions
					</p>
				</div>
			</div>

			{/* Filters */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end">
				<div className="grid gap-2">
					<Label htmlFor="type">Transaction Type</Label>
					<Select
						value={typeFilter}
						onValueChange={(value) => {
							setTypeFilter(value);
							setPage(1);
						}}
					>
						<SelectTrigger className="w-40">
							<SelectValue placeholder="All types" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="ALL">All types</SelectItem>
							{transactionTypes.map((type) => (
								<SelectItem key={type.value} value={type.value}>
									{type.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="grid gap-2">
					<Label htmlFor="startDate">Start Date</Label>
					<div className="relative">
						<Calendar className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
						<Input
							id="startDate"
							type="date"
							value={startDate}
							onChange={(e) => {
								setStartDate(e.target.value);
								setPage(1);
							}}
							className="pl-9"
						/>
					</div>
				</div>
				<div className="grid gap-2">
					<Label htmlFor="endDate">End Date</Label>
					<div className="relative">
						<Calendar className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
						<Input
							id="endDate"
							type="date"
							value={endDate}
							onChange={(e) => {
								setEndDate(e.target.value);
								setPage(1);
							}}
							className="pl-9"
						/>
					</div>
				</div>
				{(typeFilter || startDate || endDate) && (
					<Button
						variant="ghost"
						onClick={() => {
							setTypeFilter("");
							setStartDate("");
							setEndDate("");
							setPage(1);
						}}
					>
						Clear filters
					</Button>
				)}
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
								<TableRow key={row.id}>
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
										<p>No transactions found.</p>
									</div>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			{transactionsData && (
				<div className="flex items-center justify-between px-2">
					<div className="text-muted-foreground text-sm">
						Showing {transactionsData.data.length} of{" "}
						{transactionsData.pagination.total} transactions
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
							Page {page} of {transactionsData.pagination.totalPages || 1}
						</span>
						<Button
							variant="outline"
							size="icon"
							onClick={() =>
								setPage((p) =>
									Math.min(transactionsData.pagination.totalPages, p + 1),
								)
							}
							disabled={
								page === transactionsData.pagination.totalPages ||
								transactionsData.pagination.totalPages === 0
							}
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={() => setPage(transactionsData.pagination.totalPages)}
							disabled={
								page === transactionsData.pagination.totalPages ||
								transactionsData.pagination.totalPages === 0
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
