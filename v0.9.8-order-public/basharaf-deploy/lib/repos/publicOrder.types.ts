import type { PublicOrderMenu } from '@/types';

export interface PublicOrderRepo {
  getMenu(): Promise<PublicOrderMenu>;
}
