-- Ensure api_v1 grants for read-only API access via PostgREST

create schema if not exists api_v1;

-- Allow roles to access the schema
grant usage on schema api_v1 to anon, authenticated, service_role;

-- Allow selecting from all existing views/tables within api_v1
grant select on all tables in schema api_v1 to anon, authenticated, service_role;

-- Ensure future views/tables in api_v1 are also selectable by these roles
alter default privileges in schema api_v1
  grant select on tables to anon, authenticated, service_role;

-- Make PostgREST reload schema cache after privileges change
select pg_notify('pgrst', 'reload schema');



