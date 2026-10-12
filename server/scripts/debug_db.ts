import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: users, error: uError } = await supabase.from('users').select('*').limit(5);
  console.log('Users in DB:', users);
  
  if (uError) console.error('Error fetching users:', uError);
  
  const { data: rbac_roles, error: rError } = await supabase.from('rbac_roles').select('*');
  console.log('RBAC Roles in DB:', rbac_roles);
  if (rError) console.error('Error fetching rbac_roles:', rError);
}
run();
