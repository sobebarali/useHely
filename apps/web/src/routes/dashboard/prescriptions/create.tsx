import { useForm } from "@tanstack/react-form";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	Calendar,
	FileText,
	Loader2,
	Plus,
	Save,
	Trash2,
	User,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { PatientSearch } from "@/components/patients";
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
import { Textarea } from "@/components/ui/textarea";
import type { SearchPatientResult } from "@/hooks/use-patients";
import {
	type MedicineInput,
	useCreatePrescription,
	useTemplates,
} from "@/hooks/use-prescriptions";
import { authClient } from "@/lib/auth-client";
import type { ApiError } from "@/lib/prescriptions-client";
import { SELECT_NONE_VALUE } from "@/lib/utils";

const searchSchema = z.object({
	templateId: z.string().optional(),
});

export const Route = createFileRoute("/dashboard/prescriptions/create")({
	component: CreatePrescriptionPage,
	validateSearch: searchSchema,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

// Common frequency options
const frequencyOptions = [
	{ value: "once daily", label: "Once daily" },
	{ value: "twice daily", label: "Twice daily" },
	{ value: "three times daily", label: "Three times daily" },
	{ value: "four times daily", label: "Four times daily" },
	{ value: "every 4 hours", label: "Every 4 hours" },
	{ value: "every 6 hours", label: "Every 6 hours" },
	{ value: "every 8 hours", label: "Every 8 hours" },
	{ value: "before meals", label: "Before meals" },
	{ value: "after meals", label: "After meals" },
	{ value: "at bedtime", label: "At bedtime" },
	{ value: "as needed", label: "As needed" },
];

// Common route options
const routeOptions = [
	{ value: "oral", label: "Oral" },
	{ value: "sublingual", label: "Sublingual" },
	{ value: "topical", label: "Topical" },
	{ value: "inhalation", label: "Inhalation" },
	{ value: "injection", label: "Injection" },
	{ value: "intravenous", label: "Intravenous (IV)" },
	{ value: "rectal", label: "Rectal" },
	{ value: "ophthalmic", label: "Ophthalmic (Eye)" },
	{ value: "otic", label: "Otic (Ear)" },
	{ value: "nasal", label: "Nasal" },
];

const emptyMedicine: MedicineInput = {
	name: "",
	dosage: "",
	frequency: "",
	duration: "",
	instructions: "",
	route: "",
	quantity: undefined,
};

interface MedicineWithId extends MedicineInput {
	_id: string;
}

function generateMedicineId(): string {
	return `med_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function createEmptyMedicine(): MedicineWithId {
	return { ...emptyMedicine, _id: generateMedicineId() };
}

function CreatePrescriptionPage() {
	const navigate = useNavigate();
	const { templateId: urlTemplateId } = Route.useSearch();
	const [selectedPatient, setSelectedPatient] =
		useState<SearchPatientResult | null>(null);
	const [medicines, setMedicines] = useState<MedicineWithId[]>([
		createEmptyMedicine(),
	]);
	const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
	const [templateApplied, setTemplateApplied] = useState(false);

	const createPrescriptionMutation = useCreatePrescription();
	const { data: templatesData } = useTemplates();

	// Auto-select template from URL param
	useEffect(() => {
		if (urlTemplateId && templatesData?.data && !templateApplied) {
			const template = templatesData.data.find((t) => t.id === urlTemplateId);
			if (template) {
				setSelectedTemplateId(urlTemplateId);
				const templateMedicines: MedicineWithId[] = template.medicines.map(
					(m) => ({
						_id: generateMedicineId(),
						name: m.name,
						dosage: m.dosage || "",
						frequency: m.frequency || "",
						duration: m.duration || "",
						instructions: m.instructions || "",
						route: m.route || "",
						quantity: undefined,
					}),
				);
				setMedicines([...templateMedicines, createEmptyMedicine()]);
				setTemplateApplied(true);
			}
		}
	}, [urlTemplateId, templatesData?.data, templateApplied]);

	const form = useForm({
		defaultValues: {
			diagnosis: "",
			notes: "",
			followUpDate: "",
		},
		onSubmit: async ({ value }) => {
			if (!selectedPatient) {
				toast.error("Please select a patient");
				return;
			}

			// Validate medicines
			const validMedicines = medicines.filter(
				(m) => m.name && m.dosage && m.frequency && m.duration,
			);
			if (validMedicines.length === 0) {
				toast.error("At least one complete medicine entry is required");
				return;
			}

			try {
				await createPrescriptionMutation.mutateAsync({
					patientId: selectedPatient.id,
					diagnosis: value.diagnosis,
					notes: value.notes || undefined,
					medicines: validMedicines,
					followUpDate: value.followUpDate
						? new Date(value.followUpDate).toISOString()
						: undefined,
					templateId: selectedTemplateId || undefined,
				});
				toast.success("Prescription created successfully");
				navigate({ to: "/dashboard/prescriptions" });
			} catch (error) {
				const apiError = error as ApiError;
				toast.error(apiError.message || "Failed to create prescription");
			}
		},
		validators: {
			onSubmit: z.object({
				diagnosis: z.string().min(1, "Diagnosis is required"),
				notes: z.string(),
				followUpDate: z.string(),
			}),
		},
	});

	const handleAddMedicine = () => {
		setMedicines([...medicines, createEmptyMedicine()]);
	};

	const handleRemoveMedicine = (index: number) => {
		if (medicines.length > 1) {
			setMedicines(medicines.filter((_, i) => i !== index));
		}
	};

	const handleMedicineChange = (
		index: number,
		field: keyof MedicineInput,
		value: string | number | undefined,
	) => {
		const updated = [...medicines];
		updated[index] = { ...updated[index], [field]: value } as MedicineWithId;
		setMedicines(updated);
	};

	const handleTemplateSelect = (templateId: string) => {
		setSelectedTemplateId(templateId);
		setTemplateApplied(true);
		if (templateId && templateId !== SELECT_NONE_VALUE && templatesData?.data) {
			const template = templatesData.data.find((t) => t.id === templateId);
			if (template) {
				const templateMedicines: MedicineWithId[] = template.medicines.map(
					(m) => ({
						_id: generateMedicineId(),
						name: m.name,
						dosage: m.dosage || "",
						frequency: m.frequency || "",
						duration: m.duration || "",
						instructions: m.instructions || "",
						route: m.route || "",
						quantity: undefined,
					}),
				);
				setMedicines([...templateMedicines, createEmptyMedicine()]);
			}
		}
	};

	const handlePatientSelect = (patient: SearchPatientResult) => {
		setSelectedPatient(patient);
	};

	const handleClearPatient = () => {
		setSelectedPatient(null);
	};

	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => navigate({ to: "/dashboard/prescriptions" })}
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div>
					<h1 className="font-bold text-2xl">Create Prescription</h1>
					<p className="text-muted-foreground">
						Create a new prescription for a patient
					</p>
				</div>
			</div>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="grid gap-6 lg:grid-cols-3"
			>
				{/* Main Form */}
				<div className="space-y-6 lg:col-span-2">
					{/* Patient Selection */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<User className="h-5 w-5" />
								Patient
							</CardTitle>
							<CardDescription>
								Search and select a patient for this prescription
							</CardDescription>
						</CardHeader>
						<CardContent>
							{selectedPatient ? (
								<div className="flex items-center justify-between rounded-lg border p-4">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
											<User className="h-5 w-5 text-primary" />
										</div>
										<div>
											<div className="flex items-center gap-2">
												<span className="font-medium">
													{selectedPatient.firstName} {selectedPatient.lastName}
												</span>
												<Badge variant="outline">
													{selectedPatient.patientType}
												</Badge>
											</div>
											<div className="flex items-center gap-2 text-muted-foreground text-sm">
												<span>{selectedPatient.patientId}</span>
												<span>|</span>
												<span>{selectedPatient.phone}</span>
											</div>
										</div>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={handleClearPatient}
									>
										Change
									</Button>
								</div>
							) : (
								<PatientSearch onSelect={handlePatientSelect} />
							)}
						</CardContent>
					</Card>

					{/* Diagnosis & Notes */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<FileText className="h-5 w-5" />
								Diagnosis
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<form.Field name="diagnosis">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Diagnosis *</Label>
										<Textarea
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
												field.handleChange(e.target.value)
											}
											placeholder="Enter the diagnosis..."
											rows={3}
										/>
										{field.state.meta.errors.map((error) => (
											<p key={String(error)} className="text-red-500 text-sm">
												{String(error)}
											</p>
										))}
									</div>
								)}
							</form.Field>

							<form.Field name="notes">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Notes</Label>
										<Textarea
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
												field.handleChange(e.target.value)
											}
											placeholder="Additional notes (optional)..."
											rows={2}
										/>
									</div>
								)}
							</form.Field>
						</CardContent>
					</Card>

					{/* Medicines */}
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle>Medicines</CardTitle>
									<CardDescription>
										Add medications to this prescription
									</CardDescription>
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleAddMedicine}
								>
									<Plus className="mr-2 h-4 w-4" />
									Add Medicine
								</Button>
							</div>
						</CardHeader>
						<CardContent className="space-y-6">
							{medicines.map((medicine, index) => (
								<div key={medicine._id} className="space-y-4">
									{index > 0 && <Separator />}
									<div className="flex items-center justify-between">
										<h4 className="font-medium text-sm">
											Medicine {index + 1}
										</h4>
										{medicines.length > 1 && (
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-destructive"
												onClick={() => handleRemoveMedicine(index)}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										)}
									</div>

									<div className="grid gap-4 sm:grid-cols-2">
										<div className="space-y-2">
											<Label>Name *</Label>
											<Input
												value={medicine.name}
												onChange={(e) =>
													handleMedicineChange(index, "name", e.target.value)
												}
												placeholder="Medicine name"
											/>
										</div>
										<div className="space-y-2">
											<Label>Dosage *</Label>
											<Input
												value={medicine.dosage}
												onChange={(e) =>
													handleMedicineChange(index, "dosage", e.target.value)
												}
												placeholder="e.g., 500mg"
											/>
										</div>
									</div>

									<div className="grid gap-4 sm:grid-cols-2">
										<div className="space-y-2">
											<Label>Frequency *</Label>
											<Select
												value={medicine.frequency}
												onValueChange={(value) =>
													handleMedicineChange(index, "frequency", value)
												}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select frequency" />
												</SelectTrigger>
												<SelectContent>
													{frequencyOptions.map((option) => (
														<SelectItem key={option.value} value={option.value}>
															{option.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<Label>Duration *</Label>
											<Input
												value={medicine.duration}
												onChange={(e) =>
													handleMedicineChange(
														index,
														"duration",
														e.target.value,
													)
												}
												placeholder="e.g., 7 days"
											/>
										</div>
									</div>

									<div className="grid gap-4 sm:grid-cols-3">
										<div className="space-y-2">
											<Label>Route</Label>
											<Select
												value={medicine.route || ""}
												onValueChange={(value) =>
													handleMedicineChange(index, "route", value)
												}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select route" />
												</SelectTrigger>
												<SelectContent>
													{routeOptions.map((option) => (
														<SelectItem key={option.value} value={option.value}>
															{option.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<Label>Quantity</Label>
											<Input
												type="number"
												value={medicine.quantity || ""}
												onChange={(e) =>
													handleMedicineChange(
														index,
														"quantity",
														e.target.value ? Number(e.target.value) : undefined,
													)
												}
												placeholder="Total qty"
												min={1}
											/>
										</div>
										<div className="space-y-2 sm:col-span-1">
											<Label>Instructions</Label>
											<Input
												value={medicine.instructions || ""}
												onChange={(e) =>
													handleMedicineChange(
														index,
														"instructions",
														e.target.value,
													)
												}
												placeholder="Special instructions"
											/>
										</div>
									</div>
								</div>
							))}
						</CardContent>
					</Card>
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					{/* Template Selection */}
					<Card>
						<CardHeader>
							<CardTitle>Template</CardTitle>
							<CardDescription>
								Optionally use a prescription template
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Select
								value={selectedTemplateId}
								onValueChange={handleTemplateSelect}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select a template" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={SELECT_NONE_VALUE}>No template</SelectItem>
									{templatesData?.data.map((template) => (
										<SelectItem key={template.id} value={template.id}>
											<div className="flex flex-col">
												<span>{template.name}</span>
												{template.condition && (
													<span className="text-muted-foreground text-xs">
														{template.condition}
													</span>
												)}
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</CardContent>
					</Card>

					{/* Follow-up Date */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Calendar className="h-5 w-5" />
								Follow-up
							</CardTitle>
						</CardHeader>
						<CardContent>
							<form.Field name="followUpDate">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Follow-up Date</Label>
										<Input
											id={field.name}
											name={field.name}
											type="date"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											min={new Date().toISOString().split("T")[0]}
										/>
									</div>
								)}
							</form.Field>
						</CardContent>
					</Card>

					{/* Submit */}
					<Card>
						<CardContent className="pt-6">
							<form.Subscribe>
								{(state) => (
									<Button
										type="submit"
										className="w-full"
										disabled={
											!selectedPatient ||
											!state.canSubmit ||
											state.isSubmitting ||
											createPrescriptionMutation.isPending
										}
									>
										{state.isSubmitting ||
										createPrescriptionMutation.isPending ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Creating...
											</>
										) : (
											<>
												<Save className="mr-2 h-4 w-4" />
												Create Prescription
											</>
										)}
									</Button>
								)}
							</form.Subscribe>
						</CardContent>
					</Card>
				</div>
			</form>
		</div>
	);
}
