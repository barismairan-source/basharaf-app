-- ============================================================================
-- customers-migration.sql
-- Customers module: customers, loyalty_entries, coupons, coupon_redemptions,
-- tables, reservations, feedback (+ indexes + app_settings seed).
-- Idempotent. Run without RLS in pgAdmin/Supabase SQL Editor.
-- Money = bigint (toman integer). User dates = Jalali text. System dates = timestamptz.
-- NOTE: keep all comments in this file ASCII only (first byte must be a hyphen).
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- customers : customer profile. Branch scope lives on home_branch_id.
-- ---------------------------------------------------------------------------
create table if not exists customers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  phone           text not null,
  birthday        text,                                   -- Jalali string
  home_branch_id  uuid references branches(id) on delete set null,
  contact_id      uuid references contacts(id) on delete set null,  -- credit account link
  tier            text not null default 'bronze',         -- bronze | silver | gold | platinum
  points          bigint not null default 0,              -- denormalized; atomic helper only
  visit_count     integer not null default 0,
  total_spent     bigint not null default 0,
  note            text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists customers_phone_uniq  on customers (phone);
create index        if not exists customers_branch_idx  on customers (home_branch_id);
create index        if not exists customers_active_idx  on customers (is_active);

-- ---------------------------------------------------------------------------
-- loyalty_entries : append-only loyalty ledger. points sign = +earn / -redeem.
-- ---------------------------------------------------------------------------
create table if not exists loyalty_entries (
  id                 uuid primary key default gen_random_uuid(),
  customer_id        uuid not null references customers(id) on delete cascade,
  branch_id          uuid not null references branches(id) on delete restrict,
  type               text not null,                       -- earn | redeem | adjust
  points             integer not null,                    -- +earn / -redeem / +-adjust
  reason             text not null default '',
  ref_transaction_id uuid references transactions(id) on delete set null,
  created_by         uuid not null references users(id) on delete restrict,
  created_at         timestamptz not null default now()
);

create index if not exists loyalty_entries_customer_idx on loyalty_entries (customer_id);
create index if not exists loyalty_entries_branch_idx   on loyalty_entries (branch_id);
create index if not exists loyalty_entries_created_idx   on loyalty_entries (created_at);

-- ---------------------------------------------------------------------------
-- coupons : branch_id null = all branches.
-- ---------------------------------------------------------------------------
create table if not exists coupons (
  id            uuid primary key default gen_random_uuid(),
  code          text not null,
  discount_type text not null,                            -- percent | fixed
  value         bigint not null,
  min_order     bigint not null default 0,
  max_discount  bigint,
  valid_from    text not null,                            -- Jalali string
  valid_to      text not null,                            -- Jalali string
  usage_limit   integer,
  used_count    integer not null default 0,
  branch_id     uuid references branches(id) on delete set null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create unique index if not exists coupons_code_uniq  on coupons (code);
create index        if not exists coupons_branch_idx on coupons (branch_id);
create index        if not exists coupons_active_idx on coupons (is_active);

-- ---------------------------------------------------------------------------
-- coupon_redemptions : one row per successful coupon use.
-- ---------------------------------------------------------------------------
create table if not exists coupon_redemptions (
  id                 uuid primary key default gen_random_uuid(),
  coupon_id          uuid not null references coupons(id) on delete cascade,
  customer_id        uuid references customers(id) on delete set null,
  branch_id          uuid not null references branches(id) on delete restrict,
  discount_amount    bigint not null,
  ref_transaction_id uuid references transactions(id) on delete set null,
  created_by         uuid not null references users(id) on delete restrict,
  created_at         timestamptz not null default now()
);

create index if not exists coupon_redemptions_coupon_idx   on coupon_redemptions (coupon_id);
create index if not exists coupon_redemptions_customer_idx on coupon_redemptions (customer_id);
create index if not exists coupon_redemptions_branch_idx   on coupon_redemptions (branch_id);

-- ---------------------------------------------------------------------------
-- tables : restaurant tables per branch. (Drizzle export: restaurantTables)
-- ---------------------------------------------------------------------------
create table if not exists tables (
  id         uuid primary key default gen_random_uuid(),
  branch_id  uuid not null references branches(id) on delete restrict,
  name       text not null,
  capacity   integer not null default 0,
  area       text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists tables_branch_idx on tables (branch_id);

-- ---------------------------------------------------------------------------
-- reservations : branch-scoped. status state machine.
-- ---------------------------------------------------------------------------
create table if not exists reservations (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  branch_id   uuid not null references branches(id) on delete restrict,
  table_id    uuid references tables(id) on delete set null,
  date        text not null,                              -- Jalali string
  time        text not null,
  party_size  integer not null default 1,
  status      text not null default 'pending',            -- pending|confirmed|seated|cancelled|no_show
  note        text,
  created_by  uuid not null references users(id) on delete restrict,
  created_at  timestamptz not null default now()
);

create index if not exists reservations_branch_idx      on reservations (branch_id);
create index if not exists reservations_customer_idx    on reservations (customer_id);
create index if not exists reservations_status_idx      on reservations (status);
create index if not exists reservations_branch_date_idx on reservations (branch_id, date);

-- ---------------------------------------------------------------------------
-- feedback : 1..5 rating. branch average shown in reports.
-- ---------------------------------------------------------------------------
create table if not exists feedback (
  id                 uuid primary key default gen_random_uuid(),
  customer_id        uuid references customers(id) on delete set null,
  branch_id          uuid not null references branches(id) on delete restrict,
  rating             integer not null,                    -- 1..5
  comment            text,
  source             text not null default 'in_store',
  ref_transaction_id uuid references transactions(id) on delete set null,
  created_at         timestamptz not null default now()
);

-- rating bounds (guarded so re-running is safe)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'feedback_rating_chk'
  ) then
    alter table feedback add constraint feedback_rating_chk check (rating between 1 and 5);
  end if;
end $$;

create index if not exists feedback_branch_idx   on feedback (branch_id);
create index if not exists feedback_customer_idx on feedback (customer_id);
create index if not exists feedback_created_idx  on feedback (created_at);

-- ---------------------------------------------------------------------------
-- seed : loyalty earn rate (every N toman = 1 point). Label is Persian (value-only).
-- ---------------------------------------------------------------------------
insert into app_settings (key, value, label, "group")
values ('loyalty_earn_rate', '10000', 'نرخ کسب امتیاز (هر چند تومان = ۱ امتیاز)', 'loyalty')
on conflict (key) do nothing;
