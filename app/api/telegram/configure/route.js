export async function POST(request) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN; if (!token) throw new Error('Telegram token is not configured.');
    const origin = request.headers.get('origin'); if (!origin) throw new Error('Open this from the deployed website.');
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ url: `${origin}/api/telegram/webhook` }) });
    if (!response.ok) throw new Error('Telegram rejected the webhook setup.'); return Response.json({ ok: true });
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
}
