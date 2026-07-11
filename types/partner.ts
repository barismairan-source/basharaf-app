export interface PartnerBranchAssoc {
  id: string;
  branchId: string | null;
  branchName: string | null;
  sharePercent: string | null;
  joinedDate: string | null;
  isActive: boolean;
}

export interface Partner {
  id: string;
  fullName: string;
  phone: string | null;
  nationalId: string | null;
  note: string | null;
  isActive: boolean;
  branches: PartnerBranchAssoc[];
  createdAt: string;
  updatedAt: string;
}
