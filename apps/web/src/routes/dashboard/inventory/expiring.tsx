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
	AlertTriangle,
	ArrowLeft,
	ArrowUpDown,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Loader2,
	Package,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { type ExpiringItem, useExpiring } from "@/hooks/use-inventory";

export const Route = createFileRoute("/dashboard/inventory/expiring")({
	component: ExpiringItemsPage,
});

function ExpiringItemsPage() {
	const [page, setPage] = useState(1);
	const [days, setDays] = useState(30);
	const [sorting, setSorting] = useState<SortingState>([]);

	const { data: expiringData, isLoading } = useExpiring({
		page,
		limit: 10,
		days,
	});

	const columns: ColumnDef<ExpiringItem>[] = [
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
				<span className="font-medium">{row.original.name}</span>
			),
		},
		{
			accessorKey: "batchNumber",
			header: "Batch Number",
			cell: ({ row }) => (
				<span className="font-mono text-sm">{row.original.batchNumber}</span>
			),
		},
		{
			accessorKey: "quantity",
			header: "Quantity",
			cell: ({ row }) => <span>{row.original.quantity}</span>,
		},
		{
			accessorKey: "expiryDate",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Expiry Date
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			),
			cell: ({ row }) => {
				const expiryDate = new Date(row.original.expiryDate);
				return (
					<span className="font-medium text-orange-600">
						{expiryDate.toLocaleDateString()}
					</span>
				);
			},
		},
		{
			accessorKey: "daysUntilExpiry",
			header: "Days Left",
			cell: ({ row }) => {
				const days = row.original.daysUntilExpiry;
				const isExpired = days <= 0;
				const isUrgent = days <= 7;

				return (
					<Badge
						variant={
							isExpired ? "destructive" : isUrgent ? "secondary" : "outline"
						}
						className={
							isUrgent && !isExpired ? "bg-orange-100 text-orange-800" : ""
						}
					>
						{isExpired ? "EXPIRED" : `${days} days`}
					</Badge>
				);
			},
		},
		{
			id: "actions",
			cell: ({ row }) => (
				<Button variant="ghost" size="sm" asChild>
					<Link to="/dashboard/inventory/$id" params={{ id: row.original.id }}>
						View
					</Link>
				</Button>
			),
		},
	];

	const table = useReactTable({
		data: expiringData?.items ?? [],
		columns,
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		state: {
			sorting,
		},
		manualPagination: true,
		pageCount: expiringData?.totalPages ?? 0,
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
					<h1 className="font-bold text-2xl">Expiring Items</h1>
					<p className="text-muted-foreground">
						View items expiring within the next {days} days
					</p>
				</div>
			</div>

			{/* Summary */}
			{expiringData && (
				<div className="grid gap-4 md:grid-cols-2">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">
								Total Expiring Items
							</CardTitle>
							<AlertTriangle className="h-4 w-4 text-orange-500" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl text-orange-600">
								{expiringData.total}
							</div>
							<p className="text-muted-foreground text-xs">
								{expiringData.count} batches shown
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">
								Days to Check
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex items-center gap-2">
								<Label htmlFor="days" className="sr-only">
									Days
								</Label>
								<Input
									id="days"
									type="number"
									min="1"
									max="365"
									value={days}
									onChange={(e) => {
										setDays(Number.parseInt(e.target.value, 10) || 30);
										setPage(1);
									}}
									className="w-24"
								/>
								<span className="text-muted-foreground text-sm">days</span>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

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
										<p>No expiring items found.</p>
									</div>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			{expiringData && expiringData.totalPages > 0 && (
				<div className="flex items-center justify-between px-2">
					<div className="text-muted-foreground text-sm">
						Showing {expiringData.items.length} of {expiringData.total} items
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
							Page {page} of {expiringData.totalPages}
						</span>
						<Button
							variant="outline"
							size="icon"
							onClick={() =>
								setPage((p) => Math.min(expiringData.totalPages, p + 1))
							}
							disabled={page === expiringData.totalPages}
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={() => setPage(expiringData.totalPages)}
							disabled={page === expiringData.totalPages}
						>
							<ChevronsRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
