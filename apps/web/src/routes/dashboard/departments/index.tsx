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
	Building2,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Loader2,
	MoreHorizontal,
	Pencil,
	Plus,
	Search,
	Trash2,
	Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
	type DepartmentListItem,
	type DepartmentStatus,
	type DepartmentType,
	useDeleteDepartment,
	useDepartments,
} from "@/hooks/use-departments";
import { authClient } from "@/lib/auth-client";
import type { ApiError } from "@/lib/departments-client";

export const Route = createFileRoute("/dashboard/departments/")({
	component: DepartmentsListPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

// Department type badge colors
const departmentTypeColors: Record<DepartmentType, string> = {
	CLINICAL: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
	DIAGNOSTIC:
		"bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
	SUPPORT: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
	ADMINISTRATIVE:
		"bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
	EMERGENCY: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
	PHARMACY: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

// Department status badge variants
const departmentStatusVariant: Record<
	DepartmentStatus,
	"default" | "secondary" | "destructive"
> = {
	ACTIVE: "default",
	INACTIVE: "destructive",
	SUSPENDED: "secondary",
};

function DepartmentsListPage() {
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [typeFilter, setTypeFilter] = useState<string>("");
	const [statusFilter, setStatusFilter] = useState<string>("");
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = useState({});

	// Delete dialog state
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedDepartment, setSelectedDepartment] =
		useState<DepartmentListItem | null>(null);

	const { data: departmentsData, isLoading: departmentsLoading } =
		useDepartments({
			page,
			limit: 10,
			search: search || undefined,
			type:
				typeFilter && typeFilter !== "ALL"
					? (typeFilter as DepartmentType)
					: undefined,
			status:
				statusFilter && statusFilter !== "ALL"
					? (statusFilter as DepartmentStatus)
					: undefined,
			includeStaffCount: true,
		});

	const deleteMutation = useDeleteDepartment();

	const handleDelete = async () => {
		if (!selectedDepartment) return;
		try {
			await deleteMutation.mutateAsync(selectedDepartment.id);
			toast.success("Department deactivated successfully");
			setDeleteDialogOpen(false);
			setSelectedDepartment(null);
		} catch (error) {
			const apiError = error as ApiError;
			// Handle specific error codes
			if (apiError.code === "HAS_ACTIVE_STAFF") {
				toast.error("Cannot deactivate department with active staff members");
			} else if (apiError.code === "HAS_ACTIVE_PATIENTS") {
				toast.error("Cannot deactivate department with active patients");
			} else if (apiError.code === "HAS_CHILDREN") {
				toast.error("Cannot deactivate department with child departments");
			} else {
				toast.error(apiError.message || "Failed to deactivate department");
			}
		}
	};

	const columns: ColumnDef<DepartmentListItem>[] = [
		{
			accessorKey: "name",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Name
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			),
			cell: ({ row }) => (
				<div className="flex flex-col">
					<span className="font-medium">{row.original.name}</span>
					<span className="text-muted-foreground text-xs">
						{row.original.code}
					</span>
				</div>
			),
		},
		{
			accessorKey: "type",
			header: "Type",
			cell: ({ row }) => {
				const type = row.original.type;
				return (
					<Badge className={departmentTypeColors[type]} variant="outline">
						{type}
					</Badge>
				);
			},
		},
		{
			accessorKey: "head",
			header: "Head",
			cell: ({ row }) => (
				<div className="text-muted-foreground">
					{row.original.head?.name || "—"}
				</div>
			),
		},
		{
			accessorKey: "location",
			header: "Location",
			cell: ({ row }) => (
				<div className="text-muted-foreground">
					{row.original.location || "—"}
				</div>
			),
		},
		{
			accessorKey: "staffCount",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Staff
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			),
			cell: ({ row }) => (
				<div className="flex items-center gap-1">
					<Users className="h-4 w-4 text-muted-foreground" />
					<span>{row.original.staffCount ?? 0}</span>
				</div>
			),
		},
		{
			accessorKey: "status",
			header: "Status",
			cell: ({ row }) => {
				const status = row.original.status;
				return (
					<Badge variant={departmentStatusVariant[status]}>{status}</Badge>
				);
			},
		},
		{
			id: "actions",
			enableHiding: false,
			cell: ({ row }) => {
				const department = row.original;
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
								<Link
									to="/dashboard/departments/$id"
									params={{ id: department.id }}
								>
									<Pencil className="mr-2 h-4 w-4" />
									View / Edit
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							{department.status === "ACTIVE" && (
								<DropdownMenuItem
									className="text-destructive"
									onClick={() => {
										setSelectedDepartment(department);
										setDeleteDialogOpen(true);
									}}
								>
									<Trash2 className="mr-2 h-4 w-4" />
									Deactivate
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];

	const table = useReactTable({
		data: departmentsData?.data ?? [],
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
		pageCount: departmentsData?.pagination.totalPages ?? 0,
	});

	return (
		<>
			<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
				{/* Header */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="font-bold text-2xl">Departments</h1>
						<p className="text-muted-foreground">
							Manage your hospital departments
						</p>
					</div>
					<Button asChild>
						<Link to="/dashboard/departments/add">
							<Plus className="mr-2 h-4 w-4" />
							Add Department
						</Link>
					</Button>
				</div>

				{/* Filters */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
					<div className="relative flex-1">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search by name or code..."
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setPage(1);
							}}
							className="pl-9"
						/>
					</div>
					<div className="flex gap-2">
						<div className="w-40">
							<Label htmlFor="type-filter" className="sr-only">
								Type
							</Label>
							<Select
								value={typeFilter}
								onValueChange={(value) => {
									setTypeFilter(value);
									setPage(1);
								}}
							>
								<SelectTrigger id="type-filter">
									<SelectValue placeholder="All types" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ALL">All types</SelectItem>
									<SelectItem value="CLINICAL">Clinical</SelectItem>
									<SelectItem value="DIAGNOSTIC">Diagnostic</SelectItem>
									<SelectItem value="SUPPORT">Support</SelectItem>
									<SelectItem value="ADMINISTRATIVE">Administrative</SelectItem>
									<SelectItem value="EMERGENCY">Emergency</SelectItem>
									<SelectItem value="PHARMACY">Pharmacy</SelectItem>
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
									<SelectItem value="ACTIVE">Active</SelectItem>
									<SelectItem value="INACTIVE">Inactive</SelectItem>
									<SelectItem value="SUSPENDED">Suspended</SelectItem>
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
							{departmentsLoading ? (
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
											<Building2 className="h-8 w-8 text-muted-foreground" />
											<p>No departments found.</p>
										</div>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				{/* Pagination */}
				{departmentsData && (
					<div className="flex items-center justify-between px-2">
						<div className="text-muted-foreground text-sm">
							Showing {departmentsData.data.length} of{" "}
							{departmentsData.pagination.total} departments
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
								Page {page} of {departmentsData.pagination.totalPages}
							</span>
							<Button
								variant="outline"
								size="icon"
								onClick={() =>
									setPage((p) =>
										Math.min(departmentsData.pagination.totalPages, p + 1),
									)
								}
								disabled={page === departmentsData.pagination.totalPages}
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								onClick={() => setPage(departmentsData.pagination.totalPages)}
								disabled={page === departmentsData.pagination.totalPages}
							>
								<ChevronsRight className="h-4 w-4" />
							</Button>
						</div>
					</div>
				)}
			</div>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Deactivate Department</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to deactivate{" "}
							<span className="font-medium">{selectedDepartment?.name}</span>?
							This will prevent new assignments to this department.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							Deactivate
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
