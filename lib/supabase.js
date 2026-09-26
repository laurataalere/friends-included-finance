import { createClient } from '@supabase/supabase-js';

export function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

export async function employeeId(client, name) {
  const { data, error } = await client.from('employees').select('id').eq('name', name).single();
  if (error) throw new Error('Employee was not found.');
  return data.id;
}
