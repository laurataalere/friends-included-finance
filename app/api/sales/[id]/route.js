import { db, employeeId } from '../../../../lib/supabase';
import { notifyDecision } from '../../../../lib/notifications';
import { syncSale } from '../../../../lib/google-sheets';

export async function PATCH(request, { params }) {
  try {
    const body = await request.json(); if (!body.approve) throw new Error('Approval required.');
    const client = db(); const managerId = await employeeId(client, 'Svetlana de Monte Carlo');
    const shares = [body.richard, body.anastasia, body.jeanClaude].map(Number);
    if (shares.some((share) => !Number.isFinite(share) || share < 0 || share > 100) || shares.reduce((a, b) => a + b, 0) !== 100) throw new Error('Commission shares must add to exactly 100%.');
    const { data, error } = await client.from('sales').update({ status: 'approved', approved_richard_pct: shares[0], approved_anastasia_pct: shares[1], approved_jean_claude_pct: shares[2], approved_by: managerId, approved_at: new Date().toISOString() }).eq('id', params.id).eq('status', 'pending').select('*').single();
    if (error || !data) throw new Error(error?.message || 'Supabase did not update this pending sale.');
    const changed = [data.proposed_richard_pct, data.proposed_anastasia_pct, data.proposed_jean_claude_pct].some((value, index) => Number(value) !== shares[index]);
    try {
      const { data: salesperson } = await client.from('employees').select('name').eq('id', data.salesperson_id).single();
      await syncSale(data, salesperson?.name || 'Unknown');
      await client.from('sales').update({ sheets_sync_status: 'synced' }).eq('id', data.id);
    } catch { await client.from('sales').update({ sheets_sync_status: 'failed' }).eq('id', data.id); }
    const euros = shares.map((share) => (Number(data.amount) * 0.1 * share / 100).toFixed(2));
    await notifyDecision(client, data.reference, data.submission_chat_id, `Sale ${data.reference} approved${changed ? ' - commission split changed' : ''}. Sale €${Number(data.amount).toFixed(2)}; total commission €${(Number(data.amount) * 0.1).toFixed(2)}. Richard: ${shares[0]}% (€${euros[0]}). Anastasia: ${shares[1]}% (€${euros[1]}). Jean-Claude: ${shares[2]}% (€${euros[2]}).`);
    return Response.json({ ok: true, sale: data });
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
}
