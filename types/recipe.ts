// ─── Recipe book module types (basharaf.me/safasity/recipes) ─────
export type RecipeProtein = 'chicken' | 'red_meat' | 'seafood' | 'vegetarian' | 'vegan' | 'other';

export interface RecipeCategory {
  id: string;
  slug: string;
  label: string;
  sortOrder: number;
}

export interface IngredientTag {
  id: string;
  name: string;
}

export interface RecipeIngredientDTO {
  id: string;
  ingredientTagId: string;
  name: string;
  quantityLabel: string;
  sortOrder: number;
}

export interface Recipe {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: RecipeCategory | null;
  protein: RecipeProtein;
  prepTimeMinutes: number | null;
  servings: string | null;
  steps: string[];
  instagramUrl: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  isPublished: boolean;
  sortOrder: number;
  ingredients: RecipeIngredientDTO[];
}

export interface RecipeInput {
  slug: string;
  title: string;
  summary?: string;
  categoryId?: string | null;
  protein?: RecipeProtein;
  prepTimeMinutes?: number | null;
  servings?: string | null;
  steps?: string[];
  instagramUrl?: string | null;
  videoUrl?: string | null;
  imageUrl?: string | null;
  isPublished?: boolean;
  sortOrder?: number;
  ingredients?: Array<{ ingredientTagId: string; quantityLabel?: string; sortOrder?: number }>;
}
