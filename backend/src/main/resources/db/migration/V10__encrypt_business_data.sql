-- Encrypted JPA fields are stored as authenticated ciphertext strings.
ALTER TABLE suppliers
  ALTER COLUMN name TYPE VARCHAR(512),
  ALTER COLUMN document TYPE VARCHAR(512),
  ALTER COLUMN email TYPE VARCHAR(512),
  ALTER COLUMN phone TYPE VARCHAR(512);
ALTER TABLE suppliers ADD COLUMN document_fingerprint VARCHAR(64);
DROP INDEX IF EXISTS uq_suppliers_owner_document;
CREATE UNIQUE INDEX uq_suppliers_owner_document_fingerprint
  ON suppliers(owner_id, document_fingerprint)
  WHERE owner_id IS NOT NULL AND document_fingerprint IS NOT NULL;

ALTER TABLE cuts DROP CONSTRAINT IF EXISTS uq_supplier_cut_number;
ALTER TABLE cuts ADD COLUMN cut_number_fingerprint VARCHAR(64);
CREATE UNIQUE INDEX uq_supplier_cut_number_fingerprint
  ON cuts(supplier_id, cut_number_fingerprint)
  WHERE cut_number_fingerprint IS NOT NULL;
ALTER TABLE cuts
  DROP CONSTRAINT IF EXISTS cuts_packages_check,
  DROP CONSTRAINT IF EXISTS cuts_pieces_per_package_check,
  DROP CONSTRAINT IF EXISTS cuts_unit_price_per_piece_check,
  DROP CONSTRAINT IF EXISTS cuts_total_pieces_check,
  DROP CONSTRAINT IF EXISTS cuts_total_amount_check;
ALTER TABLE cuts
  ALTER COLUMN cut_number TYPE VARCHAR(512),
  ALTER COLUMN description TYPE VARCHAR(1024),
  ALTER COLUMN packages TYPE VARCHAR(64) USING packages::text,
  ALTER COLUMN pieces_per_package TYPE VARCHAR(64) USING pieces_per_package::text,
  ALTER COLUMN unit_price_per_piece TYPE VARCHAR(128) USING unit_price_per_piece::text,
  ALTER COLUMN production_date TYPE VARCHAR(64) USING production_date::text,
  ALTER COLUMN total_pieces TYPE VARCHAR(64) USING total_pieces::text,
  ALTER COLUMN total_amount TYPE VARCHAR(128) USING total_amount::text,
  ALTER COLUMN billed_at TYPE VARCHAR(128) USING billed_at::text;

ALTER TABLE settlements
  DROP CONSTRAINT IF EXISTS settlements_total_pieces_check,
  DROP CONSTRAINT IF EXISTS settlements_total_amount_check;
ALTER TABLE settlements
  ALTER COLUMN total_pieces TYPE VARCHAR(64) USING total_pieces::text,
  ALTER COLUMN total_amount TYPE VARCHAR(128) USING total_amount::text;

ALTER TABLE settlement_items
  DROP CONSTRAINT IF EXISTS settlement_items_packages_check,
  DROP CONSTRAINT IF EXISTS settlement_items_pieces_per_package_check,
  DROP CONSTRAINT IF EXISTS settlement_items_unit_price_per_piece_check,
  DROP CONSTRAINT IF EXISTS settlement_items_total_pieces_check,
  DROP CONSTRAINT IF EXISTS settlement_items_total_amount_check;
ALTER TABLE settlement_items
  ALTER COLUMN cut_number TYPE VARCHAR(512),
  ALTER COLUMN description TYPE VARCHAR(1024),
  ALTER COLUMN packages TYPE VARCHAR(64) USING packages::text,
  ALTER COLUMN pieces_per_package TYPE VARCHAR(64) USING pieces_per_package::text,
  ALTER COLUMN unit_price_per_piece TYPE VARCHAR(128) USING unit_price_per_piece::text,
  ALTER COLUMN production_date TYPE VARCHAR(64) USING production_date::text,
  ALTER COLUMN total_pieces TYPE VARCHAR(64) USING total_pieces::text,
  ALTER COLUMN total_amount TYPE VARCHAR(128) USING total_amount::text;

CREATE TABLE app_data_migrations (
  version VARCHAR(80) PRIMARY KEY,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
