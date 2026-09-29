import { apiFetch } from './api';
import type { ReservationPublicRepo } from './reservationPublic.types';
import type {
  PublicReservationBranch, PublicReservationDay, PublicReservationResult, PublicReservationDetail,
} from '@/types';

export const reservationPublicRepo: ReservationPublicRepo = {
  async getBranches() {
    const data = await apiFetch<{ branches: PublicReservationBranch[] }>('/api/public/reservations/branches');
    return data.branches;
  },

  async getDay(branchId, date, partySize, tableType) {
    const qs = new URLSearchParams({ branchId, date, partySize: String(partySize), tableType });
    return apiFetch<PublicReservationDay>(`/api/public/reservations/today?${qs}`);
  },

  async create(input) {
    const data = await apiFetch<{ reservation: PublicReservationResult }>('/api/public/reservations/create', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.reservation;
  },

  async track(code, phone) {
    const qs = new URLSearchParams({ code, phone });
    const data = await apiFetch<{ reservation: PublicReservationDetail }>(`/api/public/reservations/track?${qs}`);
    return data.reservation;
  },

  async cancel(code, phone) {
    await apiFetch('/api/public/reservations/cancel', {
      method: 'POST',
      body: JSON.stringify({ code, phone }),
    });
  },
};
