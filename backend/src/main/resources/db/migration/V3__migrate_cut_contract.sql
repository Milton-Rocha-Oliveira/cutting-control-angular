-- Compatibilidade para bancos que já executaram o contrato anterior.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cuts' AND column_name = 'available_quantity'
  ) THEN
    ALTER TABLE cuts RENAME COLUMN unit_price TO unit_price_per_piece;
    ALTER TABLE cuts ADD COLUMN packages INTEGER;
    ALTER TABLE cuts ADD COLUMN pieces_per_package INTEGER;
    ALTER TABLE cuts ADD COLUMN production_date DATE;
    ALTER TABLE cuts ADD COLUMN total_pieces BIGINT;
    ALTER TABLE cuts ADD COLUMN total_amount NUMERIC(14,2);
    ALTER TABLE cuts ADD COLUMN status VARCHAR(10);
    ALTER TABLE cuts ADD COLUMN billed_at TIMESTAMP WITH TIME ZONE;
    UPDATE cuts
       SET packages = GREATEST(1, CEIL(available_quantity)::INTEGER),
           pieces_per_package = 1,
           production_date = CURRENT_DATE,
           total_pieces = GREATEST(1, ROUND(available_quantity)::BIGINT),
           total_amount = ROUND(available_quantity * unit_price_per_piece, 2),
           status = CASE WHEN active THEN 'ACTIVE' ELSE 'INACTIVE' END;
    ALTER TABLE cuts ALTER COLUMN packages SET NOT NULL;
    ALTER TABLE cuts ALTER COLUMN pieces_per_package SET NOT NULL;
    ALTER TABLE cuts ALTER COLUMN production_date SET NOT NULL;
    ALTER TABLE cuts ALTER COLUMN total_pieces SET NOT NULL;
    ALTER TABLE cuts ALTER COLUMN total_amount SET NOT NULL;
    ALTER TABLE cuts ALTER COLUMN status SET NOT NULL;
    ALTER TABLE cuts ALTER COLUMN status SET DEFAULT 'ACTIVE';
    ALTER TABLE cuts DROP COLUMN available_quantity;
    ALTER TABLE cuts DROP COLUMN active;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settlement_items' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE settlement_items RENAME COLUMN unit_price TO unit_price_per_piece;
    ALTER TABLE settlement_items ADD COLUMN packages INTEGER;
    ALTER TABLE settlement_items ADD COLUMN pieces_per_package INTEGER;
    ALTER TABLE settlement_items ADD COLUMN production_date DATE;
    ALTER TABLE settlement_items ADD COLUMN total_pieces BIGINT;
    UPDATE settlement_items
       SET packages = GREATEST(1, CEIL(quantity)::INTEGER),
           pieces_per_package = 1,
           production_date = CURRENT_DATE,
           total_pieces = GREATEST(1, ROUND(quantity)::BIGINT);
    ALTER TABLE settlement_items ALTER COLUMN packages SET NOT NULL;
    ALTER TABLE settlement_items ALTER COLUMN pieces_per_package SET NOT NULL;
    ALTER TABLE settlement_items ALTER COLUMN production_date SET NOT NULL;
    ALTER TABLE settlement_items ALTER COLUMN total_pieces SET NOT NULL;
    ALTER TABLE settlement_items DROP COLUMN quantity;
  END IF;

  ALTER TABLE settlements ADD COLUMN IF NOT EXISTS total_pieces BIGINT NOT NULL DEFAULT 0;
  UPDATE settlements s
     SET total_pieces = COALESCE((SELECT SUM(total_pieces) FROM settlement_items i WHERE i.settlement_id = s.id), 0);
END $$;
