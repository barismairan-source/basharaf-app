import type {
  PublicReservationBranch, PublicReservationToday, CreatePublicReservationInput,
  PublicReservationResult, PublicReservationDetail,
} from '@/types';

export interface ReservationPublicRepo {
  getBranches(): Promise<PublicReservationBranch[]>;
  getToday(branchId: string): Promise<PublicReservationToday>;
  create(input: CreatePublicReservationInput): Promise<PublicReservationResult>;
  track(code: string, phone: string): Promise<PublicReservationDetail>;
  cancel(code: string, phone: string): Promise<void>;
}
