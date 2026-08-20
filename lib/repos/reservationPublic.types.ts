import type {
  PublicReservationBranch, PublicReservationDay, CreatePublicReservationInput,
  PublicReservationResult, PublicReservationDetail,
} from '@/types';

export interface ReservationPublicRepo {
  getBranches(): Promise<PublicReservationBranch[]>;
  getAvailability(branchId: string, date: string): Promise<PublicReservationDay>;
  create(input: CreatePublicReservationInput): Promise<PublicReservationResult>;
  track(code: string, phone: string): Promise<PublicReservationDetail>;
  cancel(code: string, phone: string): Promise<void>;
}
