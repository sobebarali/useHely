import { useForm } from "@tanstack/react-form";
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
import z from "zod";
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
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useDepartments } from "@/hooks/use-departments";
import { useRoles } from "@/hooks/use-roles";
import {
	type UserListItem,
	useCreateUser,
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
	const [addStaffSheetOpen, setAddStaffSheetOpen] = useState(false);
	const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);

	const { data: usersData, isLoading: usersLoading } = useUsers({
		page,
		limit: 10,
		search: search || undefined,
		status:
			statusFilter && statusFilter !== "ALL"
				? (statusFilter as "ACTIVE" | "INACTIVE" | "PASSWORD_EXPIRED")
				: undefined,
	});

	// Fetch departments and roles dynamically
	const { data: departmentsData, isLoading: departmentsLoading } =
		useDepartments({ status: "ACTIVE" });
	const { data: rolesData, isLoading: rolesLoading } = useRoles({
		isActive: true,
	});

	const deactivateMutation = useDeactivateUser();
	const forcePasswordMutation = useForcePasswordChange();
	const createUserMutation = useCreateUser();

	// Add Staff Form
	const addStaffForm = useForm({
		defaultValues: {
			firstName: "",
			lastName: "",
			email: "",
			phone: "",
			department: "",
			role: "",
			specialization: "",
			shift: "",
		},
		onSubmit: async ({ value }) => {
			try {
				await createUserMutation.mutateAsync({
					firstName: value.firstName,
					lastName: value.lastName,
					email: value.email,
					phone: value.phone,
					department: value.department,
					roles: [value.role],
					specialization: value.specialization || undefined,
					shift: value.shift as "MORNING" | "EVENING" | "NIGHT" | undefined,
				});
				toast.success("Staff member created successfully");
				setAddStaffSheetOpen(false);
				addStaffForm.reset();
			} catch (error) {
				const apiError = error as ApiError;
				toast.error(apiError.message || "Failed to create staff member");
			}
		},
		validators: {
			onSubmit: z.object({
				firstName: z.string().min(1, "First name is required").max(50),
				lastName: z.string().min(1, "Last name is required").max(50),
				email: z.string().email("Invalid email address"),
				phone: z.string().min(1, "Phone number is required"),
				department: z.string().min(1, "Department is required"),
				role: z.string().min(1, "Role is required"),
				specialization: z.string(),
				shift: z.string(),
			}),
		},
	});

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

	return (
		<>
			<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
				{/* Header */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="font-bold text-2xl">Staff</h1>
						<p className="text-muted-foreground">
							Manage your hospital staff members
						</p>
					</div>
					<Button onClick={() => setAddStaffSheetOpen(true)}>
						<UserPlus className="mr-2 h-4 w-4" />
						Add Staff
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
									<SelectItem value="ALL">All statuses</SelectItem>
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

			{/* Add Staff Sheet */}
			<Sheet open={addStaffSheetOpen} onOpenChange={setAddStaffSheetOpen}>
				<SheetContent className="overflow-y-auto sm:max-w-lg">
					<SheetHeader>
						<SheetTitle className="flex items-center gap-2">
							<UserPlus className="h-5 w-5" />
							Add Staff Member
						</SheetTitle>
						<SheetDescription>
							Enter the details for the new staff member. They will receive an
							email with their login credentials.
						</SheetDescription>
					</SheetHeader>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							addStaffForm.handleSubmit();
						}}
						className="flex flex-col gap-6 p-4"
					>
						{/* Name Fields */}
						<div className="grid gap-4 sm:grid-cols-2">
							<addStaffForm.Field name="firstName">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>First Name *</Label>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="John"
										/>
										{field.state.meta.errors.map((error) => (
											<p key={error?.message} className="text-red-500 text-sm">
												{error?.message}
											</p>
										))}
									</div>
								)}
							</addStaffForm.Field>

							<addStaffForm.Field name="lastName">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Last Name *</Label>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="Doe"
										/>
										{field.state.meta.errors.map((error) => (
											<p key={error?.message} className="text-red-500 text-sm">
												{error?.message}
											</p>
										))}
									</div>
								)}
							</addStaffForm.Field>
						</div>

						{/* Contact Fields */}
						<div className="grid gap-4 sm:grid-cols-2">
							<addStaffForm.Field name="email">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Email *</Label>
										<Input
											id={field.name}
											name={field.name}
											type="email"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="john.doe@hospital.com"
										/>
										{field.state.meta.errors.map((error) => (
											<p key={error?.message} className="text-red-500 text-sm">
												{error?.message}
											</p>
										))}
									</div>
								)}
							</addStaffForm.Field>

							<addStaffForm.Field name="phone">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Phone *</Label>
										<Input
											id={field.name}
											name={field.name}
											type="tel"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="+1 (555) 123-4567"
										/>
										{field.state.meta.errors.map((error) => (
											<p key={error?.message} className="text-red-500 text-sm">
												{error?.message}
											</p>
										))}
									</div>
								)}
							</addStaffForm.Field>
						</div>

						{/* Department & Role */}
						<div className="grid gap-4 sm:grid-cols-2">
							<addStaffForm.Field name="department">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Department *</Label>
										<Select
											value={field.state.value}
											onValueChange={field.handleChange}
											disabled={departmentsLoading}
										>
											<SelectTrigger id={field.name}>
												<SelectValue
													placeholder={
														departmentsLoading
															? "Loading..."
															: "Select department"
													}
												/>
											</SelectTrigger>
											<SelectContent>
												{departmentsData?.data.map((dept) => (
													<SelectItem key={dept.id} value={dept.id}>
														{dept.name}
													</SelectItem>
												))}
												{!departmentsLoading &&
													(!departmentsData?.data ||
														departmentsData.data.length === 0) && (
														<div className="px-2 py-1.5 text-muted-foreground text-sm">
															No departments available
														</div>
													)}
											</SelectContent>
										</Select>
										{field.state.meta.errors.map((error) => (
											<p key={error?.message} className="text-red-500 text-sm">
												{error?.message}
											</p>
										))}
									</div>
								)}
							</addStaffForm.Field>

							<addStaffForm.Field name="role">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Role *</Label>
										<Select
											value={field.state.value}
											onValueChange={field.handleChange}
											disabled={rolesLoading}
										>
											<SelectTrigger id={field.name}>
												<SelectValue
													placeholder={
														rolesLoading ? "Loading..." : "Select role"
													}
												/>
											</SelectTrigger>
											<SelectContent>
												{rolesData?.data.map((role) => (
													<SelectItem key={role.id} value={role.id}>
														{role.name}
													</SelectItem>
												))}
												{!rolesLoading &&
													(!rolesData?.data || rolesData.data.length === 0) && (
														<div className="px-2 py-1.5 text-muted-foreground text-sm">
															No roles available
														</div>
													)}
											</SelectContent>
										</Select>
										{field.state.meta.errors.map((error) => (
											<p key={error?.message} className="text-red-500 text-sm">
												{error?.message}
											</p>
										))}
									</div>
								)}
							</addStaffForm.Field>
						</div>

						{/* Optional Fields */}
						<div className="grid gap-4 sm:grid-cols-2">
							<addStaffForm.Field name="specialization">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Specialization</Label>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="e.g., Cardiac Surgery"
										/>
									</div>
								)}
							</addStaffForm.Field>

							<addStaffForm.Field name="shift">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Shift</Label>
										<Select
											value={field.state.value}
											onValueChange={field.handleChange}
										>
											<SelectTrigger id={field.name}>
												<SelectValue placeholder="Select shift" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="MORNING">Morning</SelectItem>
												<SelectItem value="EVENING">Evening</SelectItem>
												<SelectItem value="NIGHT">Night</SelectItem>
											</SelectContent>
										</Select>
									</div>
								)}
							</addStaffForm.Field>
						</div>

						{/* Submit */}
						<div className="flex justify-end gap-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => setAddStaffSheetOpen(false)}
							>
								Cancel
							</Button>
							<addStaffForm.Subscribe>
								{(state) => (
									<Button
										type="submit"
										disabled={
											!state.canSubmit ||
											state.isSubmitting ||
											createUserMutation.isPending
										}
									>
										{state.isSubmitting || createUserMutation.isPending ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Creating...
											</>
										) : (
											<>
												<UserPlus className="mr-2 h-4 w-4" />
												Create Staff Member
											</>
										)}
									</Button>
								)}
							</addStaffForm.Subscribe>
						</div>
					</form>
				</SheetContent>
			</Sheet>
		</>
	);
}
