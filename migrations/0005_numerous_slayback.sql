-- Drop dependent FK first
ALTER TABLE "products" DROP COLUMN "unit_id";

-- Recreate units with integer PK
DROP TABLE "units";
CREATE TABLE "units" (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name text NOT NULL UNIQUE,
    symbol text NOT NULL UNIQUE
);

-- Re-add unit_id as integer on products (nullable for now)
ALTER TABLE "products" ADD COLUMN "unit_id" integer;

-- Seed units
INSERT INTO units (name, symbol) VALUES
('Piece', 'pcs'),
('Kilogram', 'kg'),
('Gram', 'g'),
('Liter', 'ltr'),
('Milliliter', 'ml'),
('Box', 'box'),
('Dozen', 'doz');

-- Backfill existing products
UPDATE "products" SET "unit_id" = 1;

-- Enforce NOT NULL + FK
ALTER TABLE "products" ALTER COLUMN "unit_id" SET NOT NULL;
ALTER TABLE "products" ADD CONSTRAINT "products_unit_id_fkey"
FOREIGN KEY ("unit_id") REFERENCES "units"("id");