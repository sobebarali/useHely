import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { Clock, Loader2, MoreHorizontal, RefreshCw, Users } from "lucide-react";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { QueueItem } from "@/hooks/use-appointments";
import { useAppointmentQueue } from "@/hooks/use-appointments";
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
	const {
		data: queueData,
		isLoading,
		refetch,
		isRefetching,
	} = useAppointmentQueue({});

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

	const columns: ColumnDef<QueueItem>[] = [
		{
			id: "queue",
			header: "#",
			cell: ({ row }) => (
				<div className="font-bold text-lg text-primary">
					{row.original.queueNumber}
				</div>
			),
		},
		{
			accessorKey: "appointmentNumber",
			header: "Appointment #",
			cell: ({ row }) => (
				<div className="font-medium">{row.getValue("appointmentNumber")}</div>
			),
		},
		{
			accessorKey: "patientId",
			header: "Patient ID",
			cell: ({ row }) => (
				<div className="font-medium">{row.original.patient.patientId}</div>
			),
		},
		{
			accessorKey: "name",
			header: "Patient Name",
			cell: ({ row }) => (
				<div className="font-medium">
					{row.original.patient.firstName} {row.original.patient.lastName}
				</div>
			),
		},
		{
			accessorKey: "doctor",
			header: "Doctor",
			cell: ({ row }) => (
				<div className="text-muted-foreground">
					Dr. {row.original.doctor.firstName} {row.original.doctor.lastName}
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
					<Badge
						variant={
							priority === "EMERGENCY"
								? "destructive"
								: priority === "URGENT"
									? "default"
									: "outline"
						}
					>
						{priority}
					</Badge>
				);
			},
		},
		{
			accessorKey: "timeSlot",
			header: "Time Slot",
			cell: ({ row }) => (
				<div className="flex items-center gap-1 text-muted-foreground">
					<Clock className="h-3 w-3" />
					{formatTime(row.original.timeSlot.start)} -{" "}
					{formatTime(row.original.timeSlot.end)}
				</div>
			),
		},
		{
			accessorKey: "checkedInAt",
			header: "Check-in Time",
			cell: ({ row }) => (
				<div className="flex items-center gap-1 text-muted-foreground">
					<Clock className="h-3 w-3" />
					{formatTime(row.original.checkedInAt)}
				</div>
			),
		},
		{
			id: "waitTime",
			header: "Wait Time",
			cell: ({ row }) => {
				const waitTime = getWaitTime(row.original.checkedInAt);
				const diffMs =
					Date.now() - new Date(row.original.checkedInAt).getTime();
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
				const queueItem = row.original;
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
									params={{ id: queueItem.id }}
								>
									View appointment
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link
									to="/dashboard/patients/$id"
									params={{ id: queueItem.patient.id }}
								>
									View patient
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() =>
									navigator.clipboard.writeText(queueItem.patient.patientId)
								}
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
		data: queueData?.data ?? [],
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	const totalQueueItems = queueData?.total ?? 0;

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
						<div className="font-bold text-2xl">{totalQueueItems}</div>
						<p className="text-muted-foreground text-xs">Active OPD queue</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Queue Status</CardTitle>
						<div className="h-2 w-2 rounded-full bg-green-500" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">Active</div>
						<p className="text-muted-foreground text-xs">
							Queue is being served
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Last Updated</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">Now</div>
						<p className="text-muted-foreground text-xs">
							Auto-refreshes every minute
						</p>
					</CardContent>
				</Card>
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
											No appointments in the OPD queue
										</p>
									</div>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
