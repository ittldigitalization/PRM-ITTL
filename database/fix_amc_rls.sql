-- To quickly restore access and fix the "missing data" issue, disable RLS again:
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.amc_contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.amc_visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.amc_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.amc_documents DISABLE ROW LEVEL SECURITY;

-- =========================================================================
-- OPTIONAL: If you REALLY want to keep RLS enabled for security purposes, 
-- you MUST create policies. You can run the commands below instead:
-- =========================================================================

/*
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on customers" ON public.customers;
CREATE POLICY "Allow all on customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.amc_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on amc_contracts" ON public.amc_contracts;
CREATE POLICY "Allow all on amc_contracts" ON public.amc_contracts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.amc_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on amc_visits" ON public.amc_visits;
CREATE POLICY "Allow all on amc_visits" ON public.amc_visits FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.amc_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on amc_payments" ON public.amc_payments;
CREATE POLICY "Allow all on amc_payments" ON public.amc_payments FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.amc_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on amc_documents" ON public.amc_documents;
CREATE POLICY "Allow all on amc_documents" ON public.amc_documents FOR ALL USING (true) WITH CHECK (true);
*/
