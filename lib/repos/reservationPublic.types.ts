import type {
  PublicReservationBranch, PublicReservationDay, CreatePublicReservationInput,
  PublicReservationResult, PublicReservationDetail,
} from '@/types';

export interface ReservationPublicRepo {
  getBranches(): Promise<PublicReservationBranch[]>;
  getDay(branchId: string, date: string, partySize: number, tableType: 'normal' | 'social'): Promise<PublicReservationDay>;
  create(input: CreatePublicReservationInput): Promise<PublicReservationResult>;
  track(code: string, phone: string): Promise<PublicReservationDetail>;
  cancel(code: string, phone: string): Promise<void>;
}
