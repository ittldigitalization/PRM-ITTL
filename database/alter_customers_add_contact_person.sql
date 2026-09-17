-- This script adds the contact_person column to the customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
