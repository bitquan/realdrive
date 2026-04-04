-- AlterTable
ALTER TABLE "DriverProfile"
ADD COLUMN "acceptedPaymentMethods" "PaymentMethod"[] NOT NULL DEFAULT ARRAY['JIM', 'CASHAPP', 'CASH']::"PaymentMethod"[];
