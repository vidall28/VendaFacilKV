-- Criar tabela de produtos
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  unit TEXT NOT NULL CHECK (unit IN ('kg', 'un')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS (como não precisa de autenticação, permitimos tudo)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Políticas para produtos (acesso público total)
CREATE POLICY "Qualquer um pode ver produtos" 
ON public.products 
FOR SELECT 
USING (true);

CREATE POLICY "Qualquer um pode criar produtos" 
ON public.products 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar produtos" 
ON public.products 
FOR UPDATE 
USING (true);

CREATE POLICY "Qualquer um pode deletar produtos" 
ON public.products 
FOR DELETE 
USING (true);

-- Criar tabela de vendas
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para vendas
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Políticas para vendas (acesso público total)
CREATE POLICY "Qualquer um pode ver vendas" 
ON public.sales 
FOR SELECT 
USING (true);

CREATE POLICY "Qualquer um pode criar vendas" 
ON public.sales 
FOR INSERT 
WITH CHECK (true);

-- Trigger para atualizar updated_at em produtos
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();