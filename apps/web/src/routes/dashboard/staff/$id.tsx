import { useForm } from "@tanstack/react-form";
import {
	createFileRoute,
	redirect,
	useNavigate,
	useParams,
} from "@tanstack/react-router";
import {
	ArrowLeft,
	KeyRound,
	Loader2,
	Save,
	UserCog,
	UserMinus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
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
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/hooks/use-auth";
import {
	useDeactivateUser,
	useForcePasswordChange,
	useUpdateUser,
	useUser,
} from "@/hooks/use-users";
import { authClient } from "@/lib/auth-client";
import type { ApiError } from "@/lib/users-client";

export const Route = createFileRoute("/dashboard/staff/$id")({
	component: StaffDetailPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function StaffDetailPage() {
	const navigate = useNavigate();
	const { id } = useParams({ from: "/dashboard/staff/$id" });
	const { data: session, isLoading: sessionLoading } = useSession();
	const { data: staffMember, isLoading: staffLoading } = useUser(id);

	const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
	const [forcePasswordDialogOpen, setForcePasswordDialogOpen] = useState(false);

	const updateUserMutation = useUpdateUser();
	const deactivateMutation = useDeactivateUser();
	const forcePasswordMutation = useForcePasswordChange();

	const form = useForm({
		defaultValues: {
			firstName: staffMember?.firstName || "",
			lastName: staffMember?.lastName || "",
			phone: staffMember?.phone || "",
			department: staffMember?.department || "",
			specialization: staffMember?.specialization || "",
			shift: staffMember?.shift || "",
		},
		onSubmit: async ({ value }) => {
			try {
				await updateUserMutation.mutateAsync({
					id,
					data: {
						firstName: value.firstName,
						lastName: value.lastName,
						phone: value.phone,
						department: value.department,
						specialization: value.specialization || undefined,
						shift: value.shift as "MORNING" | "EVENING" | "NIGHT" | undefined,
					},
				});
				toast.success("Staff member updated successfully");
			} catch (error) {
				const apiError = error as ApiError;
				toast.error(apiError.message || "Failed to update staff member");
			}
		},
		validators: {
			onSubmit: z.object({
				firstName: z.string().min(1, "First name is required").max(50),
				lastName: z.string().min(1, "Last name is required").max(50),
				phone: z.string().min(1, "Phone number is required"),
				department: z.string().min(1, "Department is required"),
				specialization: z.string(),
				shift: z.string(),
			}),
		},
	});

	// Update form when staff data loads
	if (staffMember && !form.state.values.firstName && staffMember.firstName) {
		form.reset({
			firstName: staffMember.firstName,
			lastName: staffMember.lastName,
			phone: staffMember.phone,
			department: staffMember.department,
			specialization: staffMember.specialization || "",
			shift: staffMember.shift || "",
		});
	}

	const handleDeactivate = async () => {
		try {
			await deactivateMutation.mutateAsync(id);
			toast.success("User deactivated successfully");
			setDeactivateDialogOpen(false);
			navigate({ to: "/dashboard/staff" });
		} catch (error) {
			const apiError = error as ApiError;
			toast.error(apiError.message || "Failed to deactivate user");
		}
	};

	const handleForcePasswordChange = async () => {
		try {
			await forcePasswordMutation.mutateAsync(id);
			toast.success("Password change required on next login");
			setForcePasswordDialogOpen(false);
		} catch (error) {
			const apiError = error as ApiError;
			toast.error(apiError.message || "Failed to force password change");
		}
	};

	if (sessionLoading || staffLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	if (!session) return null;

	if (!staffMember) {
		return (
			<DashboardLayout
				user={{
					name:
						`${session.firstName} ${session.lastName}`.trim() ||
						session.username,
					email: session.email,
				}}
				hospital={{
					name: session.hospital?.name || "Unknown Hospital",
					plan: "Pro",
				}}
				pageTitle="Staff Details"
			>
				<div className="flex flex-col items-center justify-center gap-4 p-8">
					<h2 className="font-semibold text-xl">Staff member not found</h2>
					<Button onClick={() => navigate({ to: "/dashboard/staff" })}>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Staff List
					</Button>
				</div>
			</DashboardLayout>
		);
	}

	const user = {
		name: `${session.firstName} ${session.lastName}`.trim() || session.username,
		email: session.email,
		image: undefined,
	};

	const hospital = {
		name: session.hospital?.name || "Unknown Hospital",
		plan: "Pro",
	};

	const statusVariant =
		staffMember.status === "ACTIVE"
			? "default"
			: staffMember.status === "PASSWORD_EXPIRED"
				? "secondary"
				: "destructive";

	return (
		<DashboardLayout user={user} hospital={hospital} pageTitle="Staff Details">
			<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
				{/* Header */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-4">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => navigate({ to: "/dashboard/staff" })}
						>
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<div>
							<div className="flex items-center gap-2">
								<h1 className="font-bold text-2xl">
									{staffMember.firstName} {staffMember.lastName}
								</h1>
								<Badge variant={statusVariant}>{staffMember.status}</Badge>
							</div>
							<p className="text-muted-foreground">@{staffMember.username}</p>
						</div>
					</div>
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={() => setForcePasswordDialogOpen(true)}
						>
							<KeyRound className="mr-2 h-4 w-4" />
							Force Password Change
						</Button>
						{staffMember.status === "ACTIVE" && (
							<Button
								variant="destructive"
								onClick={() => setDeactivateDialogOpen(true)}
							>
								<UserMinus className="mr-2 h-4 w-4" />
								Deactivate
							</Button>
						)}
					</div>
				</div>

				<div className="grid gap-6 lg:grid-cols-3">
					{/* Staff Info Card */}
					<Card className="lg:col-span-2">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<UserCog className="h-5 w-5" />
								Staff Information
							</CardTitle>
							<CardDescription>Update staff member details</CardDescription>
						</CardHeader>
						<CardContent>
							<form
								onSubmit={(e) => {
									e.preventDefault();
									e.stopPropagation();
									form.handleSubmit();
								}}
								className="space-y-6"
							>
								{/* Name Fields */}
								<div className="grid gap-4 sm:grid-cols-2">
									<form.Field name="firstName">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor={field.name}>First Name</Label>
												<Input
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
												/>
												{field.state.meta.errors.map((error) => (
													<p
														key={error?.message}
														className="text-red-500 text-sm"
													>
														{error?.message}
													</p>
												))}
											</div>
										)}
									</form.Field>

									<form.Field name="lastName">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor={field.name}>Last Name</Label>
												<Input
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
												/>
												{field.state.meta.errors.map((error) => (
													<p
														key={error?.message}
														className="text-red-500 text-sm"
													>
														{error?.message}
													</p>
												))}
											</div>
										)}
									</form.Field>
								</div>

								{/* Contact & Department */}
								<div className="grid gap-4 sm:grid-cols-2">
									<form.Field name="phone">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor={field.name}>Phone</Label>
												<Input
													id={field.name}
													name={field.name}
													type="tel"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
												/>
												{field.state.meta.errors.map((error) => (
													<p
														key={error?.message}
														className="text-red-500 text-sm"
													>
														{error?.message}
													</p>
												))}
											</div>
										)}
									</form.Field>

									<form.Field name="department">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor={field.name}>Department</Label>
												<Select
													value={field.state.value}
													onValueChange={field.handleChange}
												>
													<SelectTrigger id={field.name}>
														<SelectValue placeholder="Select department" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="emergency">Emergency</SelectItem>
														<SelectItem value="cardiology">
															Cardiology
														</SelectItem>
														<SelectItem value="neurology">Neurology</SelectItem>
														<SelectItem value="orthopedics">
															Orthopedics
														</SelectItem>
														<SelectItem value="pediatrics">
															Pediatrics
														</SelectItem>
														<SelectItem value="oncology">Oncology</SelectItem>
														<SelectItem value="radiology">Radiology</SelectItem>
														<SelectItem value="pharmacy">Pharmacy</SelectItem>
														<SelectItem value="administration">
															Administration
														</SelectItem>
													</SelectContent>
												</Select>
												{field.state.meta.errors.map((error) => (
													<p
														key={error?.message}
														className="text-red-500 text-sm"
													>
														{error?.message}
													</p>
												))}
											</div>
										)}
									</form.Field>
								</div>

								{/* Optional Fields */}
								<div className="grid gap-4 sm:grid-cols-2">
									<form.Field name="specialization">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor={field.name}>Specialization</Label>
												<Input
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													placeholder="e.g., Cardiac Surgery"
												/>
											</div>
										)}
									</form.Field>

									<form.Field name="shift">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor={field.name}>Shift</Label>
												<Select
													value={field.state.value}
													onValueChange={field.handleChange}
												>
													<SelectTrigger id={field.name}>
														<SelectValue placeholder="Select shift" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="MORNING">Morning</SelectItem>
														<SelectItem value="EVENING">Evening</SelectItem>
														<SelectItem value="NIGHT">Night</SelectItem>
													</SelectContent>
												</Select>
											</div>
										)}
									</form.Field>
								</div>

								{/* Submit */}
								<div className="flex justify-end">
									<form.Subscribe>
										{(state) => (
											<Button
												type="submit"
												disabled={
													!state.canSubmit ||
													state.isSubmitting ||
													updateUserMutation.isPending
												}
											>
												{state.isSubmitting || updateUserMutation.isPending ? (
													<>
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
														Saving...
													</>
												) : (
													<>
														<Save className="mr-2 h-4 w-4" />
														Save Changes
													</>
												)}
											</Button>
										)}
									</form.Subscribe>
								</div>
							</form>
						</CardContent>
					</Card>

					{/* Account Info Card */}
					<Card>
						<CardHeader>
							<CardTitle>Account Details</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<Label className="text-muted-foreground text-xs">Email</Label>
								<p className="font-medium">{staffMember.email}</p>
							</div>
							<Separator />
							<div>
								<Label className="text-muted-foreground text-xs">
									Username
								</Label>
								<p className="font-medium">{staffMember.username}</p>
							</div>
							<Separator />
							<div>
								<Label className="text-muted-foreground text-xs">Roles</Label>
								<div className="mt-1 flex flex-wrap gap-1">
									{staffMember.roles.map((role) => (
										<Badge key={role.id} variant="secondary">
											{role.name}
										</Badge>
									))}
								</div>
							</div>
							<Separator />
							<div>
								<Label className="text-muted-foreground text-xs">
									Last Login
								</Label>
								<p className="font-medium">
									{staffMember.lastLogin
										? new Date(staffMember.lastLogin).toLocaleString()
										: "Never"}
								</p>
							</div>
							<Separator />
							<div>
								<Label className="text-muted-foreground text-xs">
									Created At
								</Label>
								<p className="font-medium">
									{new Date(staffMember.createdAt).toLocaleDateString()}
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Deactivate Dialog */}
			<AlertDialog
				open={deactivateDialogOpen}
				onOpenChange={setDeactivateDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Deactivate Staff Member</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to deactivate{" "}
							<span className="font-medium">
								{staffMember.firstName} {staffMember.lastName}
							</span>
							? They will no longer be able to access the system.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeactivate}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							disabled={deactivateMutation.isPending}
						>
							{deactivateMutation.isPending ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							Deactivate
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Force Password Change Dialog */}
			<AlertDialog
				open={forcePasswordDialogOpen}
				onOpenChange={setForcePasswordDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Force Password Change</AlertDialogTitle>
						<AlertDialogDescription>
							<span className="font-medium">
								{staffMember.firstName} {staffMember.lastName}
							</span>{" "}
							will be required to change their password on their next login.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleForcePasswordChange}
							disabled={forcePasswordMutation.isPending}
						>
							{forcePasswordMutation.isPending ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							Confirm
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</DashboardLayout>
	);
}
