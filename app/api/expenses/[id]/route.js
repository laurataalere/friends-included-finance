import { db, employeeForRole } from '../../../../lib/supabase';
import { notifyDecision } from '../../../../lib/notifications';
import { syncExpense } from '../../../../lib/google-sheets';

export async function PATCH(request, { params }) {
  try {
    const body = await request.json(); if (!['A','B','overhead'].includes(body.allocation)) throw new Error('Choose a final allocation.');
    const client = db(); const manager = await employeeForRole(client, body.actor, 'manager');
    const { data, error } = await client.from('expenses').update({ final_allocation: body.allocation, status: 'allocated', approved_by: manager.id, approved_at: new Date().toISOString() }).eq('id', params.id).eq('status', 'awaiting_allocation').select('*').single();
    if (error || !data) throw new Error(error?.message || 'Supabase did not update this expense.');
    try {
      const { data: reporter } = await client.from('employees').select('name').eq('id', data.reporter_id).single();
      await syncExpense(data, reporter?.name || 'Unknown');
      await client.from('expenses').update({ sheets_sync_status: 'synced' }).eq('id', data.id);
    } catch { await client.from('expenses').update({ sheets_sync_status: 'failed' }).eq('id', data.id); }
    await notifyDecision(client, data.reference, data.submission_chat_id, `Expense ${data.reference} ${body.allocation !== data.proposed_allocation ? 'allocation changed' : 'allocation confirmed'}. €${Number(data.amount).toFixed(2)}: ${data.description}. Final allocation: ${body.allocation}.`);
    return Response.json({ ok: true });
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
}
