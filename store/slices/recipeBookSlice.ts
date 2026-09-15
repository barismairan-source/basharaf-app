import type { StateCreator } from 'zustand';
import type { Recipe, RecipeCategory, IngredientTag, RecipeInput } from '@/types';

export interface RecipeBookSlice {
  recipes: Recipe[];
  recipeCategories: RecipeCategory[];
  ingredientTags: IngredientTag[];
  recipeBookLoaded: boolean;
  recipeBookError: string | null;

  loadRecipeBook: () => Promise<void>;
  createRecipe: (input: RecipeInput) => Promise<boolean>;
  updateRecipe: (id: string, patch: Partial<RecipeInput>) => Promise<boolean>;
  deleteRecipe: (id: string) => Promise<boolean>;
  createRecipeCategory: (input: { slug: string; label: string; sortOrder?: number }) => Promise<boolean>;
  deleteRecipeCategory: (id: string) => Promise<{ ok: boolean; error?: string }>;
  getOrCreateIngredientTag: (name: string) => Promise<IngredientTag | null>;
}

export const createRecipeBookSlice: StateCreator<RecipeBookSlice> = (set, get) => ({
  recipes: [],
  recipeCategories: [],
  ingredientTags: [],
  recipeBookLoaded: false,
  recipeBookError: null,

  async loadRecipeBook() {
    try {
      const [recipesRes, categoriesRes, tagsRes] = await Promise.all([
        fetch('/api/recipes?all=1', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/recipe-categories', { cache: 'no-store' }),
        fetch('/api/ingredient-tags', { cache: 'no-store' }),
      ]);
      const recipesData = recipesRes.ok ? await recipesRes.json() : { recipes: [] };
      const categoriesData = categoriesRes.ok ? await categoriesRes.json() : { categories: [] };
      const tagsData = tagsRes.ok ? await tagsRes.json() : { tags: [] };
      set({
        recipes: recipesData.recipes ?? [],
        recipeCategories: categoriesData.categories ?? [],
        ingredientTags: tagsData.tags ?? [],
        recipeBookLoaded: true,
      });
    } catch {
      set({ recipeBookLoaded: true });
    }
  },

  async createRecipe(input) {
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('خطا');
      await get().loadRecipeBook();
      return true;
    } catch (e) {
      set({ recipeBookError: e instanceof Error ? e.message : 'خطا' });
      return false;
    }
  },

  async updateRecipe(id, patch) {
    try {
      const res = await fetch(`/api/recipes/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('خطا');
      await get().loadRecipeBook();
      return true;
    } catch (e) {
      set({ recipeBookError: e instanceof Error ? e.message : 'خطا' });
      return false;
    }
  },

  async deleteRecipe(id) {
    set(s => ({ recipes: s.recipes.filter(r => r.id !== id) }));
    try {
      const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch {
      await get().loadRecipeBook();
      return false;
    }
  },

  async createRecipeCategory(input) {
    try {
      const res = await fetch('/api/recipe-categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('خطا');
      await get().loadRecipeBook();
      return true;
    } catch (e) {
      set({ recipeBookError: e instanceof Error ? e.message : 'خطا' });
      return false;
    }
  },

  async deleteRecipeCategory(id) {
    try {
      const res = await fetch(`/api/recipe-categories/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        return { ok: false, error: d.error ?? 'این دسته رسپی دارد' };
      }
      await get().loadRecipeBook();
      return { ok: true };
    } catch {
      return { ok: false, error: 'خطا' };
    }
  },

  async getOrCreateIngredientTag(name) {
    try {
      const res = await fetch('/api/ingredient-tags', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ name }),
      });
      if (!res.ok) return null;
      const d = await res.json();
      const tag: IngredientTag = d.tag;
      set(s => (s.ingredientTags.some(t => t.id === tag.id) ? s : { ingredientTags: [...s.ingredientTags, tag] }));
      return tag;
    } catch {
      return null;
    }
  },
});
