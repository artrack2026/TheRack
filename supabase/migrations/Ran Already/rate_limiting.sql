-- Run this once in the Supabase SQL editor against your existing project.
-- Fixed-window rate limiter for public unauthenticated routes (inquiries,
-- guest checkout, guest account creation). window_start is truncated to the
-- bucket's window size in application code, so each (bucket, identifier,
-- window) tuple gets one row that's atomically incremented on every hit via
-- increment_rate_limit() below — safe under concurrent serverless requests
-- without a read-then-write race.
-- Service-role only — no public/authenticated policies on the table, and
-- execute on the function is revoked from anon/authenticated so a client
-- can't call it directly to pollute another identifier's window.

create table if not exists rate_limit_windows (
  bucket text not null,
  identifier text not null,
  window_start timestamptz not null,
  count integer not null default 1,
  primary key (bucket, identifier, window_start)
);

create or replace function increment_rate_limit(
  p_bucket text,
  p_identifier text,
  p_window_start timestamptz
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into rate_limit_windows (bucket, identifier, window_start, count)
  values (p_bucket, p_identifier, p_window_start, 1)
  on conflict (bucket, identifier, window_start)
  do update set count = rate_limit_windows.count + 1
  returning count into v_count;
  return v_count;
end;
$$;

revoke execute on function increment_rate_limit(text, text, timestamptz) from public;
revoke execute on function increment_rate_limit(text, text, timestamptz) from anon;
revoke execute on function increment_rate_limit(text, text, timestamptz) from authenticated;
grant execute on function increment_rate_limit(text, text, timestamptz) to service_role;

alter table rate_limit_windows enable row level security;
