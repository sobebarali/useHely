import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import {
	ArrowUpDown,
	BookTemplate,
	Loader2,
	MoreHorizontal,
	Plus,
	Search,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
	type TemplateListItem,
	useDeleteTemplate,
	useTemplates,
} from "@/hooks/use-prescriptions";
import { authClient } from "@/lib/auth-client";
import type { ApiError } from "@/lib/prescriptions-client";

export const Route = createFileRoute("/dashboard/prescriptions/templates/")({
	component: TemplatesListPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function TemplatesListPage() {
	const [search, setSearch] = useState("");
	const [categoryFilter, setCategoryFilter] = useState<string>("");
	const [sorting, setSorting] = useState<SortingState>([]);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedTemplate, setSelectedTemplate] =
		useState<TemplateListItem | null>(null);

	const { data: templatesData, isLoading: templatesLoading } = useTemplates({
		search: search || undefined,
		category:
			categoryFilter && categoryFilter !== "ALL" ? categoryFilter : undefined,
	});
	const deleteTemplateMutation = useDeleteTemplate();

	const handleDeleteTemplate = async () => {
		if (!selectedTemplate) return;
		try {
			await deleteTemplateMutation.mutateAsync(selectedTemplate.id);
			toast.success("Template deleted successfully");
			setDeleteDialogOpen(false);
			setSelectedTemplate(null);
		} catch (error) {
			const apiError = error as ApiError;
			toast.error(apiError.message || "Failed to delete template");
		}
	};

	const columns: ColumnDef<TemplateListItem>[] = [
		{
			accessorKey: "name",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Template Name
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			),
			cell: ({ row }) => (
				<div className="font-medium">{row.getValue("name")}</div>
			),
		},
		{
			accessorKey: "category",
			header: "Category",
			cell: ({ row }) => {
				const category = row.original.category;
				return category ? (
					<Badge variant="outline">{category}</Badge>
				) : (
					<span className="text-muted-foreground">-</span>
				);
			},
		},
		{
			accessorKey: "condition",
			header: "Condition",
			cell: ({ row }) => {
				const condition = row.original.condition;
				return condition ? (
					<div className="max-w-[200px] truncate" title={condition}>
						{condition}
					</div>
				) : (
					<span className="text-muted-foreground">-</span>
				);
			},
		},
		{
			accessorKey: "medicines",
			header: "Medicines",
			cell: ({ row }) => (
				<Badge variant="secondary">{row.original.medicines.length} items</Badge>
			),
		},
		{
			accessorKey: "isSystem",
			header: "Type",
			cell: ({ row }) => (
				<Badge variant={row.original.isSystem ? "default" : "outline"}>
					{row.original.isSystem ? "System" : "Custom"}
				</Badge>
			),
		},
		{
			accessorKey: "createdBy",
			header: "Created By",
			cell: ({ row }) => {
				const createdBy = row.original.createdBy;
				return createdBy ? (
					<div>
						Dr. {createdBy.firstName} {createdBy.lastName}
					</div>
				) : (
					<span className="text-muted-foreground">System</span>
				);
			},
		},
		{
			id: "actions",
			enableHiding: false,
			cell: ({ row }) => {
				const template = row.original;
				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="h-8 w-8 p-0">
								<span className="sr-only">Open menu</span>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Actions</DropdownMenuLabel>
							<DropdownMenuItem asChild>
								<Link
									to="/dashboard/prescriptions/templates/$id"
									params={{ id: template.id }}
								>
									View details
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link
									to="/dashboard/prescriptions/create"
									search={{ templateId: template.id }}
								>
									Use template
								</Link>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];

	const table = useReactTable({
		data: templatesData?.data ?? [],
		columns,
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		state: {
			sorting,
		},
	});

	// Get unique categories from templates data
	const categories = [
		...new Set(
			templatesData?.data
				.map((t) => t.category)
				.filter((c): c is string => !!c) ?? [],
		),
	];

	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-bold text-2xl">Prescription Templates</h1>
					<p className="text-muted-foreground">
						Manage reusable prescription templates for faster prescribing
					</p>
				</div>
				<Button asChild>
					<Link to="/dashboard/prescriptions/templates/create">
						<Plus className="mr-2 h-4 w-4" />
						New Template
					</Link>
				</Button>
			</div>

			{/* Filters */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
				<div className="relative flex-1">
					<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search templates by name..."
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
						}}
						className="pl-9"
					/>
				</div>
				<div className="flex gap-2">
					<div className="w-40">
						<Label htmlFor="category-filter" className="sr-only">
							Category
						</Label>
						<Select
							value={categoryFilter}
							onValueChange={(value) => {
								setCategoryFilter(value);
							}}
						>
							<SelectTrigger id="category-filter">
								<SelectValue placeholder="All categories" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">All categories</SelectItem>
								{categories.map((category) => (
									<SelectItem key={category} value={category}>
										{category}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
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
						{templatesLoading ? (
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
										<BookTemplate className="h-8 w-8 text-muted-foreground" />
										<p className="text-muted-foreground">No templates found.</p>
										<Button asChild variant="outline" size="sm">
											<Link to="/dashboard/prescriptions/templates/create">
												Create your first template
											</Link>
										</Button>
									</div>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Count */}
			{templatesData && (
				<div className="flex items-center justify-between px-2">
					<div className="text-muted-foreground text-sm">
						Showing {templatesData.data.length} template
						{templatesData.data.length !== 1 ? "s" : ""}
					</div>
				</div>
			)}
		</div>
	);
}
