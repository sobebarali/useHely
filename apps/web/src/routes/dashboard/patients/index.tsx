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
	Calendar,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Download,
	Loader2,
	MoreHorizontal,
	Search,
	UserPlus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
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
import {
	type PatientListItem,
	useExportPatients,
	usePatients,
	useRegisterPatient,
} from "@/hooks/use-patients";
import { authClient } from "@/lib/auth-client";
import type { ApiError } from "@/lib/patients-client";

export const Route = createFileRoute("/dashboard/patients/")({
	component: PatientsListPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function PatientsListPage() {
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("");
	const [typeFilter, setTypeFilter] = useState<string>("");
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = useState({});

	// Add patient sheet
	const [addPatientSheetOpen, setAddPatientSheetOpen] = useState(false);

	const { data: patientsData, isLoading: patientsLoading } = usePatients({
		page,
		limit: 10,
		search: search || undefined,
		status:
			statusFilter && statusFilter !== "ALL"
				? (statusFilter as "ACTIVE" | "DISCHARGED" | "COMPLETED" | "INACTIVE")
				: undefined,
		patientType:
			typeFilter && typeFilter !== "ALL"
				? (typeFilter as "OPD" | "IPD")
				: undefined,
	});

	const registerPatientMutation = useRegisterPatient();
	const exportPatientsMutation = useExportPatients();

	// Add Patient Form
	const addPatientForm = useForm({
		defaultValues: {
			firstName: "",
			lastName: "",
			dateOfBirth: "",
			gender: "",
			bloodGroup: "",
			phone: "",
			email: "",
			patientType: "",
			// Address
			street: "",
			city: "",
			state: "",
			postalCode: "",
			country: "",
			// Emergency Contact
			emergencyName: "",
			emergencyRelationship: "",
			emergencyPhone: "",
		},
		onSubmit: async ({ value }) => {
			try {
				await registerPatientMutation.mutateAsync({
					firstName: value.firstName,
					lastName: value.lastName,
					dateOfBirth: new Date(value.dateOfBirth).toISOString(),
					gender: value.gender as "MALE" | "FEMALE" | "OTHER",
					bloodGroup: value.bloodGroup
						? (value.bloodGroup as
								| "A+"
								| "A-"
								| "B+"
								| "B-"
								| "AB+"
								| "AB-"
								| "O+"
								| "O-")
						: undefined,
					phone: value.phone,
					email: value.email || undefined,
					patientType: value.patientType as "OPD" | "IPD",
					address: {
						street: value.street,
						city: value.city,
						state: value.state,
						postalCode: value.postalCode,
						country: value.country,
					},
					emergencyContact: {
						name: value.emergencyName,
						relationship: value.emergencyRelationship,
						phone: value.emergencyPhone,
					},
				});
				toast.success("Patient registered successfully");
				setAddPatientSheetOpen(false);
				addPatientForm.reset();
			} catch (error) {
				const apiError = error as ApiError;
				toast.error(apiError.message || "Failed to register patient");
			}
		},
		validators: {
			onSubmit: z.object({
				firstName: z.string().min(1, "First name is required").max(50),
				lastName: z.string().min(1, "Last name is required").max(50),
				dateOfBirth: z.string().min(1, "Date of birth is required"),
				gender: z.string().min(1, "Gender is required"),
				bloodGroup: z.string(),
				phone: z.string().min(1, "Phone number is required"),
				email: z.string(),
				patientType: z.string().min(1, "Patient type is required"),
				street: z.string().min(1, "Street is required"),
				city: z.string().min(1, "City is required"),
				state: z.string().min(1, "State is required"),
				postalCode: z.string().min(1, "Postal code is required"),
				country: z.string().min(1, "Country is required"),
				emergencyName: z.string().min(1, "Emergency contact name is required"),
				emergencyRelationship: z.string().min(1, "Relationship is required"),
				emergencyPhone: z
					.string()
					.min(1, "Emergency contact phone is required"),
			}),
		},
	});

	const handleExport = async (format: "csv" | "pdf") => {
		try {
			await exportPatientsMutation.mutateAsync({
				format,
				status:
					statusFilter && statusFilter !== "ALL"
						? (statusFilter as
								| "ACTIVE"
								| "DISCHARGED"
								| "COMPLETED"
								| "INACTIVE")
						: undefined,
				patientType:
					typeFilter && typeFilter !== "ALL"
						? (typeFilter as "OPD" | "IPD")
						: undefined,
			});
			toast.success(`Patients exported to ${format.toUpperCase()}`);
		} catch (error) {
			const apiError = error as ApiError;
			toast.error(apiError.message || "Failed to export patients");
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const columns: ColumnDef<PatientListItem>[] = [
		{
			accessorKey: "patientId",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Patient ID
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			),
			cell: ({ row }) => (
				<div className="font-medium">{row.getValue("patientId")}</div>
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
			accessorKey: "dateOfBirth",
			header: "Date of Birth",
			cell: ({ row }) => (
				<div className="flex items-center gap-1">
					<Calendar className="h-3 w-3 text-muted-foreground" />
					{formatDate(row.original.dateOfBirth)}
				</div>
			),
		},
		{
			accessorKey: "gender",
			header: "Gender",
			cell: ({ row }) => <Badge variant="outline">{row.original.gender}</Badge>,
		},
		{
			accessorKey: "phone",
			header: "Phone",
			cell: ({ row }) => (
				<div className="text-muted-foreground">{row.original.phone}</div>
			),
		},
		{
			accessorKey: "patientType",
			header: "Type",
			cell: ({ row }) => {
				const type = row.original.patientType;
				return (
					<Badge variant={type === "IPD" ? "default" : "secondary"}>
						{type}
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
						: status === "DISCHARGED"
							? "secondary"
							: status === "COMPLETED"
								? "outline"
								: "destructive";
				return <Badge variant={variant}>{status}</Badge>;
			},
		},
		{
			id: "actions",
			enableHiding: false,
			cell: ({ row }) => {
				const patient = row.original;
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
								<Link to="/dashboard/patients/$id" params={{ id: patient.id }}>
									View details
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() => navigator.clipboard.writeText(patient.patientId)}
							>
								Copy Patient ID
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];

	const table = useReactTable({
		data: patientsData?.data ?? [],
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
		pageCount: patientsData?.pagination.totalPages ?? 0,
	});

	return (
		<>
			<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
				{/* Header */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="font-bold text-2xl">Patients</h1>
						<p className="text-muted-foreground">
							Manage your hospital patients
						</p>
					</div>
					<div className="flex gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline">
									<Download className="mr-2 h-4 w-4" />
									Export
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								<DropdownMenuItem onClick={() => handleExport("csv")}>
									Export as CSV
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => handleExport("pdf")}>
									Export as PDF
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
						<Button onClick={() => setAddPatientSheetOpen(true)}>
							<UserPlus className="mr-2 h-4 w-4" />
							Register Patient
						</Button>
					</div>
				</div>

				{/* Filters */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
					<div className="relative flex-1">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search by name, phone, or patient ID..."
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
									<SelectItem value="OPD">OPD</SelectItem>
									<SelectItem value="IPD">IPD</SelectItem>
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
									<SelectItem value="DISCHARGED">Discharged</SelectItem>
									<SelectItem value="COMPLETED">Completed</SelectItem>
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
							{patientsLoading ? (
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
										No patients found.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				{/* Pagination */}
				{patientsData && (
					<div className="flex items-center justify-between px-2">
						<div className="text-muted-foreground text-sm">
							Showing {patientsData.data.length} of{" "}
							{patientsData.pagination.total} patients
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
								Page {page} of {patientsData.pagination.totalPages}
							</span>
							<Button
								variant="outline"
								size="icon"
								onClick={() =>
									setPage((p) =>
										Math.min(patientsData.pagination.totalPages, p + 1),
									)
								}
								disabled={page === patientsData.pagination.totalPages}
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								onClick={() => setPage(patientsData.pagination.totalPages)}
								disabled={page === patientsData.pagination.totalPages}
							>
								<ChevronsRight className="h-4 w-4" />
							</Button>
						</div>
					</div>
				)}
			</div>

			{/* Add Patient Sheet */}
			<Sheet open={addPatientSheetOpen} onOpenChange={setAddPatientSheetOpen}>
				<SheetContent className="overflow-y-auto sm:max-w-xl">
					<SheetHeader>
						<SheetTitle className="flex items-center gap-2">
							<UserPlus className="h-5 w-5" />
							Register New Patient
						</SheetTitle>
						<SheetDescription>
							Enter the patient details to register them in the system.
						</SheetDescription>
					</SheetHeader>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							addPatientForm.handleSubmit();
						}}
						className="flex flex-col gap-6 p-4"
					>
						{/* Basic Information */}
						<div className="space-y-4">
							<h3 className="font-medium text-sm">Basic Information</h3>
							<div className="grid gap-4 sm:grid-cols-2">
								<addPatientForm.Field name="firstName">
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
												<p key={String(error)} className="text-red-500 text-sm">
													{String(error)}
												</p>
											))}
										</div>
									)}
								</addPatientForm.Field>

								<addPatientForm.Field name="lastName">
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
												<p key={String(error)} className="text-red-500 text-sm">
													{String(error)}
												</p>
											))}
										</div>
									)}
								</addPatientForm.Field>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<addPatientForm.Field name="dateOfBirth">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Date of Birth *</Label>
											<Input
												id={field.name}
												name={field.name}
												type="date"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
											/>
											{field.state.meta.errors.map((error) => (
												<p key={String(error)} className="text-red-500 text-sm">
													{String(error)}
												</p>
											))}
										</div>
									)}
								</addPatientForm.Field>

								<addPatientForm.Field name="gender">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Gender *</Label>
											<Select
												value={field.state.value}
												onValueChange={field.handleChange}
											>
												<SelectTrigger id={field.name}>
													<SelectValue placeholder="Select gender" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="MALE">Male</SelectItem>
													<SelectItem value="FEMALE">Female</SelectItem>
													<SelectItem value="OTHER">Other</SelectItem>
												</SelectContent>
											</Select>
											{field.state.meta.errors.map((error) => (
												<p key={String(error)} className="text-red-500 text-sm">
													{String(error)}
												</p>
											))}
										</div>
									)}
								</addPatientForm.Field>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<addPatientForm.Field name="bloodGroup">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Blood Group</Label>
											<Select
												value={field.state.value}
												onValueChange={field.handleChange}
											>
												<SelectTrigger id={field.name}>
													<SelectValue placeholder="Select blood group" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="A+">A+</SelectItem>
													<SelectItem value="A-">A-</SelectItem>
													<SelectItem value="B+">B+</SelectItem>
													<SelectItem value="B-">B-</SelectItem>
													<SelectItem value="AB+">AB+</SelectItem>
													<SelectItem value="AB-">AB-</SelectItem>
													<SelectItem value="O+">O+</SelectItem>
													<SelectItem value="O-">O-</SelectItem>
												</SelectContent>
											</Select>
										</div>
									)}
								</addPatientForm.Field>

								<addPatientForm.Field name="patientType">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Patient Type *</Label>
											<Select
												value={field.state.value}
												onValueChange={field.handleChange}
											>
												<SelectTrigger id={field.name}>
													<SelectValue placeholder="Select type" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="OPD">OPD (Outpatient)</SelectItem>
													<SelectItem value="IPD">IPD (Inpatient)</SelectItem>
												</SelectContent>
											</Select>
											{field.state.meta.errors.map((error) => (
												<p key={String(error)} className="text-red-500 text-sm">
													{String(error)}
												</p>
											))}
										</div>
									)}
								</addPatientForm.Field>
							</div>
						</div>

						{/* Contact Information */}
						<div className="space-y-4">
							<h3 className="font-medium text-sm">Contact Information</h3>
							<div className="grid gap-4 sm:grid-cols-2">
								<addPatientForm.Field name="phone">
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
												<p key={String(error)} className="text-red-500 text-sm">
													{String(error)}
												</p>
											))}
										</div>
									)}
								</addPatientForm.Field>

								<addPatientForm.Field name="email">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Email</Label>
											<Input
												id={field.name}
												name={field.name}
												type="email"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="john.doe@example.com"
											/>
											{field.state.meta.errors.map((error) => (
												<p key={String(error)} className="text-red-500 text-sm">
													{String(error)}
												</p>
											))}
										</div>
									)}
								</addPatientForm.Field>
							</div>
						</div>

						{/* Address */}
						<div className="space-y-4">
							<h3 className="font-medium text-sm">Address</h3>
							<addPatientForm.Field name="street">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Street Address *</Label>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="123 Main St"
										/>
										{field.state.meta.errors.map((error) => (
											<p key={String(error)} className="text-red-500 text-sm">
												{String(error)}
											</p>
										))}
									</div>
								)}
							</addPatientForm.Field>

							<div className="grid gap-4 sm:grid-cols-2">
								<addPatientForm.Field name="city">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>City *</Label>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="New York"
											/>
											{field.state.meta.errors.map((error) => (
												<p key={String(error)} className="text-red-500 text-sm">
													{String(error)}
												</p>
											))}
										</div>
									)}
								</addPatientForm.Field>

								<addPatientForm.Field name="state">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>State *</Label>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="NY"
											/>
											{field.state.meta.errors.map((error) => (
												<p key={String(error)} className="text-red-500 text-sm">
													{String(error)}
												</p>
											))}
										</div>
									)}
								</addPatientForm.Field>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<addPatientForm.Field name="postalCode">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Postal Code *</Label>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="10001"
											/>
											{field.state.meta.errors.map((error) => (
												<p key={String(error)} className="text-red-500 text-sm">
													{String(error)}
												</p>
											))}
										</div>
									)}
								</addPatientForm.Field>

								<addPatientForm.Field name="country">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Country *</Label>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="USA"
											/>
											{field.state.meta.errors.map((error) => (
												<p key={String(error)} className="text-red-500 text-sm">
													{String(error)}
												</p>
											))}
										</div>
									)}
								</addPatientForm.Field>
							</div>
						</div>

						{/* Emergency Contact */}
						<div className="space-y-4">
							<h3 className="font-medium text-sm">Emergency Contact</h3>
							<div className="grid gap-4 sm:grid-cols-2">
								<addPatientForm.Field name="emergencyName">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Name *</Label>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="Jane Doe"
											/>
											{field.state.meta.errors.map((error) => (
												<p key={String(error)} className="text-red-500 text-sm">
													{String(error)}
												</p>
											))}
										</div>
									)}
								</addPatientForm.Field>

								<addPatientForm.Field name="emergencyRelationship">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Relationship *</Label>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="Spouse"
											/>
											{field.state.meta.errors.map((error) => (
												<p key={String(error)} className="text-red-500 text-sm">
													{String(error)}
												</p>
											))}
										</div>
									)}
								</addPatientForm.Field>
							</div>

							<addPatientForm.Field name="emergencyPhone">
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
											placeholder="+1 (555) 987-6543"
										/>
										{field.state.meta.errors.map((error) => (
											<p key={String(error)} className="text-red-500 text-sm">
												{String(error)}
											</p>
										))}
									</div>
								)}
							</addPatientForm.Field>
						</div>

						{/* Submit */}
						<div className="flex justify-end gap-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => setAddPatientSheetOpen(false)}
							>
								Cancel
							</Button>
							<addPatientForm.Subscribe>
								{(state) => (
									<Button
										type="submit"
										disabled={
											!state.canSubmit ||
											state.isSubmitting ||
											registerPatientMutation.isPending
										}
									>
										{state.isSubmitting || registerPatientMutation.isPending ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Registering...
											</>
										) : (
											<>
												<UserPlus className="mr-2 h-4 w-4" />
												Register Patient
											</>
										)}
									</Button>
								)}
							</addPatientForm.Subscribe>
						</div>
					</form>
				</SheetContent>
			</Sheet>
		</>
	);
}
