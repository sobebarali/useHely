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
	AlertCircle,
	ArrowUpDown,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Clock,
	Loader2,
	MoreHorizontal,
	Package,
	Play,
	Search,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
	type PendingPrescription,
	type Priority,
	usePendingDispensing,
	useStartDispensing,
} from "@/hooks/use-dispensing";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/dispensing/")({
	component: DispensingPendingPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function getPriorityBadgeVariant(
	priority: Priority,
): "default" | "secondary" | "outline" | "destructive" {
	switch (priority) {
		case "URGENT":
			return "destructive";
		case "HIGH":
			return "default";
		case "NORMAL":
			return "secondary";
		case "LOW":
			return "outline";
		default:
			return "secondary";
	}
}

function formatWaitingTime(minutes: number): string {
	if (minutes < 60) {
		return `${minutes} min`;
	}
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return `${hours}h ${mins}m`;
}

function DispensingPendingPage() {
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [priorityFilter, setPriorityFilter] = useState<string>("");
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = useState({});

	const { data: pendingData, isLoading: pendingLoading } = usePendingDispensing(
		{
			page,
			limit: 10,
			priority:
				priorityFilter && priorityFilter !== "ALL"
					? (priorityFilter as Priority)
					: undefined,
		},
	);

	const startDispensingMutation = useStartDispensing();

	const handleStartDispensing = async (prescriptionId: string) => {
		try {
			await startDispensingMutation.mutateAsync(prescriptionId);
			toast.success("Dispensing started");
		} catch {
			toast.error("Failed to start dispensing");
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const columns: ColumnDef<PendingPrescription>[] = [
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
			accessorKey: "doctor",
			header: "Doctor",
			cell: ({ row }) => {
				const doctor = row.original.doctor;
				return (
					<div>
						Dr. {doctor.firstName} {doctor.lastName}
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
			accessorKey: "priority",
			header: "Priority",
			cell: ({ row }) => {
				const priority = row.original.priority as Priority;
				return (
					<Badge variant={getPriorityBadgeVariant(priority)}>{priority}</Badge>
				);
			},
		},
		{
			accessorKey: "waitingTime",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Waiting
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			),
			cell: ({ row }) => (
				<div className="flex items-center gap-1">
					<Clock className="h-3 w-3 text-muted-foreground" />
					{formatWaitingTime(row.original.waitingTime)}
				</div>
			),
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
				const prescription = row.original;
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
							<DropdownMenuItem
								onClick={() => handleStartDispensing(prescription.id)}
								disabled={startDispensingMutation.isPending}
							>
								<Play className="mr-2 h-4 w-4" />
								Start Dispensing
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<Link
									to="/dashboard/dispensing/$id"
									params={{ id: prescription.id }}
								>
									View details
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() =>
									navigator.clipboard.writeText(prescription.prescriptionId)
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
		pendingData?.data.filter((prescription) => {
			if (!search) return true;
			const searchLower = search.toLowerCase();
			return (
				prescription.prescriptionId.toLowerCase().includes(searchLower) ||
				prescription.patient.firstName.toLowerCase().includes(searchLower) ||
				prescription.patient.lastName.toLowerCase().includes(searchLower) ||
				prescription.patient.patientId.toLowerCase().includes(searchLower)
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
		pageCount: pendingData?.pagination.totalPages ?? 0,
	});

	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-bold text-2xl">Dispensing Queue</h1>
					<p className="text-muted-foreground">
						Pending prescriptions awaiting dispensing
					</p>
				</div>
				<Button asChild variant="outline">
					<Link to="/dashboard/dispensing/history">View History</Link>
				</Button>
			</div>

			{/* Summary Cards */}
			{pendingData?.summary && (
				<div className="grid gap-4 md:grid-cols-3">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">
								Total Pending
							</CardTitle>
							<Package className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl">
								{pendingData.summary.totalPending}
							</div>
							<p className="text-muted-foreground text-xs">
								prescriptions in queue
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">Urgent</CardTitle>
							<AlertCircle className="h-4 w-4 text-destructive" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl text-destructive">
								{pendingData.summary.urgent}
							</div>
							<p className="text-muted-foreground text-xs">
								require immediate attention
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">
								Avg. Wait Time
							</CardTitle>
							<Clock className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl">
								{formatWaitingTime(pendingData.summary.averageWaitTime)}
							</div>
							<p className="text-muted-foreground text-xs">average wait</p>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Filters */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
				<div className="relative flex-1">
					<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search by prescription ID or patient..."
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
						}}
						className="pl-9"
					/>
				</div>
				<div className="flex gap-2">
					<div className="w-40">
						<Label htmlFor="priority-filter" className="sr-only">
							Priority
						</Label>
						<Select
							value={priorityFilter}
							onValueChange={(value) => {
								setPriorityFilter(value);
								setPage(1);
							}}
						>
							<SelectTrigger id="priority-filter">
								<SelectValue placeholder="All priorities" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">All priorities</SelectItem>
								<SelectItem value="URGENT">Urgent</SelectItem>
								<SelectItem value="HIGH">High</SelectItem>
								<SelectItem value="NORMAL">Normal</SelectItem>
								<SelectItem value="LOW">Low</SelectItem>
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
						{pendingLoading ? (
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
										<p className="text-muted-foreground">
											No pending prescriptions.
										</p>
									</div>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			{pendingData && pendingData.pagination.total > 0 && (
				<div className="flex items-center justify-between px-2">
					<div className="text-muted-foreground text-sm">
						Showing {pendingData.data.length} of {pendingData.pagination.total}{" "}
						prescriptions
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
							Page {page} of {pendingData.pagination.totalPages || 1}
						</span>
						<Button
							variant="outline"
							size="icon"
							onClick={() =>
								setPage((p) =>
									Math.min(pendingData.pagination.totalPages, p + 1),
								)
							}
							disabled={page === pendingData.pagination.totalPages}
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={() => setPage(pendingData.pagination.totalPages)}
							disabled={page === pendingData.pagination.totalPages}
						>
							<ChevronsRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
