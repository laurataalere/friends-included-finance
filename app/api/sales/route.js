import { db, employeeForRole } from '../../../lib/supabase';
import { syncSale } from '../../../lib/google-sheets';

export async function POST(request) {
  try {
    const body = await request.json();
    const shares = ['richard', 'anastasia', 'jeanClaude'].map((key) => Number(body[key]));
    if (shares.some((share) => !Number.isFinite(share) || share < 0 || share > 100) || shares.reduce((a, b) => a + b, 0) !== 100) {
      return Response.json({ error: 'Commission shares must add to exactly 100%.' }, { status: 400 });
    }
    const missing = [
      !body.reference && 'reference', !body.customer && 'customer', !body.description && 'description',
      !['A', 'B'].includes(body.project) && 'project', !(Number(body.amount) > 0) && 'positive amount'
    ].filter(Boolean);
    if (missing.length) throw new Error(`Please provide: ${missing.join(', ')}.`);
    const client = db();
    if (body.actor !== body.salesperson) throw new Error('A demonstration role may only submit its own sale.');
    const salesperson = await employeeForRole(client, body.salesperson, 'salesperson');
    const { data: sale, error } = await client.from('sales').insert({
      reference: body.reference.trim().toUpperCase(), salesperson_id: salesperson.id, customer: body.customer.trim(), project: body.project,
      description: body.description.trim(), amount: Number(body.amount), proposed_richard_pct: shares[0], proposed_anastasia_pct: shares[1], proposed_jean_claude_pct: shares[2],
      submission_chat_id: salesperson.telegram_user_id || null
    }).select().single();
    if (error) throw new Error(error.code === '23505' ? 'That reference already exists.' : error.message);
    let syncStatus = 'synced';
    try { await syncSale(sale, body.salesperson); await client.from('sales').update({ sheets_sync_status: syncStatus }).eq('id', sale.id); }
    catch (syncError) { console.error('Google Sheets sale sync failed:', syncError.message); syncStatus = 'failed'; await client.from('sales').update({ sheets_sync_status: syncStatus }).eq('id', sale.id); }
    return Response.json({ reference: sale.reference, syncStatus }, { status: 201 });
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
}
