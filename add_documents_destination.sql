INSERT INTO public.rbac_destinations (id, name, description, category) 
VALUES ('documents', 'Documents', 'Manage documents', 'Operations')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category;
