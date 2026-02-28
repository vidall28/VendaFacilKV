-- Create storage bucket for shop logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-logos', 'shop-logos', true);

-- Add logo_url column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN logo_url text;

-- Create RLS policies for shop logos bucket
CREATE POLICY "Users can upload their own logo"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'shop-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own logo"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'shop-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own logo"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'shop-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Shop logos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'shop-logos');

-- Add RLS policy for updating profile logo_url
CREATE POLICY "Users can update their own profile logo"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);