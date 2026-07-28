-- Alter the task_name column in dprs table to TEXT to allow unlimited characters for the details field
ALTER TABLE public.dprs
ALTER COLUMN task_name TYPE TEXT;
