-- Add shipping_price_per_kg column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN shipping_price_per_kg numeric DEFAULT 0 NOT NULL;

-- Add shipping_weight column to sales table
ALTER TABLE public.sales 
ADD COLUMN shipping_weight numeric DEFAULT 0 NOT NULL;