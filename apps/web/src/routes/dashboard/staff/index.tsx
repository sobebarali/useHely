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
	KeyRound,
	Loader2,
	MoreHorizontal,
	Search,
	UserMinus,
	UserPlus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard-layout";
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
import { useSession } from "@/hooks/use-auth";
import {
	type UserListItem,
	useDeactivateUser,
	useForcePasswordChange,
	useUsers,
} from "@/hooks/use-users";
import { authClient } from "@/lib/auth-client";
import type { ApiError } from "@/lib/users-client";

export const Route = createFileRoute("/dashboard/staff/")({
	component: StaffListPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function StaffListPage() {
	const { data: session, isLoading: sessionLoading } = useSession();
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("");
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = useState({});

	// Action dialogs
	const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
	const [forcePasswordDialogOpen, setForcePasswordDialogOpen] = useState(false);
	const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);

	const { data: usersData, isLoading: usersLoading } = useUsers({
		page,
		limit: 10,
		search: search || undefined,
		status: statusFilter as
			| "ACTIVE"
			| "INACTIVE"
			| "PASSWORD_EXPIRED"
			| undefined,
	});

	const deactivateMutation = useDeactivateUser();
	const forcePasswordMutation = useForcePasswordChange();

	const handleDeactivate = async () => {
		if (!selectedUser) return;
		try {
			await deactivateMutation.mutateAsync(selectedUser.id);
			toast.success("User deactivated successfully");
			setDeactivateDialogOpen(false);
			setSelectedUser(null);
		} catch (error) {
			const apiError = error as ApiError;
			toast.error(apiError.message || "Failed to deactivate user");
		}
	};

	const handleForcePasswordChange = async () => {
		if (!selectedUser) return;
		try {
			await forcePasswordMutation.mutateAsync(selectedUser.id);
			toast.success("Password change required on next login");
			setForcePasswordDialogOpen(false);
			setSelectedUser(null);
		} catch (error) {
			const apiError = error as ApiError;
			toast.error(apiError.message || "Failed to force password change");
		}
	};

	const columns: ColumnDef<UserListItem>[] = [
		{
			accessorKey: "username",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Username
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			),
			cell: ({ row }) => (
				<div className="font-medium">{row.getValue("username")}</div>
			),
		},
		{
			accessorKey: "name",
			header: "Name",
			cell: ({ row }) => (
				<div>
					{row.original.firstName} {row.original.lastName}
				</div>
			),
		},
		{
			accessorKey: "email",
			header: "Email",
			cell: ({ row }) => (
				<div className="text-muted-foreground">{row.original.email}</div>
			),
		},
		{
			accessorKey: "department",
			header: "Department",
			cell: ({ row }) => <div>{row.original.department}</div>,
		},
		{
			accessorKey: "roles",
			header: "Roles",
			cell: ({ row }) => (
				<div className="flex flex-wrap gap-1">
					{row.original.roles.map((role) => (
						<Badge key={role.id} variant="secondary" className="text-xs">
							{role.name}
						</Badge>
					))}
				</div>
			),
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
				const user = row.original;
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
								<Link to="/dashboard/staff/$id" params={{ id: user.id }}>
									View details
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() => {
									setSelectedUser(user);
									setForcePasswordDialogOpen(true);
								}}
							>
								<KeyRound className="mr-2 h-4 w-4" />
								Force password change
							</DropdownMenuItem>
							{user.status === "ACTIVE" && (
								<DropdownMenuItem
									className="text-destructive"
									onClick={() => {
										setSelectedUser(user);
										setDeactivateDialogOpen(true);
									}}
								>
									<UserMinus className="mr-2 h-4 w-4" />
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
		data: usersData?.data ?? [],
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
		pageCount: usersData?.pagination.totalPages ?? 0,
	});

	if (sessionLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	if (!session) return null;

	const user = {
		name: `${session.firstName} ${session.lastName}`.trim() || session.username,
		email: session.email,
		image: undefined,
	};

	const hospital = {
		name: session.hospital?.name || "Unknown Hospital",
		plan: "Pro",
	};

	return (
		<DashboardLayout
			user={user}
			hospital={hospital}
			pageTitle="Staff Management"
		>
			<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
				{/* Header */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="font-bold text-2xl">Staff</h1>
						<p className="text-muted-foreground">
							Manage your hospital staff members
						</p>
					</div>
					<Button asChild>
						<Link to="/dashboard/staff/add">
							<UserPlus className="mr-2 h-4 w-4" />
							Add Staff
						</Link>
					</Button>
				</div>

				{/* Filters */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
					<div className="relative flex-1">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search by name, email, or username..."
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
									<SelectItem value="">All statuses</SelectItem>
									<SelectItem value="ACTIVE">Active</SelectItem>
									<SelectItem value="INACTIVE">Inactive</SelectItem>
									<SelectItem value="PASSWORD_EXPIRED">
										Password Expired
									</SelectItem>
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
							{usersLoading ? (
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
										No staff members found.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				{/* Pagination */}
				{usersData && (
					<div className="flex items-center justify-between px-2">
						<div className="text-muted-foreground text-sm">
							Showing {usersData.data.length} of {usersData.pagination.total}{" "}
							staff members
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
								Page {page} of {usersData.pagination.totalPages}
							</span>
							<Button
								variant="outline"
								size="icon"
								onClick={() =>
									setPage((p) =>
										Math.min(usersData.pagination.totalPages, p + 1),
									)
								}
								disabled={page === usersData.pagination.totalPages}
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								onClick={() => setPage(usersData.pagination.totalPages)}
								disabled={page === usersData.pagination.totalPages}
							>
								<ChevronsRight className="h-4 w-4" />
							</Button>
						</div>
					</div>
				)}
			</div>

			{/* Deactivate Dialog */}
			<AlertDialog
				open={deactivateDialogOpen}
				onOpenChange={setDeactivateDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Deactivate Staff Member</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to deactivate{" "}
							<span className="font-medium">
								{selectedUser?.firstName} {selectedUser?.lastName}
							</span>
							? They will no longer be able to access the system.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeactivate}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							disabled={deactivateMutation.isPending}
						>
							{deactivateMutation.isPending ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							Deactivate
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Force Password Change Dialog */}
			<AlertDialog
				open={forcePasswordDialogOpen}
				onOpenChange={setForcePasswordDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Force Password Change</AlertDialogTitle>
						<AlertDialogDescription>
							<span className="font-medium">
								{selectedUser?.firstName} {selectedUser?.lastName}
							</span>{" "}
							will be required to change their password on their next login.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleForcePasswordChange}
							disabled={forcePasswordMutation.isPending}
						>
							{forcePasswordMutation.isPending ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							Confirm
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</DashboardLayout>
	);
}
