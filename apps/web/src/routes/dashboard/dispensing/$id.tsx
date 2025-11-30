import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
	useParams,
} from "@tanstack/react-router";
import {
	ArrowLeft,
	Check,
	CheckCircle,
	Clock,
	FileText,
	Loader2,
	Pill,
	RotateCcw,
	User,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
	type MedicineDispenseInput,
	useCompleteDispensing,
	useDispenseMedicines,
	useDispensing,
	useMarkUnavailable,
	useReturnToQueue,
	useStartDispensing,
} from "@/hooks/use-dispensing";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/dispensing/$id")({
	component: DispensingDetailPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function getStatusBadgeVariant(
	status: string,
): "default" | "secondary" | "outline" | "destructive" {
	switch (status) {
		case "PENDING":
			return "secondary";
		case "DISPENSING":
			return "default";
		case "DISPENSED":
		case "COLLECTED":
			return "outline";
		case "CANCELLED":
		case "UNAVAILABLE":
			return "destructive";
		default:
			return "secondary";
	}
}

function DispensingDetailPage() {
	const navigate = useNavigate();
	const { id } = useParams({ from: "/dashboard/dispensing/$id" });
	const { data: dispensing, isLoading } = useDispensing(id);

	const startMutation = useStartDispensing();
	const dispenseMutation = useDispenseMedicines();
	const completeMutation = useCompleteDispensing();
	const unavailableMutation = useMarkUnavailable();
	const returnMutation = useReturnToQueue();

	// State for dispensing form
	const [dispenseQuantities, setDispenseQuantities] = useState<
		Record<string, number>
	>({});
	const [batchNumbers, setBatchNumbers] = useState<Record<string, string>>({});
	const [expiryDates] = useState<Record<string, string>>({});

	// State for dialogs
	const [returnDialogOpen, setReturnDialogOpen] = useState(false);
	const [returnReason, setReturnReason] = useState("");
	const [unavailableDialogOpen, setUnavailableDialogOpen] = useState(false);
	const [unavailableMedicineId, setUnavailableMedicineId] = useState("");
	const [unavailableReason, setUnavailableReason] = useState("");
	const [alternativeSuggested, setAlternativeSuggested] = useState("");
	const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
	const [completeNotes, setCompleteNotes] = useState("");
	const [patientCounseled, setPatientCounseled] = useState(false);

	if (isLoading) {
		return (
			<div className="flex h-[50vh] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	if (!dispensing) {
		return (
			<div className="flex h-[50vh] flex-col items-center justify-center gap-4">
				<FileText className="h-12 w-12 text-muted-foreground" />
				<p className="text-muted-foreground">Dispensing record not found</p>
				<Button asChild variant="outline">
					<Link to="/dashboard/dispensing">Back to Queue</Link>
				</Button>
			</div>
		);
	}

	const handleStartDispensing = async () => {
		try {
			await startMutation.mutateAsync(id);
			toast.success("Dispensing started");
		} catch {
			toast.error("Failed to start dispensing");
		}
	};

	const handleDispenseMedicine = async (medicineId: string) => {
		const quantity = dispenseQuantities[medicineId];
		if (!quantity || quantity <= 0) {
			toast.error("Please enter a valid quantity");
			return;
		}

		const input: MedicineDispenseInput = {
			medicineId,
			dispensedQuantity: quantity,
			batchNumber: batchNumbers[medicineId] || undefined,
			expiryDate: expiryDates[medicineId] || undefined,
		};

		try {
			await dispenseMutation.mutateAsync({
				prescriptionId: id,
				input: { medicines: [input] },
			});
			toast.success("Medicine dispensed");
			// Clear the form for this medicine
			setDispenseQuantities((prev) => ({ ...prev, [medicineId]: 0 }));
		} catch {
			toast.error("Failed to dispense medicine");
		}
	};

	const handleMarkUnavailable = async () => {
		if (!unavailableReason.trim()) {
			toast.error("Please enter a reason");
			return;
		}

		try {
			await unavailableMutation.mutateAsync({
				prescriptionId: id,
				input: {
					medicineId: unavailableMedicineId,
					reason: unavailableReason,
					alternativeSuggested: alternativeSuggested || undefined,
				},
			});
			toast.success("Medicine marked as unavailable");
			setUnavailableDialogOpen(false);
			setUnavailableReason("");
			setAlternativeSuggested("");
		} catch {
			toast.error("Failed to mark medicine as unavailable");
		}
	};

	const handleComplete = async () => {
		try {
			await completeMutation.mutateAsync({
				prescriptionId: id,
				input: {
					notes: completeNotes || undefined,
					patientCounseled,
				},
			});
			toast.success("Dispensing completed");
			setCompleteDialogOpen(false);
			navigate({ to: "/dashboard/dispensing" });
		} catch {
			toast.error("Failed to complete dispensing");
		}
	};

	const handleReturn = async () => {
		if (!returnReason.trim()) {
			toast.error("Please enter a reason");
			return;
		}

		try {
			await returnMutation.mutateAsync({
				prescriptionId: id,
				input: { reason: returnReason },
			});
			toast.success("Prescription returned to queue");
			setReturnDialogOpen(false);
			navigate({ to: "/dashboard/dispensing" });
		} catch {
			toast.error("Failed to return prescription");
		}
	};

	const canStartDispensing = dispensing.status === "PENDING";
	const isDispensing = dispensing.status === "DISPENSING";

	const pendingMedicines = dispensing.medicines.filter(
		(m) => m.status === "PENDING",
	);
	const dispensedMedicines = dispensing.medicines.filter(
		(m) => m.status === "DISPENSED",
	);
	const unavailableMedicines = dispensing.medicines.filter(
		(m) => m.status === "UNAVAILABLE",
	);

	const allMedicinesProcessed =
		pendingMedicines.length === 0 && dispensing.medicines.length > 0;

	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link to="/dashboard/dispensing">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<div className="flex-1">
					<div className="flex items-center gap-2">
						<h1 className="font-bold text-2xl">
							{dispensing.prescription.prescriptionId}
						</h1>
						<Badge variant={getStatusBadgeVariant(dispensing.status)}>
							{dispensing.status}
						</Badge>
					</div>
					<p className="text-muted-foreground">
						Dispensing details and actions
					</p>
				</div>
				<div className="flex gap-2">
					{canStartDispensing && (
						<Button
							onClick={handleStartDispensing}
							disabled={startMutation.isPending}
						>
							{startMutation.isPending && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							Start Dispensing
						</Button>
					)}
					{isDispensing && (
						<>
							<Dialog
								open={returnDialogOpen}
								onOpenChange={setReturnDialogOpen}
							>
								<DialogTrigger asChild>
									<Button variant="outline">
										<RotateCcw className="mr-2 h-4 w-4" />
										Return to Queue
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Return to Queue</DialogTitle>
										<DialogDescription>
											This will return the prescription to the pending queue.
										</DialogDescription>
									</DialogHeader>
									<div className="grid gap-4 py-4">
										<div className="grid gap-2">
											<Label htmlFor="return-reason">Reason</Label>
											<Textarea
												id="return-reason"
												placeholder="Enter reason for returning..."
												value={returnReason}
												onChange={(e) => setReturnReason(e.target.value)}
											/>
										</div>
									</div>
									<DialogFooter>
										<Button
											variant="outline"
											onClick={() => setReturnDialogOpen(false)}
										>
											Cancel
										</Button>
										<Button
											onClick={handleReturn}
											disabled={returnMutation.isPending}
										>
											{returnMutation.isPending && (
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											)}
											Return
										</Button>
									</DialogFooter>
								</DialogContent>
							</Dialog>
							{allMedicinesProcessed && (
								<Dialog
									open={completeDialogOpen}
									onOpenChange={setCompleteDialogOpen}
								>
									<DialogTrigger asChild>
										<Button>
											<CheckCircle className="mr-2 h-4 w-4" />
											Complete Dispensing
										</Button>
									</DialogTrigger>
									<DialogContent>
										<DialogHeader>
											<DialogTitle>Complete Dispensing</DialogTitle>
											<DialogDescription>
												Finalize the dispensing process for this prescription.
											</DialogDescription>
										</DialogHeader>
										<div className="grid gap-4 py-4">
											<div className="grid gap-2">
												<Label htmlFor="complete-notes">Notes (Optional)</Label>
												<Textarea
													id="complete-notes"
													placeholder="Any notes for the patient..."
													value={completeNotes}
													onChange={(e) => setCompleteNotes(e.target.value)}
												/>
											</div>
											<div className="flex items-center space-x-2">
												<Checkbox
													id="patient-counseled"
													checked={patientCounseled}
													onCheckedChange={(checked) =>
														setPatientCounseled(checked === true)
													}
												/>
												<Label htmlFor="patient-counseled">
													Patient has been counseled on medication usage
												</Label>
											</div>
										</div>
										<DialogFooter>
											<Button
												variant="outline"
												onClick={() => setCompleteDialogOpen(false)}
											>
												Cancel
											</Button>
											<Button
												onClick={handleComplete}
												disabled={completeMutation.isPending}
											>
												{completeMutation.isPending && (
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												)}
												Complete
											</Button>
										</DialogFooter>
									</DialogContent>
								</Dialog>
							)}
						</>
					)}
				</div>
			</div>

			{/* Patient and Prescription Info */}
			<div className="grid gap-4 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<User className="h-5 w-5" />
							Patient Information
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<div>
							<span className="text-muted-foreground text-sm">Name</span>
							<p className="font-medium">
								{dispensing.patient.firstName} {dispensing.patient.lastName}
							</p>
						</div>
						<div>
							<span className="text-muted-foreground text-sm">Patient ID</span>
							<p className="font-medium">{dispensing.patient.patientId}</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<FileText className="h-5 w-5" />
							Prescription Details
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<div>
							<span className="text-muted-foreground text-sm">Diagnosis</span>
							<p className="font-medium">{dispensing.prescription.diagnosis}</p>
						</div>
						{dispensing.prescription.notes && (
							<div>
								<span className="text-muted-foreground text-sm">Notes</span>
								<p className="font-medium">{dispensing.prescription.notes}</p>
							</div>
						)}
						<div>
							<span className="text-muted-foreground text-sm">Created</span>
							<p className="font-medium">
								{new Date(dispensing.prescription.createdAt).toLocaleString()}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Dispensing Status */}
			{dispensing.assignedTo && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Clock className="h-5 w-5" />
							Dispensing Status
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<div className="flex gap-8">
							<div>
								<span className="text-muted-foreground text-sm">
									Assigned To
								</span>
								<p className="font-medium">
									{dispensing.assignedTo.firstName}{" "}
									{dispensing.assignedTo.lastName}
								</p>
							</div>
							{dispensing.startedAt && (
								<div>
									<span className="text-muted-foreground text-sm">
										Started At
									</span>
									<p className="font-medium">
										{new Date(dispensing.startedAt).toLocaleString()}
									</p>
								</div>
							)}
							{dispensing.completedAt && (
								<div>
									<span className="text-muted-foreground text-sm">
										Completed At
									</span>
									<p className="font-medium">
										{new Date(dispensing.completedAt).toLocaleString()}
									</p>
								</div>
							)}
						</div>
						{dispensing.notes && (
							<div>
								<span className="text-muted-foreground text-sm">Notes</span>
								<p className="font-medium">{dispensing.notes}</p>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* Medicines Table */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Pill className="h-5 w-5" />
						Medicines
					</CardTitle>
					<CardDescription>
						{dispensedMedicines.length} of {dispensing.medicines.length}{" "}
						dispensed
						{unavailableMedicines.length > 0 &&
							` • ${unavailableMedicines.length} unavailable`}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Medicine</TableHead>
								<TableHead>Prescribed</TableHead>
								<TableHead>Dispensed</TableHead>
								<TableHead>Status</TableHead>
								{isDispensing && <TableHead>Actions</TableHead>}
							</TableRow>
						</TableHeader>
						<TableBody>
							{dispensing.medicines.map((medicine) => (
								<TableRow key={medicine.id}>
									<TableCell>
										<div className="font-medium">{medicine.name}</div>
										{medicine.batchNumber && (
											<div className="text-muted-foreground text-xs">
												Batch: {medicine.batchNumber}
											</div>
										)}
									</TableCell>
									<TableCell>{medicine.prescribedQuantity}</TableCell>
									<TableCell>{medicine.dispensedQuantity}</TableCell>
									<TableCell>
										<Badge variant={getStatusBadgeVariant(medicine.status)}>
											{medicine.status}
										</Badge>
										{medicine.substituted && (
											<Badge variant="outline" className="ml-2">
												Substituted
											</Badge>
										)}
									</TableCell>
									{isDispensing && medicine.status === "PENDING" && (
										<TableCell>
											<div className="flex flex-col gap-2">
												<div className="flex gap-2">
													<Input
														type="number"
														placeholder="Qty"
														className="w-20"
														min={1}
														max={medicine.prescribedQuantity}
														value={dispenseQuantities[medicine.id] || ""}
														onChange={(e) =>
															setDispenseQuantities((prev) => ({
																...prev,
																[medicine.id]: Number.parseInt(
																	e.target.value,
																	10,
																),
															}))
														}
													/>
													<Input
														placeholder="Batch #"
														className="w-24"
														value={batchNumbers[medicine.id] || ""}
														onChange={(e) =>
															setBatchNumbers((prev) => ({
																...prev,
																[medicine.id]: e.target.value,
															}))
														}
													/>
													<Button
														size="sm"
														onClick={() => handleDispenseMedicine(medicine.id)}
														disabled={dispenseMutation.isPending}
													>
														<Check className="h-4 w-4" />
													</Button>
												</div>
												<Button
													variant="ghost"
													size="sm"
													className="text-destructive"
													onClick={() => {
														setUnavailableMedicineId(medicine.id);
														setUnavailableDialogOpen(true);
													}}
												>
													<XCircle className="mr-1 h-3 w-3" />
													Mark Unavailable
												</Button>
											</div>
										</TableCell>
									)}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* Mark Unavailable Dialog */}
			<Dialog
				open={unavailableDialogOpen}
				onOpenChange={setUnavailableDialogOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Mark Medicine as Unavailable</DialogTitle>
						<DialogDescription>
							This medicine will be marked as unavailable and the prescribing
							doctor will be notified.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="unavailable-reason">Reason</Label>
							<Textarea
								id="unavailable-reason"
								placeholder="Enter reason for unavailability..."
								value={unavailableReason}
								onChange={(e) => setUnavailableReason(e.target.value)}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="alternative">
								Alternative Suggestion (Optional)
							</Label>
							<Input
								id="alternative"
								placeholder="Suggest an alternative medicine..."
								value={alternativeSuggested}
								onChange={(e) => setAlternativeSuggested(e.target.value)}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setUnavailableDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleMarkUnavailable}
							disabled={unavailableMutation.isPending}
						>
							{unavailableMutation.isPending && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							Mark Unavailable
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
