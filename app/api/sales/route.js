import { db, employeeId } from '../../../lib/supabase';
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
    const salespersonId = await employeeId(client, body.salesperson);
    const { data: sale, error } = await client.from('sales').insert({
      reference: body.reference.trim().toUpperCase(), salesperson_id: salespersonId, customer: body.customer.trim(), project: body.project,
      description: body.description.trim(), amount: Number(body.amount), proposed_richard_pct: shares[0], proposed_anastasia_pct: shares[1], proposed_jean_claude_pct: shares[2]
    }).select().single();
    if (error) throw new Error(error.code === '23505' ? 'That reference already exists.' : error.message);
    try { await syncSale(sale, body.salesperson); await client.from('sales').update({ sheets_sync_status: 'synced' }).eq('id', sale.id); }
    catch { await client.from('sales').update({ sheets_sync_status: 'failed' }).eq('id', sale.id); }
    return Response.json({ reference: sale.reference }, { status: 201 });
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
}
