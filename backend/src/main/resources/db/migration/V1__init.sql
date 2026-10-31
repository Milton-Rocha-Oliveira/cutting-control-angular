CREATE TABLE suppliers (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  document VARCHAR(30),
  email VARCHAR(160),
  phone VARCHAR(40),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX uq_suppliers_document ON suppliers(document) WHERE document IS NOT NULL;
CREATE TABLE cuts (
  id BIGSERIAL PRIMARY KEY,
  supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
  cut_number VARCHAR(80) NOT NULL,
  description VARCHAR(255) NOT NULL,
  packages INTEGER NOT NULL CHECK (packages > 0),
  pieces_per_package INTEGER NOT NULL CHECK (pieces_per_package > 0),
  unit_price_per_piece NUMERIC(14,2) NOT NULL CHECK (unit_price_per_piece >= 0),
  production_date DATE NOT NULL,
  total_pieces BIGINT NOT NULL CHECK (total_pieces > 0),
  total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0),
  status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  billed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_supplier_cut_number UNIQUE (supplier_id, cut_number)
);
CREATE TABLE settlements (
  id BIGSERIAL PRIMARY KEY,
  invoice_number VARCHAR(40) NOT NULL UNIQUE,
  supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
  settled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_pieces BIGINT NOT NULL DEFAULT 0 CHECK (total_pieces >= 0),
  total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0),
  created_by VARCHAR(120) NOT NULL
);
CREATE TABLE settlement_items (
  id BIGSERIAL PRIMARY KEY,
  settlement_id BIGINT NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  cut_id BIGINT NOT NULL REFERENCES cuts(id),
  cut_number VARCHAR(80) NOT NULL,
  description VARCHAR(255) NOT NULL,
  packages INTEGER NOT NULL CHECK (packages > 0),
  pieces_per_package INTEGER NOT NULL CHECK (pieces_per_package > 0),
  unit_price_per_piece NUMERIC(14,2) NOT NULL CHECK (unit_price_per_piece >= 0),
  production_date DATE NOT NULL,
  total_pieces BIGINT NOT NULL CHECK (total_pieces > 0),
  total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0)
);
CREATE INDEX idx_cuts_supplier ON cuts(supplier_id);
CREATE INDEX idx_settlements_supplier_date ON settlements(supplier_id, settled_at);
