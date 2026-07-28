import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'client/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createUser() {
  const { data, error } = await supabase.auth.signUp({
    email: 'testuser@indotech.com',
    password: 'Password123!',
  });
  if (error) {
    console.error('Error creating user:', error.message);
  } else {
    console.log('Successfully created test user!');
    console.log('Email:', 'testuser@indotech.com');
    console.log('Password:', 'Password123!');
  }
}

createUser();
