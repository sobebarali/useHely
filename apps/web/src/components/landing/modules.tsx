import {
	Activity,
	Building2,
	Calendar,
	FileText,
	Pill,
	Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const modules = [
	{
		id: "patients",
		icon: Users,
		title: "Patients",
		description: "Complete patient lifecycle management for OPD and IPD",
		image:
			"https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=500&h=350&fit=crop&q=80",
		imageAlt: "Nurse caring for patient in hospital",
		features: [
			"Patient registration with photo upload",
			"Search by name, phone, ID, or email",
			"OPD consultation workflow",
			"IPD admission and discharge",
			"Emergency contact management",
			"Export to CSV/PDF",
		],
		workflow: [
			"Registration",
			"Queue",
			"Consultation",
			"Prescription",
			"Follow-up",
		],
	},
	{
		id: "appointments",
		icon: Calendar,
		title: "Appointments",
		description: "Scheduling and queue management for consultations",
		image:
			"https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500&h=350&fit=crop&q=80",
		imageAlt: "Medical appointment scheduling on digital device",
		features: [
			"Doctor schedule management",
			"Appointment booking",
			"Priority queue handling",
			"Walk-in patient support",
			"Rescheduling and cancellation",
			"Automated reminders",
		],
		workflow: ["Book", "Confirm", "Check-in", "Consult", "Complete"],
	},
	{
		id: "prescriptions",
		icon: FileText,
		title: "Prescriptions",
		description: "Digital prescriptions with pharmacy integration",
		image:
			"https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=500&h=350&fit=crop&q=80",
		imageAlt: "Doctor writing digital prescription",
		features: [
			"E-prescription creation",
			"Prescription templates",
			"Drug interaction warnings",
			"Dosage instructions",
			"Pharmacy dispatch",
			"Prescription history",
		],
		workflow: ["Create", "Review", "Sign", "Dispatch", "Dispense"],
	},
	{
		id: "vitals",
		icon: Activity,
		title: "Vitals",
		description: "Patient vital signs monitoring and alerts",
		image:
			"https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=500&h=350&fit=crop&q=80",
		imageAlt: "Medical monitoring equipment showing vital signs",
		features: [
			"Blood pressure tracking",
			"Temperature recording",
			"Heart rate monitoring",
			"Blood glucose levels",
			"Weight and height",
			"Custom threshold alerts",
		],
		workflow: ["Record", "Validate", "Store", "Alert", "Report"],
	},
	{
		id: "pharmacy",
		icon: Pill,
		title: "Pharmacy",
		description: "Inventory management and medicine dispensing",
		image:
			"https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=500&h=350&fit=crop&q=80",
		imageAlt: "Pharmacist organizing medicine inventory",
		features: [
			"Medicine inventory",
			"Stock level tracking",
			"Expiry date alerts",
			"Prescription dispensing",
			"Batch management",
			"Reorder notifications",
		],
		workflow: ["Receive", "Stock", "Dispense", "Track", "Reorder"],
	},
	{
		id: "departments",
		icon: Building2,
		title: "Departments",
		description: "Organizational structure and staff management",
		image:
			"https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=500&h=350&fit=crop&q=80",
		imageAlt: "Hospital department corridor and reception",
		features: [
			"Department creation",
			"Staff assignment",
			"Department-based access",
			"Resource allocation",
			"Shift management",
			"Performance tracking",
		],
		workflow: ["Create", "Assign", "Manage", "Monitor", "Report"],
	},
];

export function Modules() {
	return (
		<section className="bg-muted/30 px-4 py-20 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-7xl">
				<div className="text-center">
					<Badge variant="outline" className="mb-4">
						Core Modules
					</Badge>
					<h2 className="font-bold text-3xl tracking-tight sm:text-4xl">
						Purpose-Built for Healthcare
					</h2>
					<p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
						Each module is designed with healthcare workflows in mind, from
						patient intake to discharge.
					</p>
				</div>

				<div className="mt-12">
					<Tabs defaultValue="patients" className="w-full">
						<TabsList className="mx-auto mb-8 grid h-auto w-full max-w-3xl grid-cols-3 gap-2 bg-transparent sm:grid-cols-6">
							{modules.map((module) => (
								<TabsTrigger
									key={module.id}
									value={module.id}
									className="flex flex-col gap-1 rounded-lg border bg-card py-3 shadow-sm transition-all hover:shadow-md data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
								>
									<module.icon className="h-5 w-5" />
									<span className="text-xs">{module.title}</span>
								</TabsTrigger>
							))}
						</TabsList>

						{modules.map((module) => (
							<TabsContent key={module.id} value={module.id}>
								<div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
									<div className="grid lg:grid-cols-5">
										{/* Left: Image */}
										<div className="relative lg:col-span-2">
											<img
												src={module.image}
												alt={module.imageAlt}
												className="h-64 w-full object-cover lg:h-full"
												loading="lazy"
											/>
											<div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-background/60" />

											{/* Module badge overlay */}
											<div className="absolute bottom-4 left-4 lg:hidden">
												<div className="flex items-center gap-2 rounded-lg bg-card/90 px-3 py-2 backdrop-blur-sm">
													<module.icon className="h-5 w-5 text-primary" />
													<span className="font-semibold">{module.title}</span>
												</div>
											</div>
										</div>

										{/* Right: Content */}
										<div className="p-6 lg:col-span-3 lg:p-8">
											<div className="flex items-center gap-3">
												<div className="hidden h-12 w-12 items-center justify-center rounded-xl bg-primary/10 lg:flex">
													<module.icon className="h-6 w-6 text-primary" />
												</div>
												<div>
													<h3 className="font-semibold text-xl">
														{module.title}
													</h3>
													<p className="text-muted-foreground text-sm">
														{module.description}
													</p>
												</div>
											</div>

											{/* Workflow */}
											<div className="mt-6">
												<h4 className="mb-3 font-medium text-muted-foreground text-sm">
													Workflow
												</h4>
												<div className="flex flex-wrap items-center gap-2">
													{module.workflow.map((step, index) => (
														<div key={step} className="flex items-center gap-2">
															<Badge
																variant="secondary"
																className="px-3 py-1 text-xs"
															>
																{step}
															</Badge>
															{index < module.workflow.length - 1 && (
																<span className="text-muted-foreground">
																	&rarr;
																</span>
															)}
														</div>
													))}
												</div>
											</div>

											{/* Features */}
											<div className="mt-6">
												<h4 className="mb-3 font-medium text-muted-foreground text-sm">
													Key Features
												</h4>
												<ul className="grid gap-2 sm:grid-cols-2">
													{module.features.map((feature) => (
														<li
															key={feature}
															className="flex items-center gap-2 text-sm"
														>
															<div className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
															<span>{feature}</span>
														</li>
													))}
												</ul>
											</div>
										</div>
									</div>
								</div>
							</TabsContent>
						))}
					</Tabs>
				</div>
			</div>
		</section>
	);
}
