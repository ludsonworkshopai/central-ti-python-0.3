-- Execute no SQL Editor do Supabase para atualizar um banco existente.
-- Requer PostgreSQL com encoding UTF8.
BEGIN;

CREATE OR REPLACE FUNCTION public.normalizar_nome_usuario(valor TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT btrim(regexp_replace(normalize(upper(valor), NFD), U&'[\0300-\036f]', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.users_normalizar_nome()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.nome := public.normalizar_nome_usuario(NEW.nome);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_normalizar_nome ON public.users;
CREATE TRIGGER users_normalizar_nome
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.users_normalizar_nome();

UPDATE public.users
SET nome = public.normalizar_nome_usuario(nome)
WHERE nome IS DISTINCT FROM public.normalizar_nome_usuario(nome);

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_nome_normalizado_check;
ALTER TABLE public.users ADD CONSTRAINT users_nome_normalizado_check
CHECK (nome = public.normalizar_nome_usuario(nome) AND char_length(nome) BETWEEN 2 AND 255);

COMMIT;
