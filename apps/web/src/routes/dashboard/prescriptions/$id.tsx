import { useForm } from "@tanstack/react-form";
import {
	createFileRoute,
	redirect,
	useNavigate,
	useParams,
} from "@tanstack/react-router";
import {
	ArrowLeft,
	Ban,
	Calendar,
	Check,
	Clock,
	FileText,
	Loader2,
	Pill,
	Plus,
	Save,
	Stethoscope,
	Trash2,
	User,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
	type MedicineInput,
	type PrescriptionStatus,
	useCancelPrescription,
	usePrescription,
	useUpdatePrescription,
} from "@/hooks/use-prescriptions";
import { authClient } from "@/lib/auth-client";
import type { ApiError } from "@/lib/prescriptions-client";

export const Route = createFileRoute("/dashboard/prescriptions/$id")({
	component: PrescriptionDetailPage,
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

function getStatusBadgeVariant(
	status: PrescriptionStatus,
): "default" | "secondary" | "outline" | "destructive" {
	switch (status) {
		case "PENDING":
			return "secondary";
		case "DISPENSING":
			return "default";
		case "DISPENSED":
			return "outline";
		case "COMPLETED":
			return "outline";
		case "CANCELLED":
			return "destructive";
		default:
			return "secondary";
	}
}

function isModifiable(status: PrescriptionStatus): boolean {
	return !["DISPENSED", "COMPLETED", "CANCELLED"].includes(status);
}

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

function PrescriptionDetailPage() {
	const navigate = useNavigate();
	const { id } = useParams({ from: "/dashboard/prescriptions/$id" });
	const { data: prescription, isLoading: prescriptionLoading } =
		usePrescription(id);
	const updatePrescriptionMutation = useUpdatePrescription();
	const cancelPrescriptionMutation = useCancelPrescription();

	const [isEditing, setIsEditing] = useState(false);
	const [medicines, setMedicines] = useState<MedicineWithId[]>([]);
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [cancellationReason, setCancellationReason] = useState("");

	// Initialize medicines when prescription data loads
	if (
		prescription &&
		medicines.length === 0 &&
		prescription.medicines.length > 0
	) {
		setMedicines(
			prescription.medicines.map((m) => ({
				_id: generateMedicineId(),
				name: m.name,
				dosage: m.dosage,
				frequency: m.frequency,
				duration: m.duration,
				instructions: m.instructions || "",
				route: m.route || "",
				quantity: m.quantity,
			})),
		);
	}

	const form = useForm({
		defaultValues: {
			diagnosis: prescription?.diagnosis || "",
			notes: prescription?.notes || "",
			followUpDate: prescription?.followUpDate
				? prescription.followUpDate.split("T")[0]
				: "",
		},
		onSubmit: async ({ value }) => {
			// Validate medicines
			const validMedicines = medicines.filter(
				(m) => m.name && m.dosage && m.frequency && m.duration,
			);
			if (validMedicines.length === 0) {
				toast.error("At least one complete medicine entry is required");
				return;
			}

			try {
				await updatePrescriptionMutation.mutateAsync({
					id,
					data: {
						diagnosis: value.diagnosis,
						notes: value.notes || undefined,
						medicines: validMedicines,
						followUpDate: value.followUpDate
							? new Date(value.followUpDate).toISOString()
							: undefined,
					},
				});
				toast.success("Prescription updated successfully");
				setIsEditing(false);
			} catch (error) {
				const apiError = error as ApiError;
				toast.error(apiError.message || "Failed to update prescription");
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

	// Update form when prescription data loads
	if (prescription && !form.state.values.diagnosis && prescription.diagnosis) {
		form.reset({
			diagnosis: prescription.diagnosis,
			notes: prescription.notes || "",
			followUpDate: prescription.followUpDate
				? prescription.followUpDate.split("T")[0]
				: "",
		});
	}

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

	const handleCancelEdit = () => {
		if (prescription) {
			form.reset({
				diagnosis: prescription.diagnosis,
				notes: prescription.notes || "",
				followUpDate: prescription.followUpDate
					? prescription.followUpDate.split("T")[0]
					: "",
			});
			setMedicines(
				prescription.medicines.map((m) => ({
					_id: generateMedicineId(),
					name: m.name,
					dosage: m.dosage,
					frequency: m.frequency,
					duration: m.duration,
					instructions: m.instructions || "",
					route: m.route || "",
					quantity: m.quantity,
				})),
			);
		}
		setIsEditing(false);
	};

	const handleCancelPrescription = async () => {
		try {
			await cancelPrescriptionMutation.mutateAsync({
				id,
				data: { reason: cancellationReason || undefined },
			});
			toast.success("Prescription cancelled successfully");
			setCancelDialogOpen(false);
			setCancellationReason("");
		} catch (error) {
			const apiError = error as ApiError;
			toast.error(apiError.message || "Failed to cancel prescription");
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	const formatDateTime = (dateString: string) => {
		return new Date(dateString).toLocaleString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	if (prescriptionLoading) {
		return (
			<div className="flex h-64 items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	if (!prescription) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 p-8">
				<h2 className="font-semibold text-xl">Prescription not found</h2>
				<Button onClick={() => navigate({ to: "/dashboard/prescriptions" })}>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back to Prescriptions
				</Button>
			</div>
		);
	}

	const canEdit = isModifiable(prescription.status);

	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => navigate({ to: "/dashboard/prescriptions" })}
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div>
						<div className="flex items-center gap-2">
							<h1 className="font-bold text-2xl">
								{prescription.prescriptionId}
							</h1>
							<Badge variant={getStatusBadgeVariant(prescription.status)}>
								{prescription.status}
							</Badge>
						</div>
						<p className="text-muted-foreground">
							Created on {formatDate(prescription.createdAt)}
						</p>
					</div>
				</div>
				{canEdit && !isEditing && (
					<div className="flex gap-2">
						<Button
							variant="outline"
							className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
							onClick={() => setCancelDialogOpen(true)}
						>
							<Ban className="mr-2 h-4 w-4" />
							Cancel Prescription
						</Button>
						<Button onClick={() => setIsEditing(true)}>
							Edit Prescription
						</Button>
					</div>
				)}
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Main Content */}
				<div className="space-y-6 lg:col-span-2">
					{/* Diagnosis & Notes */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<FileText className="h-5 w-5" />
								Diagnosis
							</CardTitle>
						</CardHeader>
						<CardContent>
							{isEditing ? (
								<form
									onSubmit={(e) => {
										e.preventDefault();
										e.stopPropagation();
										form.handleSubmit();
									}}
									className="space-y-4"
								>
									<form.Field name="diagnosis">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor={field.name}>Diagnosis *</Label>
												<Textarea
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(
														e: React.ChangeEvent<HTMLTextAreaElement>,
													) => field.handleChange(e.target.value)}
													rows={3}
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

									<form.Field name="notes">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor={field.name}>Notes</Label>
												<Textarea
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(
														e: React.ChangeEvent<HTMLTextAreaElement>,
													) => field.handleChange(e.target.value)}
													rows={2}
												/>
											</div>
										)}
									</form.Field>

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
													className="w-48"
												/>
											</div>
										)}
									</form.Field>
								</form>
							) : (
								<div className="space-y-4">
									<div>
										<Label className="text-muted-foreground text-xs">
											Diagnosis
										</Label>
										<p className="mt-1">{prescription.diagnosis}</p>
									</div>
									{prescription.notes && (
										<div>
											<Label className="text-muted-foreground text-xs">
												Notes
											</Label>
											<p className="mt-1">{prescription.notes}</p>
										</div>
									)}
									{prescription.followUpDate && (
										<div>
											<Label className="text-muted-foreground text-xs">
												Follow-up Date
											</Label>
											<p className="mt-1">
												{formatDate(prescription.followUpDate)}
											</p>
										</div>
									)}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Medicines */}
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle className="flex items-center gap-2">
										<Pill className="h-5 w-5" />
										Medicines
									</CardTitle>
									<CardDescription>
										{prescription.medicines.length} medication(s) prescribed
									</CardDescription>
								</div>
								{isEditing && (
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={handleAddMedicine}
									>
										<Plus className="mr-2 h-4 w-4" />
										Add Medicine
									</Button>
								)}
							</div>
						</CardHeader>
						<CardContent>
							{isEditing ? (
								<div className="space-y-6">
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
															handleMedicineChange(
																index,
																"name",
																e.target.value,
															)
														}
														placeholder="Medicine name"
													/>
												</div>
												<div className="space-y-2">
													<Label>Dosage *</Label>
													<Input
														value={medicine.dosage}
														onChange={(e) =>
															handleMedicineChange(
																index,
																"dosage",
																e.target.value,
															)
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
																<SelectItem
																	key={option.value}
																	value={option.value}
																>
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
																<SelectItem
																	key={option.value}
																	value={option.value}
																>
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
																e.target.value
																	? Number(e.target.value)
																	: undefined,
															)
														}
														placeholder="Total qty"
														min={1}
													/>
												</div>
												<div className="space-y-2">
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
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Medicine</TableHead>
											<TableHead>Dosage</TableHead>
											<TableHead>Frequency</TableHead>
											<TableHead>Duration</TableHead>
											<TableHead>Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{prescription.medicines.map((medicine) => (
											<TableRow key={medicine.id}>
												<TableCell>
													<div>
														<div className="font-medium">{medicine.name}</div>
														{medicine.route && (
															<div className="text-muted-foreground text-xs">
																{medicine.route}
															</div>
														)}
													</div>
												</TableCell>
												<TableCell>{medicine.dosage}</TableCell>
												<TableCell>{medicine.frequency}</TableCell>
												<TableCell>{medicine.duration}</TableCell>
												<TableCell>
													{medicine.dispensed ? (
														<Badge variant="outline" className="gap-1">
															<Check className="h-3 w-3" />
															Dispensed
														</Badge>
													) : (
														<Badge variant="secondary">Pending</Badge>
													)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>

					{/* Edit Actions */}
					{isEditing && (
						<div className="flex justify-end gap-4">
							<Button
								type="button"
								variant="outline"
								onClick={handleCancelEdit}
							>
								Cancel
							</Button>
							<form.Subscribe>
								{(state) => (
									<Button
										type="button"
										onClick={() => form.handleSubmit()}
										disabled={
											!state.canSubmit ||
											state.isSubmitting ||
											updatePrescriptionMutation.isPending
										}
									>
										{state.isSubmitting ||
										updatePrescriptionMutation.isPending ? (
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
					)}
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					{/* Patient Info */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<User className="h-4 w-4" />
								Patient
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div>
								<Label className="text-muted-foreground text-xs">Name</Label>
								<p className="font-medium">
									{prescription.patient.firstName}{" "}
									{prescription.patient.lastName}
								</p>
							</div>
							<div>
								<Label className="text-muted-foreground text-xs">
									Patient ID
								</Label>
								<p>{prescription.patient.patientId}</p>
							</div>
							<div>
								<Label className="text-muted-foreground text-xs">Phone</Label>
								<p>{prescription.patient.phone}</p>
							</div>
							{prescription.patient.email && (
								<div>
									<Label className="text-muted-foreground text-xs">Email</Label>
									<p>{prescription.patient.email}</p>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Doctor Info */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Stethoscope className="h-4 w-4" />
								Prescribing Doctor
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div>
								<Label className="text-muted-foreground text-xs">Name</Label>
								<p className="font-medium">
									Dr. {prescription.doctor.firstName}{" "}
									{prescription.doctor.lastName}
								</p>
							</div>
							{prescription.doctor.specialization && (
								<div>
									<Label className="text-muted-foreground text-xs">
										Specialization
									</Label>
									<p>{prescription.doctor.specialization}</p>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Dispensing Info */}
					{prescription.dispensedBy && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Pill className="h-4 w-4" />
									Dispensing Info
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div>
									<Label className="text-muted-foreground text-xs">
										Dispensed By
									</Label>
									<p className="font-medium">
										{prescription.dispensedBy.firstName}{" "}
										{prescription.dispensedBy.lastName}
									</p>
								</div>
								{prescription.dispensedAt && (
									<div>
										<Label className="text-muted-foreground text-xs">
											Dispensed At
										</Label>
										<p>{formatDateTime(prescription.dispensedAt)}</p>
									</div>
								)}
							</CardContent>
						</Card>
					)}

					{/* Timestamps */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Clock className="h-4 w-4" />
								Timeline
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div>
								<Label className="text-muted-foreground text-xs">Created</Label>
								<p>{formatDateTime(prescription.createdAt)}</p>
							</div>
							<div>
								<Label className="text-muted-foreground text-xs">
									Last Updated
								</Label>
								<p>{formatDateTime(prescription.updatedAt)}</p>
							</div>
							{prescription.followUpDate && (
								<div>
									<Label className="text-muted-foreground text-xs">
										<Calendar className="mr-1 inline h-3 w-3" />
										Follow-up
									</Label>
									<p>{formatDate(prescription.followUpDate)}</p>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Cancel Prescription Dialog */}
			<AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancel Prescription</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to cancel this prescription? This action
							cannot be undone and will prevent dispensing of any remaining
							medications.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="py-4">
						<Label
							htmlFor="cancellation-reason"
							className="font-medium text-sm"
						>
							Reason for cancellation (optional)
						</Label>
						<Textarea
							id="cancellation-reason"
							placeholder="Enter reason for cancellation..."
							value={cancellationReason}
							onChange={(e) => setCancellationReason(e.target.value)}
							className="mt-2"
							rows={3}
						/>
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel
							onClick={() => {
								setCancellationReason("");
							}}
						>
							Keep Prescription
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleCancelPrescription}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							disabled={cancelPrescriptionMutation.isPending}
						>
							{cancelPrescriptionMutation.isPending ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Ban className="mr-2 h-4 w-4" />
							)}
							Cancel Prescription
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
