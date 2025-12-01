/**
 * Dashboard Hook
 *
 * Provides reactive dashboard data fetching and state management
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type DoctorDashboardOutput,
	dashboardClient,
	type GetDashboardOutput,
	type HospitalAdminDashboardOutput,
	type NurseDashboardOutput,
	type PharmacistDashboardOutput,
	type ReceptionistDashboardOutput,
} from "@/lib/dashboard-client";

// Dashboard query keys
export const dashboardKeys = {
	all: ["dashboard"] as const,
	main: () => [...dashboardKeys.all, "main"] as const,
	quickStats: () => [...dashboardKeys.all, "quickStats"] as const,
	widget: (widgetId: string) =>
		[...dashboardKeys.all, "widget", widgetId] as const,
};

// Hook for fetching main dashboard data
export function useDashboard() {
	return useQuery({
		queryKey: dashboardKeys.main(),
		queryFn: dashboardClient.getDashboard,
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 3,
	});
}

// Hook for fetching quick stats
export function useQuickStats() {
	return useQuery({
		queryKey: dashboardKeys.quickStats(),
		queryFn: dashboardClient.getQuickStats,
		staleTime: 2 * 60 * 1000, // 2 minutes
		retry: 3,
	});
}

// Hook for fetching widget data
export function useWidget(widgetId: string) {
	return useQuery({
		queryKey: dashboardKeys.widget(widgetId),
		queryFn: () => dashboardClient.getWidget(widgetId),
		enabled: !!widgetId,
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 3,
	});
}

// Hook for refreshing dashboard data
export function useRefreshDashboard() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: dashboardClient.refreshDashboard,
		onSuccess: () => {
			// Invalidate all dashboard queries to trigger refetch
			queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
		},
	});
}

// Helper hook to determine dashboard type based on data
export function useDashboardType() {
	const { data: dashboardData } = useDashboard();

	if (!dashboardData) return null;

	// Type guard functions
	const isHospitalAdmin = (
		data: GetDashboardOutput,
	): data is HospitalAdminDashboardOutput =>
		"overview" in data && "totalPatients" in data.overview;

	const isDoctor = (data: GetDashboardOutput): data is DoctorDashboardOutput =>
		"today" in data && "totalAppointments" in data.today;

	const isNurse = (data: GetDashboardOutput): data is NurseDashboardOutput =>
		"ward" in data && "totalBeds" in data.ward;

	const isPharmacist = (
		data: GetDashboardOutput,
	): data is PharmacistDashboardOutput =>
		"queue" in data && "pending" in data.queue && "dispensing" in data;

	const isReceptionist = (
		data: GetDashboardOutput,
	): data is ReceptionistDashboardOutput =>
		"registrations" in data && "today" in data.registrations;

	if (isHospitalAdmin(dashboardData)) return "hospital_admin";
	if (isDoctor(dashboardData)) return "doctor";
	if (isNurse(dashboardData)) return "nurse";
	if (isPharmacist(dashboardData)) return "pharmacist";
	if (isReceptionist(dashboardData)) return "receptionist";

	return null;
}

// Hook for getting dashboard stats for SectionCards
export function useDashboardStats() {
	const { data: dashboardData, isLoading, error } = useDashboard();

	if (isLoading || error || !dashboardData) {
		return {
			stats: {
				totalPatients: 0,
				appointmentsToday: 0,
				opdQueue: 0,
				activeStaff: 0,
			},
			isLoading,
			error,
		};
	}

	// Extract stats based on dashboard type
	const getStats = () => {
		// Hospital Admin
		if ("overview" in dashboardData) {
			const data = dashboardData as HospitalAdminDashboardOutput;
			return {
				totalPatients: data.overview.totalPatients || 0,
				appointmentsToday: data.overview.appointmentsToday || 0,
				opdQueue: data.overview.opdToday || 0,
				activeStaff: data.staff?.totalActive || 0,
			};
		}

		// Doctor
		if (
			"today" in dashboardData &&
			"totalAppointments" in dashboardData.today
		) {
			const data = dashboardData as DoctorDashboardOutput;
			return {
				totalPatients: data.patients?.totalAssigned || 0,
				appointmentsToday: data.today.totalAppointments || 0,
				opdQueue: data.today.remaining || 0,
				activeStaff: 1, // Doctor themselves
			};
		}

		// Nurse
		if ("ward" in dashboardData) {
			const data = dashboardData as NurseDashboardOutput;
			return {
				totalPatients: data.patients?.assigned || 0,
				appointmentsToday: 0,
				opdQueue: data.patients?.critical || 0,
				activeStaff: 1, // Nurse themselves
			};
		}

		// Pharmacist
		if ("queue" in dashboardData && "dispensing" in dashboardData) {
			const data = dashboardData as PharmacistDashboardOutput;
			return {
				totalPatients: 0,
				appointmentsToday: data.queue.pending || 0,
				opdQueue: data.queue.urgent || 0,
				activeStaff: 1, // Pharmacist themselves
			};
		}

		// Receptionist
		if ("registrations" in dashboardData) {
			const data = dashboardData as ReceptionistDashboardOutput;
			return {
				totalPatients: data.registrations.today || 0,
				appointmentsToday: data.appointments?.todayTotal || 0,
				opdQueue: data.queue?.totalWaiting || 0,
				activeStaff: 1, // Receptionist themselves
			};
		}

		// Fallback - quick stats don't contain these values anymore
		// They only contain notifications, pendingTasks, and alerts

		// Default fallback
		return {
			totalPatients: 0,
			appointmentsToday: 0,
			opdQueue: 0,
			activeStaff: 0,
		};
	};

	return {
		stats: getStats(),
		isLoading,
		error,
	};
}

// Hook for getting trend data for charts
export function useDashboardTrends() {
	const { data: dashboardData, isLoading, error } = useDashboard();

	if (isLoading || error || !dashboardData) {
		return {
			trends: {
				patientTrend: [],
				appointmentTrend: [],
			},
			isLoading,
			error,
		};
	}

	// Extract trend data based on dashboard type
	const getTrends = () => {
		// Hospital Admin has trend data
		if ("patients" in dashboardData && "trend" in dashboardData.patients) {
			const data = dashboardData as HospitalAdminDashboardOutput;
			return {
				patientTrend: data.patients.trend || [],
				appointmentTrend: data.appointments?.trend || [],
			};
		}

		// Other roles might have different trend structures
		// For now, return empty arrays for non-admin roles
		return {
			patientTrend: [],
			appointmentTrend: [],
		};
	};

	return {
		trends: getTrends(),
		isLoading,
		error,
	};
}
