import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
	Activity,
	AlertTriangle,
	ArrowUpDown,
	Calendar,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Eye,
	Loader2,
	Search,
	TrendingUp,
	User,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
import { useSearchPatients } from "@/hooks/use-patients";
import {
	useLatestVitals,
	usePatientVitals,
	useVitalsTrends,
	type VitalParameter,
	type VitalsRecordOutput,
} from "@/hooks/use-vitals";
import { authClient } from "@/lib/auth-client";
import { normalizeSelectValue, SELECT_ALL_VALUE } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/vitals/history")({
	component: VitalsHistoryPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw import("@tanstack/react-router").then((m) =>
				m.redirect({ to: "/login" }),
			);
		}
	},
});

function VitalsHistoryPage() {
	const navigate = useNavigate();

	// Patient search state
	const [patientSearch, setPatientSearch] = useState("");
	const [showSearchResults, setShowSearchResults] = useState(false);
	const [selectedPatient, setSelectedPatient] = useState<{
		id: string;
		patientId: string;
		firstName: string;
		lastName: string;
	} | null>(null);

	// Filters
	const [page, setPage] = useState(1);
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [parameterFilter, setParameterFilter] = useState<string>("");
	const [trendParameter, setTrendParameter] =
		useState<VitalParameter>("heartRate");

	// Table state
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = useState({});

	// Search patients
	const { data: searchResults, isLoading: searchLoading } = useSearchPatients({
		q: patientSearch,
		limit: 10,
	});

	// Fetch vitals for selected patient
	const normalizedParameterFilter = normalizeSelectValue(parameterFilter);
	const { data: vitalsData, isLoading: vitalsLoading } = usePatientVitals(
		selectedPatient?.id || "",
		{
			page,
			limit: 10,
			startDate: startDate || undefined,
			endDate: endDate || undefined,
			parameter: normalizedParameterFilter
				? (normalizedParameterFilter as VitalParameter)
				: undefined,
		},
	);

	// Fetch latest vitals
	const { data: latestVitals } = useLatestVitals(selectedPatient?.id || "");

	// Fetch trends
	const { data: trendsData } = useVitalsTrends(selectedPatient?.id || "", {
		parameter: trendParameter,
		limit: "30",
	});

	const handlePatientSelect = (patient: {
		id: string;
		patientId: string;
		firstName: string;
		lastName: string;
	}) => {
		setSelectedPatient(patient);
		setShowSearchResults(false);
		setPatientSearch("");
		setPage(1);
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const columns: ColumnDef<VitalsRecordOutput>[] = [
		{
			accessorKey: "recordedAt",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Date/Time
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			),
			cell: ({ row }) => (
				<div className="flex items-center gap-1">
					<Calendar className="h-3 w-3 text-muted-foreground" />
					{formatDate(row.original.recordedAt)}
				</div>
			),
		},
		{
			accessorKey: "vitals",
			header: "Vitals Summary",
			cell: ({ row }) => {
				const v = row.original;
				const parts = [];
				if (v.temperature)
					parts.push(`${v.temperature.value}°${v.temperature.unit[0]}`);
				if (v.bloodPressure)
					parts.push(
						`${v.bloodPressure.systolic}/${v.bloodPressure.diastolic}`,
					);
				if (v.heartRate) parts.push(`${v.heartRate} bpm`);
				if (v.oxygenSaturation) parts.push(`${v.oxygenSaturation}% O2`);
				return (
					<div className="max-w-xs truncate text-sm">
						{parts.join(" | ") || "-"}
					</div>
				);
			},
		},
		{
			accessorKey: "alerts",
			header: "Alerts",
			cell: ({ row }) => {
				const alerts = row.original.alerts;
				if (!alerts || alerts.length === 0) {
					return <span className="text-muted-foreground">None</span>;
				}
				const criticalCount = alerts.filter(
					(a) => a.severity === "CRITICAL" || a.severity === "HIGH",
				).length;
				return (
					<div className="flex items-center gap-1">
						{criticalCount > 0 && (
							<Badge variant="destructive" className="gap-1">
								<AlertTriangle className="h-3 w-3" />
								{criticalCount}
							</Badge>
						)}
						{alerts.length > criticalCount && (
							<Badge variant="secondary">{alerts.length - criticalCount}</Badge>
						)}
					</div>
				);
			},
		},
		{
			accessorKey: "recordedBy",
			header: "Recorded By",
			cell: ({ row }) => {
				const recorder = row.original.recordedBy;
				return (
					<span className="text-sm">
						{recorder.firstName} {recorder.lastName}
					</span>
				);
			},
		},
		{
			id: "actions",
			enableHiding: false,
			cell: ({ row }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						onClick={() =>
							navigate({
								to: "/dashboard/vitals/$id",
								params: { id: row.original.id },
							})
						}
					>
						<Eye className="mr-1 h-4 w-4" />
						View
					</Button>
				);
			},
		},
	];

	const table = useReactTable({
		data: vitalsData?.data ?? [],
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
		pageCount: vitalsData?.pagination.totalPages ?? 0,
	});

	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-bold text-2xl">Vitals History</h1>
					<p className="text-muted-foreground">
						View and analyze patient vital signs over time
					</p>
				</div>
				<Button asChild>
					<Link to="/dashboard/vitals/record">
						<Activity className="mr-2 h-4 w-4" />
						Record New Vitals
					</Link>
				</Button>
			</div>

			{/* Patient Selection */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<User className="h-5 w-5" />
						Select Patient
					</CardTitle>
					<CardDescription>
						Search and select a patient to view their vitals history
					</CardDescription>
				</CardHeader>
				<CardContent>
					{selectedPatient ? (
						<div className="flex items-center gap-2">
							<div className="flex-1 rounded-md border bg-muted p-3">
								<span className="font-medium">
									{selectedPatient.firstName} {selectedPatient.lastName}
								</span>
								<span className="ml-2 text-muted-foreground">
									({selectedPatient.patientId})
								</span>
							</div>
							<Button
								type="button"
								variant="outline"
								onClick={() => setSelectedPatient(null)}
							>
								Change
							</Button>
						</div>
					) : (
						<div className="relative">
							<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search by name, ID, or phone..."
								value={patientSearch}
								onChange={(e) => {
									setPatientSearch(e.target.value);
									setShowSearchResults(true);
								}}
								onFocus={() => setShowSearchResults(true)}
								className="pl-9"
							/>
							{showSearchResults && patientSearch.length >= 2 && (
								<div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg">
									{searchLoading ? (
										<div className="p-4 text-center text-muted-foreground">
											<Loader2 className="mx-auto h-4 w-4 animate-spin" />
										</div>
									) : searchResults && searchResults.length > 0 ? (
										<ul className="max-h-60 overflow-auto py-1">
											{searchResults.map((patient) => (
												<li key={patient.id}>
													<button
														type="button"
														className="w-full px-4 py-2 text-left hover:bg-muted"
														onClick={() => handlePatientSelect(patient)}
													>
														<div className="font-medium">
															{patient.firstName} {patient.lastName}
														</div>
														<div className="text-muted-foreground text-sm">
															ID: {patient.patientId} | {patient.phone}
														</div>
													</button>
												</li>
											))}
										</ul>
									) : (
										<div className="p-4 text-center text-muted-foreground">
											No patients found
										</div>
									)}
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{selectedPatient && (
				<>
					{/* Latest Vitals Summary */}
					{latestVitals && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Activity className="h-5 w-5" />
									Latest Vitals Summary
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
									{latestVitals.temperature && (
										<div className="rounded-lg border p-3">
											<div className="text-muted-foreground text-sm">
												Temperature
											</div>
											<div className="font-semibold text-lg">
												{latestVitals.temperature.value}°
												{latestVitals.temperature.unit[0]}
											</div>
											<div className="text-muted-foreground text-xs">
												{formatDate(latestVitals.temperature.recordedAt)}
											</div>
										</div>
									)}
									{latestVitals.bloodPressure && (
										<div className="rounded-lg border p-3">
											<div className="text-muted-foreground text-sm">
												Blood Pressure
											</div>
											<div className="font-semibold text-lg">
												{latestVitals.bloodPressure.systolic}/
												{latestVitals.bloodPressure.diastolic} mmHg
											</div>
											<div className="text-muted-foreground text-xs">
												{formatDate(latestVitals.bloodPressure.recordedAt)}
											</div>
										</div>
									)}
									{latestVitals.heartRate && (
										<div className="rounded-lg border p-3">
											<div className="text-muted-foreground text-sm">
												Heart Rate
											</div>
											<div className="font-semibold text-lg">
												{latestVitals.heartRate.value} bpm
											</div>
											<div className="text-muted-foreground text-xs">
												{formatDate(latestVitals.heartRate.recordedAt)}
											</div>
										</div>
									)}
									{latestVitals.oxygenSaturation && (
										<div className="rounded-lg border p-3">
											<div className="text-muted-foreground text-sm">
												Oxygen Saturation
											</div>
											<div className="font-semibold text-lg">
												{latestVitals.oxygenSaturation.value}%
											</div>
											<div className="text-muted-foreground text-xs">
												{formatDate(latestVitals.oxygenSaturation.recordedAt)}
											</div>
										</div>
									)}
									{latestVitals.weight && (
										<div className="rounded-lg border p-3">
											<div className="text-muted-foreground text-sm">
												Weight
											</div>
											<div className="font-semibold text-lg">
												{latestVitals.weight.value} {latestVitals.weight.unit}
											</div>
											<div className="text-muted-foreground text-xs">
												{formatDate(latestVitals.weight.recordedAt)}
											</div>
										</div>
									)}
									{latestVitals.bmi && (
										<div className="rounded-lg border p-3">
											<div className="text-muted-foreground text-sm">BMI</div>
											<div className="font-semibold text-lg">
												{latestVitals.bmi.value.toFixed(1)}
											</div>
											<div className="text-muted-foreground text-xs">
												{formatDate(latestVitals.bmi.recordedAt)}
											</div>
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Trends */}
					{trendsData && trendsData.dataPoints.length > 0 && (
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle className="flex items-center gap-2">
										<TrendingUp className="h-5 w-5" />
										Trends
									</CardTitle>
									<Select
										value={trendParameter}
										onValueChange={(v) =>
											setTrendParameter(v as VitalParameter)
										}
									>
										<SelectTrigger className="w-48">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="temperature">Temperature</SelectItem>
											<SelectItem value="bloodPressure">
												Blood Pressure
											</SelectItem>
											<SelectItem value="heartRate">Heart Rate</SelectItem>
											<SelectItem value="respiratoryRate">
												Respiratory Rate
											</SelectItem>
											<SelectItem value="oxygenSaturation">
												Oxygen Saturation
											</SelectItem>
											<SelectItem value="weight">Weight</SelectItem>
											<SelectItem value="bloodGlucose">
												Blood Glucose
											</SelectItem>
											<SelectItem value="painLevel">Pain Level</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</CardHeader>
							<CardContent>
								<div className="grid gap-4 sm:grid-cols-4">
									<div className="rounded-lg border p-3">
										<div className="text-muted-foreground text-sm">Minimum</div>
										<div className="font-semibold text-lg">
											{trendsData.statistics.min}
											{trendsData.unit && ` ${trendsData.unit}`}
										</div>
									</div>
									<div className="rounded-lg border p-3">
										<div className="text-muted-foreground text-sm">Maximum</div>
										<div className="font-semibold text-lg">
											{trendsData.statistics.max}
											{trendsData.unit && ` ${trendsData.unit}`}
										</div>
									</div>
									<div className="rounded-lg border p-3">
										<div className="text-muted-foreground text-sm">Average</div>
										<div className="font-semibold text-lg">
											{trendsData.statistics.avg.toFixed(1)}
											{trendsData.unit && ` ${trendsData.unit}`}
										</div>
									</div>
									<div className="rounded-lg border p-3">
										<div className="text-muted-foreground text-sm">
											Readings
										</div>
										<div className="font-semibold text-lg">
											{trendsData.statistics.count}
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Filters */}
					<div className="flex flex-col gap-4 sm:flex-row sm:items-end">
						<div className="flex-1 space-y-2">
							<Label>Start Date</Label>
							<Input
								type="date"
								value={startDate}
								onChange={(e) => {
									setStartDate(e.target.value);
									setPage(1);
								}}
							/>
						</div>
						<div className="flex-1 space-y-2">
							<Label>End Date</Label>
							<Input
								type="date"
								value={endDate}
								onChange={(e) => {
									setEndDate(e.target.value);
									setPage(1);
								}}
							/>
						</div>
						<div className="w-48 space-y-2">
							<Label>Parameter</Label>
							<Select
								value={parameterFilter}
								onValueChange={(v) => {
									setParameterFilter(v);
									setPage(1);
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="All parameters" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={SELECT_ALL_VALUE}>
										All parameters
									</SelectItem>
									<SelectItem value="temperature">Temperature</SelectItem>
									<SelectItem value="bloodPressure">Blood Pressure</SelectItem>
									<SelectItem value="heartRate">Heart Rate</SelectItem>
									<SelectItem value="respiratoryRate">
										Respiratory Rate
									</SelectItem>
									<SelectItem value="oxygenSaturation">
										Oxygen Saturation
									</SelectItem>
									<SelectItem value="weight">Weight</SelectItem>
									<SelectItem value="bloodGlucose">Blood Glucose</SelectItem>
								</SelectContent>
							</Select>
						</div>
						{(startDate || endDate || parameterFilter) && (
							<Button
								variant="outline"
								onClick={() => {
									setStartDate("");
									setEndDate("");
									setParameterFilter("");
									setPage(1);
								}}
							>
								Clear Filters
							</Button>
						)}
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
								{vitalsLoading ? (
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
											No vitals records found.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>

					{/* Pagination */}
					{vitalsData && (
						<div className="flex items-center justify-between px-2">
							<div className="text-muted-foreground text-sm">
								Showing {vitalsData.data.length} of{" "}
								{vitalsData.pagination.total} records
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
									Page {page} of {vitalsData.pagination.totalPages}
								</span>
								<Button
									variant="outline"
									size="icon"
									onClick={() =>
										setPage((p) =>
											Math.min(vitalsData.pagination.totalPages, p + 1),
										)
									}
									disabled={page === vitalsData.pagination.totalPages}
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
								<Button
									variant="outline"
									size="icon"
									onClick={() => setPage(vitalsData.pagination.totalPages)}
									disabled={page === vitalsData.pagination.totalPages}
								>
									<ChevronsRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
				</>
			)}

			{!selectedPatient && (
				<Card className="py-12">
					<CardContent className="text-center">
						<User className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
						<h3 className="mb-2 font-semibold text-lg">No Patient Selected</h3>
						<p className="text-muted-foreground">
							Search and select a patient above to view their vitals history.
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
