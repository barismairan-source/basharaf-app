// ─── Link Hub module types (basharaf.me/safasity) ─────────────────
export type HubItemKind = 'menu' | 'apply' | 'instagram' | 'phone' | 'reserve' | 'order' | 'custom';

export interface HubItem {
  id: string;
  kind: HubItemKind;
  label: string;
  url: string;
  isVisible: boolean;
  sortOrder: number;
}

export interface HubSettings {
  title: string;
  bio: string;
  addressFa: string;
  mapUrl: string | null;
  showQr: boolean;
}
