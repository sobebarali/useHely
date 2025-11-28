// Re-export Zod-inferred type as Input DTO (single source of truth)
export type { RegisterHospitalValidated as RegisterHospitalInput } from "../validations/register.hospital.validation";

// Output DTO
export interface RegisterHospitalOutput {
	id: string;
	tenantId: string;
	name: string;
	status: string;
	adminUsername: string;
	message: string;
}
