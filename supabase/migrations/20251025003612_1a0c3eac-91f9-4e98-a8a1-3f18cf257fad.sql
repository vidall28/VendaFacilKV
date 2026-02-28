-- Fix handle_new_user function to ensure shop_name always has a value
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, shop_name, email)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'shop_name', 'Loja'),
    new.email
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      shop_name = COALESCE(EXCLUDED.shop_name, profiles.shop_name);
  RETURN new;
END;
$$;