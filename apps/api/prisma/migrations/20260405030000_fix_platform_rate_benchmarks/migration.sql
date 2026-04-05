-- Fix platform rate benchmark values (incorrect SUV/XL values were 0.0)
-- Delete all existing benchmarks
DELETE FROM "PlatformRateBenchmark";

-- Reinsert correct benchmark values
INSERT INTO "PlatformRateBenchmark" (id, provider, "marketKey", "rideType", "baseFare", "perMile", "perMinute", multiplier, "observedAt", "createdAt", "updatedAt") VALUES
-- Uber DEFAULT
('uber_std_default', 'UBER', 'DEFAULT', 'STANDARD', 2.5, 1.2, 0.45, 1, NOW(), NOW(), NOW()),
('uber_suv_default', 'UBER', 'DEFAULT', 'SUV', 4.0, 1.8, 0.6, 1, NOW(), NOW(), NOW()),
('uber_xl_default', 'UBER', 'DEFAULT', 'XL', 5.0, 2.0, 0.7, 1, NOW(), NOW(), NOW()),
-- Lyft DEFAULT
('lyft_std_default', 'LYFT', 'DEFAULT', 'STANDARD', 2.75, 1.15, 0.5, 1, NOW(), NOW(), NOW()),
('lyft_suv_default', 'LYFT', 'DEFAULT', 'SUV', 4.25, 1.75, 0.65, 1, NOW(), NOW(), NOW()),
('lyft_xl_default', 'LYFT', 'DEFAULT', 'XL', 5.25, 1.95, 0.75, 1, NOW(), NOW(), NOW());
