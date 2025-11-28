// Input DTO
export interface RegisterHospitalInput {
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
	adminEmail: string;
	adminPhone: string;
}

// Output DTO
export interface RegisterHospitalOutput {
	id: string;
	tenantId: string;
	name: string;
	status: string;
	adminUsername: string;
	message: string;
}
