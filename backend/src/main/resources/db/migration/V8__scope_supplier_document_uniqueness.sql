DROP INDEX IF EXISTS uq_suppliers_document;
CREATE UNIQUE INDEX uq_suppliers_owner_document
  ON suppliers(owner_id, document)
  WHERE owner_id IS NOT NULL AND document IS NOT NULL;
