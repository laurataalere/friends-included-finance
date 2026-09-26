import { db } from '../../../../lib/supabase';
import { telegram } from '../../../../lib/telegram';

export async function POST(request) {
  try {
    const { id, actor } = await request.json();
    if (actor !== 'Svetlana de Monte Carlo') throw new Error('Only Svetlana can retry a notification.');
    const client = db(); const { data: notice, error } = await client.from('notifications').select('*').eq('id', id).single();
    if (error || !notice) throw new Error('Notification was not found.');
    const sent = await telegram(notice.recipient_chat_id, notice.message);
    await client.from('notifications').update({ status: sent ? 'sent' : 'failed', sent_at: sent ? new Date().toISOString() : null }).eq('id', id);
    return Response.json({ sent });
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
}
