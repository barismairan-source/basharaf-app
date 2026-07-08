-- db-form-builder-migration.sql
-- فاز: Form Builder داینامیک استخدام
-- idempotent — اجرای مکرر امن است

-- ════════════════════════════════════════════════════════
-- ۱. Enums
-- ════════════════════════════════════════════════════════
DO $$ BEGIN
  CREATE TYPE form_field_type AS ENUM (
    'text','textarea','number','tel','email','select','multiselect','radio','checkbox','date'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE form_field_scope AS ENUM ('all','kitchen','hall');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE form_field_width AS ENUM ('full','half');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE condition_operator AS ENUM (
    'equals','not_equals','includes','is_empty','is_not_empty'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE condition_action AS ENUM ('show','hide','require');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ════════════════════════════════════════════════════════
-- ۲. form_sections
-- ════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS form_sections (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text        NOT NULL UNIQUE,
  title       text        NOT NULL,
  subtitle    text,
  sort_order  integer     NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  is_system   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════
-- ۳. form_fields
-- ════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS form_fields (
  id           uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id   uuid             NOT NULL REFERENCES form_sections(id) ON DELETE CASCADE,
  key          text             NOT NULL UNIQUE,
  label        text             NOT NULL,
  placeholder  text,
  help_text    text,
  type         form_field_type  NOT NULL,
  is_required  boolean          NOT NULL DEFAULT false,
  is_active    boolean          NOT NULL DEFAULT true,
  is_system    boolean          NOT NULL DEFAULT false,
  is_filterable boolean         NOT NULL DEFAULT false,
  sort_order   integer          NOT NULL DEFAULT 0,
  scope        form_field_scope NOT NULL DEFAULT 'all',
  validation   jsonb,
  default_value text,
  width        form_field_width NOT NULL DEFAULT 'full',
  created_at   timestamptz      NOT NULL DEFAULT NOW(),
  updated_at   timestamptz      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ff_section_idx  ON form_fields(section_id);
CREATE INDEX IF NOT EXISTS ff_active_idx   ON form_fields(is_active);

-- ════════════════════════════════════════════════════════
-- ۴. form_field_options
-- ════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS form_field_options (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id    uuid    NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
  label       text    NOT NULL,
  value       text    NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ffo_field_idx ON form_field_options(field_id);

-- ════════════════════════════════════════════════════════
-- ۵. form_field_conditions
-- ════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS form_field_conditions (
  id                  uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id            uuid               NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
  depends_on_field_id uuid               NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
  operator            condition_operator NOT NULL,
  value               text,
  action              condition_action   NOT NULL,
  created_at          timestamptz        NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ffc_field_idx ON form_field_conditions(field_id);

-- ════════════════════════════════════════════════════════
-- ۶. افزودن ستون‌های جدید به job_applications
-- ════════════════════════════════════════════════════════
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS custom_fields  jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS field_snapshot jsonb NOT NULL DEFAULT '[]';
