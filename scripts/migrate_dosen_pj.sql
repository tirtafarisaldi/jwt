-- =============================================================================
-- Migrasi: Dosen Penanggung Jawab + Role baru + Keterangan wajib
--
-- Skema sama untuk database LOCAL (localhost Postgres) dan PRODUCTION
-- (Neon Postgres). Jalankan pada database: studio_pertunjukan
--
-- Contoh (local):
--   psql -U tirta -d studio_pertunjukan -f scripts/migrate_dosen_pj.sql
--
-- Contoh (production / Neon):
--   psql "postgres://studio_pertunjukan_owner:PASSWORD@ep-young-dew-b38ojpfl-pooler.c-4.ap-southeast-1.aws.neon.tech/studio_pertunjukan" \
--     -f scripts/migrate_dosen_pj.sql
-- =============================================================================

BEGIN;

-- 1. Kolom baru "Dosen Penanggung Jawab" pada tabel bookings.
--    Opsional di DB (validation mandatori utk mahasiswa dilakukan di API).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dosen_pj VARCHAR(255) NULL;

-- 2. Keterangan (note) menjadi wajib.
--    Backfill nilai lama yang kosong lalu beri constraint NOT NULL.
UPDATE bookings SET note = '' WHERE note IS NULL;
ALTER TABLE bookings ALTER COLUMN note SET DEFAULT '';
ALTER TABLE bookings ALTER COLUMN note SET NOT NULL;

-- 3. Role pengguna: user/admin -> admin/staff/dosen/mahasiswa.
--    Backfill role lama "user" berdasarkan domain email. Admin tetap admin.
UPDATE users SET role = 'staff'
  WHERE role = 'user' AND email ILIKE '%@staff.pens.ac.id';
UPDATE users SET role = 'mahasiswa'
  WHERE role = 'user' AND email ILIKE '%@student.pens.ac.id';
UPDATE users SET role = 'dosen'
  WHERE role = 'user'
    AND email ILIKE '%@pens.ac.id'
    AND email NOT ILIKE '%@staff.pens.ac.id'
    AND email NOT ILIKE '%@student.pens.ac.id';
UPDATE users SET role = 'mahasiswa'
  WHERE role NOT IN ('admin', 'staff', 'dosen', 'mahasiswa');

-- 4. Batasi nilai role di kolom users.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'staff', 'dosen', 'mahasiswa'));

COMMIT;

-- Verifikasi hasil:
--   SELECT role, count(*) FROM users GROUP BY role;
--   SELECT dosen_pj, note FROM bookings LIMIT 10;