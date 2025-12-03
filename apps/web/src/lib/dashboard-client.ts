/**
 * Dashboard Client
 *
 * Interfaces with dashboard API endpoints
 */

import { authenticatedRequest } from "./api-client";

// Dashboard types from server validation
export type HospitalAdminDashboardOutput = {
	overview: {
		totalPatients: number;
		activePatients: number;
		opdToday: number;
		ipdCurrent: number;
		appointmentsToday: number;
		prescriptionsToday: number;
	};
	patients: {
		newThisWeek: number;
		newThisMonth: number;
		byType: { opd: number; ipd: number };
		byDepartment: { departmentId: string; name: string; count: number }[];
		trend: { date: string; count: number }[];
	};
	appointments: {
		today: number;
		completed: number;
		pending: number;
		cancelled: number;
		noShow: number;
		byDepartment: { departmentId: string; name: string; count: number }[];
		trend: { date: string; count: number }[];
	};
	staff: {
		totalActive: number;
		byRole: { role: string; count: number }[];
		onDutyToday: number;
	};
	alerts: {
		type: string;
		severity: "INFO" | "WARNING" | "CRITICAL";
		message: string;
		createdAt: string;
	}[];
};

export type DoctorDashboardOutput = {
	today: {
		totalAppointments: number;
		completed: number;
		remaining: number;
		currentPatient: {
			id: string;
			name: string;
			patientId: string;
		} | null;
		nextPatient: { id: string; name: string; patientId: string } | null;
	};
	appointments: {
		upcoming: { id: string; patientName: string; time: string; type: string }[];
		todaySchedule: {
			id: string;
			patientName: string;
			time: string;
			status: string;
		}[];
		pendingFollowUps: number;
	};
	patients: {
		totalAssigned: number;
		seenToday: number;
		recentPatients: { id: string; name: string; lastVisit: string }[];
	};
	prescriptions: {
		issuedToday: number;
		pendingDispensing: number;
	};
	queue: {
		current: { queueNumber: number; patientName: string; status: string }[];
		waiting: number;
		averageWait: number;
	};
};

export type NurseDashboardOutput = {
	ward: {
		name: string;
		totalBeds: number;
		occupiedBeds: number;
		availableBeds: number;
	};
	patients: {
		assigned: number;
		critical: number;
		needsAttention: {
			patientId: string;
			patientName: string;
			reason: string;
		}[];
	};
	vitals: {
		pendingRecording: number;
		recordedToday: number;
		abnormal: {
			patientId: string;
			patientName: string;
			parameter: string;
			value: number;
			severity: string;
		}[];
	};
	tasks: {
		medicationDue: { patientId: string; medication: string; dueAt: string }[];
		vitalsDue: { patientId: string; patientName: string; dueAt: string }[];
		pending: number;
	};
	alerts: {
		patientId: string;
		patientName: string;
		type: string;
		message: string;
		severity: string;
		createdAt: string;
	}[];
};

export type PharmacistDashboardOutput = {
	queue: {
		pending: number;
		urgent: number;
		inProgress: number;
		averageWait: number;
		nextPrescription: {
			id: string;
			patientName: string;
			priority: string;
		} | null;
	};
	dispensing: {
		completedToday: number;
		totalToday: number;
		byHour: { hour: number; count: number }[];
	};
	inventory: {
		lowStock: {
			medicineId: string;
			name: string;
			currentStock: number;
			reorderLevel: number;
		}[];
		expiringSoon: {
			medicineId: string;
			name: string;
			expiryDate: string;
			quantity: number;
		}[];
		outOfStock: number;
	};
	statistics: {
		averageProcessingTime: number;
		prescriptionsHandled: number;
	};
};

export type ReceptionistDashboardOutput = {
	registrations: {
		today: number;
		pending: number;
		recentRegistrations: { id: string; name: string; registeredAt: string }[];
	};
	appointments: {
		todayTotal: number;
		scheduled: number;
		checkedIn: number;
		completed: number;
		cancelled: number;
		upcoming: {
			id: string;
			patientName: string;
			doctorName: string;
			time: string;
		}[];
	};
	queue: {
		byDoctor: { doctorId: string; name: string; waiting: number }[];
		totalWaiting: number;
		averageWait: number;
	};
	checkIns: {
		completedToday: number;
		pending: { id: string; patientName: string; scheduledTime: string }[];
	};
};

export type GetDashboardOutput =
	| HospitalAdminDashboardOutput
	| DoctorDashboardOutput
	| NurseDashboardOutput
	| PharmacistDashboardOutput
	| ReceptionistDashboardOutput;

// Quick stats - matches server GetQuickStatsOutput
export type QuickStatsOutput = {
	notifications: number;
	pendingTasks: number;
	alerts: number;
};

export type WidgetDataOutput = {
	widgetId: string;
	data: unknown;
	updatedAt: string;
};

export type RefreshResponse = {
	success: boolean;
	message: string;
	refreshedAt: string;
};

// Dashboard API functions
export async function getDashboard(): Promise<GetDashboardOutput> {
	return authenticatedRequest<GetDashboardOutput>("/api/dashboard");
}

export async function getQuickStats(): Promise<QuickStatsOutput> {
	return authenticatedRequest<QuickStatsOutput>("/api/dashboard/quick-stats");
}

export async function getWidget(widgetId: string): Promise<WidgetDataOutput> {
	return authenticatedRequest<WidgetDataOutput>(
		`/api/dashboard/widgets/${widgetId}`,
	);
}

export async function refreshDashboard(): Promise<RefreshResponse> {
	return authenticatedRequest<RefreshResponse>("/api/dashboard/refresh", {
		method: "POST",
	});
}

// Dashboard client object
export const dashboardClient = {
	getDashboard,
	getQuickStats,
	getWidget,
	refreshDashboard,
};

export default dashboardClient;
