-- ============================================================
-- Supabase Auth & Storage Shim for Plain PostgreSQL
-- Creates minimal auth.users, auth roles, and storage tables
-- to allow migrations to run outside of Supabase
-- ============================================================

-- Create schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS vault;

-- ─── Roles ─────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END
$$;

-- Grant necessary privileges to service_role
GRANT ALL ON SCHEMA public TO service_role;
GRANT ALL ON SCHEMA auth TO service_role;
GRANT ALL ON SCHEMA storage TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA auth TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA storage TO service_role;

-- ─── Auth Schema ───────────────────────────────────────────

-- Minimal auth.users table
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  encrypted_password text,
  email_confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  raw_app_meta_data jsonb DEFAULT '{}'::jsonb,
  is_super_admin boolean DEFAULT false,
  role text,
  confirmation_token text,
  email_change text,
  phone text,
  phone_confirmed_at timestamptz,
  last_sign_in_at timestamptz
);

-- Grant access to roles
GRANT ALL ON auth.users TO service_role;
GRANT SELECT ON auth.users TO authenticated;

-- Helper function: auth.uid() - returns current user ID from JWT claims
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_id text;
BEGIN
  -- Read JWT claims from request.jwt.claims setting
  BEGIN
    claims := current_setting('request.jwt.claims', true)::jsonb;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN NULL;
  END;
  
  IF claims IS NULL THEN
    RETURN NULL;
  END IF;
  
  user_id := claims->>'sub';
  
  IF user_id IS NULL OR user_id = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN user_id::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Helper function: auth.role() - returns current user role from JWT claims
CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_role text;
BEGIN
  -- Read JWT claims from request.jwt.claims setting
  BEGIN
    claims := current_setting('request.jwt.claims', true)::jsonb;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN 'anon';
  END;
  
  IF claims IS NULL THEN
    RETURN 'anon';
  END IF;
  
  user_role := claims->>'role';
  
  IF user_role IS NULL OR user_role = '' THEN
    RETURN 'anon';
  END IF;
  
  RETURN user_role;
END;
$$;

-- Enable pgcrypto for password hashing (used by tests)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Storage Schema ────────────────────────────────────────

-- Storage buckets table
CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  owner uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  public boolean DEFAULT false,
  avif_autodetection boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

-- Storage objects table
CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text NOT NULL,
  owner uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  path_tokens text[] DEFAULT ARRAY[]::text[],
  version text,
  UNIQUE (bucket_id, name)
);

-- Enable RLS on storage tables
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Grant access to roles
GRANT ALL ON storage.buckets TO service_role;
GRANT ALL ON storage.objects TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated;

-- Helper function: storage.foldername() - extracts folder path from object name
CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  parts text[];
  result text[];
  i int;
BEGIN
  -- Split path by '/'
  parts := string_to_array(name, '/');
  
  -- Return all parts except the last (filename)
  IF array_length(parts, 1) > 1 THEN
    FOR i IN 1..(array_length(parts, 1) - 1) LOOP
      result := array_append(result, parts[i]);
    END LOOP;
  END IF;
  
  RETURN COALESCE(result, ARRAY[]::text[]);
END;
$$;

-- ─── Test Helpers ──────────────────────────────────────────

-- Function to set JWT claims for testing (simulates different roles)
CREATE OR REPLACE FUNCTION set_test_role(role_name text, user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  claims jsonb;
BEGIN
  IF user_id IS NOT NULL THEN
    claims := jsonb_build_object(
      'role', role_name,
      'sub', user_id::text
    );
  ELSE
    claims := jsonb_build_object('role', role_name);
  END IF;
  
  PERFORM set_config('request.jwt.claims', claims::text, false);
END;
$$;

COMMENT ON FUNCTION set_test_role IS 'Test helper: Sets JWT claims to simulate authenticated user or role';

-- ─── Vault Schema (for testing) ────────────────────────────

-- Minimal vault.decrypted_secrets table for testing
-- In production Supabase, this is provided by the Vault extension
CREATE TABLE IF NOT EXISTS vault.decrypted_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  decrypted_secret text NOT NULL,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE vault.decrypted_secrets IS 'Test shim for Supabase Vault secrets';

-- Grant access to service_role only
GRANT ALL ON TABLE vault.decrypted_secrets TO service_role;
REVOKE ALL ON TABLE vault.decrypted_secrets FROM PUBLIC, anon, authenticated;

-- Enable uuid-ossp extension (provides uuid_generate_v4)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
