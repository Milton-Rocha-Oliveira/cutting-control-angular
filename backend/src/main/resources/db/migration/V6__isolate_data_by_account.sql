-- Records are owned by the verified account. Backfill legacy records explicitly before enabling access.
ALTER TABLE suppliers ADD COLUMN owner_email VARCHAR(320);
CREATE INDEX idx_suppliers_owner_email ON suppliers(owner_email);
