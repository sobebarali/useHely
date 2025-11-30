import { useForm } from "@tanstack/react-form";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { KeyRound, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import z from "zod";
import MfaSettingsCard from "@/components/mfa-settings-card";
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
import { Separator } from "@/components/ui/separator";
import { useChangePassword } from "@/hooks/use-users";
import { authClient } from "@/lib/auth-client";
import type { ApiError } from "@/lib/users-client";

export const Route = createFileRoute("/dashboard/settings/security")({
	component: SecuritySettingsPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function SecuritySettingsPage() {
	const changePasswordMutation = useChangePassword();

	const form = useForm({
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		},
		onSubmit: async ({ value }) => {
			try {
				await changePasswordMutation.mutateAsync({
					currentPassword: value.currentPassword,
					newPassword: value.newPassword,
					confirmPassword: value.confirmPassword,
				});
				toast.success("Password changed successfully");
				form.reset();
			} catch (error) {
				const apiError = error as ApiError;
				toast.error(apiError.message || "Failed to change password");
			}
		},
		validators: {
			onSubmit: z
				.object({
					currentPassword: z.string().min(1, "Current password is required"),
					newPassword: z
						.string()
						.min(8, "Password must be at least 8 characters")
						.regex(
							/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
							"Password must contain uppercase, lowercase, number, and special character",
						),
					confirmPassword: z.string().min(1, "Please confirm your password"),
				})
				.refine((data) => data.newPassword === data.confirmPassword, {
					message: "Passwords do not match",
					path: ["confirmPassword"],
				})
				.refine((data) => data.currentPassword !== data.newPassword, {
					message: "New password must be different from current password",
					path: ["newPassword"],
				}),
		},
	});

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-semibold text-2xl tracking-tight">Security</h2>
				<p className="text-muted-foreground">
					Manage your account security settings
				</p>
			</div>

			<Separator />

			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
							<KeyRound className="h-5 w-5 text-primary" />
						</div>
						<div>
							<CardTitle>Change Password</CardTitle>
							<CardDescription>
								Update your password to keep your account secure
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="space-y-4"
					>
						<form.Field name="currentPassword">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>Current Password</Label>
									<Input
										id={field.name}
										name={field.name}
										type="password"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="Enter your current password"
									/>
									{field.state.meta.errors.map((error) => (
										<p
											key={error?.message}
											className="text-destructive text-sm"
										>
											{error?.message}
										</p>
									))}
								</div>
							)}
						</form.Field>

						<form.Field name="newPassword">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>New Password</Label>
									<Input
										id={field.name}
										name={field.name}
										type="password"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="Enter new password"
									/>
									{field.state.meta.errors.map((error) => (
										<p
											key={error?.message}
											className="text-destructive text-sm"
										>
											{error?.message}
										</p>
									))}
								</div>
							)}
						</form.Field>

						<form.Field name="confirmPassword">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>Confirm New Password</Label>
									<Input
										id={field.name}
										name={field.name}
										type="password"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="Confirm new password"
									/>
									{field.state.meta.errors.map((error) => (
										<p
											key={error?.message}
											className="text-destructive text-sm"
										>
											{error?.message}
										</p>
									))}
								</div>
							)}
						</form.Field>

						<div className="rounded-lg border bg-muted/50 p-3">
							<div className="flex items-center gap-2">
								<Shield className="h-4 w-4 text-muted-foreground" />
								<p className="font-medium text-sm">Password requirements:</p>
							</div>
							<ul className="mt-2 ml-6 list-disc space-y-1 text-muted-foreground text-xs">
								<li>At least 8 characters</li>
								<li>At least one uppercase letter</li>
								<li>At least one lowercase letter</li>
								<li>At least one number</li>
								<li>At least one special character (@$!%*?&)</li>
							</ul>
						</div>

						<form.Subscribe>
							{(state) => (
								<Button
									type="submit"
									disabled={
										!state.canSubmit ||
										state.isSubmitting ||
										changePasswordMutation.isPending
									}
								>
									{state.isSubmitting || changePasswordMutation.isPending ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Changing password...
										</>
									) : (
										"Change Password"
									)}
								</Button>
							)}
						</form.Subscribe>
					</form>
				</CardContent>
			</Card>

			{/* Two-Factor Authentication */}
			<MfaSettingsCard />
		</div>
	);
}
