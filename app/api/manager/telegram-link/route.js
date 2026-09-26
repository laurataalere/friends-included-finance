import { db } from '../../../../lib/supabase';

export async function POST(request) {
  try {
    const { employee, telegramUserId } = await request.json();
    if (!employee || !/^\d+$/.test(String(telegramUserId))) throw new Error('Enter an employee and a numeric Telegram user ID.');
    const client = db();
    const { error: clearError } = await client.from('employees').update({ telegram_user_id: null }).eq('telegram_user_id', telegramUserId);
    if (clearError) throw clearError;
    const { error } = await client.from('employees').update({ telegram_user_id: telegramUserId }).eq('name', employee);
    if (error) throw error; return Response.json({ ok: true });
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
}
