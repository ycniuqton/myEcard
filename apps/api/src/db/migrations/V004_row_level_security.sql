DO $$
DECLARE
  tbl text;
BEGIN
  IF to_regprocedure('auth.uid()') IS NULL THEN
    RAISE NOTICE 'auth.uid() not found, skipping row level security';
    RETURN;
  END IF;
  FOREACH tbl IN ARRAY ARRAY['settings', 'user_words', 'review_logs', 'day_stats'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_owner', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()))',
      tbl || '_owner', tbl);
  END LOOP;
END
$$;
