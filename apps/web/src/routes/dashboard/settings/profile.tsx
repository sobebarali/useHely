import { useForm } from "@tanstack/react-form";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	Building2,
	Edit,
	Loader2,
	Mail,
	MapPin,
	Phone,
	Save,
	X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/use-auth";
import {
	type HospitalDetails,
	useHospital,
	useUpdateHospital,
} from "@/hooks/use-hospital";
import { type AuthError, authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/settings/profile")({
	component: HospitalProfilePage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function HospitalProfilePage() {
	const { data: session } = useSession();
	const hospitalId = session?.hospital?.id;
	const { data: hospital, isLoading, error } = useHospital(hospitalId);
	const [isEditing, setIsEditing] = useState(false);

	if (isLoading) {
		return <HospitalProfileSkeleton />;
	}

	if (error || !hospital) {
		return (
			<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
				<div className="py-12 text-center">
					<Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
					<h3 className="mt-4 font-semibold text-lg">Hospital Not Found</h3>
					<p className="text-muted-foreground text-sm">
						Unable to load hospital information. Please try again later.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-bold text-2xl">Hospital Profile</h1>
					<p className="text-muted-foreground">
						View and manage your hospital information
					</p>
				</div>
				{!isEditing && (
					<Button onClick={() => setIsEditing(true)}>
						<Edit className="mr-2 h-4 w-4" />
						Edit Profile
					</Button>
				)}
			</div>

			{isEditing ? (
				<HospitalEditForm
					hospital={hospital}
					onCancel={() => setIsEditing(false)}
					onSuccess={() => setIsEditing(false)}
				/>
			) : (
				<HospitalDetailsView hospital={hospital} />
			)}
		</div>
	);
}

function HospitalDetailsView({ hospital }: { hospital: HospitalDetails }) {
	const statusVariant = getStatusVariant(hospital.status);

	return (
		<div className="grid gap-6 md:grid-cols-2">
			{/* Basic Information */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Building2 className="h-5 w-5" />
						Basic Information
					</CardTitle>
					<CardDescription>Hospital identification details</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-1">
						<Label className="text-muted-foreground text-xs">
							Hospital Name
						</Label>
						<p className="font-medium">{hospital.name}</p>
					</div>
					<div className="space-y-1">
						<Label className="text-muted-foreground text-xs">
							License Number
						</Label>
						<p className="font-mono text-sm">{hospital.licenseNumber}</p>
					</div>
					<div className="space-y-1">
						<Label className="text-muted-foreground text-xs">Status</Label>
						<div>
							<Badge variant={statusVariant}>{hospital.status}</Badge>
						</div>
					</div>
					<Separator />
					<div className="grid grid-cols-2 gap-4 text-sm">
						<div className="space-y-1">
							<Label className="text-muted-foreground text-xs">
								Created At
							</Label>
							<p>{new Date(hospital.createdAt).toLocaleDateString()}</p>
						</div>
						<div className="space-y-1">
							<Label className="text-muted-foreground text-xs">
								Last Updated
							</Label>
							<p>{new Date(hospital.updatedAt).toLocaleDateString()}</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Contact Information */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Phone className="h-5 w-5" />
						Contact Information
					</CardTitle>
					<CardDescription>How to reach the hospital</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-start gap-3">
						<Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
						<div className="space-y-1">
							<Label className="text-muted-foreground text-xs">Email</Label>
							<p>{hospital.contactEmail}</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
						<div className="space-y-1">
							<Label className="text-muted-foreground text-xs">Phone</Label>
							<p>{hospital.contactPhone}</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Address */}
			<Card className="md:col-span-2">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<MapPin className="h-5 w-5" />
						Address
					</CardTitle>
					<CardDescription>Physical location of the hospital</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<div className="space-y-1">
							<Label className="text-muted-foreground text-xs">Street</Label>
							<p>{hospital.address.street}</p>
						</div>
						<div className="space-y-1">
							<Label className="text-muted-foreground text-xs">City</Label>
							<p>{hospital.address.city}</p>
						</div>
						<div className="space-y-1">
							<Label className="text-muted-foreground text-xs">State</Label>
							<p>{hospital.address.state}</p>
						</div>
						<div className="space-y-1">
							<Label className="text-muted-foreground text-xs">
								Postal Code
							</Label>
							<p>{hospital.address.postalCode}</p>
						</div>
						<div className="space-y-1">
							<Label className="text-muted-foreground text-xs">Country</Label>
							<p>{hospital.address.country}</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function HospitalEditForm({
	hospital,
	onCancel,
	onSuccess,
}: {
	hospital: HospitalDetails;
	onCancel: () => void;
	onSuccess: () => void;
}) {
	const updateMutation = useUpdateHospital();

	const form = useForm({
		defaultValues: {
			name: hospital.name,
			contactEmail: hospital.contactEmail,
			contactPhone: hospital.contactPhone,
			street: hospital.address.street,
			city: hospital.address.city,
			state: hospital.address.state,
			postalCode: hospital.address.postalCode,
			country: hospital.address.country,
		},
		onSubmit: async ({ value }) => {
			try {
				await updateMutation.mutateAsync({
					hospitalId: hospital.id,
					data: {
						name: value.name,
						contactEmail: value.contactEmail,
						contactPhone: value.contactPhone,
						address: {
							street: value.street,
							city: value.city,
							state: value.state,
							postalCode: value.postalCode,
							country: value.country,
						},
					},
				});
				toast.success("Hospital profile updated successfully");
				onSuccess();
			} catch (error) {
				const apiError = error as AuthError;
				toast.error(apiError.message || "Failed to update hospital profile");
			}
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(1, "Hospital name is required").max(100),
				contactEmail: z.string().email("Invalid email address"),
				contactPhone: z.string().min(1, "Phone number is required"),
				street: z.string().min(1, "Street is required"),
				city: z.string().min(1, "City is required"),
				state: z.string().min(1, "State is required"),
				postalCode: z.string().min(1, "Postal code is required"),
				country: z.string().min(1, "Country is required"),
			}),
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
		>
			<div className="grid gap-6 md:grid-cols-2">
				{/* Basic Information */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Building2 className="h-5 w-5" />
							Basic Information
						</CardTitle>
						<CardDescription>Hospital identification details</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<form.Field name="name">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>Hospital Name *</Label>
									<Input
										id={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
									{field.state.meta.errors.map((error) => (
										<p key={error?.message} className="text-red-500 text-sm">
											{error?.message}
										</p>
									))}
								</div>
							)}
						</form.Field>
						<div className="space-y-2">
							<Label className="text-muted-foreground">License Number</Label>
							<Input value={hospital.licenseNumber} disabled />
							<p className="text-muted-foreground text-xs">
								License number cannot be changed
							</p>
						</div>
					</CardContent>
				</Card>

				{/* Contact Information */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Phone className="h-5 w-5" />
							Contact Information
						</CardTitle>
						<CardDescription>How to reach the hospital</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<form.Field name="contactEmail">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>Email *</Label>
									<Input
										id={field.name}
										type="email"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
									{field.state.meta.errors.map((error) => (
										<p key={error?.message} className="text-red-500 text-sm">
											{error?.message}
										</p>
									))}
								</div>
							)}
						</form.Field>
						<form.Field name="contactPhone">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>Phone *</Label>
									<Input
										id={field.name}
										type="tel"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
									{field.state.meta.errors.map((error) => (
										<p key={error?.message} className="text-red-500 text-sm">
											{error?.message}
										</p>
									))}
								</div>
							)}
						</form.Field>
					</CardContent>
				</Card>

				{/* Address */}
				<Card className="md:col-span-2">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<MapPin className="h-5 w-5" />
							Address
						</CardTitle>
						<CardDescription>Physical location of the hospital</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							<form.Field name="street">
								{(field) => (
									<div className="space-y-2 lg:col-span-2">
										<Label htmlFor={field.name}>Street *</Label>
										<Input
											id={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										{field.state.meta.errors.map((error) => (
											<p key={error?.message} className="text-red-500 text-sm">
												{error?.message}
											</p>
										))}
									</div>
								)}
							</form.Field>
							<form.Field name="city">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>City *</Label>
										<Input
											id={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										{field.state.meta.errors.map((error) => (
											<p key={error?.message} className="text-red-500 text-sm">
												{error?.message}
											</p>
										))}
									</div>
								)}
							</form.Field>
							<form.Field name="state">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>State *</Label>
										<Input
											id={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										{field.state.meta.errors.map((error) => (
											<p key={error?.message} className="text-red-500 text-sm">
												{error?.message}
											</p>
										))}
									</div>
								)}
							</form.Field>
							<form.Field name="postalCode">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Postal Code *</Label>
										<Input
											id={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										{field.state.meta.errors.map((error) => (
											<p key={error?.message} className="text-red-500 text-sm">
												{error?.message}
											</p>
										))}
									</div>
								)}
							</form.Field>
							<form.Field name="country">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Country *</Label>
										<Input
											id={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										{field.state.meta.errors.map((error) => (
											<p key={error?.message} className="text-red-500 text-sm">
												{error?.message}
											</p>
										))}
									</div>
								)}
							</form.Field>
						</div>
					</CardContent>
				</Card>

				{/* Actions */}
				<div className="flex justify-end gap-4 md:col-span-2">
					<Button type="button" variant="outline" onClick={onCancel}>
						<X className="mr-2 h-4 w-4" />
						Cancel
					</Button>
					<form.Subscribe>
						{(state) => (
							<Button
								type="submit"
								disabled={
									!state.canSubmit ||
									state.isSubmitting ||
									updateMutation.isPending
								}
							>
								{state.isSubmitting || updateMutation.isPending ? (
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
			</div>
		</form>
	);
}

function HospitalProfileSkeleton() {
	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-2">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-4 w-72" />
				</div>
				<Skeleton className="h-10 w-32" />
			</div>
			<div className="grid gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-40" />
						<Skeleton className="h-4 w-56" />
					</CardHeader>
					<CardContent className="space-y-4">
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-8 w-24" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-40" />
						<Skeleton className="h-4 w-56" />
					</CardHeader>
					<CardContent className="space-y-4">
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-12 w-full" />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function getStatusVariant(
	status: string,
): "default" | "secondary" | "destructive" | "outline" {
	switch (status) {
		case "ACTIVE":
			return "default";
		case "VERIFIED":
			return "secondary";
		case "PENDING":
			return "outline";
		case "SUSPENDED":
		case "INACTIVE":
			return "destructive";
		default:
			return "outline";
	}
}
