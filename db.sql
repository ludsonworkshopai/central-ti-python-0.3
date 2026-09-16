CREATE TABLE IF NOT EXISTS users(
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL CHECK (length(trim(nome)) >= 2),
  email VARCHAR(255) NOT NULL UNIQUE CHECK (email = lower(email) AND email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  senha VARCHAR(255) NOT NULL CHECK (length(trim(senha)) > 0),
  funcao INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE POLICY "users_insert"
ON public.users
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

GRANT INSERT ON TABLE public.users TO anon, authenticated;

CREATE POLICY "users_select"
ON public.users
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (true);

GRANT SELECT ON TABLE public.users TO anon, authenticated;

CREATE POLICY "users_update"
ON public.users
AS PERMISSIVE
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

GRANT UPDATE ON TABLE public.users TO anon, authenticated;

CREATE POLICY "users_delete"
ON public.users
AS PERMISSIVE
FOR DELETE
TO anon, authenticated
USING (true);

GRANT DELETE ON TABLE public.users TO anon, authenticated;