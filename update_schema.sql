-- Add metadata columns for cloud storage integration to books table
ALTER TABLE books ADD COLUMN IF NOT EXISTS file_key TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS uploader_id UUID;

-- Optional: If you want to update the default admin user with a bcrypt hashed password.
-- The hash below is for 'admin123' with 10 salt rounds.
UPDATE users 
SET password = '$2a$10$3eY9nEq.7gC0V48b1D9uFeQ89Tq7bQpM7n5o5e4Y21K0q9tB.8Fqy'
WHERE email = 'admin@dlcf.org';

-- Remove author column from books table
ALTER TABLE books DROP COLUMN IF EXISTS author;

