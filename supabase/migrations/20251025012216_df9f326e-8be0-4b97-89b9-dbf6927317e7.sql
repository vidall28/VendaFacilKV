-- Add temporary column to force type regeneration
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS temp_sync_column text;

-- Remove it immediately
ALTER TABLE public.profiles DROP COLUMN IF EXISTS temp_sync_column;