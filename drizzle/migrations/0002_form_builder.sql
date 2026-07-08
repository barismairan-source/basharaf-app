DO $$ BEGIN
 CREATE TYPE "public"."form_field_type" AS ENUM('text','textarea','number','tel','email','select','multiselect','radio','checkbox','date');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."form_field_scope" AS ENUM('all','kitchen','hall');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."form_field_width" AS ENUM('full','half');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."condition_operator" AS ENUM('equals','not_equals','includes','is_empty','is_not_empty');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."condition_action" AS ENUM('show','hide','require');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "form_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "form_sections_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "form_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"placeholder" text,
	"help_text" text,
	"type" "form_field_type" NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_filterable" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"scope" "form_field_scope" DEFAULT 'all' NOT NULL,
	"validation" jsonb,
	"default_value" text,
	"width" "form_field_width" DEFAULT 'full' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "form_fields_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "form_field_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_id" uuid NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "form_field_conditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_id" uuid NOT NULL,
	"depends_on_field_id" uuid NOT NULL,
	"operator" "condition_operator" NOT NULL,
	"value" text,
	"action" "condition_action" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "custom_fields" jsonb DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "field_snapshot" jsonb DEFAULT '[]' NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_section_id_form_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."form_sections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "form_field_options" ADD CONSTRAINT "form_field_options_field_id_form_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."form_fields"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "form_field_conditions" ADD CONSTRAINT "form_field_conditions_field_id_form_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."form_fields"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "form_field_conditions" ADD CONSTRAINT "form_field_conditions_depends_on_field_id_form_fields_id_fk" FOREIGN KEY ("depends_on_field_id") REFERENCES "public"."form_fields"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ff_section_idx" ON "form_fields" USING btree ("section_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ff_active_idx" ON "form_fields" USING btree ("is_active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ffo_field_idx" ON "form_field_options" USING btree ("field_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ffc_field_idx" ON "form_field_conditions" USING btree ("field_id");
