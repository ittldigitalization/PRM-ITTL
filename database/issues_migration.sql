-- Create the issues table
CREATE TABLE public.issues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_name TEXT NOT NULL,
    date DATE NOT NULL,
    reported_dept TEXT,
    concerned_person TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Resolved')),
    supporting_person_type TEXT CHECK (supporting_person_type IN ('Internal', 'External (Vendor)')),
    supporting_person_name TEXT,
    date_of_issue DATE,
    remarks TEXT,
    communication_status BOOLEAN DEFAULT false,
    evidence_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.issues FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.issues FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.issues FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.issues FOR DELETE USING (true);

-- Enable real-time for the issues table
ALTER PUBLICATION supabase_realtime ADD TABLE public.issues;

-- Force PostgREST to reload the schema cache so the API recognizes the new table immediately
NOTIFY pgrst, 'reload schema';
