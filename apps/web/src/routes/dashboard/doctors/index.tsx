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
	Calendar,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Loader2,
	MoreHorizontal,
	Search,
	Stethoscope,
	UserPlus,
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
import { useDepartments } from "@/hooks/use-departments";
import { type UserListItem, useUsers } from "@/hooks/use-users";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/doctors/")({
	component: DoctorsListPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function DoctorsListPage() {
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("");
	const [departmentFilter, setDepartmentFilter] = useState<string>("");
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = useState({});

	// Fetch users filtered by DOCTOR role
	const { data: doctorsData, isLoading: doctorsLoading } = useUsers({
		page,
		limit: 10,
		role: "DOCTOR",
		search: search || undefined,
		status:
			statusFilter && statusFilter !== "ALL"
				? (statusFilter as "ACTIVE" | "INACTIVE" | "PASSWORD_EXPIRED")
				: undefined,
		department:
			departmentFilter && departmentFilter !== "ALL"
				? departmentFilter
				: undefined,
	});

	// Fetch departments for filter
	const { data: departmentsData } = useDepartments({ status: "ACTIVE" });

	const columns: ColumnDef<UserListItem>[] = [
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
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
						<Stethoscope className="h-5 w-5 text-primary" />
					</div>
					<div>
						<div className="font-medium">
							Dr. {row.original.firstName} {row.original.lastName}
						</div>
						<div className="text-muted-foreground text-sm">
							{row.original.email}
						</div>
					</div>
				</div>
			),
		},
		{
			accessorKey: "department",
			header: "Department",
			cell: ({ row }) => <div>{row.original.department}</div>,
		},
		{
			accessorKey: "specialization",
			header: "Specialization",
			cell: ({ row }) => {
				// Note: specialization is not in UserListItem, we'll show department as fallback
				return (
					<Badge variant="outline">
						{row.original.department || "General"}
					</Badge>
				);
			},
		},
		{
			accessorKey: "status",
			header: "Status",
			cell: ({ row }) => {
				const status = row.original.status;
				const variant =
					status === "ACTIVE"
						? "default"
						: status === "PASSWORD_EXPIRED"
							? "secondary"
							: "destructive";
				return <Badge variant={variant}>{status}</Badge>;
			},
		},
		{
			id: "actions",
			enableHiding: false,
			cell: ({ row }) => {
				const doctor = row.original;
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
								<Link to="/dashboard/staff/$id" params={{ id: doctor.id }}>
									View Profile
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<Link to="/dashboard/doctors/availability">
									<Calendar className="mr-2 h-4 w-4" />
									Manage Availability
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link
									to="/dashboard/appointments"
									search={{ doctorId: doctor.id }}
								>
									View Appointments
								</Link>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];

	const table = useReactTable({
		data: doctorsData?.data ?? [],
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
		pageCount: doctorsData?.pagination.totalPages ?? 0,
	});

	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-bold text-2xl">Doctors</h1>
					<p className="text-muted-foreground">
						View and manage doctors in your hospital
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" asChild>
						<Link to="/dashboard/doctors/availability">
							<Calendar className="mr-2 h-4 w-4" />
							Availability
						</Link>
					</Button>
					<Button asChild>
						<Link to="/dashboard/staff/add">
							<UserPlus className="mr-2 h-4 w-4" />
							Add Doctor
						</Link>
					</Button>
				</div>
			</div>

			{/* Filters */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
				<div className="relative flex-1">
					<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search doctors by name or email..."
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
						<Label htmlFor="department-filter" className="sr-only">
							Department
						</Label>
						<Select
							value={departmentFilter}
							onValueChange={(value) => {
								setDepartmentFilter(value);
								setPage(1);
							}}
						>
							<SelectTrigger id="department-filter">
								<SelectValue placeholder="All Departments" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">All Departments</SelectItem>
								{departmentsData?.data.map((dept) => (
									<SelectItem key={dept.id} value={dept.id}>
										{dept.name}
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
								<SelectItem value="ACTIVE">Active</SelectItem>
								<SelectItem value="INACTIVE">Inactive</SelectItem>
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
						{doctorsLoading ? (
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
										<Stethoscope className="h-8 w-8 text-muted-foreground" />
										<p>No doctors found.</p>
										<Button variant="outline" size="sm" asChild>
											<Link to="/dashboard/staff/add">Add a Doctor</Link>
										</Button>
									</div>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			{doctorsData && (
				<div className="flex items-center justify-between px-2">
					<div className="text-muted-foreground text-sm">
						Showing {doctorsData.data.length} of {doctorsData.pagination.total}{" "}
						doctors
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
							Page {page} of {doctorsData.pagination.totalPages || 1}
						</span>
						<Button
							variant="outline"
							size="icon"
							onClick={() =>
								setPage((p) =>
									Math.min(doctorsData.pagination.totalPages, p + 1),
								)
							}
							disabled={page === doctorsData.pagination.totalPages}
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={() => setPage(doctorsData.pagination.totalPages)}
							disabled={page === doctorsData.pagination.totalPages}
						>
							<ChevronsRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
