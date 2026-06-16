// ─── Menu module types ───────────────────────────────────────────
export interface MenuCategory {
  id: string;
  slug: string;
  labelEn: string;
  labelFa: string;
  sortOrder: number;
  vatRate: number | null;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  titleEn: string;
  titleFa: string;
  descriptionEn: string;
  descriptionFa: string;
  price: number | null;
  priceTakeaway: number | null;
  inHall: boolean;
  inTakeaway: boolean;
  isAvailable: boolean;
  sortOrder: number;
}

export interface MenuSection extends MenuCategory {
  items: MenuItem[];
}

export interface MenuSettings {
  faFont: string;
  phone: string;
  addressFa: string;
  addressEn: string;
  instagram: string;
  showPriceHall: boolean;
  showPriceTakeaway: boolean;
  takeawaySlug: string;
  hallTitle: string | null;
  takeawayTitle: string | null;
  hallNote: string | null;
  takeawayNote: string | null;
}
