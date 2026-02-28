-- Create a security definer function to get email by shop_name
-- This bypasses RLS and allows login lookup without authentication
CREATE OR REPLACE FUNCTION public.get_email_by_shop_name(shop_name_input TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email 
  FROM public.profiles 
  WHERE LOWER(shop_name) = LOWER(shop_name_input)
  LIMIT 1;
$$;