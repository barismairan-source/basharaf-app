import type { schema } from './client';

export function rowToRecipeCategory(row: typeof schema.recipeCategories.$inferSelect) {
  return { id: row.id, slug: row.slug, label: row.label, sortOrder: row.sortOrder };
}

export function rowToIngredientTag(row: typeof schema.ingredientTags.$inferSelect) {
  return { id: row.id, name: row.name };
}

export function rowToRecipeIngredient(
  row: typeof schema.recipeIngredients.$inferSelect,
  tagName: string,
) {
  return {
    id: row.id,
    ingredientTagId: row.ingredientTagId,
    name: tagName,
    quantityLabel: row.quantityLabel,
    sortOrder: row.sortOrder,
  };
}

export function rowToRecipe(
  row: typeof schema.recipes.$inferSelect,
  category: ReturnType<typeof rowToRecipeCategory> | null,
  ingredients: ReturnType<typeof rowToRecipeIngredient>[],
) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    category,
    protein: row.protein,
    prepTimeMinutes: row.prepTimeMinutes,
    servings: row.servings,
    steps: row.steps,
    instagramUrl: row.instagramUrl,
    videoUrl: row.videoUrl,
    imageUrl: row.imageUrl,
    isPublished: row.isPublished,
    sortOrder: row.sortOrder,
    ingredients,
  };
}

export const RECIPE_PROTEIN_LABEL_FA: Record<string, string> = {
  chicken: 'مرغ',
  red_meat: 'گوشت قرمز',
  seafood: 'دریایی',
  vegetarian: 'گیاهی',
  vegan: 'وگان',
  other: 'سایر',
};
