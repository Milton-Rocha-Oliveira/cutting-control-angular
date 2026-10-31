DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM suppliers WHERE owner_id IS NULL) THEN
    RAISE EXCEPTION 'Existem fornecedores sem owner_id. Atribua os registros a uma conta antes de habilitar a produção.';
  END IF;
END $$;

ALTER TABLE suppliers ALTER COLUMN owner_id SET NOT NULL;
