-- Run in the Supabase SQL Editor AFTER all TypeORM migrations, on a NEW validation project.
-- No clinical data belongs in this project. This script does not delete data.
BEGIN;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sitf_runtime') THEN
    CREATE ROLE sitf_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END $$;

GRANT CONNECT ON DATABASE postgres TO sitf_runtime;
GRANT USAGE ON SCHEMA public, extensions TO sitf_runtime;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'tenants', 'users', 'patients', 'categories', 'exercises',
    'exercise_rules', 'exercise_count_rules', 'sessions', 'session_exercises',
    'session_executions', 'execution_notes', 'appointments', 'patient_reports', 'audit_events'
  ] LOOP
    -- Supabase's automatic Data API must not expose the NestJS tables to public clients.
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM sitf_runtime', table_name);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = table_name AND policyname = 'sitf_backend_access'
    ) THEN
      -- Tenant authorization stays in NestJS; the database role is never given to browsers.
      EXECUTE format('CREATE POLICY sitf_backend_access ON public.%I TO sitf_runtime USING (true) WITH CHECK (true)', table_name);
    END IF;
    IF table_name IN ('audit_events', 'patient_reports') THEN
      EXECUTE format('GRANT SELECT, INSERT ON TABLE public.%I TO sitf_runtime', table_name);
    ELSE
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO sitf_runtime', table_name);
    END IF;
  END LOOP;
END $$;

REVOKE ALL ON TABLE public.migrations FROM PUBLIC, anon, authenticated, sitf_runtime;
COMMIT;

-- Separately set a strong password in this SQL Editor (never commit it):
-- ALTER ROLE sitf_runtime LOGIN PASSWORD '<unique password>';
-- Session pooler username: sitf_runtime.<project reference>, port 5432.
-- Re-run this script after migrations that create additional app tables; update the list above.
