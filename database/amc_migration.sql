-- AMC Management Module Migration

-- Create new Enums
DO $$ BEGIN
    CREATE TYPE amc_contract_status AS ENUM ('Active', 'Expired', 'Renewal Due');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE amc_visit_status AS ENUM ('Scheduled', 'Completed', 'Cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE amc_payment_status AS ENUM ('Pending', 'Partial', 'Paid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Customers Table (Master)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. AMC Contracts Table
CREATE TABLE IF NOT EXISTS public.amc_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amc_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    contract_name VARCHAR(255) NOT NULL,
    amc_type VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    contract_amount DECIMAL(15, 2) NOT NULL,
    engineer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    response_time VARCHAR(100),
    service_frequency VARCHAR(100),
    status amc_contract_status DEFAULT 'Active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. AMC Service Visits Table
CREATE TABLE IF NOT EXISTS public.amc_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amc_id UUID REFERENCES public.amc_contracts(id) ON DELETE CASCADE,
    visit_date DATE NOT NULL,
    engineer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    work_performed TEXT,
    spare_parts_used TEXT,
    remarks TEXT,
    next_service_date DATE,
    visit_status amc_visit_status DEFAULT 'Scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. AMC Payments Table
CREATE TABLE IF NOT EXISTS public.amc_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amc_id UUID REFERENCES public.amc_contracts(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    gst DECIMAL(15, 2) DEFAULT 0,
    paid_amount DECIMAL(15, 2) DEFAULT 0,
    balance DECIMAL(15, 2) NOT NULL,
    payment_status amc_payment_status DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. AMC Documents Table
CREATE TABLE IF NOT EXISTS public.amc_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amc_id UUID REFERENCES public.amc_contracts(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    size_str VARCHAR(50) NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Disable RLS for easy testing from frontend without auth
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.amc_contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.amc_visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.amc_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.amc_documents DISABLE ROW LEVEL SECURITY;
