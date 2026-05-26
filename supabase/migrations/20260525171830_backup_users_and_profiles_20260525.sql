
/*
  # Backup all user and profile data - 2026-05-25

  Creates a snapshot backup table of all current profiles so data is
  never lost regardless of future auth changes.
*/

CREATE TABLE IF NOT EXISTS profiles_backup_20260525 AS
SELECT * FROM public.profiles;

-- Verify count
DO $$
DECLARE cnt INT;
BEGIN
  SELECT COUNT(*) INTO cnt FROM profiles_backup_20260525;
  RAISE NOTICE 'Backed up % profiles', cnt;
END $$;
