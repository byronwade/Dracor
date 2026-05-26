-- =============================================================================
-- Dracor: Unique display names + character name uniqueness
-- =============================================================================

-- Add unique constraint on profile display names (case-insensitive)
CREATE UNIQUE INDEX idx_profiles_display_name_lower
  ON public.profiles (lower(display_name));

-- Add unique constraint on character names (case-insensitive)
CREATE UNIQUE INDEX idx_characters_name_lower
  ON public.characters (lower(name));

-- Add a username column to profiles for login/display identity
-- This is the canonical unique identifier players choose at signup
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

-- Backfill username from display_name for existing rows
UPDATE public.profiles
  SET username = lower(replace(display_name, ' ', '_'))
  WHERE username IS NULL;

-- Make username NOT NULL and unique (case-insensitive)
ALTER TABLE public.profiles
  ALTER COLUMN username SET NOT NULL;

CREATE UNIQUE INDEX idx_profiles_username_lower
  ON public.profiles (lower(username));

-- Username validation: 3-20 chars, alphanumeric + underscores only
ALTER TABLE public.profiles
  ADD CONSTRAINT chk_username_format
  CHECK (username ~ '^[a-zA-Z0-9_]{3,20}$');

-- Display name validation: 2-24 chars, not empty
ALTER TABLE public.profiles
  ADD CONSTRAINT chk_display_name_length
  CHECK (char_length(trim(display_name)) BETWEEN 2 AND 24);

-- Character name validation: 2-24 chars
ALTER TABLE public.characters
  ADD CONSTRAINT chk_character_name_length
  CHECK (char_length(trim(name)) BETWEEN 2 AND 24);
