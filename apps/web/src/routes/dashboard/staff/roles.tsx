import { createFileRoute, redirect } from "@tanstack/react-router";
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
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Edit,
	Loader2,
	MoreHorizontal,
	Plus,
	Search,
	Shield,
	ShieldCheck,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { Textarea } from "@/components/ui/textarea";
import {
	type RoleListItem,
	useCreateRole,
	useDeleteRole,
	useRoles,
	useUpdateRole,
} from "@/hooks/use-roles";
import { authClient } from "@/lib/auth-client";
import type { ApiError } from "@/lib/roles-client";

export const Route = createFileRoute("/dashboard/staff/roles")({
	component: RolesPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

// Permission groups for the selector
const PERMISSION_GROUPS: Record<string, { label: string; actions: string[] }> =
	{
		PATIENT: {
			label: "Patients",
			actions: ["CREATE", "READ", "UPDATE", "DELETE", "MANAGE", "EXPORT"],
		},
		PRESCRIPTION: {
			label: "Prescriptions",
			actions: ["CREATE", "READ", "UPDATE", "DELETE", "MANAGE"],
		},
		DIAGNOSIS: {
			label: "Diagnosis",
			actions: ["CREATE", "READ", "UPDATE", "DELETE", "MANAGE"],
		},
		VITALS: {
			label: "Vitals",
			actions: ["CREATE", "READ", "UPDATE", "DELETE", "MANAGE"],
		},
		DISPENSING: {
			label: "Dispensing",
			actions: ["CREATE", "READ", "UPDATE", "DELETE", "MANAGE"],
		},
		APPOINTMENT: {
			label: "Appointments",
			actions: ["CREATE", "READ", "UPDATE", "DELETE", "MANAGE"],
		},
		USER: {
			label: "Users",
			actions: ["CREATE", "READ", "UPDATE", "DELETE", "MANAGE"],
		},
		ROLE: {
			label: "Roles",
			actions: ["CREATE", "READ", "UPDATE", "DELETE", "MANAGE"],
		},
		DEPARTMENT: {
			label: "Departments",
			actions: ["CREATE", "READ", "UPDATE", "DELETE", "MANAGE"],
		},
		INVENTORY: {
			label: "Inventory",
			actions: ["CREATE", "READ", "UPDATE", "DELETE", "MANAGE"],
		},
		REPORT: {
			label: "Reports",
			actions: ["CREATE", "READ", "UPDATE", "DELETE", "MANAGE", "EXPORT"],
		},
		TENANT: {
			label: "Tenant/Hospital",
			actions: ["CREATE", "READ", "UPDATE", "DELETE", "MANAGE"],
		},
		ADMISSION: {
			label: "Admissions",
			actions: ["CREATE", "READ", "UPDATE", "DELETE", "MANAGE"],
		},
		DASHBOARD: {
			label: "Dashboard",
			actions: ["VIEW"],
		},
		SETTINGS: {
			label: "Settings",
			actions: ["READ", "MANAGE"],
		},
		QUEUE: {
			label: "Queue",
			actions: ["READ", "MANAGE"],
		},
		DOCTOR: {
			label: "Doctor",
			actions: ["READ"],
		},
		SECURITY: {
			label: "Security",
			actions: ["READ", "MANAGE"],
		},
	};

// Permission Selector Component
function PermissionSelector({
	selectedPermissions,
	onChange,
	disabled = false,
}: {
	selectedPermissions: string[];
	onChange: (permissions: string[]) => void;
	disabled?: boolean;
}) {
	const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

	const toggleGroup = (resource: string) => {
		const newOpen = new Set(openGroups);
		if (newOpen.has(resource)) {
			newOpen.delete(resource);
		} else {
			newOpen.add(resource);
		}
		setOpenGroups(newOpen);
	};

	const togglePermission = (permission: string) => {
		if (disabled) return;
		const newPermissions = selectedPermissions.includes(permission)
			? selectedPermissions.filter((p) => p !== permission)
			: [...selectedPermissions, permission];
		onChange(newPermissions);
	};

	const toggleAllForResource = (resource: string) => {
		if (disabled) return;
		const group = PERMISSION_GROUPS[resource];
		const resourcePermissions = group.actions.map((a) => `${resource}:${a}`);
		const allSelected = resourcePermissions.every((p) =>
			selectedPermissions.includes(p),
		);

		let newPermissions: string[];
		if (allSelected) {
			newPermissions = selectedPermissions.filter(
				(p) => !resourcePermissions.includes(p),
			);
		} else {
			const permissionsSet = new Set([
				...selectedPermissions,
				...resourcePermissions,
			]);
			newPermissions = Array.from(permissionsSet);
		}
		onChange(newPermissions);
	};

	const getResourceSelectionState = (resource: string) => {
		const group = PERMISSION_GROUPS[resource];
		const resourcePermissions = group.actions.map((a) => `${resource}:${a}`);
		const selectedCount = resourcePermissions.filter((p) =>
			selectedPermissions.includes(p),
		).length;

		if (selectedCount === 0) return "none";
		if (selectedCount === resourcePermissions.length) return "all";
		return "partial";
	};

	return (
		<div className="space-y-2 rounded-md border p-4">
			<div className="mb-3 flex items-center justify-between">
				<Label className="font-medium text-sm">Permissions</Label>
				<Badge variant="secondary">{selectedPermissions.length} selected</Badge>
			</div>
			<div className="max-h-[400px] space-y-1 overflow-y-auto">
				{Object.entries(PERMISSION_GROUPS).map(([resource, group]) => {
					const selectionState = getResourceSelectionState(resource);
					const isOpen = openGroups.has(resource);

					return (
						<Collapsible
							key={resource}
							open={isOpen}
							onOpenChange={() => toggleGroup(resource)}
						>
							<div className="flex items-center gap-2 rounded-md p-2 hover:bg-muted/50">
								<Checkbox
									checked={selectionState === "all"}
									// @ts-expect-error - indeterminate is a valid DOM property
									indeterminate={selectionState === "partial"}
									onCheckedChange={() => toggleAllForResource(resource)}
									disabled={disabled}
								/>
								<CollapsibleTrigger asChild>
									<button
										type="button"
										className="flex flex-1 items-center justify-between"
									>
										<span className="font-medium text-sm">{group.label}</span>
										<ChevronDown
											className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
										/>
									</button>
								</CollapsibleTrigger>
							</div>
							<CollapsibleContent>
								<div className="ml-6 grid grid-cols-2 gap-2 py-2 sm:grid-cols-3">
									{group.actions.map((action) => {
										const permission = `${resource}:${action}`;
										const isSelected = selectedPermissions.includes(permission);

										return (
											<div key={permission} className="flex items-center gap-2">
												<Checkbox
													id={permission}
													checked={isSelected}
													onCheckedChange={() => togglePermission(permission)}
													disabled={disabled}
												/>
												<label
													htmlFor={permission}
													className="cursor-pointer text-sm"
												>
													{action}
												</label>
											</div>
										);
									})}
								</div>
							</CollapsibleContent>
						</Collapsible>
					);
				})}
			</div>
		</div>
	);
}

// Role Form Sheet Component
function RoleFormSheet({
	open,
	onOpenChange,
	role,
	mode,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	role?: RoleListItem | null;
	mode: "create" | "edit";
}) {
	const [name, setName] = useState(role?.name || "");
	const [description, setDescription] = useState(role?.description || "");
	const [permissions, setPermissions] = useState<string[]>(
		role?.permissions || [],
	);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const createMutation = useCreateRole();
	const updateMutation = useUpdateRole();

	const isLoading = createMutation.isPending || updateMutation.isPending;
	const isSystem = role?.isSystem || false;

	const resetForm = () => {
		setName(role?.name || "");
		setDescription(role?.description || "");
		setPermissions(role?.permissions || []);
		setErrors({});
	};

	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!name.trim()) {
			newErrors.name = "Role name is required";
		} else if (name.length > 50) {
			newErrors.name = "Role name must be 50 characters or less";
		}

		if (description && description.length > 255) {
			newErrors.description = "Description must be 255 characters or less";
		}

		if (permissions.length === 0) {
			newErrors.permissions = "At least one permission is required";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validate()) return;

		try {
			if (mode === "create") {
				await createMutation.mutateAsync({
					name: name.trim(),
					description: description.trim() || undefined,
					permissions,
				});
				toast.success("Role created successfully");
			} else if (role) {
				await updateMutation.mutateAsync({
					id: role.id,
					data: {
						name: name.trim(),
						description: description.trim() || undefined,
						permissions,
					},
				});
				toast.success("Role updated successfully");
			}
			onOpenChange(false);
			resetForm();
		} catch (error) {
			const apiError = error as ApiError;
			toast.error(apiError.message || "An error occurred");
		}
	};

	// Reset form when role changes
	const handleOpenChange = (newOpen: boolean) => {
		if (newOpen) {
			setName(role?.name || "");
			setDescription(role?.description || "");
			setPermissions(role?.permissions || []);
			setErrors({});
		}
		onOpenChange(newOpen);
	};

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
			<SheetContent className="overflow-y-auto sm:max-w-lg">
				<SheetHeader>
					<SheetTitle className="flex items-center gap-2">
						{mode === "create" ? (
							<>
								<Plus className="h-5 w-5" />
								Create Role
							</>
						) : (
							<>
								<Edit className="h-5 w-5" />
								Edit Role
							</>
						)}
					</SheetTitle>
					<SheetDescription>
						{mode === "create"
							? "Create a new custom role with specific permissions."
							: isSystem
								? "System roles can only have their permissions viewed."
								: "Update the role name, description, and permissions."}
					</SheetDescription>
				</SheetHeader>

				<form onSubmit={handleSubmit} className="flex flex-col gap-6 p-4">
					{/* Role Name */}
					<div className="space-y-2">
						<Label htmlFor="name">Role Name *</Label>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g., Senior Nurse"
							disabled={isSystem}
						/>
						{errors.name && (
							<p className="text-red-500 text-sm">{errors.name}</p>
						)}
					</div>

					{/* Description */}
					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Describe the role and its responsibilities..."
							rows={3}
							disabled={isSystem}
						/>
						{errors.description && (
							<p className="text-red-500 text-sm">{errors.description}</p>
						)}
					</div>

					{/* Permissions */}
					<div className="space-y-2">
						<PermissionSelector
							selectedPermissions={permissions}
							onChange={setPermissions}
							disabled={isSystem}
						/>
						{errors.permissions && (
							<p className="text-red-500 text-sm">{errors.permissions}</p>
						)}
					</div>

					{/* Actions */}
					<div className="flex justify-end gap-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						{!isSystem && (
							<Button type="submit" disabled={isLoading}>
								{isLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										{mode === "create" ? "Creating..." : "Saving..."}
									</>
								) : mode === "create" ? (
									<>
										<Plus className="mr-2 h-4 w-4" />
										Create Role
									</>
								) : (
									<>
										<Edit className="mr-2 h-4 w-4" />
										Save Changes
									</>
								)}
							</Button>
						)}
					</div>
				</form>
			</SheetContent>
		</Sheet>
	);
}

function RolesPage() {
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [typeFilter, setTypeFilter] = useState<string>("ALL");
	const [statusFilter, setStatusFilter] = useState<string>("ALL");
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = useState({});

	// Sheet/Dialog states
	const [createSheetOpen, setCreateSheetOpen] = useState(false);
	const [editSheetOpen, setEditSheetOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedRole, setSelectedRole] = useState<RoleListItem | null>(null);

	// Build query params
	const queryParams = {
		page,
		limit: 10,
		search: search || undefined,
		isSystem:
			typeFilter === "SYSTEM"
				? true
				: typeFilter === "CUSTOM"
					? false
					: undefined,
		isActive:
			statusFilter === "ACTIVE"
				? true
				: statusFilter === "INACTIVE"
					? false
					: undefined,
	};

	const { data: rolesData, isLoading } = useRoles(queryParams);
	const deleteMutation = useDeleteRole();

	const handleDelete = async () => {
		if (!selectedRole) return;
		try {
			await deleteMutation.mutateAsync(selectedRole.id);
			toast.success("Role deleted successfully");
			setDeleteDialogOpen(false);
			setSelectedRole(null);
		} catch (error) {
			const apiError = error as ApiError;
			toast.error(apiError.message || "Failed to delete role");
		}
	};

	const columns: ColumnDef<RoleListItem>[] = [
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
				<div className="flex items-center gap-2">
					{row.original.isSystem ? (
						<ShieldCheck className="h-4 w-4 text-blue-500" />
					) : (
						<Shield className="h-4 w-4 text-muted-foreground" />
					)}
					<span className="font-medium">{row.getValue("name")}</span>
				</div>
			),
		},
		{
			accessorKey: "description",
			header: "Description",
			cell: ({ row }) => (
				<div className="max-w-[200px] truncate text-muted-foreground">
					{row.original.description || "-"}
				</div>
			),
		},
		{
			accessorKey: "permissions",
			header: "Permissions",
			cell: ({ row }) => (
				<Badge variant="outline">
					{row.original.permissions.length} permissions
				</Badge>
			),
		},
		{
			accessorKey: "usersCount",
			header: "Users",
			cell: ({ row }) => (
				<div className="flex items-center gap-1">
					<Users className="h-4 w-4 text-muted-foreground" />
					<span>{row.original.usersCount ?? 0}</span>
				</div>
			),
		},
		{
			accessorKey: "isSystem",
			header: "Type",
			cell: ({ row }) => (
				<Badge variant={row.original.isSystem ? "default" : "secondary"}>
					{row.original.isSystem ? "System" : "Custom"}
				</Badge>
			),
		},
		{
			accessorKey: "isActive",
			header: "Status",
			cell: ({ row }) => (
				<Badge variant={row.original.isActive ? "default" : "destructive"}>
					{row.original.isActive ? "Active" : "Inactive"}
				</Badge>
			),
		},
		{
			id: "actions",
			enableHiding: false,
			cell: ({ row }) => {
				const role = row.original;
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
								onClick={() => {
									setSelectedRole(role);
									setEditSheetOpen(true);
								}}
							>
								<Edit className="mr-2 h-4 w-4" />
								{role.isSystem ? "View permissions" : "Edit"}
							</DropdownMenuItem>
							{!role.isSystem && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										className="text-destructive"
										onClick={() => {
											setSelectedRole(role);
											setDeleteDialogOpen(true);
										}}
									>
										<Trash2 className="mr-2 h-4 w-4" />
										Delete
									</DropdownMenuItem>
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];

	const table = useReactTable({
		data: rolesData?.data ?? [],
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
		pageCount: rolesData?.pagination.totalPages ?? 0,
	});

	return (
		<>
			<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
				{/* Header */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="font-bold text-2xl">Roles</h1>
						<p className="text-muted-foreground">
							Manage roles and permissions for your hospital staff
						</p>
					</div>
					<Button onClick={() => setCreateSheetOpen(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Create Role
					</Button>
				</div>

				{/* Filters */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
					<div className="relative flex-1">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search roles..."
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setPage(1);
							}}
							className="pl-9"
						/>
					</div>
					<div className="flex gap-2">
						<div className="w-32">
							<Select
								value={typeFilter}
								onValueChange={(value) => {
									setTypeFilter(value);
									setPage(1);
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="Type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ALL">All types</SelectItem>
									<SelectItem value="SYSTEM">System</SelectItem>
									<SelectItem value="CUSTOM">Custom</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="w-32">
							<Select
								value={statusFilter}
								onValueChange={(value) => {
									setStatusFilter(value);
									setPage(1);
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="Status" />
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
										No roles found.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				{/* Pagination */}
				{rolesData && (
					<div className="flex items-center justify-between px-2">
						<div className="text-muted-foreground text-sm">
							Showing {rolesData.data.length} of {rolesData.pagination.total}{" "}
							roles
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
								Page {page} of {rolesData.pagination.totalPages}
							</span>
							<Button
								variant="outline"
								size="icon"
								onClick={() =>
									setPage((p) =>
										Math.min(rolesData.pagination.totalPages, p + 1),
									)
								}
								disabled={page === rolesData.pagination.totalPages}
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								onClick={() => setPage(rolesData.pagination.totalPages)}
								disabled={page === rolesData.pagination.totalPages}
							>
								<ChevronsRight className="h-4 w-4" />
							</Button>
						</div>
					</div>
				)}
			</div>

			{/* Create Role Sheet */}
			<RoleFormSheet
				open={createSheetOpen}
				onOpenChange={setCreateSheetOpen}
				mode="create"
			/>

			{/* Edit Role Sheet */}
			<RoleFormSheet
				open={editSheetOpen}
				onOpenChange={setEditSheetOpen}
				role={selectedRole}
				mode="edit"
			/>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Role</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete the role{" "}
							<span className="font-medium">{selectedRole?.name}</span>? This
							action will deactivate the role and it will no longer be available
							for assignment.
							{(selectedRole?.usersCount ?? 0) > 0 && (
								<span className="mt-2 block text-amber-600">
									Warning: This role is currently assigned to{" "}
									{selectedRole?.usersCount} user(s).
								</span>
							)}
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
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
