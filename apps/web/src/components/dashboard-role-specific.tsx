/**
 * Role-specific Dashboard Components
 *
 * Components for different user roles based on dashboard API responses
 */

import { Link } from "@tanstack/react-router";
import {
	Activity,
	AlertTriangle,
	BedDouble,
	Calendar,
	CheckCircle2,
	ClipboardList,
	Clock,
	Package,
	Phone,
	Pill,
	TrendingUp,
	UserCheck,
	UserPlus,
	Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/hooks/use-dashboard";
import type {
	DoctorDashboardOutput,
	NurseDashboardOutput,
	PharmacistDashboardOutput,
	ReceptionistDashboardOutput,
} from "@/lib/dashboard-client";

// Stat Card Component for role-specific dashboards
interface RoleStatCardProps {
	title: string;
	value: number | string;
	description?: string;
	icon: React.ReactNode;
	iconBgClass: string;
	iconColorClass: string;
}

function RoleStatCard({
	title,
	value,
	description,
	icon,
	iconBgClass,
	iconColorClass,
}: RoleStatCardProps) {
	return (
		<Card className="group relative overflow-hidden transition-all hover:shadow-md">
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="font-medium text-muted-foreground text-sm">
					{title}
				</CardTitle>
				<div
					className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBgClass} transition-transform group-hover:scale-110`}
				>
					<span className={iconColorClass}>{icon}</span>
				</div>
			</CardHeader>
			<CardContent>
				<div className="font-bold text-2xl tabular-nums">{value}</div>
				{description && (
					<p className="mt-1 text-muted-foreground text-xs">{description}</p>
				)}
			</CardContent>
		</Card>
	);
}

// Doctor Dashboard Component
export function DoctorDashboard() {
	const { data: dashboardData, isLoading, error } = useDashboard();

	if (isLoading) return <DoctorDashboardSkeleton />;
	if (error || !dashboardData) return <DashboardError />;

	const data = dashboardData as DoctorDashboardOutput;

	return (
		<div className="space-y-6 px-4 lg:px-6">
			{/* Today's Overview */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<RoleStatCard
					title="Total Appointments"
					value={data.today.totalAppointments}
					description={`${data.today.completed} completed, ${data.today.remaining} remaining`}
					icon={<Calendar className="h-5 w-5" />}
					iconBgClass="bg-primary/10 dark:bg-primary/20"
					iconColorClass="text-primary"
				/>
				<RoleStatCard
					title="Current Patient"
					value={data.today.currentPatient?.name || "None"}
					description={
						data.today.currentPatient
							? `ID: ${data.today.currentPatient.patientId}`
							: "No active consultation"
					}
					icon={<UserCheck className="h-5 w-5" />}
					iconBgClass="bg-chart-2/10 dark:bg-chart-2/20"
					iconColorClass="text-chart-2"
				/>
				<RoleStatCard
					title="Next Patient"
					value={data.today.nextPatient?.name || "None"}
					description={
						data.today.nextPatient
							? `ID: ${data.today.nextPatient.patientId}`
							: "No next appointment"
					}
					icon={<Clock className="h-5 w-5" />}
					iconBgClass="bg-chart-3/10 dark:bg-chart-3/20"
					iconColorClass="text-chart-3"
				/>
				<RoleStatCard
					title="Prescriptions Today"
					value={data.prescriptions.issuedToday}
					description={`${data.prescriptions.pendingDispensing} pending dispensing`}
					icon={<Pill className="h-5 w-5" />}
					iconBgClass="bg-chart-4/10 dark:bg-chart-4/20"
					iconColorClass="text-chart-4"
				/>
			</div>

			{/* Queue Status */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
							<Users className="h-4 w-4 text-primary" />
						</div>
						<div>
							<CardTitle className="text-base">Queue Status</CardTitle>
							<CardDescription className="text-xs">
								Current patient queue
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
								<span className="text-muted-foreground text-sm">
									Waiting Patients
								</span>
								<Badge variant="secondary" className="font-semibold">
									{data.queue.waiting}
								</Badge>
							</div>
							<div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
								<span className="text-muted-foreground text-sm">
									Average Wait Time
								</span>
								<Badge variant="outline" className="font-semibold">
									{data.queue.averageWait} min
								</Badge>
							</div>
						</div>
						{data.queue.current.length > 0 && (
							<div className="space-y-2">
								<span className="font-medium text-sm">
									Currently Being Seen
								</span>
								<div className="space-y-2">
									{data.queue.current.map((patient) => (
										<div
											key={`queue-${patient.queueNumber}`}
											className="flex items-center justify-between rounded-lg border bg-card p-3"
										>
											<div className="flex items-center gap-3">
												<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-sm">
													#{patient.queueNumber}
												</div>
												<span className="font-medium text-sm">
													{patient.patientName}
												</span>
											</div>
											<Badge
												variant={
													patient.status === "IN_PROGRESS"
														? "default"
														: "secondary"
												}
											>
												{patient.status}
											</Badge>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Today's Schedule */}
			{data.appointments.todaySchedule.length > 0 && (
				<Card>
					<CardHeader className="pb-3">
						<div className="flex items-center gap-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10">
								<Calendar className="h-4 w-4 text-chart-2" />
							</div>
							<div>
								<CardTitle className="text-base">Today's Schedule</CardTitle>
								<CardDescription className="text-xs">
									{data.appointments.todaySchedule.length} appointments
									scheduled
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{data.appointments.todaySchedule.map((appointment) => (
								<div
									key={appointment.id}
									className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
								>
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
											<Clock className="h-4 w-4 text-muted-foreground" />
										</div>
										<div>
											<p className="font-medium text-sm">
												{appointment.patientName}
											</p>
											<p className="text-muted-foreground text-xs">
												{new Date(appointment.time).toLocaleTimeString([], {
													hour: "2-digit",
													minute: "2-digit",
												})}
											</p>
										</div>
									</div>
									<Badge
										variant={
											appointment.status === "COMPLETED"
												? "default"
												: appointment.status === "IN_PROGRESS"
													? "secondary"
													: appointment.status === "CANCELLED"
														? "destructive"
														: "outline"
										}
									>
										{appointment.status}
									</Badge>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Recent Patients */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-3/10">
							<Users className="h-4 w-4 text-chart-3" />
						</div>
						<div>
							<CardTitle className="text-base">Recent Patients</CardTitle>
							<CardDescription className="text-xs">
								Patients you've seen recently
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{data.patients.recentPatients.map((patient) => (
							<div
								key={patient.id}
								className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
							>
								<div>
									<p className="font-medium text-sm">{patient.name}</p>
									<p className="text-muted-foreground text-xs">
										Last visit:{" "}
										{new Date(patient.lastVisit).toLocaleDateString()}
									</p>
								</div>
								<Button variant="outline" size="sm" asChild>
									<Link
										to="/dashboard/patients/$id"
										params={{ id: patient.id }}
									>
										View Details
									</Link>
								</Button>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

// Nurse Dashboard Component
export function NurseDashboard() {
	const { data: dashboardData, isLoading, error } = useDashboard();

	if (isLoading) return <NurseDashboardSkeleton />;
	if (error || !dashboardData) return <DashboardError />;

	const data = dashboardData as NurseDashboardOutput;

	return (
		<div className="space-y-6 px-4 lg:px-6">
			{/* Ward Overview */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<RoleStatCard
					title={`Ward: ${data.ward.name}`}
					value={`${data.ward.occupiedBeds}/${data.ward.totalBeds}`}
					description={`${data.ward.availableBeds} beds available`}
					icon={<BedDouble className="h-5 w-5" />}
					iconBgClass="bg-primary/10 dark:bg-primary/20"
					iconColorClass="text-primary"
				/>
				<RoleStatCard
					title="Assigned Patients"
					value={data.patients.assigned}
					description={`${data.patients.critical} critical`}
					icon={<Users className="h-5 w-5" />}
					iconBgClass="bg-chart-2/10 dark:bg-chart-2/20"
					iconColorClass="text-chart-2"
				/>
				<RoleStatCard
					title="Vitals Today"
					value={data.vitals.recordedToday}
					description={`${data.vitals.pendingRecording} pending recording`}
					icon={<Activity className="h-5 w-5" />}
					iconBgClass="bg-chart-3/10 dark:bg-chart-3/20"
					iconColorClass="text-chart-3"
				/>
				<RoleStatCard
					title="Pending Tasks"
					value={data.tasks.pending}
					description={`${data.tasks.medicationDue.length} medications due`}
					icon={<ClipboardList className="h-5 w-5" />}
					iconBgClass="bg-chart-4/10 dark:bg-chart-4/20"
					iconColorClass="text-chart-4"
				/>
			</div>

			{/* Critical Patients */}
			{data.patients.needsAttention.length > 0 && (
				<Card className="border-destructive/30">
					<CardHeader className="pb-3">
						<div className="flex items-center gap-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
								<AlertTriangle className="h-4 w-4 text-destructive" />
							</div>
							<div>
								<CardTitle className="text-base">
									Patients Needing Attention
								</CardTitle>
								<CardDescription className="text-xs">
									{data.patients.needsAttention.length} patients require
									immediate attention
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{data.patients.needsAttention.map((patient) => (
								<div
									key={patient.patientId}
									className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-3 dark:bg-destructive/10"
								>
									<div>
										<p className="font-medium text-sm">{patient.patientName}</p>
										<p className="text-muted-foreground text-xs">
											{patient.reason}
										</p>
									</div>
									<Button size="sm" variant="destructive" asChild>
										<Link
											to="/dashboard/patients/$id"
											params={{ id: patient.patientId }}
										>
											Attend Now
										</Link>
									</Button>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Abnormal Vitals */}
			{data.vitals.abnormal.length > 0 && (
				<Card className="border-amber-500/30">
					<CardHeader className="pb-3">
						<div className="flex items-center gap-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
								<Activity className="h-4 w-4 text-amber-500" />
							</div>
							<div>
								<CardTitle className="text-base">Abnormal Vitals</CardTitle>
								<CardDescription className="text-xs">
									Patients with abnormal vital signs
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{data.vitals.abnormal.map((vital) => (
								<div
									key={`${vital.patientId}-${vital.parameter}`}
									className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 dark:bg-amber-500/10"
								>
									<div>
										<p className="font-medium text-sm">{vital.patientName}</p>
										<p className="text-muted-foreground text-xs">
											{vital.parameter}: {vital.value}
										</p>
									</div>
									<Badge
										variant="outline"
										className="border-amber-500/50 text-amber-600 dark:text-amber-400"
									>
										{vital.severity}
									</Badge>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Patient Alerts */}
			{data.alerts.length > 0 && (
				<Card>
					<CardHeader className="pb-3">
						<div className="flex items-center gap-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
								<AlertTriangle className="h-4 w-4 text-amber-500" />
							</div>
							<div>
								<CardTitle className="text-base">Patient Alerts</CardTitle>
								<CardDescription className="text-xs">
									{data.alerts.length} active alerts requiring attention
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{data.alerts.map((alert, index) => (
								<div
									key={`alert-${alert.patientId}-${index}`}
									className={`flex items-center justify-between rounded-lg border p-3 ${
										alert.severity === "CRITICAL"
											? "border-red-500/30 bg-red-500/5 dark:bg-red-500/10"
											: alert.severity === "HIGH"
												? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10"
												: "border-yellow-500/30 bg-yellow-500/5 dark:bg-yellow-500/10"
									}`}
								>
									<div>
										<p className="font-medium text-sm">{alert.patientName}</p>
										<p className="text-muted-foreground text-xs">
											{alert.type}: {alert.message}
										</p>
										<p className="text-muted-foreground/70 text-xs">
											{new Date(alert.createdAt).toLocaleString()}
										</p>
									</div>
									<Badge
										variant={
											alert.severity === "CRITICAL"
												? "destructive"
												: "secondary"
										}
									>
										{alert.severity}
									</Badge>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

// Pharmacist Dashboard Component
export function PharmacistDashboard() {
	const { data: dashboardData, isLoading, error } = useDashboard();

	if (isLoading) return <PharmacistDashboardSkeleton />;
	if (error || !dashboardData) return <DashboardError />;

	const data = dashboardData as PharmacistDashboardOutput;

	return (
		<div className="space-y-6 px-4 lg:px-6">
			{/* Queue Overview */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<RoleStatCard
					title="Pending Prescriptions"
					value={data.queue.pending}
					description={`${data.queue.urgent} urgent`}
					icon={<Pill className="h-5 w-5" />}
					iconBgClass="bg-primary/10 dark:bg-primary/20"
					iconColorClass="text-primary"
				/>
				<RoleStatCard
					title="In Progress"
					value={data.queue.inProgress}
					description={`${data.queue.averageWait} min avg wait`}
					icon={<Activity className="h-5 w-5" />}
					iconBgClass="bg-chart-2/10 dark:bg-chart-2/20"
					iconColorClass="text-chart-2"
				/>
				<RoleStatCard
					title="Completed Today"
					value={data.dispensing.completedToday}
					description={`${data.dispensing.totalToday} total today`}
					icon={<TrendingUp className="h-5 w-5" />}
					iconBgClass="bg-chart-3/10 dark:bg-chart-3/20"
					iconColorClass="text-chart-3"
				/>
				<RoleStatCard
					title="Out of Stock"
					value={data.inventory.outOfStock}
					description={`${data.inventory.lowStock.length} low stock items`}
					icon={<Package className="h-5 w-5" />}
					iconBgClass="bg-destructive/10 dark:bg-destructive/20"
					iconColorClass="text-destructive"
				/>
			</div>

			{/* Next Prescription */}
			{data.queue.nextPrescription && (
				<Card className="border-primary/30">
					<CardHeader className="pb-3">
						<div className="flex items-center gap-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
								<Pill className="h-4 w-4 text-primary" />
							</div>
							<div>
								<CardTitle className="text-base">Next Prescription</CardTitle>
								<CardDescription className="text-xs">
									Ready to dispense
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-between rounded-lg border bg-primary/5 p-4 dark:bg-primary/10">
							<div>
								<p className="font-medium">
									{data.queue.nextPrescription.patientName}
								</p>
								<p className="text-muted-foreground text-sm">
									Priority:{" "}
									<Badge variant="outline" className="ml-1">
										{data.queue.nextPrescription.priority}
									</Badge>
								</p>
							</div>
							<Button asChild>
								<Link
									to="/dashboard/dispensing/$id"
									params={{ id: data.queue.nextPrescription.id }}
								>
									Start Dispensing
								</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Low Stock Alerts */}
			{data.inventory.lowStock.length > 0 && (
				<Card className="border-amber-500/30">
					<CardHeader className="pb-3">
						<div className="flex items-center gap-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
								<AlertTriangle className="h-4 w-4 text-amber-500" />
							</div>
							<div>
								<CardTitle className="text-base">Low Stock Alerts</CardTitle>
								<CardDescription className="text-xs">
									{data.inventory.lowStock.length} items below reorder level
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{data.inventory.lowStock.map((item) => (
								<div
									key={item.medicineId}
									className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 dark:bg-amber-500/10"
								>
									<div>
										<p className="font-medium text-sm">{item.name}</p>
										<p className="text-muted-foreground text-xs">
											Current: {item.currentStock} | Reorder at:{" "}
											{item.reorderLevel}
										</p>
									</div>
									<Button size="sm" variant="outline" asChild>
										<Link to="/dashboard/dispensing">Reorder</Link>
									</Button>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Expiring Soon */}
			{data.inventory.expiringSoon.length > 0 && (
				<Card className="border-red-500/30">
					<CardHeader className="pb-3">
						<div className="flex items-center gap-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
								<Clock className="h-4 w-4 text-red-500" />
							</div>
							<div>
								<CardTitle className="text-base">
									Medicines Expiring Soon
								</CardTitle>
								<CardDescription className="text-xs">
									{data.inventory.expiringSoon.length} items expiring within 90
									days
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{data.inventory.expiringSoon.map((item) => (
								<div
									key={`${item.medicineId}-${item.expiryDate}`}
									className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 p-3 dark:bg-red-500/10"
								>
									<div>
										<p className="font-medium text-sm">{item.name}</p>
										<p className="text-muted-foreground text-xs">
											Expires: {new Date(item.expiryDate).toLocaleDateString()}{" "}
											| Qty: {item.quantity}
										</p>
									</div>
									<Badge variant="destructive">
										{Math.ceil(
											(new Date(item.expiryDate).getTime() - Date.now()) /
												(1000 * 60 * 60 * 24),
										)}{" "}
										days
									</Badge>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

// Receptionist Dashboard Component
export function ReceptionistDashboard() {
	const { data: dashboardData, isLoading, error } = useDashboard();

	if (isLoading) return <ReceptionistDashboardSkeleton />;
	if (error || !dashboardData) return <DashboardError />;

	const data = dashboardData as ReceptionistDashboardOutput;

	return (
		<div className="space-y-6 px-4 lg:px-6">
			{/* Today's Overview */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<RoleStatCard
					title="Registrations Today"
					value={data.registrations.today}
					description={`${data.registrations.pending} pending`}
					icon={<UserPlus className="h-5 w-5" />}
					iconBgClass="bg-primary/10 dark:bg-primary/20"
					iconColorClass="text-primary"
				/>
				<RoleStatCard
					title="Appointments"
					value={data.appointments.todayTotal}
					description={`${data.appointments.checkedIn} checked in`}
					icon={<Calendar className="h-5 w-5" />}
					iconBgClass="bg-chart-2/10 dark:bg-chart-2/20"
					iconColorClass="text-chart-2"
				/>
				<RoleStatCard
					title="Queue Status"
					value={data.queue.totalWaiting}
					description={`${data.queue.averageWait} min avg wait`}
					icon={<Users className="h-5 w-5" />}
					iconBgClass="bg-chart-3/10 dark:bg-chart-3/20"
					iconColorClass="text-chart-3"
				/>
				<RoleStatCard
					title="Check-ins"
					value={data.checkIns.completedToday}
					description={`${data.checkIns.pending.length} pending`}
					icon={<CheckCircle2 className="h-5 w-5" />}
					iconBgClass="bg-chart-4/10 dark:bg-chart-4/20"
					iconColorClass="text-chart-4"
				/>
			</div>

			{/* Pending Check-ins */}
			{data.checkIns.pending.length > 0 && (
				<Card className="border-primary/30">
					<CardHeader className="pb-3">
						<div className="flex items-center gap-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
								<Phone className="h-4 w-4 text-primary" />
							</div>
							<div>
								<CardTitle className="text-base">Pending Check-ins</CardTitle>
								<CardDescription className="text-xs">
									{data.checkIns.pending.length} patients waiting to check in
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{data.checkIns.pending.map((appointment) => (
								<div
									key={appointment.id}
									className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
								>
									<div>
										<p className="font-medium text-sm">
											{appointment.patientName}
										</p>
										<p className="text-muted-foreground text-xs">
											Scheduled:{" "}
											{new Date(appointment.scheduledTime).toLocaleTimeString(
												[],
												{
													hour: "2-digit",
													minute: "2-digit",
												},
											)}
										</p>
									</div>
									<Button size="sm" asChild>
										<Link
											to="/dashboard/appointments/$id"
											params={{ id: appointment.id }}
										>
											Check In
										</Link>
									</Button>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Upcoming Appointments */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10">
							<Calendar className="h-4 w-4 text-chart-2" />
						</div>
						<div>
							<CardTitle className="text-base">Upcoming Appointments</CardTitle>
							<CardDescription className="text-xs">
								Next scheduled appointments
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{data.appointments.upcoming.map((appointment) => (
							<div
								key={appointment.id}
								className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
							>
								<div>
									<p className="font-medium text-sm">
										{appointment.patientName}
									</p>
									<p className="text-muted-foreground text-xs">
										Dr. {appointment.doctorName} •{" "}
										{new Date(appointment.time).toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</p>
								</div>
								<Button variant="outline" size="sm" asChild>
									<Link
										to="/dashboard/appointments/$id"
										params={{ id: appointment.id }}
									>
										View Details
									</Link>
								</Button>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

// Error Component
function DashboardError() {
	return (
		<div className="px-4 lg:px-6">
			<Card>
				<CardContent className="flex h-32 flex-col items-center justify-center gap-2">
					<AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
					<p className="text-muted-foreground">Failed to load dashboard data</p>
				</CardContent>
			</Card>
		</div>
	);
}

// Skeleton Components
function StatCardSkeleton() {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-9 w-9 rounded-lg" />
			</CardHeader>
			<CardContent>
				<Skeleton className="h-7 w-16" />
				<Skeleton className="mt-2 h-3 w-28" />
			</CardContent>
		</Card>
	);
}

function DoctorDashboardSkeleton() {
	return (
		<div className="space-y-6 px-4 lg:px-6">
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{[1, 2, 3, 4].map((key) => (
					<StatCardSkeleton key={key} />
				))}
			</div>
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center gap-2">
						<Skeleton className="h-8 w-8 rounded-lg" />
						<div>
							<Skeleton className="h-5 w-24" />
							<Skeleton className="mt-1 h-3 w-32" />
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-24 w-full rounded-lg" />
				</CardContent>
			</Card>
		</div>
	);
}

function NurseDashboardSkeleton() {
	return <DoctorDashboardSkeleton />;
}

function PharmacistDashboardSkeleton() {
	return <DoctorDashboardSkeleton />;
}

function ReceptionistDashboardSkeleton() {
	return <DoctorDashboardSkeleton />;
}
