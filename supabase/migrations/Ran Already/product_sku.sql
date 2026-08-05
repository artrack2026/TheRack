-- Run this once in the Supabase SQL editor against your existing project.
-- Adds an optional admin-set product identifier ("Product ID" in the admin
-- form) — free text, not enforced unique (Postgres allows multiple NULLs
-- under a unique constraint but not multiple blank/duplicate values, and
-- there's no uniqueness validation in the UI yet, so a unique constraint
-- would risk a raw DB error on save). Searchable via the header search and
-- the /shop page's local search filter.

alter table products add column if not exists sku text;
