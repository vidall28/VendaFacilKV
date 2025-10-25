-- Add shipping_fee column to sales table
ALTER TABLE public.sales 
ADD COLUMN shipping_fee numeric DEFAULT 0 NOT NULL;