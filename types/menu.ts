// ─── Menu module types ───────────────────────────────────────────
export interface MenuCategory {
  id: string;
  slug: string;
  labelEn: string;
  labelFa: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  titleEn: string;
  titleFa: string;
  descriptionEn: string;
  descriptionFa: string;
  price: number;
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
}
