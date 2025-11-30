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
	AlertTriangle,
	ArrowUpDown,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Eye,
	Info,
	Loader2,
	Search,
	Shield,
	ShieldAlert,
	ShieldX,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	type SecurityEvent,
	type SecurityEventSeverity,
	type SecurityEventType,
	useSecurityEvents,
} from "@/hooks/use-security";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/admin/security/events")({
	component: SecurityEventsPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

// Severity badge colors
const SEVERITY_CONFIG: Record<
	SecurityEventSeverity,
	{
		variant: "default" | "secondary" | "destructive" | "outline";
		icon: typeof Info;
	}
> = {
	LOW: { variant: "secondary", icon: Info },
	MEDIUM: { variant: "outline", icon: AlertTriangle },
	HIGH: { variant: "default", icon: ShieldAlert },
	CRITICAL: { variant: "destructive", icon: ShieldX },
};

// Event type display names
const EVENT_TYPE_LABELS: Record<SecurityEventType, string> = {
	AUTH_FAILED: "Authentication Failed",
	AUTH_LOCKOUT: "Account Locked",
	PERMISSION_DENIED: "Permission Denied",
	MFA_FAILED: "MFA Verification Failed",
	MFA_ENABLED: "MFA Enabled",
	MFA_DISABLED: "MFA Disabled",
	SUSPICIOUS_ACTIVITY: "Suspicious Activity",
	KEY_ROTATION: "Encryption Key Rotation",
	ADMIN_ACTION: "Admin Action",
};

// Event Detail Dialog
function EventDetailDialog({
	event,
	open,
	onOpenChange,
}: {
	event: SecurityEvent | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	if (!event) return null;

	const severityConfig = SEVERITY_CONFIG[event.severity];
	const SeverityIcon = severityConfig.icon;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Shield className="h-5 w-5" />
						Security Event Details
					</DialogTitle>
					<DialogDescription>
						{EVENT_TYPE_LABELS[event.type] || event.type}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Severity and Type */}
					<div className="flex items-center gap-4">
						<Badge
							variant={severityConfig.variant}
							className="flex items-center gap-1"
						>
							<SeverityIcon className="h-3 w-3" />
							{event.severity}
						</Badge>
						<Badge variant="outline">{event.type}</Badge>
					</div>

					<Separator />

					{/* Event Info Grid */}
					<div className="grid gap-3 text-sm">
						<div className="flex justify-between">
							<span className="text-muted-foreground">Event ID</span>
							<span className="font-mono">{event.id || "N/A"}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Timestamp</span>
							<span>{new Date(event.timestamp).toLocaleString()}</span>
						</div>
						{event.userId && (
							<div className="flex justify-between">
								<span className="text-muted-foreground">User ID</span>
								<span className="font-mono">{event.userId}</span>
							</div>
						)}
						{event.tenantId && (
							<div className="flex justify-between">
								<span className="text-muted-foreground">Tenant ID</span>
								<span className="font-mono">{event.tenantId}</span>
							</div>
						)}
						{event.ip && (
							<div className="flex justify-between">
								<span className="text-muted-foreground">IP Address</span>
								<span className="font-mono">{event.ip}</span>
							</div>
						)}
					</div>

					{/* User Agent */}
					{event.userAgent && (
						<>
							<Separator />
							<div className="space-y-2">
								<span className="text-muted-foreground text-sm">
									User Agent
								</span>
								<p className="break-all rounded-md bg-muted p-2 font-mono text-xs">
									{event.userAgent}
								</p>
							</div>
						</>
					)}

					{/* Details */}
					{event.details && Object.keys(event.details).length > 0 && (
						<>
							<Separator />
							<div className="space-y-2">
								<span className="text-muted-foreground text-sm">
									Additional Details
								</span>
								<pre className="max-h-40 overflow-auto rounded-md bg-muted p-2 font-mono text-xs">
									{JSON.stringify(event.details, null, 2)}
								</pre>
							</div>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

function SecurityEventsPage() {
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [severityFilter, setSeverityFilter] = useState<string>("ALL");
	const [typeFilter, setTypeFilter] = useState<string>("ALL");
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = useState({});

	// Dialog state
	const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(
		null,
	);
	const [detailDialogOpen, setDetailDialogOpen] = useState(false);

	// Build query params
	const queryParams = {
		page,
		limit: 20,
		severity:
			severityFilter !== "ALL"
				? (severityFilter as SecurityEventSeverity)
				: undefined,
		type: typeFilter !== "ALL" ? (typeFilter as SecurityEventType) : undefined,
		userId: search || undefined,
	};

	const { data: eventsData, isLoading } = useSecurityEvents(queryParams);

	const columns: ColumnDef<SecurityEvent>[] = [
		{
			accessorKey: "timestamp",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Timestamp
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			),
			cell: ({ row }) => (
				<div className="text-sm">
					{new Date(row.original.timestamp).toLocaleString()}
				</div>
			),
		},
		{
			accessorKey: "type",
			header: "Event Type",
			cell: ({ row }) => (
				<div className="font-medium text-sm">
					{EVENT_TYPE_LABELS[row.original.type] || row.original.type}
				</div>
			),
		},
		{
			accessorKey: "severity",
			header: "Severity",
			cell: ({ row }) => {
				const severity = row.original.severity;
				const config = SEVERITY_CONFIG[severity];
				const Icon = config.icon;
				return (
					<Badge
						variant={config.variant}
						className="flex w-fit items-center gap-1"
					>
						<Icon className="h-3 w-3" />
						{severity}
					</Badge>
				);
			},
		},
		{
			accessorKey: "userId",
			header: "User",
			cell: ({ row }) => (
				<div className="max-w-[150px] truncate font-mono text-sm">
					{row.original.userId || "-"}
				</div>
			),
		},
		{
			accessorKey: "ip",
			header: "IP Address",
			cell: ({ row }) => (
				<div className="font-mono text-sm">{row.original.ip || "-"}</div>
			),
		},
		{
			id: "actions",
			enableHiding: false,
			cell: ({ row }) => {
				const event = row.original;
				return (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							setSelectedEvent(event);
							setDetailDialogOpen(true);
						}}
					>
						<Eye className="mr-1 h-4 w-4" />
						View
					</Button>
				);
			},
		},
	];

	const table = useReactTable({
		data: eventsData?.events ?? [],
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
		pageCount: eventsData?.pagination.pages ?? 0,
	});

	return (
		<>
			<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
				{/* Header */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="font-bold text-2xl">Security Events</h1>
						<p className="text-muted-foreground">
							Monitor and analyze security events across your hospital
						</p>
					</div>
				</div>

				{/* Filters */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
					<div className="relative flex-1">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search by user ID..."
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
								value={severityFilter}
								onValueChange={(value) => {
									setSeverityFilter(value);
									setPage(1);
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="Severity" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ALL">All severities</SelectItem>
									<SelectItem value="LOW">Low</SelectItem>
									<SelectItem value="MEDIUM">Medium</SelectItem>
									<SelectItem value="HIGH">High</SelectItem>
									<SelectItem value="CRITICAL">Critical</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="w-40">
							<Select
								value={typeFilter}
								onValueChange={(value) => {
									setTypeFilter(value);
									setPage(1);
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="Event type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ALL">All types</SelectItem>
									<SelectItem value="AUTH_FAILED">Auth Failed</SelectItem>
									<SelectItem value="AUTH_LOCKOUT">Account Locked</SelectItem>
									<SelectItem value="PERMISSION_DENIED">
										Permission Denied
									</SelectItem>
									<SelectItem value="MFA_FAILED">MFA Failed</SelectItem>
									<SelectItem value="MFA_ENABLED">MFA Enabled</SelectItem>
									<SelectItem value="MFA_DISABLED">MFA Disabled</SelectItem>
									<SelectItem value="SUSPICIOUS_ACTIVITY">
										Suspicious Activity
									</SelectItem>
									<SelectItem value="KEY_ROTATION">Key Rotation</SelectItem>
									<SelectItem value="ADMIN_ACTION">Admin Action</SelectItem>
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
										No security events found.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				{/* Pagination */}
				{eventsData && (
					<div className="flex items-center justify-between px-2">
						<div className="text-muted-foreground text-sm">
							Showing {eventsData.events.length} of{" "}
							{eventsData.pagination.total} events
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
								Page {page} of {eventsData.pagination.pages}
							</span>
							<Button
								variant="outline"
								size="icon"
								onClick={() =>
									setPage((p) => Math.min(eventsData.pagination.pages, p + 1))
								}
								disabled={page === eventsData.pagination.pages}
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								onClick={() => setPage(eventsData.pagination.pages)}
								disabled={page === eventsData.pagination.pages}
							>
								<ChevronsRight className="h-4 w-4" />
							</Button>
						</div>
					</div>
				)}
			</div>

			{/* Event Detail Dialog */}
			<EventDetailDialog
				event={selectedEvent}
				open={detailDialogOpen}
				onOpenChange={setDetailDialogOpen}
			/>
		</>
	);
}
