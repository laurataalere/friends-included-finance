export async function telegram(chatId, text) {
  if (!chatId || !process.env.TELEGRAM_BOT_TOKEN) return false;
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ chat_id: chatId, text }) });
  return response.ok;
}
