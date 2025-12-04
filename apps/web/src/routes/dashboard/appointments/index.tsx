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
import { format } from "date-fns";
import {
	AlertTriangle,
	ArrowUpDown,
	Calendar,
	CalendarPlus,
	Check,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Clock,
	Loader2,
	LogIn,
	MoreHorizontal,
	X,
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
import { DatePicker } from "@/components/ui/date-picker";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
	type AppointmentListItem,
	type AppointmentStatus,
	type AppointmentType,
	useAppointments,
	useCancelAppointment,
	useCheckInAppointment,
	useCompleteAppointment,
} from "@/hooks/use-appointments";
import type { ApiError } from "@/lib/appointments-client";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/appointments/")({
	component: AppointmentsListPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

const STATUS_OPTIONS: { value: AppointmentStatus | "ALL"; label: string }[] = [
	{ value: "ALL", label: "All Statuses" },
	{ value: "SCHEDULED", label: "Scheduled" },
	{ value: "CONFIRMED", label: "Confirmed" },
	{ value: "CHECKED_IN", label: "Checked In" },
	{ value: "IN_PROGRESS", label: "In Progress" },
	{ value: "COMPLETED", label: "Completed" },
	{ value: "CANCELLED", label: "Cancelled" },
	{ value: "NO_SHOW", label: "No Show" },
];

const TYPE_OPTIONS: { value: AppointmentType | "ALL"; label: string }[] = [
	{ value: "ALL", label: "All Types" },
	{ value: "CONSULTATION", label: "Consultation" },
	{ value: "FOLLOW_UP", label: "Follow Up" },
	{ value: "PROCEDURE", label: "Procedure" },
	{ value: "EMERGENCY", label: "Emergency" },
	{ value: "ROUTINE_CHECK", label: "Routine Check" },
];

function getStatusBadgeVariant(
	status: AppointmentStatus,
): "default" | "secondary" | "destructive" | "outline" {
	switch (status) {
		case "SCHEDULED":
		case "CONFIRMED":
			return "secondary";
		case "CHECKED_IN":
		case "IN_PROGRESS":
			return "default";
		case "COMPLETED":
			return "outline";
		case "CANCELLED":
		case "NO_SHOW":
			return "destructive";
		default:
			return "secondary";
	}
}

function getPriorityBadgeVariant(
	priority: string,
): "default" | "secondary" | "destructive" | "outline" {
	switch (priority) {
		case "EMERGENCY":
			return "destructive";
		case "URGENT":
			return "default";
		default:
			return "outline";
	}
}

function AppointmentsListPage() {
	const [page, setPage] = useState(1);
	const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
	const [statusFilter, setStatusFilter] = useState<string>("");
	const [typeFilter, setTypeFilter] = useState<string>("");
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = useState({});

	// Format date for API calls (YYYY-MM-DD)
	const dateFilterString = dateFilter
		? format(dateFilter, "yyyy-MM-dd")
		: undefined;

	// Cancel dialog state
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [appointmentToCancel, setAppointmentToCancel] =
		useState<AppointmentListItem | null>(null);

	const { data: appointmentsData, isLoading: appointmentsLoading } =
		useAppointments({
			page,
			limit: 10,
			date: dateFilterString,
			status:
				statusFilter && statusFilter !== "ALL"
					? (statusFilter as AppointmentStatus)
					: undefined,
			type:
				typeFilter && typeFilter !== "ALL"
					? (typeFilter as AppointmentType)
					: undefined,
			sortBy: "date",
			sortOrder: "asc",
		});

	const checkInMutation = useCheckInAppointment();
	const completeMutation = useCompleteAppointment();
	const cancelMutation = useCancelAppointment();

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const formatTime = (time: string) => {
		const [hours, minutes] = time.split(":");
		const hour = Number.parseInt(hours, 10);
		const ampm = hour >= 12 ? "PM" : "AM";
		const hour12 = hour % 12 || 12;
		return `${hour12}:${minutes} ${ampm}`;
	};

	const handleCheckIn = async (appointment: AppointmentListItem) => {
		try {
			await checkInMutation.mutateAsync(appointment.id);
			toast.success(
				`Patient checked in. Queue number: ${appointment.queueNumber || "Assigned"}`,
			);
		} catch (error) {
			const apiError = error as ApiError;
			toast.error(apiError.message || "Failed to check in patient");
		}
	};

	const handleComplete = async (appointment: AppointmentListItem) => {
		try {
			await completeMutation.mutateAsync({ id: appointment.id });
			toast.success("Appointment completed successfully");
		} catch (error) {
			const apiError = error as ApiError;
			toast.error(apiError.message || "Failed to complete appointment");
		}
	};

	const handleCancelClick = (appointment: AppointmentListItem) => {
		setAppointmentToCancel(appointment);
		setCancelDialogOpen(true);
	};

	const handleCancelConfirm = async () => {
		if (!appointmentToCancel) return;
		try {
			await cancelMutation.mutateAsync({ id: appointmentToCancel.id });
			toast.success("Appointment cancelled successfully");
			setCancelDialogOpen(false);
			setAppointmentToCancel(null);
		} catch (error) {
			const apiError = error as ApiError;
			toast.error(apiError.message || "Failed to cancel appointment");
		}
	};

	const canCheckIn = (status: AppointmentStatus) => {
		return status === "SCHEDULED" || status === "CONFIRMED";
	};

	const canComplete = (status: AppointmentStatus) => {
		return status === "CHECKED_IN" || status === "IN_PROGRESS";
	};

	const canCancel = (status: AppointmentStatus) => {
		return (
			status === "SCHEDULED" ||
			status === "CONFIRMED" ||
			status === "CHECKED_IN"
		);
	};

	const columns: ColumnDef<AppointmentListItem>[] = [
		{
			accessorKey: "appointmentNumber",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Appointment #
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			),
			cell: ({ row }) => (
				<div className="font-medium">{row.getValue("appointmentNumber")}</div>
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
						<div className="text-muted-foreground text-sm">
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
						<div className="font-medium">
							Dr. {doctor.firstName} {doctor.lastName}
						</div>
						{doctor.specialization && (
							<div className="text-muted-foreground text-sm">
								{doctor.specialization}
							</div>
						)}
					</div>
				);
			},
		},
		{
			accessorKey: "date",
			header: "Date & Time",
			cell: ({ row }) => (
				<div>
					<div className="flex items-center gap-1">
						<Calendar className="h-3 w-3 text-muted-foreground" />
						{formatDate(row.original.date)}
					</div>
					<div className="flex items-center gap-1 text-muted-foreground text-sm">
						<Clock className="h-3 w-3" />
						{formatTime(row.original.timeSlot.start)} -{" "}
						{formatTime(row.original.timeSlot.end)}
					</div>
				</div>
			),
		},
		{
			accessorKey: "type",
			header: "Type",
			cell: ({ row }) => (
				<Badge variant="outline">{row.original.type.replace("_", " ")}</Badge>
			),
		},
		{
			accessorKey: "priority",
			header: "Priority",
			cell: ({ row }) => {
				const priority = row.original.priority;
				return (
					<Badge variant={getPriorityBadgeVariant(priority)}>
						{priority === "EMERGENCY" && (
							<AlertTriangle className="mr-1 h-3 w-3" />
						)}
						{priority}
					</Badge>
				);
			},
		},
		{
			accessorKey: "status",
			header: "Status",
			cell: ({ row }) => {
				const status = row.original.status;
				return (
					<Badge variant={getStatusBadgeVariant(status)}>
						{status.replace("_", " ")}
					</Badge>
				);
			},
		},
		{
			accessorKey: "queueNumber",
			header: "Queue",
			cell: ({ row }) => {
				const queueNumber = row.original.queueNumber;
				if (!queueNumber)
					return <span className="text-muted-foreground">-</span>;
				return (
					<Badge variant="secondary" className="font-mono">
						#{queueNumber}
					</Badge>
				);
			},
		},
		{
			id: "actions",
			enableHiding: false,
			cell: ({ row }) => {
				const appointment = row.original;
				const isCheckingIn = checkInMutation.isPending;
				const isCompleting = completeMutation.isPending;
				const isCancelling = cancelMutation.isPending;

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
									to="/dashboard/appointments/$id"
									params={{ id: appointment.id }}
								>
									View details
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />

							{canCheckIn(appointment.status) && (
								<DropdownMenuItem
									onClick={() => handleCheckIn(appointment)}
									disabled={isCheckingIn}
								>
									<LogIn className="mr-2 h-4 w-4" />
									Check In
								</DropdownMenuItem>
							)}

							{canComplete(appointment.status) && (
								<DropdownMenuItem
									onClick={() => handleComplete(appointment)}
									disabled={isCompleting}
								>
									<Check className="mr-2 h-4 w-4" />
									Complete
								</DropdownMenuItem>
							)}

							{canCancel(appointment.status) && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={() => handleCancelClick(appointment)}
										disabled={isCancelling}
										className="text-destructive focus:text-destructive"
									>
										<X className="mr-2 h-4 w-4" />
										Cancel Appointment
									</DropdownMenuItem>
								</>
							)}

							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() =>
									navigator.clipboard.writeText(appointment.appointmentNumber)
								}
							>
								Copy Appointment #
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];

	const table = useReactTable({
		data: appointmentsData?.data ?? [],
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
		pageCount: appointmentsData?.pagination.totalPages ?? 0,
	});

	return (
		<>
			<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
				{/* Header */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="font-bold text-2xl">Appointments</h1>
						<p className="text-muted-foreground">
							Manage patient appointments and scheduling
						</p>
					</div>
					<Button asChild>
						<Link to="/dashboard/appointments/schedule">
							<CalendarPlus className="mr-2 h-4 w-4" />
							Schedule Appointment
						</Link>
					</Button>
				</div>

				{/* Filters */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
					<div className="w-48">
						<Label htmlFor="date-filter" className="sr-only">
							Date
						</Label>
						<DatePicker
							value={dateFilter}
							onChange={(date) => {
								setDateFilter(date);
								setPage(1);
							}}
							placeholder="Filter by date"
							dateFormat="MMM d, yyyy"
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
									<SelectValue placeholder="All Statuses" />
								</SelectTrigger>
								<SelectContent>
									{STATUS_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
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
									<SelectValue placeholder="All Types" />
								</SelectTrigger>
								<SelectContent>
									{TYPE_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						{(dateFilter || statusFilter || typeFilter) && (
							<Button
								variant="ghost"
								onClick={() => {
									setDateFilter(undefined);
									setStatusFilter("");
									setTypeFilter("");
									setPage(1);
								}}
							>
								<X className="mr-2 h-4 w-4" />
								Clear
							</Button>
						)}
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
							{appointmentsLoading ? (
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
										No appointments found.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				{/* Pagination */}
				{appointmentsData && (
					<div className="flex items-center justify-between px-2">
						<div className="text-muted-foreground text-sm">
							Showing {appointmentsData.data.length} of{" "}
							{appointmentsData.pagination.total} appointments
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
								Page {page} of {appointmentsData.pagination.totalPages}
							</span>
							<Button
								variant="outline"
								size="icon"
								onClick={() =>
									setPage((p) =>
										Math.min(appointmentsData.pagination.totalPages, p + 1),
									)
								}
								disabled={page === appointmentsData.pagination.totalPages}
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								onClick={() => setPage(appointmentsData.pagination.totalPages)}
								disabled={page === appointmentsData.pagination.totalPages}
							>
								<ChevronsRight className="h-4 w-4" />
							</Button>
						</div>
					</div>
				)}
			</div>

			{/* Cancel Confirmation Dialog */}
			<AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to cancel appointment{" "}
							<span className="font-medium">
								{appointmentToCancel?.appointmentNumber}
							</span>
							? This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep Appointment</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleCancelConfirm}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{cancelMutation.isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Cancelling...
								</>
							) : (
								"Cancel Appointment"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
