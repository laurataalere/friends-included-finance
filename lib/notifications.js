import { telegram } from './telegram';

export async function notifyDecision(client, reference, chatId, text) {
  const { data } = await client.from('notifications').insert({ transaction_reference: reference, recipient_chat_id: chatId ?? null, message: text, status: 'pending' }).select().single();
  if (!chatId) return;
  const sent = await telegram(chatId, text);
  await client.from('notifications').update({ status: sent ? 'sent' : 'failed', sent_at: sent ? new Date().toISOString() : null }).eq('id', data.id);
}
