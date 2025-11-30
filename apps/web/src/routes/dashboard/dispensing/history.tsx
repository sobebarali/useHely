import { createFileRoute, Link, redirect } from "@tanstack/react-router";
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
	ArrowUpDown,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	History,
	Loader2,
	MoreHorizontal,
	Search,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
	type DispensingStatus,
	type HistoryRecord,
	useDispensingHistory,
} from "@/hooks/use-dispensing";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/dispensing/history")({
	component: DispensingHistoryPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function getStatusBadgeVariant(
	status: DispensingStatus,
): "default" | "secondary" | "outline" | "destructive" {
	switch (status) {
		case "PENDING":
			return "secondary";
		case "DISPENSING":
			return "default";
		case "DISPENSED":
		case "COLLECTED":
			return "outline";
		case "CANCELLED":
			return "destructive";
		default:
			return "secondary";
	}
}

function DispensingHistoryPage() {
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("");
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = useState({});

	const { data: historyData, isLoading: historyLoading } = useDispensingHistory(
		{
			page,
			limit: 10,
			status:
				statusFilter && statusFilter !== "ALL"
					? (statusFilter as DispensingStatus)
					: undefined,
		},
	);

	const formatDate = (dateString: string | undefined) => {
		if (!dateString) return "-";
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const columns: ColumnDef<HistoryRecord>[] = [
		{
			accessorKey: "prescriptionId",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Prescription ID
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			),
			cell: ({ row }) => (
				<div className="font-medium">{row.getValue("prescriptionId")}</div>
			),
		},
		{
			accessorKey: "patient",
			header: "Patient",
			cell: ({ row }) => {
				const patient = row.original.patient;
				return (
					<div>
						<div className="font-medium">
							{patient.firstName} {patient.lastName}
						</div>
						<div className="text-muted-foreground text-xs">
							{patient.patientId}
						</div>
					</div>
				);
			},
		},
		{
			accessorKey: "pharmacist",
			header: "Pharmacist",
			cell: ({ row }) => {
				const pharmacist = row.original.pharmacist;
				if (!pharmacist) return "-";
				return (
					<div>
						{pharmacist.firstName} {pharmacist.lastName}
					</div>
				);
			},
		},
		{
			accessorKey: "medicineCount",
			header: "Medicines",
			cell: ({ row }) => (
				<Badge variant="outline">{row.original.medicineCount} items</Badge>
			),
		},
		{
			accessorKey: "status",
			header: "Status",
			cell: ({ row }) => {
				const status = row.original.status;
				return <Badge variant={getStatusBadgeVariant(status)}>{status}</Badge>;
			},
		},
		{
			accessorKey: "completedAt",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Completed
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			),
			cell: ({ row }) => formatDate(row.original.completedAt),
		},
		{
			accessorKey: "createdAt",
			header: "Created",
			cell: ({ row }) => formatDate(row.original.createdAt),
		},
		{
			id: "actions",
			enableHiding: false,
			cell: ({ row }) => {
				const record = row.original;
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
								<Link to="/dashboard/dispensing/$id" params={{ id: record.id }}>
									View details
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() =>
									navigator.clipboard.writeText(record.prescriptionId)
								}
							>
								Copy Prescription ID
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];

	const filteredData =
		historyData?.data.filter((record) => {
			if (!search) return true;
			const searchLower = search.toLowerCase();
			return (
				record.prescriptionId.toLowerCase().includes(searchLower) ||
				record.patient.firstName.toLowerCase().includes(searchLower) ||
				record.patient.lastName.toLowerCase().includes(searchLower) ||
				record.patient.patientId.toLowerCase().includes(searchLower) ||
				record.pharmacist?.firstName.toLowerCase().includes(searchLower) ||
				record.pharmacist?.lastName.toLowerCase().includes(searchLower)
			);
		}) ?? [];

	const table = useReactTable({
		data: filteredData,
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
		pageCount: historyData?.pagination.totalPages ?? 0,
	});

	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-bold text-2xl">Dispensing History</h1>
					<p className="text-muted-foreground">
						View completed and past dispensing records
					</p>
				</div>
				<Button asChild variant="outline">
					<Link to="/dashboard/dispensing">View Queue</Link>
				</Button>
			</div>

			{/* Filters */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
				<div className="relative flex-1">
					<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search by prescription ID, patient, or pharmacist..."
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
						}}
						className="pl-9"
					/>
				</div>
				<div className="flex gap-2">
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
								<SelectItem value="DISPENSING">Dispensing</SelectItem>
								<SelectItem value="DISPENSED">Dispensed</SelectItem>
								<SelectItem value="COLLECTED">Collected</SelectItem>
								<SelectItem value="CANCELLED">Cancelled</SelectItem>
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
						{historyLoading ? (
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
										<History className="h-8 w-8 text-muted-foreground" />
										<p className="text-muted-foreground">
											No dispensing history found.
										</p>
									</div>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			{historyData && historyData.pagination.total > 0 && (
				<div className="flex items-center justify-between px-2">
					<div className="text-muted-foreground text-sm">
						Showing {historyData.data.length} of {historyData.pagination.total}{" "}
						records
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
							Page {page} of {historyData.pagination.totalPages || 1}
						</span>
						<Button
							variant="outline"
							size="icon"
							onClick={() =>
								setPage((p) =>
									Math.min(historyData.pagination.totalPages, p + 1),
								)
							}
							disabled={page === historyData.pagination.totalPages}
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={() => setPage(historyData.pagination.totalPages)}
							disabled={page === historyData.pagination.totalPages}
						>
							<ChevronsRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
