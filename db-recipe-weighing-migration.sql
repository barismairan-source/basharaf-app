-- db-recipe-weighing-migration.sql
-- Recipe & weighing form: adds category/portion label/notes to inv_recipes.
-- idempotent - safe to run more than once.

ALTER TABLE inv_recipes ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'سایر';
ALTER TABLE inv_recipes ADD COLUMN IF NOT EXISTS portion_label text;
ALTER TABLE inv_recipes ADD COLUMN IF NOT EXISTS notes text;

-- Regular unique index is on (branch_id, code), but Postgres treats every
-- NULL branch_id as distinct from every other NULL - so it never catches a
-- duplicate code among shared (branch_id IS NULL) items, and re-running a
-- seed script would silently insert duplicates instead of upserting. This
-- partial index gives shared items a real uniqueness guarantee on code.
CREATE UNIQUE INDEX IF NOT EXISTS inv_items_shared_code_uniq ON inv_items(code) WHERE branch_id IS NULL;
