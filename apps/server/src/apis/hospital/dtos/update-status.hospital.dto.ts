// Input DTO
export interface UpdateStatusInput {
	status: string;
	reason?: string;
}

// Output DTO
export interface UpdateStatusOutput {
	id: string;
	status: string;
	updatedAt: string;
}
