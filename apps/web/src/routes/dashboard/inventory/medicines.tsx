import { createFileRoute, Link } from "@tanstack/react-router";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import {
	ArrowLeft,
	ArrowUpDown,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Loader2,
	Package,
	Plus,
	Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
	type AddMedicineInput,
	type MedicineCategory,
	type MedicineItem,
	type MedicineType,
	useAddMedicine,
	useMedicines,
} from "@/hooks/use-inventory";
import type { ApiError } from "@/lib/inventory-client";

const searchSchema = z.object({
	action: z.enum(["add"]).optional(),
});

export const Route = createFileRoute("/dashboard/inventory/medicines")({
	component: MedicinesCatalogPage,
	validateSearch: searchSchema,
});

// Category options
const categoryOptions: { value: MedicineCategory; label: string }[] = [
	{ value: "ANALGESICS", label: "Analgesics" },
	{ value: "ANTIBIOTICS", label: "Antibiotics" },
	{ value: "ANTIDIABETICS", label: "Antidiabetics" },
	{ value: "ANTIHYPERTENSIVES", label: "Antihypertensives" },
	{ value: "ANTIHISTAMINES", label: "Antihistamines" },
	{ value: "CARDIOVASCULAR", label: "Cardiovascular" },
	{ value: "GASTROINTESTINAL", label: "Gastrointestinal" },
	{ value: "RESPIRATORY", label: "Respiratory" },
	{ value: "VITAMINS", label: "Vitamins" },
	{ value: "TOPICAL", label: "Topical" },
	{ value: "INJECTABLE", label: "Injectable" },
	{ value: "OTHER", label: "Other" },
];

// Type options
const typeOptions: { value: MedicineType; label: string }[] = [
	{ value: "TABLET", label: "Tablet" },
	{ value: "CAPSULE", label: "Capsule" },
	{ value: "SYRUP", label: "Syrup" },
	{ value: "INJECTION", label: "Injection" },
	{ value: "CREAM", label: "Cream" },
	{ value: "OINTMENT", label: "Ointment" },
	{ value: "DROPS", label: "Drops" },
	{ value: "INHALER", label: "Inhaler" },
	{ value: "POWDER", label: "Powder" },
	{ value: "SUSPENSION", label: "Suspension" },
];

function MedicinesCatalogPage() {
	const { action } = Route.useSearch();

	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [categoryFilter, setCategoryFilter] = useState<string>("");
	const [typeFilter, setTypeFilter] = useState<string>("");
	const [sorting, setSorting] = useState<SortingState>([]);

	// Dialog state
	const [addDialogOpen, setAddDialogOpen] = useState(false);

	// Form state
	const [form, setForm] = useState<AddMedicineInput>({
		name: "",
		genericName: "",
		code: "",
		category: "OTHER",
		type: "TABLET",
		manufacturer: "",
		strength: "",
		unit: "",
		reorderLevel: 10,
		maxStock: undefined,
		description: "",
	});

	const { data: medicinesData, isLoading } = useMedicines({
		page,
		limit: 10,
		search: search || undefined,
		category:
			categoryFilter && categoryFilter !== "ALL" ? categoryFilter : undefined,
		type: typeFilter && typeFilter !== "ALL" ? typeFilter : undefined,
	});

	const addMedicineMutation = useAddMedicine();

	// Handle action from URL
	useEffect(() => {
		if (action === "add") {
			setAddDialogOpen(true);
		}
	}, [action]);

	const handleAddMedicine = async () => {
		try {
			await addMedicineMutation.mutateAsync(form);
			toast.success("Medicine added to catalog");
			setAddDialogOpen(false);
			setForm({
				name: "",
				genericName: "",
				code: "",
				category: "OTHER",
				type: "TABLET",
				manufacturer: "",
				strength: "",
				unit: "",
				reorderLevel: 10,
				maxStock: undefined,
				description: "",
			});
		} catch (err) {
			const apiError = err as ApiError;
			toast.error(apiError.message || "Failed to add medicine");
		}
	};

	const columns: ColumnDef<MedicineItem>[] = [
		{
			accessorKey: "name",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Name
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			),
			cell: ({ row }) => (
				<div className="flex flex-col">
					<span className="font-medium">{row.original.name}</span>
					<span className="text-muted-foreground text-xs">
						{row.original.genericName}
					</span>
				</div>
			),
		},
		{
			accessorKey: "code",
			header: "Code",
			cell: ({ row }) => (
				<span className="font-mono text-sm">{row.original.code}</span>
			),
		},
		{
			accessorKey: "category",
			header: "Category",
			cell: ({ row }) => (
				<Badge variant="outline">{row.original.category}</Badge>
			),
		},
		{
			accessorKey: "type",
			header: "Type",
			cell: ({ row }) => <Badge variant="secondary">{row.original.type}</Badge>,
		},
		{
			accessorKey: "manufacturer",
			header: "Manufacturer",
			cell: ({ row }) => (
				<span className="text-muted-foreground">
					{row.original.manufacturer || "—"}
				</span>
			),
		},
		{
			accessorKey: "strength",
			header: "Strength",
			cell: ({ row }) => (
				<span className="text-muted-foreground">
					{row.original.strength || "—"}
				</span>
			),
		},
		{
			accessorKey: "unit",
			header: "Unit",
			cell: ({ row }) => <span>{row.original.unit}</span>,
		},
	];

	const table = useReactTable({
		data: medicinesData?.data ?? [],
		columns,
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		state: {
			sorting,
		},
		manualPagination: true,
		pageCount: medicinesData?.pagination.totalPages ?? 0,
	});

	return (
		<>
			<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
				{/* Header */}
				<div className="flex items-center gap-4">
					<Button variant="ghost" size="icon" asChild>
						<Link to="/dashboard/inventory">
							<ArrowLeft className="h-4 w-4" />
						</Link>
					</Button>
					<div className="flex-1">
						<h1 className="font-bold text-2xl">Medicine Catalog</h1>
						<p className="text-muted-foreground">
							Manage your medicine catalog and add new medicines
						</p>
					</div>
					<Button onClick={() => setAddDialogOpen(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Add Medicine
					</Button>
				</div>

				{/* Filters */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
					<div className="relative flex-1">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search by name or code..."
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setPage(1);
							}}
							className="pl-9"
						/>
					</div>
					<div className="flex gap-2">
						<Select
							value={categoryFilter}
							onValueChange={(value) => {
								setCategoryFilter(value);
								setPage(1);
							}}
						>
							<SelectTrigger className="w-40">
								<SelectValue placeholder="All categories" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">All categories</SelectItem>
								{categoryOptions.map((cat) => (
									<SelectItem key={cat.value} value={cat.value}>
										{cat.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select
							value={typeFilter}
							onValueChange={(value) => {
								setTypeFilter(value);
								setPage(1);
							}}
						>
							<SelectTrigger className="w-36">
								<SelectValue placeholder="All types" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">All types</SelectItem>
								{typeOptions.map((type) => (
									<SelectItem key={type.value} value={type.value}>
										{type.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* Table */}
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) => (
										<TableHead key={header.id}>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
										</TableHead>
									))}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell
										colSpan={columns.length}
										className="h-24 text-center"
									>
										<Loader2 className="mx-auto h-6 w-6 animate-spin" />
									</TableCell>
								</TableRow>
							) : table.getRowModel().rows?.length ? (
								table.getRowModel().rows.map((row) => (
									<TableRow key={row.id}>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id}>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</TableCell>
										))}
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={columns.length}
										className="h-24 text-center"
									>
										<div className="flex flex-col items-center gap-2">
											<Package className="h-8 w-8 text-muted-foreground" />
											<p>No medicines found.</p>
										</div>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				{/* Pagination */}
				{medicinesData && (
					<div className="flex items-center justify-between px-2">
						<div className="text-muted-foreground text-sm">
							Showing {medicinesData.data.length} of{" "}
							{medicinesData.pagination.total} medicines
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="icon"
								onClick={() => setPage(1)}
								disabled={page === 1}
							>
								<ChevronsLeft className="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={page === 1}
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
							<span className="text-sm">
								Page {page} of {medicinesData.pagination.totalPages || 1}
							</span>
							<Button
								variant="outline"
								size="icon"
								onClick={() =>
									setPage((p) =>
										Math.min(medicinesData.pagination.totalPages, p + 1),
									)
								}
								disabled={
									page === medicinesData.pagination.totalPages ||
									medicinesData.pagination.totalPages === 0
								}
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								onClick={() => setPage(medicinesData.pagination.totalPages)}
								disabled={
									page === medicinesData.pagination.totalPages ||
									medicinesData.pagination.totalPages === 0
								}
							>
								<ChevronsRight className="h-4 w-4" />
							</Button>
						</div>
					</div>
				)}
			</div>

			{/* Add Medicine Dialog */}
			<Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
				<DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Add Medicine to Catalog</DialogTitle>
						<DialogDescription>
							Add a new medicine to your hospital's catalog
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="name">Name *</Label>
							<Input
								id="name"
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
								placeholder="e.g., Paracetamol"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="genericName">Generic Name *</Label>
							<Input
								id="genericName"
								value={form.genericName}
								onChange={(e) =>
									setForm({ ...form, genericName: e.target.value })
								}
								placeholder="e.g., Acetaminophen"
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="category">Category *</Label>
								<Select
									value={form.category}
									onValueChange={(value) =>
										setForm({ ...form, category: value as MedicineCategory })
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{categoryOptions.map((cat) => (
											<SelectItem key={cat.value} value={cat.value}>
												{cat.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="type">Type *</Label>
								<Select
									value={form.type}
									onValueChange={(value) =>
										setForm({ ...form, type: value as MedicineType })
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{typeOptions.map((type) => (
											<SelectItem key={type.value} value={type.value}>
												{type.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="unit">Unit *</Label>
							<Input
								id="unit"
								value={form.unit}
								onChange={(e) => setForm({ ...form, unit: e.target.value })}
								placeholder="e.g., tablets, ml, mg"
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="strength">Strength</Label>
								<Input
									id="strength"
									value={form.strength}
									onChange={(e) =>
										setForm({ ...form, strength: e.target.value })
									}
									placeholder="e.g., 500mg"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="manufacturer">Manufacturer</Label>
								<Input
									id="manufacturer"
									value={form.manufacturer}
									onChange={(e) =>
										setForm({ ...form, manufacturer: e.target.value })
									}
									placeholder="Manufacturer name"
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="reorderLevel">Reorder Level</Label>
								<Input
									id="reorderLevel"
									type="number"
									min="1"
									value={form.reorderLevel || ""}
									onChange={(e) =>
										setForm({
											...form,
											reorderLevel:
												Number.parseInt(e.target.value, 10) || undefined,
										})
									}
									placeholder="10"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="maxStock">Max Stock</Label>
								<Input
									id="maxStock"
									type="number"
									min="1"
									value={form.maxStock || ""}
									onChange={(e) =>
										setForm({
											...form,
											maxStock:
												Number.parseInt(e.target.value, 10) || undefined,
										})
									}
									placeholder="Optional"
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								value={form.description}
								onChange={(e) =>
									setForm({ ...form, description: e.target.value })
								}
								placeholder="Additional notes about this medicine..."
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setAddDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleAddMedicine}
							disabled={
								addMedicineMutation.isPending ||
								!form.name ||
								!form.genericName ||
								!form.unit
							}
						>
							{addMedicineMutation.isPending && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							Add Medicine
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
