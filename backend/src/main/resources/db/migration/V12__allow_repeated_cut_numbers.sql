-- Cut numbers are labels that may be reused over time for the same supplier.
DROP INDEX IF EXISTS uq_supplier_cut_number_fingerprint;
CREATE INDEX ix_cuts_supplier_cut_number_fingerprint
  ON cuts(supplier_id, cut_number_fingerprint);
