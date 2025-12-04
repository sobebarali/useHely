import { useForm } from "@tanstack/react-form";
import {
	createFileRoute,
	redirect,
	useNavigate,
	useParams,
} from "@tanstack/react-router";
import {
	ArrowLeft,
	Building2,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Loader2,
	Mail,
	MapPin,
	Phone,
	Save,
	Trash2,
	UserMinus,
	UserPlus,
	Users,
} from "lucide-react";
import { useEffect, useState } from "react";
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
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
	type DepartmentStaffItem,
	type DepartmentStatus,
	type DepartmentType,
	useAssignStaffToDepartment,
	useDeleteDepartment,
	useDepartment,
	useDepartmentStaff,
	useDepartments,
	useRemoveStaffFromDepartment,
	useUpdateDepartment,
} from "@/hooks/use-departments";
import { useUsers } from "@/hooks/use-users";
import { authClient } from "@/lib/auth-client";
import type { ApiError } from "@/lib/departments-client";
import { normalizeSelectValue, SELECT_NONE_VALUE } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/departments/$id")({
	component: DepartmentDetailPage,
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

const updateDepartmentSchema = z.object({
	name: z.string().min(1, "Name is required").max(100),
	description: z.string().max(500),
	parentId: z.string(),
	headId: z.string(),
	location: z.string().max(200),
	contactPhone: z.string().max(20),
	contactEmail: z.string().email().or(z.literal("")),
});

function DepartmentDetailPage() {
	const navigate = useNavigate();
	const { id } = useParams({ from: "/dashboard/departments/$id" });
	const { data: department, isLoading: departmentLoading } = useDepartment(id);

	// Staff management state
	const [staffPage, setStaffPage] = useState(1);
	const [assignDialogOpen, setAssignDialogOpen] = useState(false);
	const [removeStaffDialogOpen, setRemoveStaffDialogOpen] = useState(false);
	const [selectedStaff, setSelectedStaff] =
		useState<DepartmentStaffItem | null>(null);
	const [selectedUserId, setSelectedUserId] = useState("");

	// Delete dialog state
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	// Fetch staff for this department
	const { data: staffData, isLoading: staffLoading } = useDepartmentStaff(id, {
		page: staffPage,
		limit: 10,
	});

	// Fetch departments for parent selection
	const { data: departmentsData } = useDepartments({
		status: "ACTIVE",
		limit: 100,
	});

	// Fetch all staff for head selection and assignment
	const { data: allStaffData } = useUsers({
		status: "ACTIVE",
		limit: 100,
	});

	// Mutations
	const updateMutation = useUpdateDepartment();
	const deleteMutation = useDeleteDepartment();
	const assignStaffMutation = useAssignStaffToDepartment();
	const removeStaffMutation = useRemoveStaffFromDepartment();

	const form = useForm({
		defaultValues: {
			name: "",
			description: "",
			parentId: "",
			headId: "",
			location: "",
			contactPhone: "",
			contactEmail: "",
		},
		onSubmit: async ({ value }) => {
			try {
				await updateMutation.mutateAsync({
					id,
					data: {
						name: value.name,
						description: value.description || undefined,
						parentId: normalizeSelectValue(value.parentId) || null,
						headId: normalizeSelectValue(value.headId) || null,
						location: value.location || undefined,
						contactPhone: value.contactPhone || undefined,
						contactEmail: value.contactEmail || undefined,
					},
				});
				toast.success("Department updated successfully");
			} catch (error) {
				const apiError = error as ApiError;
				if (apiError.code === "NAME_EXISTS") {
					toast.error("Department name already exists");
				} else if (apiError.code === "INVALID_HEAD") {
					toast.error("Invalid department head selected");
				} else if (apiError.code === "INVALID_PARENT") {
					toast.error("Invalid parent department selected");
				} else if (apiError.code === "CIRCULAR_REFERENCE") {
					toast.error("Cannot create circular hierarchy");
				} else {
					toast.error(apiError.message || "Failed to update department");
				}
			}
		},
		validators: {
			onSubmit: updateDepartmentSchema,
		},
	});

	// Update form when department data loads
	useEffect(() => {
		if (department && !form.state.values.name) {
			form.reset({
				name: department.name,
				description: department.description || "",
				parentId: department.parent?.id || "",
				headId: department.head?.id || "",
				location: department.location || "",
				contactPhone: department.contactPhone || "",
				contactEmail: department.contactEmail || "",
			});
		}
	}, [department, form]);

	const handleDelete = async () => {
		try {
			await deleteMutation.mutateAsync(id);
			toast.success("Department deactivated successfully");
			navigate({ to: "/dashboard/departments" });
		} catch (error) {
			const apiError = error as ApiError;
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

	const handleAssignStaff = async () => {
		if (!selectedUserId) return;
		try {
			await assignStaffMutation.mutateAsync({
				departmentId: id,
				userId: selectedUserId,
			});
			toast.success("Staff assigned successfully");
			setAssignDialogOpen(false);
			setSelectedUserId("");
		} catch (error) {
			const apiError = error as ApiError;
			if (apiError.code === "ALREADY_ASSIGNED") {
				toast.info("Staff is already assigned to this department");
			} else {
				toast.error(apiError.message || "Failed to assign staff");
			}
		}
	};

	const handleRemoveStaff = async () => {
		if (!selectedStaff) return;
		try {
			await removeStaffMutation.mutateAsync({
				departmentId: id,
				userId: selectedStaff.id,
			});
			toast.success("Staff removed from department");
			setRemoveStaffDialogOpen(false);
			setSelectedStaff(null);
		} catch (error) {
			const apiError = error as ApiError;
			if (apiError.code === "IS_HEAD") {
				toast.error("Cannot remove department head. Assign a new head first.");
			} else {
				toast.error(apiError.message || "Failed to remove staff");
			}
		}
	};

	if (departmentLoading) {
		return (
			<div className="flex h-64 items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	if (!department) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 p-8">
				<h2 className="font-semibold text-xl">Department not found</h2>
				<Button onClick={() => navigate({ to: "/dashboard/departments" })}>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back to Departments
				</Button>
			</div>
		);
	}

	// Filter out already assigned staff and current department from parent options
	const availableStaff = allStaffData?.data.filter(
		(staff) => !staffData?.data.some((assigned) => assigned.id === staff.id),
	);

	const availableParents = departmentsData?.data.filter(
		(dept) => dept.id !== id,
	);

	return (
		<>
			<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
				{/* Header */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-4">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => navigate({ to: "/dashboard/departments" })}
						>
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<div>
							<div className="flex items-center gap-2">
								<h1 className="font-bold text-2xl">{department.name}</h1>
								<Badge
									className={departmentTypeColors[department.type]}
									variant="outline"
								>
									{department.type}
								</Badge>
								<Badge variant={departmentStatusVariant[department.status]}>
									{department.status}
								</Badge>
							</div>
							<p className="text-muted-foreground">Code: {department.code}</p>
						</div>
					</div>
				</div>

				{/* Tabs */}
				<Tabs defaultValue="overview" className="w-full">
					<TabsList>
						<TabsTrigger value="overview">Overview</TabsTrigger>
						<TabsTrigger value="staff">Staff</TabsTrigger>
						<TabsTrigger value="settings">Settings</TabsTrigger>
					</TabsList>

					{/* Overview Tab */}
					<TabsContent value="overview" className="space-y-6">
						<div className="grid gap-6 lg:grid-cols-3">
							{/* Quick Info Cards */}
							<Card>
								<CardHeader className="pb-2">
									<CardTitle className="font-medium text-sm">
										Staff Count
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="flex items-center gap-2">
										<Users className="h-5 w-5 text-muted-foreground" />
										<span className="font-bold text-2xl">
											{department.staffCount ?? 0}
										</span>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className="pb-2">
									<CardTitle className="font-medium text-sm">
										Department Head
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="text-lg">
										{department.head?.name || "Not assigned"}
									</div>
									{department.head?.email && (
										<div className="text-muted-foreground text-sm">
											{department.head.email}
										</div>
									)}
								</CardContent>
							</Card>

							<Card>
								<CardHeader className="pb-2">
									<CardTitle className="font-medium text-sm">
										Parent Department
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="text-lg">
										{department.parent?.name || "Top-level"}
									</div>
									{department.parent?.code && (
										<div className="text-muted-foreground text-sm">
											{department.parent.code}
										</div>
									)}
								</CardContent>
							</Card>
						</div>

						{/* Edit Form */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Building2 className="h-5 w-5" />
									Department Information
								</CardTitle>
								<CardDescription>Update department details</CardDescription>
							</CardHeader>
							<CardContent>
								<form
									onSubmit={(e) => {
										e.preventDefault();
										e.stopPropagation();
										form.handleSubmit();
									}}
									className="space-y-6"
								>
									<div className="grid gap-4 sm:grid-cols-2">
										{/* Name */}
										<form.Field name="name">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor={field.name}>Name</Label>
													<Input
														id={field.name}
														name={field.name}
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
													/>
													{field.state.meta.errors.map((error) => (
														<p
															key={error?.message}
															className="text-red-500 text-sm"
														>
															{error?.message}
														</p>
													))}
												</div>
											)}
										</form.Field>

										{/* Parent */}
										<form.Field name="parentId">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor={field.name}>Parent Department</Label>
													<Select
														value={field.state.value}
														onValueChange={field.handleChange}
													>
														<SelectTrigger id={field.name}>
															<SelectValue placeholder="None (top-level)" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value={SELECT_NONE_VALUE}>
																None (top-level)
															</SelectItem>
															{availableParents?.map((dept) => (
																<SelectItem key={dept.id} value={dept.id}>
																	{dept.name} ({dept.code})
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
											)}
										</form.Field>
									</div>

									{/* Description */}
									<form.Field name="description">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor={field.name}>Description</Label>
												<Textarea
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													rows={3}
												/>
											</div>
										)}
									</form.Field>

									<div className="grid gap-4 sm:grid-cols-2">
										{/* Head */}
										<form.Field name="headId">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor={field.name}>Department Head</Label>
													<Select
														value={field.state.value}
														onValueChange={field.handleChange}
													>
														<SelectTrigger id={field.name}>
															<SelectValue placeholder="Select head" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value={SELECT_NONE_VALUE}>
																Not assigned
															</SelectItem>
															{allStaffData?.data.map((staff) => (
																<SelectItem key={staff.id} value={staff.id}>
																	{staff.firstName} {staff.lastName}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
											)}
										</form.Field>

										{/* Location */}
										<form.Field name="location">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor={field.name}>Location</Label>
													<Input
														id={field.name}
														name={field.name}
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														placeholder="Building, Floor"
													/>
												</div>
											)}
										</form.Field>
									</div>

									<div className="grid gap-4 sm:grid-cols-2">
										{/* Phone */}
										<form.Field name="contactPhone">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor={field.name}>Contact Phone</Label>
													<Input
														id={field.name}
														name={field.name}
														type="tel"
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
													/>
												</div>
											)}
										</form.Field>

										{/* Email */}
										<form.Field name="contactEmail">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor={field.name}>Contact Email</Label>
													<Input
														id={field.name}
														name={field.name}
														type="email"
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
													/>
													{field.state.meta.errors.map((error) => (
														<p
															key={error?.message}
															className="text-red-500 text-sm"
														>
															{error?.message}
														</p>
													))}
												</div>
											)}
										</form.Field>
									</div>

									<div className="flex justify-end">
										<Button type="submit" disabled={updateMutation.isPending}>
											{updateMutation.isPending ? (
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											) : (
												<Save className="mr-2 h-4 w-4" />
											)}
											Save Changes
										</Button>
									</div>
								</form>
							</CardContent>
						</Card>

						{/* Contact Card */}
						{(department.location ||
							department.contactPhone ||
							department.contactEmail) && (
							<Card>
								<CardHeader>
									<CardTitle>Contact Information</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									{department.location && (
										<div className="flex items-center gap-2">
											<MapPin className="h-4 w-4 text-muted-foreground" />
											<span>{department.location}</span>
										</div>
									)}
									{department.contactPhone && (
										<div className="flex items-center gap-2">
											<Phone className="h-4 w-4 text-muted-foreground" />
											<span>{department.contactPhone}</span>
										</div>
									)}
									{department.contactEmail && (
										<div className="flex items-center gap-2">
											<Mail className="h-4 w-4 text-muted-foreground" />
											<span>{department.contactEmail}</span>
										</div>
									)}
								</CardContent>
							</Card>
						)}
					</TabsContent>

					{/* Staff Tab */}
					<TabsContent value="staff" className="space-y-4">
						<Card>
							<CardHeader>
								<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
									<div>
										<CardTitle className="flex items-center gap-2">
											<Users className="h-5 w-5" />
											Department Staff
										</CardTitle>
										<CardDescription>
											Manage staff assigned to this department
										</CardDescription>
									</div>
									<Button onClick={() => setAssignDialogOpen(true)}>
										<UserPlus className="mr-2 h-4 w-4" />
										Assign Staff
									</Button>
								</div>
							</CardHeader>
							<CardContent>
								{/* Staff Table */}
								<div className="rounded-md border">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Name</TableHead>
												<TableHead>Email</TableHead>
												<TableHead>Role</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Assigned</TableHead>
												<TableHead className="w-[80px]" />
											</TableRow>
										</TableHeader>
										<TableBody>
											{staffLoading ? (
												<TableRow>
													<TableCell colSpan={6} className="h-24 text-center">
														<Loader2 className="mx-auto h-6 w-6 animate-spin" />
													</TableCell>
												</TableRow>
											) : staffData?.data.length ? (
												staffData.data.map((staff) => (
													<TableRow key={staff.id}>
														<TableCell className="font-medium">
															{staff.name}
															{department.head?.id === staff.id && (
																<Badge
																	variant="outline"
																	className="ml-2 text-xs"
																>
																	Head
																</Badge>
															)}
														</TableCell>
														<TableCell className="text-muted-foreground">
															{staff.email}
														</TableCell>
														<TableCell>
															<Badge variant="secondary">{staff.role}</Badge>
														</TableCell>
														<TableCell>
															<Badge
																variant={
																	staff.status === "ACTIVE"
																		? "default"
																		: "destructive"
																}
															>
																{staff.status}
															</Badge>
														</TableCell>
														<TableCell className="text-muted-foreground">
															{new Date(staff.assignedAt).toLocaleDateString()}
														</TableCell>
														<TableCell>
															<Button
																variant="ghost"
																size="icon"
																onClick={() => {
																	setSelectedStaff(staff);
																	setRemoveStaffDialogOpen(true);
																}}
																disabled={department.head?.id === staff.id}
																title={
																	department.head?.id === staff.id
																		? "Cannot remove department head"
																		: "Remove from department"
																}
															>
																<UserMinus className="h-4 w-4" />
															</Button>
														</TableCell>
													</TableRow>
												))
											) : (
												<TableRow>
													<TableCell colSpan={6} className="h-24 text-center">
														<div className="flex flex-col items-center gap-2">
															<Users className="h-8 w-8 text-muted-foreground" />
															<p>No staff assigned to this department.</p>
														</div>
													</TableCell>
												</TableRow>
											)}
										</TableBody>
									</Table>
								</div>

								{/* Staff Pagination */}
								{staffData && staffData.pagination.totalPages > 1 && (
									<div className="mt-4 flex items-center justify-between px-2">
										<div className="text-muted-foreground text-sm">
											Showing {staffData.data.length} of{" "}
											{staffData.pagination.total} staff
										</div>
										<div className="flex items-center gap-2">
											<Button
												variant="outline"
												size="icon"
												onClick={() => setStaffPage(1)}
												disabled={staffPage === 1}
											>
												<ChevronsLeft className="h-4 w-4" />
											</Button>
											<Button
												variant="outline"
												size="icon"
												onClick={() => setStaffPage((p) => Math.max(1, p - 1))}
												disabled={staffPage === 1}
											>
												<ChevronLeft className="h-4 w-4" />
											</Button>
											<span className="text-sm">
												Page {staffPage} of {staffData.pagination.totalPages}
											</span>
											<Button
												variant="outline"
												size="icon"
												onClick={() =>
													setStaffPage((p) =>
														Math.min(staffData.pagination.totalPages, p + 1),
													)
												}
												disabled={staffPage === staffData.pagination.totalPages}
											>
												<ChevronRight className="h-4 w-4" />
											</Button>
											<Button
												variant="outline"
												size="icon"
												onClick={() =>
													setStaffPage(staffData.pagination.totalPages)
												}
												disabled={staffPage === staffData.pagination.totalPages}
											>
												<ChevronsRight className="h-4 w-4" />
											</Button>
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					{/* Settings Tab */}
					<TabsContent value="settings" className="space-y-4">
						<Card className="border-destructive">
							<CardHeader>
								<CardTitle className="text-destructive">Danger Zone</CardTitle>
								<CardDescription>
									Irreversible actions for this department
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="flex items-center justify-between">
									<div>
										<p className="font-medium">Deactivate Department</p>
										<p className="text-muted-foreground text-sm">
											This will prevent new staff assignments and patient
											registrations.
										</p>
									</div>
									<Button
										variant="destructive"
										onClick={() => setDeleteDialogOpen(true)}
										disabled={department.status !== "ACTIVE"}
									>
										<Trash2 className="mr-2 h-4 w-4" />
										Deactivate
									</Button>
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>

			{/* Assign Staff Dialog */}
			<Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Assign Staff to Department</DialogTitle>
						<DialogDescription>
							Select a staff member to assign to {department.name}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="staff-select">Staff Member</Label>
							<Select value={selectedUserId} onValueChange={setSelectedUserId}>
								<SelectTrigger id="staff-select">
									<SelectValue placeholder="Select staff member" />
								</SelectTrigger>
								<SelectContent>
									{availableStaff?.length ? (
										availableStaff.map((staff) => (
											<SelectItem key={staff.id} value={staff.id}>
												{staff.firstName} {staff.lastName} ({staff.email})
											</SelectItem>
										))
									) : (
										<div className="px-2 py-1.5 text-muted-foreground text-sm">
											No available staff
										</div>
									)}
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setAssignDialogOpen(false);
								setSelectedUserId("");
							}}
						>
							Cancel
						</Button>
						<Button
							onClick={handleAssignStaff}
							disabled={!selectedUserId || assignStaffMutation.isPending}
						>
							{assignStaffMutation.isPending ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<UserPlus className="mr-2 h-4 w-4" />
							)}
							Assign
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Remove Staff Dialog */}
			<AlertDialog
				open={removeStaffDialogOpen}
				onOpenChange={setRemoveStaffDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove Staff from Department</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to remove{" "}
							<span className="font-medium">{selectedStaff?.name}</span> from{" "}
							{department.name}?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleRemoveStaff}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							disabled={removeStaffMutation.isPending}
						>
							{removeStaffMutation.isPending ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							Remove
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Delete Department Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Deactivate Department</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to deactivate{" "}
							<span className="font-medium">{department.name}</span>? This will
							prevent new staff assignments and patient registrations.
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
