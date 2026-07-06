export type ChequeStatus = 'pending' | 'cashed' | 'bounced' | 'returned' | 'spent';
export type ChequeKind = 'received' | 'issued';

export interface Cheque {
  id: string;
  kind: ChequeKind;
  contactId: string | null;
  contactName: string | null;
  amount: number;
  serialNo: string;
  bankName: string;
  dueDateJalali: string;
  status: ChequeStatus;
  note: string;
  branchId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewChequeInput {
  kind: ChequeKind;
  contactId?: string | null;
  amount: number;
  serialNo?: string;
  bankName?: string;
  dueDateJalali: string;
  note?: string;
  branchId?: string | null;
}
