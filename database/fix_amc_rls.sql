-- This script enables RLS and adds proper authenticated policies to clear Supabase Linter errors.
-- It ensures that data is visible in the frontend for logged-in users.

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable insert for anon" ON public.customers;
DROP POLICY IF EXISTS "Allow all on customers" ON public.customers;
DROP POLICY IF EXISTS "Allow authenticated on customers" ON public.customers;
CREATE POLICY "Allow authenticated on customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.amc_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on amc_contracts" ON public.amc_contracts;
DROP POLICY IF EXISTS "Allow authenticated on amc_contracts" ON public.amc_contracts;
CREATE POLICY "Allow authenticated on amc_contracts" ON public.amc_contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.amc_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on amc_documents" ON public.amc_documents;
DROP POLICY IF EXISTS "Allow authenticated on amc_documents" ON public.amc_documents;
CREATE POLICY "Allow authenticated on amc_documents" ON public.amc_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.amc_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on amc_payments" ON public.amc_payments;
DROP POLICY IF EXISTS "Allow authenticated on amc_payments" ON public.amc_payments;
CREATE POLICY "Allow authenticated on amc_payments" ON public.amc_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.amc_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on amc_visits" ON public.amc_visits;
DROP POLICY IF EXISTS "Allow authenticated on amc_visits" ON public.amc_visits;
CREATE POLICY "Allow authenticated on amc_visits" ON public.amc_visits FOR ALL TO authenticated USING (true) WITH CHECK (true);
