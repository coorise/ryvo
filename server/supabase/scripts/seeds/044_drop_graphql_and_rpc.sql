-- Ryvo uses PostgREST + RLS, not the GraphQL API. Dropping pg_graphql clears linter 0026/0027
-- (schema discovery warnings) without changing REST behaviour.
-- Run as postgres.

DROP EXTENSION IF EXISTS pg_graphql CASCADE;

REVOKE ALL ON FUNCTION public.has_role(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(text) TO postgres, service_role;
