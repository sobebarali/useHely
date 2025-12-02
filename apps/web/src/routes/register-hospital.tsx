import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	Building2,
	CheckCircle2,
	Lock,
	ShieldCheck,
	Stethoscope,
	User,
	Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { UseHelyLogo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegisterHospital } from "@/hooks/use-hospital";
import { useRegistrationTerminology } from "@/hooks/use-terminology";
import type { AuthError, OrganizationType } from "@/lib/auth-client";

export const Route = createFileRoute("/register-hospital")({
	component: RegisterHospitalPage,
});

// Create validation schema based on organization type
const createRegistrationSchema = (orgType: OrganizationType) =>
	z.object({
		type: z.enum(["HOSPITAL", "CLINIC", "SOLO_PRACTICE"]),
		name: z.string().min(1, "Name is required"),
		address: z.object({
			street: z.string().min(1, "Street address is required"),
			city: z.string().min(1, "City is required"),
			state: z.string().min(1, "State is required"),
			postalCode: z.string().min(1, "Postal code is required"),
			country: z.string().min(1, "Country is required"),
		}),
		contactEmail: z.string().email("Invalid contact email"),
		contactPhone: z.string().min(1, "Contact phone is required"),
		licenseNumber:
			orgType === "HOSPITAL"
				? z.string().min(1, "License number is required")
				: z.string().optional(),
		adminEmail: z.string().email("Invalid admin email"),
		adminPhone: z.string().min(1, "Admin phone is required"),
	});

const organizationTypeOptions: {
	type: OrganizationType;
	label: string;
	description: string;
	icon: typeof Building2;
	badge?: string;
}[] = [
	{
		type: "HOSPITAL",
		label: "Hospital",
		description: "Large healthcare facility with multiple departments",
		icon: Building2,
		badge: "Requires verification",
	},
	{
		type: "CLINIC",
		label: "Clinic",
		description: "Medical clinic with one or more doctors",
		icon: Stethoscope,
		badge: "Instant activation",
	},
	{
		type: "SOLO_PRACTICE",
		label: "Solo Practice",
		description: "Individual practitioner managing patients",
		icon: User,
		badge: "Instant activation",
	},
];

function RegisterHospitalPage() {
	const registerMutation = useRegisterHospital();
	const [registrationSuccess, setRegistrationSuccess] = useState(false);
	const [registeredEmail, setRegisteredEmail] = useState("");
	const [organizationType, setOrganizationType] =
		useState<OrganizationType>("CLINIC");
	const { terminology, needsVerification } =
		useRegistrationTerminology(organizationType);

	const form = useForm({
		defaultValues: {
			type: "CLINIC" as OrganizationType,
			name: "",
			address: {
				street: "",
				city: "",
				state: "",
				postalCode: "",
				country: "",
			},
			contactEmail: "",
			contactPhone: "",
			licenseNumber: "" as string | undefined,
			adminEmail: "",
			adminPhone: "",
		},
		onSubmit: async ({ value }) => {
			try {
				await registerMutation.mutateAsync({
					...value,
					licenseNumber:
						organizationType === "HOSPITAL" ? value.licenseNumber : undefined,
				});
				setRegisteredEmail(value.adminEmail);
				setRegistrationSuccess(true);
				toast.success(terminology.registrationSuccessTitle);
			} catch (error) {
				const authError = error as AuthError;
				toast.error(authError.message || "Registration failed");
			}
		},
		validators: {
			onSubmit: createRegistrationSchema(organizationType),
		},
	});

	if (registrationSuccess) {
		return (
			<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-muted/50 p-4">
				{/* Background decorations */}
				<div className="pointer-events-none absolute inset-0 overflow-hidden">
					<div className="absolute top-1/4 right-0 h-96 w-96 translate-x-1/2 rounded-full bg-green-500/10 blur-3xl" />
					<div className="-translate-x-1/2 absolute bottom-0 left-0 h-96 w-96 translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
				</div>

				<Card className="relative w-full max-w-md border-green-500/20 bg-card/80 backdrop-blur-sm">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
							<CheckCircle2 className="h-10 w-10 text-green-500" />
						</div>
						<h1 className="font-bold text-2xl">
							{terminology.registrationSuccessTitle}
						</h1>
					</CardHeader>
					<CardContent className="space-y-4 text-center">
						<p className="text-muted-foreground">
							{needsVerification ? (
								<>
									We've sent a verification email to{" "}
									<span className="font-medium text-foreground">
										{registeredEmail}
									</span>
								</>
							) : (
								<>
									Your login credentials have been sent to{" "}
									<span className="font-medium text-foreground">
										{registeredEmail}
									</span>
								</>
							)}
						</p>
						<p className="text-muted-foreground text-sm">
							{terminology.registrationSuccessMessage}
						</p>
						<div className="rounded-lg border bg-muted/50 p-4">
							<p className="font-medium text-sm">What happens next?</p>
							<ul className="mt-2 space-y-1 text-left text-muted-foreground text-sm">
								{needsVerification ? (
									<>
										<li className="flex items-center gap-2">
											<CheckCircle2 className="h-4 w-4 text-green-500" />
											Verify your email address
										</li>
										<li className="flex items-center gap-2">
											<CheckCircle2 className="h-4 w-4 text-green-500" />
											Receive your admin login credentials
										</li>
										<li className="flex items-center gap-2">
											<CheckCircle2 className="h-4 w-4 text-green-500" />
											Sign in to set up your{" "}
											{terminology.organization.toLowerCase()}
										</li>
									</>
								) : (
									<>
										<li className="flex items-center gap-2">
											<CheckCircle2 className="h-4 w-4 text-green-500" />
											Check your email for login credentials
										</li>
										<li className="flex items-center gap-2">
											<CheckCircle2 className="h-4 w-4 text-green-500" />
											Sign in to your {terminology.organization.toLowerCase()}
										</li>
										<li className="flex items-center gap-2">
											<CheckCircle2 className="h-4 w-4 text-green-500" />
											Start managing your patients
										</li>
									</>
								)}
							</ul>
						</div>
						<Button asChild className="w-full">
							<Link to="/login">Go to Login</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background to-muted/50">
			{/* Background decorations */}
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="absolute top-1/4 right-0 h-96 w-96 translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
				<div className="-translate-x-1/2 absolute bottom-0 left-0 h-96 w-96 translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
			</div>

			<div className="relative grid min-h-screen lg:grid-cols-2">
				{/* Left Column - Image & Features (Hidden on mobile) */}
				<div className="relative hidden lg:block">
					{/* Full height image */}
					<div className="absolute inset-0">
						<img
							src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&h=1600&fit=crop&q=80"
							alt="Modern hospital building exterior"
							className="h-full w-full object-cover"
						/>
						{/* Dark overlay */}
						<div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
						<div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
					</div>

					{/* Content overlay */}
					<div className="relative flex h-full flex-col justify-center p-12">
						<Link
							to="/"
							className="mb-8 flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
						>
							<ArrowLeft className="h-4 w-4" />
							Back to Home
						</Link>

						<div className="mb-8 flex items-center gap-3">
							<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 backdrop-blur-sm">
								<UseHelyLogo className="h-6 w-6 text-primary" />
							</div>
							<span className="font-bold text-xl">useHely</span>
						</div>

						<h1 className="mb-4 font-bold text-4xl leading-tight">
							{terminology.registrationTitle}
						</h1>
						<p className="mb-8 max-w-md text-lg text-muted-foreground">
							{terminology.registrationSubtitle}
						</p>

						{/* Feature cards */}
						<div className="space-y-4">
							{[
								{
									icon: ShieldCheck,
									title: "Enterprise Security",
									desc: "HIPAA-ready with end-to-end encryption",
								},
								{
									icon: Users,
									title: "Role-Based Access",
									desc: "6 pre-defined roles with customizable permissions",
								},
								{
									icon: Lock,
									title: "Data Isolation",
									desc: "Complete tenant isolation for your data",
								},
							].map((feature) => (
								<div
									key={feature.title}
									className="flex items-start gap-4 rounded-xl border border-border/50 bg-card/30 p-4 backdrop-blur-sm"
								>
									<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20">
										<feature.icon className="h-5 w-5 text-primary" />
									</div>
									<div>
										<h3 className="font-semibold">{feature.title}</h3>
										<p className="text-muted-foreground text-sm">
											{feature.desc}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Right Column - Registration Form */}
				<div className="flex flex-col overflow-y-auto px-4 py-8 lg:px-12">
					{/* Mobile header */}
					<div className="mb-6 lg:hidden">
						<Button variant="ghost" size="sm" asChild className="mb-4">
							<Link to="/">
								<ArrowLeft className="mr-2 h-4 w-4" />
								Back to Home
							</Link>
						</Button>
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
								<UseHelyLogo className="h-5 w-5 text-primary" />
							</div>
							<div>
								<h1 className="font-bold text-xl">
									{terminology.registrationTitle}
								</h1>
								<p className="text-muted-foreground text-sm">
									Join the useHely platform
								</p>
							</div>
						</div>
					</div>

					{/* Desktop header */}
					<div className="mb-8 hidden lg:block">
						<h2 className="font-bold text-2xl">Create your account</h2>
						<p className="text-muted-foreground">
							Fill in your {terminology.organization.toLowerCase()} details to
							get started
						</p>
					</div>

					{/* Registration Form */}
					<Card className="border-border/50 bg-card/50 backdrop-blur-sm">
						<CardContent className="pt-6">
							<form
								onSubmit={(e) => {
									e.preventDefault();
									e.stopPropagation();
									form.handleSubmit();
								}}
								className="space-y-6"
							>
								{/* Organization Type Selector */}
								<div className="space-y-4">
									<h3 className="font-semibold">What type of facility?</h3>
									<div className="grid gap-3">
										{organizationTypeOptions.map((option) => (
											<button
												key={option.type}
												type="button"
												onClick={() => {
													setOrganizationType(option.type);
													form.setFieldValue("type", option.type);
												}}
												className={`flex items-start gap-4 rounded-xl border p-4 text-left transition-colors ${
													organizationType === option.type
														? "border-primary bg-primary/5"
														: "border-border/50 bg-background/50 hover:border-primary/50"
												}`}
											>
												<div
													className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
														organizationType === option.type
															? "bg-primary/20"
															: "bg-muted"
													}`}
												>
													<option.icon
														className={`h-5 w-5 ${
															organizationType === option.type
																? "text-primary"
																: "text-muted-foreground"
														}`}
													/>
												</div>
												<div className="flex-1">
													<div className="flex items-center gap-2">
														<span className="font-semibold">
															{option.label}
														</span>
														{option.badge && (
															<span
																className={`rounded-full px-2 py-0.5 text-xs ${
																	option.type === "HOSPITAL"
																		? "bg-amber-500/10 text-amber-600"
																		: "bg-green-500/10 text-green-600"
																}`}
															>
																{option.badge}
															</span>
														)}
													</div>
													<p className="text-muted-foreground text-sm">
														{option.description}
													</p>
												</div>
											</button>
										))}
									</div>
								</div>

								{/* Organization Information */}
								<div className="space-y-4">
									<h3 className="font-semibold">
										{terminology.organization} Information
									</h3>

									<form.Field name="name">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor={field.name}>
													{terminology.organization} Name *
												</Label>
												<Input
													id={field.name}
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													onBlur={field.handleBlur}
													placeholder={
														organizationType === "HOSPITAL"
															? "City General Hospital"
															: organizationType === "CLINIC"
																? "Downtown Medical Clinic"
																: "Dr. Smith's Practice"
													}
													className="bg-background/50"
												/>
												{field.state.meta.errors.map((error) => (
													<p
														key={String(error)}
														className="text-red-500 text-sm"
													>
														{String(error)}
													</p>
												))}
											</div>
										)}
									</form.Field>

									{organizationType === "HOSPITAL" && (
										<form.Field name="licenseNumber">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor={field.name}>License Number *</Label>
													<Input
														id={field.name}
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														placeholder="MED-2024-001234"
														className="bg-background/50"
													/>
													<p className="text-muted-foreground text-xs">
														Your official hospital license number
													</p>
													{field.state.meta.errors.map((error) => (
														<p
															key={String(error)}
															className="text-red-500 text-sm"
														>
															{String(error)}
														</p>
													))}
												</div>
											)}
										</form.Field>
									)}

									<div className="grid gap-4 sm:grid-cols-2">
										<form.Field name="contactEmail">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor={field.name}>Contact Email *</Label>
													<Input
														id={field.name}
														type="email"
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														placeholder="info@hospital.com"
														className="bg-background/50"
													/>
													{field.state.meta.errors.map((error) => (
														<p
															key={String(error)}
															className="text-red-500 text-sm"
														>
															{String(error)}
														</p>
													))}
												</div>
											)}
										</form.Field>

										<form.Field name="contactPhone">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor={field.name}>Contact Phone *</Label>
													<Input
														id={field.name}
														type="tel"
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														placeholder="+1-555-0100"
														className="bg-background/50"
													/>
													{field.state.meta.errors.map((error) => (
														<p
															key={String(error)}
															className="text-red-500 text-sm"
														>
															{String(error)}
														</p>
													))}
												</div>
											)}
										</form.Field>
									</div>
								</div>

								{/* Address */}
								<div className="space-y-4">
									<h3 className="font-semibold">Address</h3>

									<form.Field name="address.street">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor={field.name}>Street Address *</Label>
												<Input
													id={field.name}
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													onBlur={field.handleBlur}
													placeholder="123 Main Street"
													className="bg-background/50"
												/>
												{field.state.meta.errors.map((error) => (
													<p
														key={String(error)}
														className="text-red-500 text-sm"
													>
														{String(error)}
													</p>
												))}
											</div>
										)}
									</form.Field>

									<div className="grid gap-4 sm:grid-cols-2">
										<form.Field name="address.city">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor={field.name}>City *</Label>
													<Input
														id={field.name}
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														placeholder="New York"
														className="bg-background/50"
													/>
													{field.state.meta.errors.map((error) => (
														<p
															key={String(error)}
															className="text-red-500 text-sm"
														>
															{String(error)}
														</p>
													))}
												</div>
											)}
										</form.Field>

										<form.Field name="address.state">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor={field.name}>State/Province *</Label>
													<Input
														id={field.name}
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														placeholder="NY"
														className="bg-background/50"
													/>
													{field.state.meta.errors.map((error) => (
														<p
															key={String(error)}
															className="text-red-500 text-sm"
														>
															{String(error)}
														</p>
													))}
												</div>
											)}
										</form.Field>
									</div>

									<div className="grid gap-4 sm:grid-cols-2">
										<form.Field name="address.postalCode">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor={field.name}>Postal Code *</Label>
													<Input
														id={field.name}
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														placeholder="10001"
														className="bg-background/50"
													/>
													{field.state.meta.errors.map((error) => (
														<p
															key={String(error)}
															className="text-red-500 text-sm"
														>
															{String(error)}
														</p>
													))}
												</div>
											)}
										</form.Field>

										<form.Field name="address.country">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor={field.name}>Country *</Label>
													<Input
														id={field.name}
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														placeholder="USA"
														className="bg-background/50"
													/>
													{field.state.meta.errors.map((error) => (
														<p
															key={String(error)}
															className="text-red-500 text-sm"
														>
															{String(error)}
														</p>
													))}
												</div>
											)}
										</form.Field>
									</div>
								</div>

								{/* Admin Account */}
								<div className="space-y-4">
									<h3 className="font-semibold">
										{organizationType === "SOLO_PRACTICE"
											? "Your Account"
											: "Administrator Account"}
									</h3>
									<p className="text-muted-foreground text-sm">
										{organizationType === "SOLO_PRACTICE"
											? "This will be your login for the practice"
											: `This will be the primary administrator for your ${terminology.organization.toLowerCase()}`}
									</p>

									<div className="grid gap-4 sm:grid-cols-2">
										<form.Field name="adminEmail">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor={field.name}>
														{organizationType === "SOLO_PRACTICE"
															? "Your Email *"
															: "Admin Email *"}
													</Label>
													<Input
														id={field.name}
														type="email"
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														placeholder={
															organizationType === "SOLO_PRACTICE"
																? "doctor@example.com"
																: "admin@organization.com"
														}
														className="bg-background/50"
													/>
													<p className="text-muted-foreground text-xs">
														{needsVerification
															? "Verification link will be sent here"
															: "Login credentials will be sent here"}
													</p>
													{field.state.meta.errors.map((error) => (
														<p
															key={String(error)}
															className="text-red-500 text-sm"
														>
															{String(error)}
														</p>
													))}
												</div>
											)}
										</form.Field>

										<form.Field name="adminPhone">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor={field.name}>
														{organizationType === "SOLO_PRACTICE"
															? "Your Phone *"
															: "Admin Phone *"}
													</Label>
													<Input
														id={field.name}
														type="tel"
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														placeholder="+1-555-0101"
														className="bg-background/50"
													/>
													{field.state.meta.errors.map((error) => (
														<p
															key={String(error)}
															className="text-red-500 text-sm"
														>
															{String(error)}
														</p>
													))}
												</div>
											)}
										</form.Field>
									</div>
								</div>

								{/* Submit */}
								<div className="border-t pt-6">
									<form.Subscribe>
										{(state) => (
											<Button
												type="submit"
												className="w-full"
												size="lg"
												disabled={
													!state.canSubmit ||
													state.isSubmitting ||
													registerMutation.isPending
												}
											>
												{state.isSubmitting || registerMutation.isPending
													? "Registering..."
													: `Register ${terminology.organization}`}
											</Button>
										)}
									</form.Subscribe>

									<p className="mt-4 text-center text-muted-foreground text-sm">
										Already have an account?{" "}
										<Link
											to="/login"
											className="text-primary underline-offset-4 hover:underline"
										>
											Sign in
										</Link>
									</p>
								</div>
							</form>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
