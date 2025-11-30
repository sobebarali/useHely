import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import {
	Calendar,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Clock,
	Loader2,
	MoreHorizontal,
	RefreshCw,
	Search,
	Users,
} from "lucide-react";
import { useState } from "react";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { type PatientListItem, usePatients } from "@/hooks/use-patients";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/patients/opd-queue")({
	component: OpdQueuePage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function OpdQueuePage() {
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");

	const {
		data: patientsData,
		isLoading,
		refetch,
		isRefetching,
	} = usePatients({
		page,
		limit: 20,
		search: search || undefined,
		patientType: "OPD",
		status: "ACTIVE",
		sortBy: "createdAt",
		sortOrder: "asc",
	});

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const formatTime = (dateString: string) => {
		return new Date(dateString).toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const getWaitTime = (createdAt: string) => {
		const created = new Date(createdAt);
		const now = new Date();
		const diffMs = now.getTime() - created.getTime();
		const diffMins = Math.floor(diffMs / 60000);

		if (diffMins < 60) {
			return `${diffMins} min`;
		}
		const hours = Math.floor(diffMins / 60);
		const mins = diffMins % 60;
		return `${hours}h ${mins}m`;
	};

	const columns: ColumnDef<PatientListItem>[] = [
		{
			id: "queue",
			header: "#",
			cell: ({ row }) => (
				<div className="font-bold text-lg text-primary">
					{(page - 1) * 20 + row.index + 1}
				</div>
			),
		},
		{
			accessorKey: "patientId",
			header: "Patient ID",
			cell: ({ row }) => (
				<div className="font-medium">{row.getValue("patientId")}</div>
			),
		},
		{
			accessorKey: "name",
			header: "Name",
			cell: ({ row }) => (
				<div className="font-medium">
					{row.original.firstName} {row.original.lastName}
				</div>
			),
		},
		{
			accessorKey: "dateOfBirth",
			header: "Date of Birth",
			cell: ({ row }) => (
				<div className="flex items-center gap-1 text-muted-foreground">
					<Calendar className="h-3 w-3" />
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
			accessorKey: "department",
			header: "Department",
			cell: ({ row }) => (
				<div className="text-muted-foreground">
					{row.original.department || "-"}
				</div>
			),
		},
		{
			accessorKey: "createdAt",
			header: "Check-in Time",
			cell: ({ row }) => (
				<div className="flex items-center gap-1 text-muted-foreground">
					<Clock className="h-3 w-3" />
					{formatTime(row.original.createdAt)}
				</div>
			),
		},
		{
			id: "waitTime",
			header: "Wait Time",
			cell: ({ row }) => {
				const waitTime = getWaitTime(row.original.createdAt);
				const diffMs = Date.now() - new Date(row.original.createdAt).getTime();
				const diffMins = Math.floor(diffMs / 60000);

				return (
					<Badge
						variant={
							diffMins > 60
								? "destructive"
								: diffMins > 30
									? "secondary"
									: "outline"
						}
					>
						{waitTime}
					</Badge>
				);
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
		getCoreRowModel: getCoreRowModel(),
		manualPagination: true,
		pageCount: patientsData?.pagination.totalPages ?? 0,
	});

	const totalPatients = patientsData?.pagination.total ?? 0;

	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-bold text-2xl">OPD Queue</h1>
					<p className="text-muted-foreground">
						Manage outpatient department queue
					</p>
				</div>
				<Button
					variant="outline"
					onClick={() => refetch()}
					disabled={isRefetching}
				>
					{isRefetching ? (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<RefreshCw className="mr-2 h-4 w-4" />
					)}
					Refresh
				</Button>
			</div>

			{/* Stats */}
			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							Patients in Queue
						</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">{totalPatients}</div>
						<p className="text-muted-foreground text-xs">Active OPD patients</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Current Page</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{page} / {patientsData?.pagination.totalPages ?? 1}
						</div>
						<p className="text-muted-foreground text-xs">
							Showing {patientsData?.data.length ?? 0} patients
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Status</CardTitle>
						<div className="h-2 w-2 rounded-full bg-green-500" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">Active</div>
						<p className="text-muted-foreground text-xs">
							Queue is being served
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Search */}
			<div className="flex items-center gap-4">
				<div className="relative max-w-sm flex-1">
					<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search by name, phone, or ID..."
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
						className="pl-9"
					/>
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
									<div className="flex flex-col items-center gap-2">
										<Users className="h-8 w-8 text-muted-foreground" />
										<p className="text-muted-foreground">
											No patients in the OPD queue
										</p>
									</div>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			{patientsData && patientsData.pagination.totalPages > 0 && (
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
	);
}
