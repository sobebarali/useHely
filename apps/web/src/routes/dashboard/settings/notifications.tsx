import { createFileRoute, redirect } from "@tanstack/react-router";
import { Bell, Mail, MessageSquare, Smartphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/settings/notifications")({
	component: NotificationSettingsPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

interface NotificationSetting {
	id: string;
	label: string;
	description: string;
	enabled: boolean;
}

interface NotificationCategory {
	id: string;
	name: string;
	icon: React.ReactNode;
	settings: NotificationSetting[];
}

function NotificationSettingsPage() {
	// In a real app, these would be loaded from an API
	const [categories, setCategories] = useState<NotificationCategory[]>([
		{
			id: "appointments",
			name: "Appointments",
			icon: <Bell className="h-5 w-5 text-primary" />,
			settings: [
				{
					id: "appointment_reminder",
					label: "Appointment Reminders",
					description: "Receive reminders before scheduled appointments",
					enabled: true,
				},
				{
					id: "appointment_created",
					label: "New Appointments",
					description: "Get notified when a new appointment is scheduled",
					enabled: true,
				},
				{
					id: "appointment_cancelled",
					label: "Appointment Cancellations",
					description: "Get notified when an appointment is cancelled",
					enabled: true,
				},
				{
					id: "appointment_rescheduled",
					label: "Appointment Reschedules",
					description: "Get notified when an appointment is rescheduled",
					enabled: false,
				},
			],
		},
		{
			id: "patients",
			name: "Patients",
			icon: <MessageSquare className="h-5 w-5 text-primary" />,
			settings: [
				{
					id: "patient_registered",
					label: "New Patient Registration",
					description: "Get notified when a new patient is registered",
					enabled: true,
				},
				{
					id: "patient_vitals_critical",
					label: "Critical Vitals Alert",
					description:
						"Get notified when a patient's vitals are in critical range",
					enabled: true,
				},
				{
					id: "patient_admission",
					label: "Patient Admissions",
					description: "Get notified when a patient is admitted",
					enabled: false,
				},
			],
		},
		{
			id: "inventory",
			name: "Inventory & Pharmacy",
			icon: <Smartphone className="h-5 w-5 text-primary" />,
			settings: [
				{
					id: "low_stock_alert",
					label: "Low Stock Alerts",
					description: "Get notified when medicine stock is running low",
					enabled: true,
				},
				{
					id: "expiry_alert",
					label: "Expiry Alerts",
					description: "Get notified when medicines are nearing expiry date",
					enabled: true,
				},
				{
					id: "prescription_filled",
					label: "Prescription Filled",
					description: "Get notified when a prescription is filled",
					enabled: false,
				},
			],
		},
		{
			id: "system",
			name: "System & Security",
			icon: <Mail className="h-5 w-5 text-primary" />,
			settings: [
				{
					id: "login_alert",
					label: "New Login Alerts",
					description:
						"Get notified when your account is accessed from a new device",
					enabled: true,
				},
				{
					id: "password_changed",
					label: "Password Changes",
					description: "Get notified when your password is changed",
					enabled: true,
				},
				{
					id: "report_ready",
					label: "Report Generation Complete",
					description: "Get notified when a requested report is ready",
					enabled: true,
				},
				{
					id: "system_updates",
					label: "System Updates",
					description: "Get notified about system maintenance and updates",
					enabled: false,
				},
			],
		},
	]);

	// Email preferences state
	const [emailPreferences, setEmailPreferences] = useState({
		dailyDigest: false,
		immediateEmails: true,
		productUpdates: false,
	});

	const [isSaving, setIsSaving] = useState(false);

	const handleToggle = (categoryId: string, settingId: string) => {
		setCategories((prev) =>
			prev.map((category) => {
				if (category.id === categoryId) {
					return {
						...category,
						settings: category.settings.map((setting) => {
							if (setting.id === settingId) {
								return { ...setting, enabled: !setting.enabled };
							}
							return setting;
						}),
					};
				}
				return category;
			}),
		);
	};

	const handleSavePreferences = async () => {
		setIsSaving(true);
		try {
			// In a real app, this would call an API to save preferences
			await new Promise((resolve) => setTimeout(resolve, 1000));
			toast.success("Notification preferences saved successfully");
		} catch (error) {
			toast.error("Failed to save notification preferences");
		} finally {
			setIsSaving(false);
		}
	};

	const enabledCount = categories.reduce(
		(acc, cat) => acc + cat.settings.filter((s) => s.enabled).length,
		0,
	);
	const totalCount = categories.reduce(
		(acc, cat) => acc + cat.settings.length,
		0,
	);

	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl">Notification Settings</h1>
					<p className="text-muted-foreground">
						Manage how you receive notifications and alerts
					</p>
				</div>
				<Button onClick={handleSavePreferences} disabled={isSaving}>
					{isSaving ? "Saving..." : "Save Preferences"}
				</Button>
			</div>

			{/* Summary Card */}
			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
							<Bell className="h-5 w-5 text-primary" />
						</div>
						<div>
							<CardTitle>Notification Overview</CardTitle>
							<CardDescription>
								{enabledCount} of {totalCount} notification types enabled
							</CardDescription>
						</div>
					</div>
				</CardHeader>
			</Card>

			{/* Notification Categories */}
			{categories.map((category) => (
				<Card key={category.id}>
					<CardHeader>
						<div className="flex items-center gap-2">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
								{category.icon}
							</div>
							<div>
								<CardTitle>{category.name}</CardTitle>
								<CardDescription>
									{category.settings.filter((s) => s.enabled).length} of{" "}
									{category.settings.length} enabled
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{category.settings.map((setting, index) => (
								<div key={setting.id}>
									{index > 0 && <Separator className="mb-4" />}
									<div className="flex items-center justify-between">
										<div className="space-y-0.5">
											<Label
												htmlFor={setting.id}
												className="font-medium text-base"
											>
												{setting.label}
											</Label>
											<p className="text-muted-foreground text-sm">
												{setting.description}
											</p>
										</div>
										<Switch
											id={setting.id}
											checked={setting.enabled}
											onCheckedChange={() =>
												handleToggle(category.id, setting.id)
											}
										/>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			))}

			{/* Email Preferences */}
			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
							<Mail className="h-5 w-5 text-primary" />
						</div>
						<div>
							<CardTitle>Email Preferences</CardTitle>
							<CardDescription>
								Configure how you receive email notifications
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label htmlFor="email_digest" className="font-medium text-base">
									Daily Digest
								</Label>
								<p className="text-muted-foreground text-sm">
									Receive a daily summary of all notifications
								</p>
							</div>
							<Switch
								id="email_digest"
								checked={emailPreferences.dailyDigest}
								onCheckedChange={(checked) =>
									setEmailPreferences((prev) => ({
										...prev,
										dailyDigest: checked,
									}))
								}
							/>
						</div>
						<Separator />
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label
									htmlFor="email_immediate"
									className="font-medium text-base"
								>
									Immediate Emails
								</Label>
								<p className="text-muted-foreground text-sm">
									Receive emails immediately for critical alerts
								</p>
							</div>
							<Switch
								id="email_immediate"
								checked={emailPreferences.immediateEmails}
								onCheckedChange={(checked) =>
									setEmailPreferences((prev) => ({
										...prev,
										immediateEmails: checked,
									}))
								}
							/>
						</div>
						<Separator />
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label
									htmlFor="email_marketing"
									className="font-medium text-base"
								>
									Product Updates
								</Label>
								<p className="text-muted-foreground text-sm">
									Receive updates about new features and improvements
								</p>
							</div>
							<Switch
								id="email_marketing"
								checked={emailPreferences.productUpdates}
								onCheckedChange={(checked) =>
									setEmailPreferences((prev) => ({
										...prev,
										productUpdates: checked,
									}))
								}
							/>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
