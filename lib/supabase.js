import { createClient } from '@supabase/supabase-js';

export function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

export async function employeeId(client, name) {
  const { data, error } = await client.from('employees').select('id').eq('name', name).single();
  if (error) throw new Error('Employee was not found.');
  return data.id;
}

export async function employeeForRole(client, name, role) {
  if (!name) throw new Error('Choose a demonstration role.');
  const { data, error } = await client.from('employees').select('*').eq('name', name).single();
  if (error || !data) throw new Error('Employee was not found.');
  if (data.role !== role) throw new Error(`${name} is not allowed to perform this action.`);
  return data;
}
