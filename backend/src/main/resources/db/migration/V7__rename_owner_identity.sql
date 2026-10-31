ALTER TABLE suppliers RENAME COLUMN owner_email TO owner_id;
ALTER INDEX idx_suppliers_owner_email RENAME TO idx_suppliers_owner_id;
