-- Create profiles table to store shop names
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies: users can only see their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Add user_id to products table
ALTER TABLE public.products
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to sales table
ALTER TABLE public.sales
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update products RLS policies
DROP POLICY IF EXISTS "Qualquer um pode ver produtos" ON public.products;
DROP POLICY IF EXISTS "Qualquer um pode criar produtos" ON public.products;
DROP POLICY IF EXISTS "Qualquer um pode atualizar produtos" ON public.products;
DROP POLICY IF EXISTS "Qualquer um pode deletar produtos" ON public.products;

CREATE POLICY "Users can view their own products"
ON public.products
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products"
ON public.products
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products"
ON public.products
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Update sales RLS policies
DROP POLICY IF EXISTS "Qualquer um pode ver vendas" ON public.sales;
DROP POLICY IF EXISTS "Qualquer um pode criar vendas" ON public.sales;

CREATE POLICY "Users can view their own sales"
ON public.sales
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sales"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Function to auto-create profile when user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, shop_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'shop_name', 'Loja'));
  RETURN new;
END;
$$;

-- Trigger to create profile automatically
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();