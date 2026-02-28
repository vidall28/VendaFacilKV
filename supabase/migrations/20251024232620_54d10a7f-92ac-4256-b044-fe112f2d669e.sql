-- Adicionar coluna customer_name na tabela sales
ALTER TABLE public.sales 
ADD COLUMN customer_name TEXT NOT NULL DEFAULT 'Cliente';