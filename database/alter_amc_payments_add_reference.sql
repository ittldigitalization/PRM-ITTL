-- Add invoice_reference column to amc_payments
ALTER TABLE public.amc_payments ADD COLUMN IF NOT EXISTS invoice_reference VARCHAR(255);
