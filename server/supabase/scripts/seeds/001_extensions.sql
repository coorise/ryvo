-- Ryvo-Line: required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- H3 indexing is computed in edge services (h3-js); optional DB extension can be added later.
