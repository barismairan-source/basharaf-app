CREATE TYPE "public"."applicant_gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."application_area" AS ENUM('hall', 'kitchen');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('new', 'shortlist', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('national_id_card', 'birth_certificate', 'health_card', 'contract', 'insurance_doc', 'education', 'photo', 'other');--> statement-breakpoint
CREATE TYPE "public"."employee_role" AS ENUM('manager', 'chef', 'cook', 'waiter', 'cashier', 'dishwasher', 'delivery', 'cleaner', 'other');--> statement-breakpoint
CREATE TYPE "public"."equipment_status" AS ENUM('active', 'maintenance', 'retired');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."insurance_status" AS ENUM('insured', 'uninsured', 'pending', 'exempt');--> statement-breakpoint
CREATE TYPE "public"."inv_cook_mode" AS ENUM('daily', 'batch');--> statement-breakpoint
CREATE TYPE "public"."inv_item_kind" AS ENUM('raw', 'prep');--> statement-breakpoint
CREATE TYPE "public"."inv_unit" AS ENUM('kg', 'g', 'L', 'ml', 'pcs', 'can', 'pack');--> statement-breakpoint
CREATE TYPE "public"."inv_voucher_kind" AS ENUM('in', 'out', 'waste', 'sale', 'produce', 'stocktake');--> statement-breakpoint
CREATE TYPE "public"."inv_voucher_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."journal_voucher_status" AS ENUM('built', 'posted', 'reversed');--> statement-breakpoint
CREATE TYPE "public"."maint_type" AS ENUM('preventive', 'corrective', 'inspection');--> statement-breakpoint
CREATE TYPE "public"."marital_status" AS ENUM('single', 'married', 'other');--> statement-breakpoint
CREATE TYPE "public"."payroll_event_type" AS ENUM('advance', 'deduction', 'bonus', 'settlement');--> statement-breakpoint
CREATE TYPE "public"."payroll_run_status" AS ENUM('draft', 'calculated', 'approved', 'posted');--> statement-breakpoint
CREATE TYPE "public"."po_status" AS ENUM('draft', 'sent', 'partial', 'received', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'done', 'skipped');--> statement-breakpoint
ALTER TYPE "public"."notif_type" ADD VALUE 'warning';--> statement-breakpoint
ALTER TYPE "public"."notif_type" ADD VALUE 'critical';--> statement-breakpoint
ALTER TYPE "public"."tx_status" ADD VALUE 'proforma';--> statement-breakpoint
ALTER TYPE "public"."tx_type" ADD VALUE 'transfer';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'Warehouse';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'Chef';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'cash' NOT NULL,
	"balance" bigint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"branch_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "anomaly_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_key" text NOT NULL,
	"severity" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"branch_id" uuid,
	"entity_type" text,
	"entity_id" text,
	"jalali_date" text,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"details" jsonb NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "anomaly_rules" (
	"rule_key" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"thresholds" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"label" text NOT NULL,
	"group" text DEFAULT 'general' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"meta" text,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cheques" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"contact_id" uuid,
	"amount" bigint NOT NULL,
	"serial_no" text DEFAULT '' NOT NULL,
	"bank_name" text DEFAULT '' NOT NULL,
	"due_date_jalali" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"branch_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'customer' NOT NULL,
	"phone" text,
	"note" text,
	"balance" bigint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coupon_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"customer_id" uuid,
	"branch_id" uuid NOT NULL,
	"discount_amount" bigint NOT NULL,
	"ref_transaction_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"discount_type" text NOT NULL,
	"value" bigint NOT NULL,
	"min_order" bigint DEFAULT 0 NOT NULL,
	"max_discount" bigint,
	"valid_from" text NOT NULL,
	"valid_to" text NOT NULL,
	"usage_limit" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"branch_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"birthday" text,
	"home_branch_id" uuid,
	"contact_id" uuid,
	"tier" text DEFAULT 'bronze' NOT NULL,
	"points" bigint DEFAULT 0 NOT NULL,
	"visit_count" integer DEFAULT 0 NOT NULL,
	"total_spent" bigint DEFAULT 0 NOT NULL,
	"note" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"type" "document_type" NOT NULL,
	"title" text NOT NULL,
	"storage_path" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text,
	"file_size" bigint,
	"expiry_date" date,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"national_id" text,
	"phone" text NOT NULL,
	"role" text DEFAULT 'other' NOT NULL,
	"branch_id" uuid,
	"branch_name" text,
	"father_name" text,
	"birth_date" date,
	"gender" "gender",
	"marital_status" "marital_status",
	"address" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"iban" text,
	"bank_account" text,
	"insurance_status" "insurance_status" DEFAULT 'uninsured' NOT NULL,
	"insurance_number" text,
	"insurance_start_date" date,
	"health_card_number" text,
	"health_card_issue_date" date,
	"health_card_expiry_date" date,
	"join_date" date NOT NULL,
	"termination_date" date,
	"base_monthly_salary" bigint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"status" "equipment_status" DEFAULT 'active' NOT NULL,
	"purchase_date" text,
	"purchase_cost" bigint DEFAULT 0 NOT NULL,
	"warranty_expiry" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid,
	"branch_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"source" text DEFAULT 'in_store' NOT NULL,
	"ref_transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "financial_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jalali_year" integer NOT NULL,
	"jalali_month" integer NOT NULL,
	"closed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inv_daily_sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voucher_id" uuid,
	"branch_id" uuid,
	"jalali_date" text NOT NULL,
	"lines" jsonb NOT NULL,
	"total_cogs" bigint DEFAULT 0 NOT NULL,
	"total_revenue" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inv_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'سایر' NOT NULL,
	"kind" "inv_item_kind" DEFAULT 'raw' NOT NULL,
	"branch_id" uuid,
	"unit" "inv_unit" DEFAULT 'kg' NOT NULL,
	"base_per_unit" numeric(14, 4) DEFAULT '1000' NOT NULL,
	"yield_pct" numeric(5, 2) DEFAULT '100' NOT NULL,
	"qty_physical" numeric(16, 4) DEFAULT '0' NOT NULL,
	"qty_base" numeric(16, 4) DEFAULT '0' NOT NULL,
	"avg_cost_per_base" numeric(24, 6) DEFAULT '0' NOT NULL,
	"min_base" numeric(16, 4) DEFAULT '0' NOT NULL,
	"batch_yield_base" numeric(16, 4),
	"shelf_life_days" integer DEFAULT 1 NOT NULL,
	"prep_recipe" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inv_recipe_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"qty_base" numeric(16, 4) NOT NULL,
	"override_pct" numeric(5, 2)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inv_recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"branch_id" uuid,
	"portions" integer DEFAULT 1 NOT NULL,
	"target_fc_pct" numeric(5, 2) DEFAULT '30' NOT NULL,
	"price" bigint DEFAULT 0 NOT NULL,
	"cook_mode" "inv_cook_mode" DEFAULT 'daily' NOT NULL,
	"shelf_life_days" integer DEFAULT 1 NOT NULL,
	"menu_item_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inv_stock_tx" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"voucher_id" uuid,
	"kind" "inv_voucher_kind" NOT NULL,
	"delta_base" numeric(16, 4) NOT NULL,
	"value" bigint DEFAULT 0 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"expiry_date" text,
	"jalali_date" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inv_voucher_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voucher_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"qty_base" numeric(16, 4) NOT NULL,
	"est_unit_cost" numeric(24, 6) DEFAULT '0' NOT NULL,
	"final_unit_cost" numeric(24, 6),
	"expiry_date" text,
	"waste_reason" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inv_vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"no" text NOT NULL,
	"kind" "inv_voucher_kind" NOT NULL,
	"status" "inv_voucher_status" DEFAULT 'pending' NOT NULL,
	"branch_id" uuid,
	"est_total" bigint DEFAULT 0 NOT NULL,
	"final_total" bigint,
	"note" text DEFAULT '' NOT NULL,
	"sale_meta" jsonb,
	"created_by" uuid,
	"maker_date" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"rejected_by" uuid,
	"rejected_at" timestamp with time zone,
	"rejection_reason" text,
	"linked_transaction_id" uuid,
	"parent_voucher_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text NOT NULL,
	"age" integer,
	"gender" "applicant_gender",
	"city" text,
	"has_resume" boolean DEFAULT false NOT NULL,
	"resume_url" text,
	"resume_path" text,
	"manual_info" text,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"area" "application_area",
	"shift_availability" jsonb,
	"start_availability" text,
	"referral_source" text,
	"status" "application_status" DEFAULT 'new' NOT NULL,
	"score" integer,
	"reviewer_note" text,
	"reviewed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "journal_vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"period" text NOT NULL,
	"branch_id" uuid,
	"lines" jsonb NOT NULL,
	"total_debit" bigint NOT NULL,
	"total_credit" bigint NOT NULL,
	"idempotency_key" text NOT NULL,
	"basharaf_voucher_id" text,
	"status" "journal_voucher_status" DEFAULT 'built' NOT NULL,
	"posted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "journal_vouchers_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyalty_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"type" text NOT NULL,
	"points" integer NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"ref_transaction_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maintenance_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_id" uuid NOT NULL,
	"type" "maint_type" DEFAULT 'preventive' NOT NULL,
	"date" text NOT NULL,
	"cost" bigint DEFAULT 0 NOT NULL,
	"vendor" text,
	"note" text DEFAULT '' NOT NULL,
	"ref_transaction_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "menu_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"label_en" text NOT NULL,
	"label_fa" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"vat_rate" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"title_en" text NOT NULL,
	"title_fa" text NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"description_fa" text DEFAULT '' NOT NULL,
	"price" bigint,
	"price_takeaway" bigint,
	"in_hall" boolean DEFAULT true NOT NULL,
	"in_takeaway" boolean DEFAULT false NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "menu_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"fa_font" text DEFAULT 'IRANMarker' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"address_fa" text DEFAULT '' NOT NULL,
	"address_en" text DEFAULT '' NOT NULL,
	"instagram" text DEFAULT '' NOT NULL,
	"show_price_hall" boolean DEFAULT true NOT NULL,
	"show_price_takeaway" boolean DEFAULT true NOT NULL,
	"takeaway_slug" text DEFAULT 'birun' NOT NULL,
	"hall_title" text,
	"takeaway_title" text,
	"hall_note" text,
	"takeaway_note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_rules" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"sms_enabled" boolean DEFAULT false NOT NULL,
	"threshold" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ord_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"is_open" boolean DEFAULT true NOT NULL,
	"open_time" text DEFAULT '09:00' NOT NULL,
	"close_time" text DEFAULT '23:00' NOT NULL,
	"delivery_enabled" boolean DEFAULT true NOT NULL,
	"pickup_enabled" boolean DEFAULT true NOT NULL,
	"pay_cash" boolean DEFAULT true NOT NULL,
	"pay_online" boolean DEFAULT false NOT NULL,
	"pay_gateway" text DEFAULT 'zarinpal' NOT NULL,
	"zarinpal_merchant_id" text,
	"idpay_api_key" text,
	"zibal_merchant_id" text,
	"neshan_api_key" text,
	"min_order" bigint DEFAULT 0 NOT NULL,
	"prep_buffer_min" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ord_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"name" text NOT NULL,
	"delivery_fee" bigint NOT NULL,
	"min_order" bigint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"note" text,
	"actor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"item_name" text NOT NULL,
	"unit_price" bigint NOT NULL,
	"qty" integer NOT NULL,
	"line_total" bigint NOT NULL,
	"menu_item_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"order_no" text NOT NULL,
	"track_token" text NOT NULL,
	"service_type" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"address" text,
	"zone_id" uuid,
	"subtotal" bigint NOT NULL,
	"delivery_fee" bigint DEFAULT 0 NOT NULL,
	"discount" bigint DEFAULT 0 NOT NULL,
	"total" bigint NOT NULL,
	"pay_method" text NOT NULL,
	"pay_status" text DEFAULT 'unpaid' NOT NULL,
	"pay_ref" text,
	"pay_authority" text,
	"pickup_time" text,
	"client_token" text,
	"sale_transaction_id" uuid,
	"order_customer_id" uuid,
	"jalali_date" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payroll_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"type" "payroll_event_type" NOT NULL,
	"amount" bigint NOT NULL,
	"period_year_month" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text,
	"settlement_method" text,
	"settled_amount" bigint,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"voided_at" timestamp with time zone,
	"void_reason" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payroll_parameters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jalali_year" integer NOT NULL,
	"min_daily_wage" bigint NOT NULL,
	"min_monthly_wage" bigint NOT NULL,
	"housing_allowance" bigint NOT NULL,
	"grocery_allowance" bigint NOT NULL,
	"marriage_allowance" bigint NOT NULL,
	"seniority_daily" bigint NOT NULL,
	"child_allowance_per" bigint NOT NULL,
	"tax_exempt_monthly" bigint NOT NULL,
	"tax_brackets" jsonb NOT NULL,
	"insurance_employee_rate" numeric(5, 4) NOT NULL,
	"insurance_employer_rate" numeric(5, 4) NOT NULL,
	"overtime_multiplier" numeric(4, 2) NOT NULL,
	"night_shift_premium" numeric(4, 2) NOT NULL,
	"holiday_multiplier" numeric(4, 2) NOT NULL,
	"child_min_insurance_days" integer DEFAULT 720 NOT NULL,
	"standard_monthly_hours" numeric(6, 2) DEFAULT '192' NOT NULL,
	"effective_from" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_parameters_jalali_year_unique" UNIQUE("jalali_year")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payroll_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid,
	"branch_name" text,
	"period_year_month" text NOT NULL,
	"parameters_id" uuid NOT NULL,
	"status" "payroll_run_status" DEFAULT 'draft' NOT NULL,
	"calculated_at" timestamp with time zone,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"posted_to_basharaf_at" timestamp with time zone,
	"journal_voucher_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payslips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"period_year_month" text NOT NULL,
	"worked_days" numeric(5, 2) NOT NULL,
	"gross_earnings" bigint NOT NULL,
	"taxable_base" bigint NOT NULL,
	"insurance_base" bigint NOT NULL,
	"insurance_employee" bigint NOT NULL,
	"insurance_employer" bigint NOT NULL,
	"income_tax" bigint NOT NULL,
	"total_deductions" bigint NOT NULL,
	"net_pay" bigint NOT NULL,
	"calc_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"inventory_item_id" uuid,
	"description" text DEFAULT '' NOT NULL,
	"qty" numeric(16, 4) DEFAULT '0' NOT NULL,
	"unit_cost" bigint DEFAULT 0 NOT NULL,
	"total_cost" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"no" text NOT NULL,
	"branch_id" uuid NOT NULL,
	"supplier_id" uuid,
	"status" "po_status" DEFAULT 'draft' NOT NULL,
	"expected_date" text,
	"note" text DEFAULT '' NOT NULL,
	"est_total" bigint DEFAULT 0 NOT NULL,
	"final_total" bigint,
	"ref_transaction_id" uuid,
	"ref_inv_voucher_id" uuid,
	"received_by" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid,
	"branch_id" uuid NOT NULL,
	"table_id" uuid,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"party_size" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"name" text NOT NULL,
	"capacity" integer DEFAULT 0 NOT NULL,
	"area" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sms_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"message" text NOT NULL,
	"template_key" text,
	"entity_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider" text DEFAULT 'kavenegar' NOT NULL,
	"provider_response" jsonb,
	"error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" text DEFAULT 'info' NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"message" text NOT NULL,
	"path" text,
	"method" text,
	"status_code" integer,
	"user_id" uuid,
	"user_email" text,
	"context" text,
	"stack" text,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid,
	"branch_id" uuid NOT NULL,
	"assigned_user_id" uuid,
	"due_date" text NOT NULL,
	"completed_at" timestamp with time zone,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid,
	"title" text NOT NULL,
	"category" text DEFAULT 'ops' NOT NULL,
	"assigned_role" text DEFAULT 'BranchUser' NOT NULL,
	"frequency" text DEFAULT 'daily' NOT NULL,
	"estimated_minutes" integer DEFAULT 0 NOT NULL,
	"checklist_json" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web_customer_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"title" text NOT NULL,
	"address" text NOT NULL,
	"lat" numeric,
	"lng" numeric,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web_customer_otp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "category_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "category_name" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "action_url" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "entity_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "receipt_url" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "destination_account_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "contact_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "vat_amount" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "is_credit" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "invoice_code" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "sale_meta" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "permissions" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sms_phone" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accounts" ADD CONSTRAINT "accounts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "anomaly_findings" ADD CONSTRAINT "anomaly_findings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "anomaly_findings" ADD CONSTRAINT "anomaly_findings_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cheques" ADD CONSTRAINT "cheques_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cheques" ADD CONSTRAINT "cheques_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cheques" ADD CONSTRAINT "cheques_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_ref_transaction_id_transactions_id_fk" FOREIGN KEY ("ref_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupons" ADD CONSTRAINT "coupons_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customers" ADD CONSTRAINT "customers_home_branch_id_branches_id_fk" FOREIGN KEY ("home_branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customers" ADD CONSTRAINT "customers_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employees" ADD CONSTRAINT "employees_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "equipment" ADD CONSTRAINT "equipment_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback" ADD CONSTRAINT "feedback_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback" ADD CONSTRAINT "feedback_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback" ADD CONSTRAINT "feedback_ref_transaction_id_transactions_id_fk" FOREIGN KEY ("ref_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "financial_periods" ADD CONSTRAINT "financial_periods_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inv_daily_sales" ADD CONSTRAINT "inv_daily_sales_voucher_id_inv_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."inv_vouchers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inv_daily_sales" ADD CONSTRAINT "inv_daily_sales_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inv_items" ADD CONSTRAINT "inv_items_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inv_recipe_lines" ADD CONSTRAINT "inv_recipe_lines_recipe_id_inv_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."inv_recipes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inv_recipe_lines" ADD CONSTRAINT "inv_recipe_lines_item_id_inv_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inv_items"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inv_recipes" ADD CONSTRAINT "inv_recipes_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inv_recipes" ADD CONSTRAINT "inv_recipes_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inv_stock_tx" ADD CONSTRAINT "inv_stock_tx_item_id_inv_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inv_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inv_stock_tx" ADD CONSTRAINT "inv_stock_tx_voucher_id_inv_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."inv_vouchers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inv_voucher_lines" ADD CONSTRAINT "inv_voucher_lines_voucher_id_inv_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."inv_vouchers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inv_voucher_lines" ADD CONSTRAINT "inv_voucher_lines_item_id_inv_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inv_items"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inv_vouchers" ADD CONSTRAINT "inv_vouchers_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inv_vouchers" ADD CONSTRAINT "inv_vouchers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inv_vouchers" ADD CONSTRAINT "inv_vouchers_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inv_vouchers" ADD CONSTRAINT "inv_vouchers_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inv_vouchers" ADD CONSTRAINT "inv_vouchers_linked_transaction_id_transactions_id_fk" FOREIGN KEY ("linked_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inv_vouchers" ADD CONSTRAINT "inv_vouchers_parent_voucher_id_inv_vouchers_id_fk" FOREIGN KEY ("parent_voucher_id") REFERENCES "public"."inv_vouchers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "journal_vouchers" ADD CONSTRAINT "journal_vouchers_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "journal_vouchers" ADD CONSTRAINT "journal_vouchers_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_entries" ADD CONSTRAINT "loyalty_entries_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_entries" ADD CONSTRAINT "loyalty_entries_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_entries" ADD CONSTRAINT "loyalty_entries_ref_transaction_id_transactions_id_fk" FOREIGN KEY ("ref_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_entries" ADD CONSTRAINT "loyalty_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_ref_transaction_id_transactions_id_fk" FOREIGN KEY ("ref_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_menu_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ord_settings" ADD CONSTRAINT "ord_settings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ord_zones" ADD CONSTRAINT "ord_zones_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_events" ADD CONSTRAINT "order_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_zone_id_ord_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."ord_zones"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_sale_transaction_id_transactions_id_fk" FOREIGN KEY ("sale_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_order_customer_id_web_customers_id_fk" FOREIGN KEY ("order_customer_id") REFERENCES "public"."web_customers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payroll_events" ADD CONSTRAINT "payroll_events_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payroll_events" ADD CONSTRAINT "payroll_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_parameters_id_payroll_parameters_id_fk" FOREIGN KEY ("parameters_id") REFERENCES "public"."payroll_parameters"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_order_id_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_inventory_item_id_inv_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inv_items"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_contacts_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_ref_transaction_id_transactions_id_fk" FOREIGN KEY ("ref_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_ref_inv_voucher_id_inv_vouchers_id_fk" FOREIGN KEY ("ref_inv_voucher_id") REFERENCES "public"."inv_vouchers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reservations" ADD CONSTRAINT "reservations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reservations" ADD CONSTRAINT "reservations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reservations" ADD CONSTRAINT "reservations_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reservations" ADD CONSTRAINT "reservations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tables" ADD CONSTRAINT "tables_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_instances" ADD CONSTRAINT "task_instances_template_id_task_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."task_templates"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_instances" ADD CONSTRAINT "task_instances_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_instances" ADD CONSTRAINT "task_instances_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web_customer_addresses" ADD CONSTRAINT "web_customer_addresses_customer_id_web_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."web_customers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "af_rule_idx" ON "anomaly_findings" USING btree ("rule_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "af_status_idx" ON "anomaly_findings" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "af_branch_idx" ON "anomaly_findings" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "af_entity_idx" ON "anomaly_findings" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "af_detected_idx" ON "anomaly_findings" USING btree ("detected_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_user_idx" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cheques_due_date_idx" ON "cheques" USING btree ("due_date_jalali");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cheques_status_idx" ON "cheques" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cheques_kind_idx" ON "cheques" USING btree ("kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cheques_branch_idx" ON "cheques" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cheques_contact_idx" ON "cheques" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_redemptions_coupon_idx" ON "coupon_redemptions" USING btree ("coupon_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_redemptions_customer_idx" ON "coupon_redemptions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_redemptions_branch_idx" ON "coupon_redemptions" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "coupons_code_uniq" ON "coupons" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupons_branch_idx" ON "coupons" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupons_active_idx" ON "coupons" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "customers_phone_uniq" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_branch_idx" ON "customers" USING btree ("home_branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_active_idx" ON "customers" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_documents_employee_idx" ON "employee_documents" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_documents_type_idx" ON "employee_documents" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "employees_national_id_uniq" ON "employees" USING btree ("national_id") WHERE "employees"."national_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_active_idx" ON "employees" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_full_name_idx" ON "employees" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_branch_idx" ON "employees" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "equipment_branch_code_uidx" ON "equipment" USING btree ("branch_id","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "equipment_branch_idx" ON "equipment" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "equipment_status_idx" ON "equipment" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_branch_idx" ON "feedback" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_customer_idx" ON "feedback" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_created_idx" ON "feedback" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "fp_year_month_uidx" ON "financial_periods" USING btree ("jalali_year","jalali_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fp_year_idx" ON "financial_periods" USING btree ("jalali_year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_daily_sales_branch_date_idx" ON "inv_daily_sales" USING btree ("branch_id","jalali_date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inv_items_branch_code_uniq" ON "inv_items" USING btree ("branch_id","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_items_kind_idx" ON "inv_items" USING btree ("kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_items_branch_idx" ON "inv_items" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_items_active_idx" ON "inv_items" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_recipe_lines_recipe_idx" ON "inv_recipe_lines" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_recipe_lines_item_idx" ON "inv_recipe_lines" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_recipes_branch_idx" ON "inv_recipes" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_recipes_active_idx" ON "inv_recipes" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_stock_tx_item_idx" ON "inv_stock_tx" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_stock_tx_created_idx" ON "inv_stock_tx" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_voucher_lines_voucher_idx" ON "inv_voucher_lines" USING btree ("voucher_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_voucher_lines_item_idx" ON "inv_voucher_lines" USING btree ("item_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inv_vouchers_branch_no_uniq" ON "inv_vouchers" USING btree ("branch_id","no");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_vouchers_status_idx" ON "inv_vouchers" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_vouchers_kind_idx" ON "inv_vouchers" USING btree ("kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_vouchers_branch_status_idx" ON "inv_vouchers" USING btree ("branch_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_applications_status_idx" ON "job_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_applications_created_idx" ON "job_applications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_entries_customer_idx" ON "loyalty_entries" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_entries_branch_idx" ON "loyalty_entries" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_entries_created_idx" ON "loyalty_entries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mlog_equipment_idx" ON "maintenance_logs" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mlog_date_idx" ON "maintenance_logs" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ord_settings_branch_uidx" ON "ord_settings" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ord_zones_branch_idx" ON "ord_zones" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_events_order_idx" ON "order_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_lines_order_idx" ON "order_lines" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "orders_order_no_uidx" ON "orders" USING btree ("order_no");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "orders_track_token_uidx" ON "orders" USING btree ("track_token");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "orders_client_token_uidx" ON "orders" USING btree ("client_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_branch_status_idx" ON "orders" USING btree ("branch_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_pay_authority_idx" ON "orders" USING btree ("pay_authority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_events_employee_period_idx" ON "payroll_events" USING btree ("employee_id","period_year_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_events_period_idx" ON "payroll_events" USING btree ("period_year_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_events_type_idx" ON "payroll_events" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_events_one_active_settlement_per_month" ON "payroll_events" USING btree ("employee_id","period_year_month") WHERE voided_at IS NULL AND type = 'settlement';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_runs_branch_period_uniq" ON "payroll_runs" USING btree ("branch_id","period_year_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_runs_period_idx" ON "payroll_runs" USING btree ("period_year_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payslips_run_idx" ON "payslips" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payslips_employee_period_idx" ON "payslips" USING btree ("employee_id","period_year_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "poi_order_idx" ON "purchase_order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "poi_item_idx" ON "purchase_order_items" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "po_branch_no_uidx" ON "purchase_orders" USING btree ("branch_id","no");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "po_branch_idx" ON "purchase_orders" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "po_supplier_idx" ON "purchase_orders" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "po_status_idx" ON "purchase_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservations_branch_idx" ON "reservations" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservations_customer_idx" ON "reservations" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservations_status_idx" ON "reservations" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservations_branch_date_idx" ON "reservations" USING btree ("branch_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tables_branch_idx" ON "tables" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sms_log_phone_idx" ON "sms_log" USING btree ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sms_log_status_idx" ON "sms_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sms_log_entity_idx" ON "sms_log" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sms_log_created_idx" ON "sms_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "logs_level_idx" ON "system_logs" USING btree ("level");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "logs_category_idx" ON "system_logs" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "logs_created_idx" ON "system_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tinst_branch_idx" ON "task_instances" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tinst_template_idx" ON "task_instances" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tinst_status_idx" ON "task_instances" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tinst_due_idx" ON "task_instances" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tmpl_branch_idx" ON "task_templates" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tmpl_active_idx" ON "task_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "web_customer_addresses_customer_idx" ON "web_customer_addresses" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "web_customer_otp_phone_used_idx" ON "web_customer_otp" USING btree ("phone","used");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "web_customers_phone_uniq" ON "web_customers" USING btree ("phone");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_destination_account_id_accounts_id_fk" FOREIGN KEY ("destination_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
