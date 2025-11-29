import { ClipboardCheck, Mail, Rocket, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const steps = [
	{
		step: 1,
		icon: ClipboardCheck,
		title: "Register",
		description:
			"Hospital self-registers with license details, contact information, and admin credentials.",
	},
	{
		step: 2,
		icon: Mail,
		title: "Verify",
		description:
			"Email verification activates the account with pre-configured roles, default department, and admin user.",
	},
	{
		step: 3,
		icon: Settings,
		title: "Configure",
		description:
			"Set up departments, add staff members, define workflows, and customize settings.",
	},
	{
		step: 4,
		icon: Rocket,
		title: "Go Live",
		description:
			"Start managing patients, scheduling appointments, and running daily operations.",
	},
];

export function HowItWorks() {
	return (
		<section className="px-4 py-20 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-7xl">
				<div className="text-center">
					<Badge variant="outline" className="mb-4">
						Simple Setup
					</Badge>
					<h2 className="font-bold text-3xl tracking-tight sm:text-4xl">
						Up and Running in Minutes
					</h2>
					<p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
						From registration to your first patient - our streamlined onboarding
						gets you operational quickly.
					</p>
				</div>

				<div className="mt-16">
					<div className="grid gap-8 md:grid-cols-4">
						{steps.map((item, index) => (
							<div key={item.step} className="relative">
								{/* Connector line */}
								{index < steps.length - 1 && (
									<div className="absolute top-8 left-1/2 hidden h-0.5 w-full bg-border md:block" />
								)}

								<div className="relative flex flex-col items-center text-center">
									{/* Step circle */}
									<div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
										<item.icon className="h-7 w-7" />
									</div>

									{/* Step number badge */}
									<Badge className="absolute top-12 right-1/2 translate-x-8">
										Step {item.step}
									</Badge>

									<h3 className="mt-8 font-semibold text-lg">{item.title}</h3>
									<p className="mt-2 text-muted-foreground text-sm">
										{item.description}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Auto-provisioning highlight */}
				<div className="mt-16 rounded-2xl border bg-card p-8 shadow-sm">
					<div className="text-center">
						<h3 className="font-semibold text-xl">
							Automatic Tenant Provisioning
						</h3>
						<p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
							Upon verification, the system automatically creates:
						</p>
					</div>
					<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{[
							{
								title: "6 System Roles",
								desc: "Super Admin, Hospital Admin, Doctor, Nurse, Pharmacist, Receptionist",
							},
							{
								title: "Default Department",
								desc: "Administration department ready for staff assignment",
							},
							{
								title: "Admin Account",
								desc: "Hospital admin with temporary password and force change",
							},
							{
								title: "Welcome Email",
								desc: "Credentials and login instructions sent automatically",
							},
						].map((item) => (
							<div
								key={item.title}
								className="rounded-lg bg-muted/50 p-4 text-center"
							>
								<div className="font-medium">{item.title}</div>
								<div className="mt-1 text-muted-foreground text-xs">
									{item.desc}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
