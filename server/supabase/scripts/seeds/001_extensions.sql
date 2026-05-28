-- Ryvo-Line: required PostgreSQL extensions
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- H3 indexing is computed in edge services (h3-js); optional DB extension can be added later.
