import { schema } from '@/lib/db/client';

export function serializeEmployee(e: typeof schema.employees.$inferSelect) {
  return {
    id: e.id, fullName: e.fullName, nationalId: e.nationalId, phone: e.phone,
    role: e.role, branchId: e.branchId, branchName: e.branchName,
    fatherName: e.fatherName, gender: e.gender, maritalStatus: e.maritalStatus,
    address: e.address, emergencyContactName: e.emergencyContactName,
    emergencyContactPhone: e.emergencyContactPhone, iban: e.iban, bankAccount: e.bankAccount,
    insuranceStatus: e.insuranceStatus, insuranceNumber: e.insuranceNumber,
    healthCardNumber: e.healthCardNumber,
    healthCardExpiryDate: e.healthCardExpiryDate ? e.healthCardExpiryDate.toISOString().slice(0,10) : null,
    joinDate: e.joinDate.toISOString().slice(0,10),
    terminationDate: e.terminationDate ? e.terminationDate.toISOString().slice(0,10) : null,
    baseMonthlySalary: Number(e.baseMonthlySalary), isActive: e.isActive, notes: e.notes,
    createdAt: e.createdAt.toISOString(), updatedAt: e.updatedAt.toISOString(),
  };
}
