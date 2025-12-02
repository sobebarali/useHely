import {
	AlertTriangle,
	CheckCircle2,
	Database,
	Eye,
	FileCheck,
	Key,
	Lock,
	Server,
	Shield,
	ShieldCheck,
	Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

const securityFeatures = [
	{
		icon: Database,
		title: "Tenant Data Isolation",
		description:
			"Schema-per-tenant architecture ensures complete data separation between organizations.",
	},
	{
		icon: Key,
		title: "JWT Authentication",
		description:
			"Secure token-based auth with Better-Auth, including access and refresh token rotation.",
	},
	{
		icon: Users,
		title: "Role-Based Access (RBAC)",
		description:
			"6 pre-defined roles with granular permission format: RESOURCE:ACTION.",
	},
	{
		icon: Eye,
		title: "Attribute-Based Access (ABAC)",
		description:
			"Fine-grained control based on user attributes like department and specialization.",
	},
	{
		icon: AlertTriangle,
		title: "Account Protection",
		description:
			"Account lockout after failed login attempts, with automatic session revocation.",
	},
	{
		icon: FileCheck,
		title: "Audit Logging",
		description:
			"Complete audit trail for compliance with healthcare regulations.",
	},
];

const roles = [
	{
		name: "SUPER_ADMIN",
		level: 0,
		description: "Platform administrator with full system access",
	},
	{
		name: "ADMIN",
		level: 1,
		description: "Organization administrator with tenant-wide access",
	},
	{
		name: "DOCTOR",
		level: 2,
		description: "Medical practitioner with patient care access",
	},
	{
		name: "NURSE",
		level: 2,
		description: "Nursing staff with patient monitoring access",
	},
	{
		name: "PHARMACIST",
		level: 2,
		description: "Pharmacy staff with dispensing access",
	},
	{
		name: "RECEPTIONIST",
		level: 3,
		description: "Front desk with registration access",
	},
];

const complianceItems = [
	"Field-level encryption",
	"HIPAA-ready architecture",
	"GDPR-ready infrastructure",
	"SOC 2-aligned practices",
	"Comprehensive audit logging",
	"High availability architecture",
];

export function Security() {
	return (
		<section className="px-4 py-20 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-7xl">
				{/* Header with image */}
				<div className="grid items-center gap-12 lg:grid-cols-2">
					<div>
						<Badge variant="outline" className="mb-4">
							<Shield className="mr-1 h-3 w-3" />
							Enterprise Security
						</Badge>
						<h2 className="font-bold text-3xl tracking-tight sm:text-4xl">
							Built for Healthcare Compliance
						</h2>
						<p className="mt-4 text-lg text-muted-foreground">
							Enterprise-grade security with multi-layered access control and
							complete audit trails. Your patient data is protected with
							industry-leading security measures.
						</p>

						{/* Compliance badges */}
						<div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
							{complianceItems.map((item) => (
								<div key={item} className="flex items-center gap-2 text-sm">
									<CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
									<span className="text-muted-foreground">{item}</span>
								</div>
							))}
						</div>
					</div>

					{/* Security illustration */}
					<div className="relative hidden lg:block">
						<div className="relative overflow-hidden rounded-2xl">
							<img
								src="https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&h=400&fit=crop&q=80"
								alt="Secure data center with server infrastructure"
								className="h-auto w-full object-cover"
								loading="lazy"
							/>
							<div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />

							{/* Floating security badge */}
							<div className="absolute right-4 bottom-4 left-4 rounded-xl border bg-card/95 p-4 backdrop-blur-sm">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
											<ShieldCheck className="h-5 w-5 text-green-500" />
										</div>
										<div>
											<div className="font-semibold text-sm">
												Security Status
											</div>
											<div className="text-green-500 text-xs">
												All systems protected
											</div>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Server className="h-4 w-4 text-muted-foreground" />
										<Lock className="h-4 w-4 text-muted-foreground" />
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Security Features Grid */}
				<div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{securityFeatures.map((feature) => (
						<Card
							key={feature.title}
							className="group hover:-translate-y-1 border-0 shadow-sm transition-all hover:shadow-md"
						>
							<CardHeader className="pb-2">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
										<feature.icon className="h-5 w-5 text-primary" />
									</div>
									<CardTitle className="text-base">{feature.title}</CardTitle>
								</div>
							</CardHeader>
							<CardContent>
								<CardDescription>{feature.description}</CardDescription>
							</CardContent>
						</Card>
					))}
				</div>

				{/* Role Hierarchy */}
				<div className="mt-16 overflow-hidden rounded-2xl border bg-card shadow-sm">
					<div className="grid lg:grid-cols-3">
						{/* Left: Image */}
						<div className="relative hidden lg:block">
							<img
								src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=500&fit=crop&q=80"
								alt="Medical team collaborating"
								className="h-full w-full object-cover"
								loading="lazy"
							/>
							<div className="absolute inset-0 bg-gradient-to-r from-transparent to-card" />
						</div>

						{/* Right: Role hierarchy */}
						<div className="p-8 lg:col-span-2">
							<div className="text-center lg:text-left">
								<h3 className="font-semibold text-xl">Role Hierarchy</h3>
								<p className="mt-2 text-muted-foreground">
									Pre-configured roles with hierarchical permissions
								</p>
							</div>

							<div className="mt-8 flex flex-col items-center lg:items-start">
								<div className="flex w-full max-w-2xl flex-col gap-3">
									{[0, 1, 2, 3].map((level) => {
										const levelRoles = roles.filter((r) => r.level === level);
										return (
											<div
												key={level}
												className="flex flex-col items-center lg:items-start"
											>
												<div className="flex flex-wrap justify-center gap-3 lg:justify-start">
													{levelRoles.map((role) => (
														<div
															key={role.name}
															className="group flex flex-col items-center rounded-lg border bg-muted/50 px-4 py-3 text-center transition-all hover:bg-muted hover:shadow-sm"
														>
															<Badge
																variant={level === 0 ? "default" : "secondary"}
																className="mb-1"
															>
																{role.name}
															</Badge>
															<span className="max-w-32 text-muted-foreground text-xs">
																{role.description}
															</span>
														</div>
													))}
												</div>
												{level < 3 && (
													<div className="my-2 h-6 w-0.5 bg-border lg:ml-8" />
												)}
											</div>
										);
									})}
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Trust badges */}
				<div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
					<div className="flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-2">
						<Lock className="h-4 w-4" />
						<span className="text-sm">AES-256 Encryption</span>
					</div>
					<div className="flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-2">
						<Shield className="h-4 w-4" />
						<span className="text-sm">HIPAA-Ready</span>
					</div>
					<div className="flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-2">
						<Database className="h-4 w-4" />
						<span className="text-sm">Isolated Tenants</span>
					</div>
					<div className="flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-2">
						<Server className="h-4 w-4" />
						<span className="text-sm">High Availability</span>
					</div>
				</div>
			</div>
		</section>
	);
}
