// Input DTO
export interface GetHospitalByIdInput {
	id: string;
}

// Output DTO
export interface GetHospitalByIdOutput {
	id: string;
	tenantId: string;
	name: string;
	address: {
		street: string;
		city: string;
		state: string;
		postalCode: string;
		country: string;
	};
	contactEmail: string;
	contactPhone: string;
	licenseNumber: string;
	status: string;
	createdAt: string;
	updatedAt: string;
}
