-- Add Profile Fields and Seed Data for Demo
-- Run this in Supabase SQL Editor to enhance the profiles table

-- Step 1: Add new columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS company text,
ADD COLUMN IF NOT EXISTS role text;

-- Step 2: Create arrays of realistic data for random assignment
WITH profile_data AS (
  SELECT
    id,
    email,
    full_name,
    ROW_NUMBER() OVER (ORDER BY updated_at, id) as row_num
  FROM profiles
),
bios AS (
  SELECT * FROM (VALUES
    ('Full-stack developer passionate about building scalable web applications'),
    ('Product designer focused on creating delightful user experiences'),
    ('Backend engineer specializing in distributed systems and microservices'),
    ('Data scientist working on machine learning and AI applications'),
    ('Frontend developer with a love for React and modern JavaScript'),
    ('DevOps engineer automating everything that moves'),
    ('Mobile developer creating native iOS and Android experiences'),
    ('UX researcher dedicated to understanding user needs'),
    ('Technical writer making complex topics accessible'),
    ('Security engineer keeping systems safe and sound'),
    ('Cloud architect designing resilient infrastructure'),
    ('QA engineer ensuring quality at every step'),
    ('Product manager bridging tech and business'),
    ('Solutions architect solving complex technical challenges'),
    ('Database administrator optimizing data performance')
  ) AS t(bio)
),
locations AS (
  SELECT * FROM (VALUES
    ('San Francisco, CA'),
    ('New York, NY'),
    ('Austin, TX'),
    ('Seattle, WA'),
    ('London, UK'),
    ('Berlin, Germany'),
    ('Toronto, Canada'),
    ('Amsterdam, Netherlands'),
    ('Sydney, Australia'),
    ('Tokyo, Japan'),
    ('Barcelona, Spain'),
    ('Remote'),
    ('Los Angeles, CA'),
    ('Chicago, IL'),
    ('Boston, MA')
  ) AS t(location)
),
companies AS (
  SELECT * FROM (VALUES
    ('TechCorp'),
    ('StartupHub'),
    ('Digital Ventures'),
    ('CloudScale'),
    ('DataFlow Systems'),
    ('InnovateLabs'),
    ('FutureStack'),
    ('CodeCraft'),
    ('ByteWorks'),
    ('Nexus Technologies'),
    ('Quantum Solutions'),
    ('Freelance'),
    ('OpenSource Co'),
    ('AI Dynamics'),
    ('WebScale Inc')
  ) AS t(company)
),
roles AS (
  SELECT * FROM (VALUES
    ('Senior Engineer'),
    ('Tech Lead'),
    ('Principal Engineer'),
    ('Staff Engineer'),
    ('Software Engineer'),
    ('Senior Developer'),
    ('Engineering Manager'),
    ('Product Designer'),
    ('Senior Designer'),
    ('Lead Designer'),
    ('Data Scientist'),
    ('ML Engineer'),
    ('DevOps Engineer'),
    ('Frontend Developer'),
    ('Backend Developer')
  ) AS t(role)
)
-- Step 3: Update existing profiles with random but consistent data
UPDATE profiles p
SET
  bio = COALESCE(p.bio, (
    SELECT bio FROM bios
    LIMIT 1
    OFFSET (ABS(hashtext(p.id::text)) % 15)
  )),
  location = COALESCE(p.location, (
    SELECT location FROM locations
    LIMIT 1
    OFFSET (ABS(hashtext(p.id::text || '1')) % 15)
  )),
  company = COALESCE(p.company, (
    SELECT company FROM companies
    LIMIT 1
    OFFSET (ABS(hashtext(p.id::text || '2')) % 15)
  )),
  role = COALESCE(p.role, (
    SELECT role FROM roles
    LIMIT 1
    OFFSET (ABS(hashtext(p.id::text || '3')) % 15)
  )),
  website = COALESCE(p.website,
    CASE
      WHEN random() < 0.7 THEN 'https://linkedin.com/in/' || LOWER(REPLACE(p.full_name, ' ', '-'))
      WHEN random() < 0.85 THEN 'https://github.com/' || LOWER(SPLIT_PART(p.full_name, ' ', 1))
      ELSE 'https://' || LOWER(REPLACE(p.full_name, ' ', '')) || '.dev'
    END
  ),
  updated_at = NOW()
WHERE p.bio IS NULL
   OR p.location IS NULL
   OR p.company IS NULL
   OR p.role IS NULL
   OR p.website IS NULL;

-- Step 4: Update some profiles to have more variety in names (if they're still default)
UPDATE profiles
SET full_name =
  CASE
    WHEN full_name = '' OR full_name IS NULL THEN
      CASE (ABS(hashtext(id::text || '4')) % 20)
        WHEN 0 THEN 'Sarah Johnson'
        WHEN 1 THEN 'Michael Chen'
        WHEN 2 THEN 'Emma Williams'
        WHEN 3 THEN 'James Rodriguez'
        WHEN 4 THEN 'Olivia Brown'
        WHEN 5 THEN 'David Kim'
        WHEN 6 THEN 'Sophia Martinez'
        WHEN 7 THEN 'Robert Taylor'
        WHEN 8 THEN 'Isabella Anderson'
        WHEN 9 THEN 'William Lee'
        WHEN 10 THEN 'Ava Thompson'
        WHEN 11 THEN 'Daniel Garcia'
        WHEN 12 THEN 'Mia Wilson'
        WHEN 13 THEN 'Christopher Moore'
        WHEN 14 THEN 'Charlotte Davis'
        WHEN 15 THEN 'Matthew Jones'
        WHEN 16 THEN 'Amelia Miller'
        WHEN 17 THEN 'Joseph White'
        WHEN 18 THEN 'Harper Jackson'
        ELSE 'Alex Smith'
      END
    ELSE full_name
  END
WHERE full_name = '' OR full_name IS NULL;

-- Step 5: Ensure at least a few profiles have avatars for visual variety
UPDATE profiles
SET avatar_url =
  CASE (ABS(hashtext(id::text || '5')) % 10)
    WHEN 0 THEN 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || id
    WHEN 1 THEN 'https://api.dicebear.com/7.x/initials/svg?seed=' || id
    WHEN 2 THEN 'https://api.dicebear.com/7.x/personas/svg?seed=' || id
    WHEN 3 THEN 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || id || '&backgroundColor=b6e3f4'
    WHEN 4 THEN 'https://api.dicebear.com/7.x/initials/svg?seed=' || id || '&backgroundColor=c0aede'
    ELSE avatar_url
  END
WHERE avatar_url IS NULL OR avatar_url = '';

-- Step 6: Display what we've updated
SELECT
  id,
  full_name,
  bio,
  location,
  company,
  role,
  website,
  avatar_url,
  updated_at
FROM profiles
ORDER BY updated_at DESC
LIMIT 10;